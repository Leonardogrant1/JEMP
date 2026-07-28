# Affiliate Creator-Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose four dev utilities (refill assessments, reset onboarding, reset plan, seed history) to `affiliate`/`admin` users via a collapsible section in the profile tab, backed by role-checked DB functions.

**Architecture:** A new collapsible `CreatorToolsSection` component in the profile tab, rendered only for `role ∈ {affiliate, admin}`. Reset Onboarding and Reset Plan reuse existing client-side logic (RLS-verified: users have full CRUD on their own workout tables). Assessment refill and history seeding go through Supabase RPCs that check the caller's role inside SECURITY DEFINER functions. One migration adds `fn_refill_user_assessments()` (no 28-day cooldown) and hardens `fn_dev_seed_category_history` (was callable by any authenticated user with an arbitrary `p_user_id`).

**Tech Stack:** React Native / Expo Router, TypeScript, Supabase (Postgres RPCs, typed client via `database.types.ts`), TanStack Query, react-i18next, Jest (`jest-expo` preset).

**Spec:** `docs/superpowers/specs/2026-07-28-affiliate-creator-tools-design.md`

## Global Constraints

- **Git:** Keine Commits ohne explizite Freigabe des Users (User-Präferenz). Die Commit-Steps unten nur ausführen, wenn der User Commits freigegeben hat — sonst überspringen.
- **Deployment:** Niemals auf Production pushen/deployen; Migration nur lokal anwenden. Der User deployt selbst.
- **i18n:** Alle UI-Texte über `t('ui.…')`-Keys in `i18n/locales/de.ts` UND `i18n/locales/en.ts`.
- **Styling:** Bestehende Komponenten (`SettingsRow`, `JempText`) und Theme-Konstanten (`Colors`, `useColorScheme`) verwenden; 4-Spaces-Einrückung wie im Repo.
- **`__DEV__`-Toolbar:** bleibt funktional unverändert bis auf (a) geteilten Reset-Onboarding-Helper, (b) angepassten `fn_dev_seed_category_history`-Aufruf (neue Signatur).
- **Verifikation pro Task:** `npx tsc --noEmit` darf keine NEUEN Fehler in geänderten Dateien zeigen (das Repo hat vorbestehende Fehler in `components/onboarding/steps/*` und `components/exercise-video-hero.tsx` — die ignorieren).

---

### Task 1: DB-Migration + Typen — `fn_refill_user_assessments` und Härtung `fn_dev_seed_category_history`

**Files:**
- Create: `supabase/migrations/20260728130000_add_creator_tools.sql`
- Modify: `database.types.ts:1761-1777` (Functions-Block)

**Interfaces:**
- Produces: RPC `fn_refill_user_assessments()` — keine Args, Returns void, wirft Exception `creator tools require affiliate or admin role` bei falscher Rolle. RPC `fn_dev_seed_category_history(p_days integer DEFAULT 10)` — NEUE Signatur ohne `p_user_id`, wirkt auf `auth.uid()`, gleicher Rollencheck. Client-Aufrufe: `supabase.rpc('fn_refill_user_assessments')` und `supabase.rpc('fn_dev_seed_category_history', { p_days: 10 })`.
- Consumes: bestehende Tabellen `user_profiles` (Spalte `role`, Enum `user_role`), `assessments`, `sport_category_relevance`, `assessment_equipments`, `user_equipments`, `user_assessments`, `user_category_levels`, `user_category_level_history`.

- [ ] **Step 1: Migration schreiben**

Datei `supabase/migrations/20260728130000_add_creator_tools.sql` mit exakt diesem Inhalt:

```sql
-- ─────────────────────────────────────────────────────────────
-- Creator tools for affiliate/admin roles:
-- 1) fn_assert_creator_role(): shared role guard.
-- 2) fn_refill_user_assessments(): user-scoped assessment refill
--    WITHOUT the 28-day cooldown (content creators need instant
--    refills). Insert logic mirrors fn_create_user_assessments.
-- 3) Harden fn_dev_seed_category_history: acts on auth.uid() only
--    (was callable by any authenticated user with an arbitrary
--    p_user_id) and requires the creator role.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_assert_creator_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('affiliate', 'admin')
    ) THEN
        RAISE EXCEPTION 'creator tools require affiliate or admin role';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION fn_assert_creator_role() FROM PUBLIC;

CREATE OR REPLACE FUNCTION fn_refill_user_assessments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM fn_assert_creator_role();

    INSERT INTO user_assessments (user_id, assessment_id, status)
    SELECT auth.uid(), a.id, 'pending'
    FROM assessments a
    JOIN sport_category_relevance scr
        ON scr.category_id = a.category_id
    JOIN user_profiles up
        ON up.sport_id = scr.sport_id
        AND up.id = auth.uid()
    WHERE
      -- User has all required equipment (or assessment needs none)
      NOT EXISTS (
          SELECT 1 FROM assessment_equipments ae
          WHERE ae.assessment_id = a.id
            AND NOT EXISTS (
                SELECT 1 FROM user_equipments ue
                WHERE ue.user_id = auth.uid()
                  AND ue.equipment_id = ae.equipment_id
            )
      )
      -- Not already pending or in progress (no cooldown check on purpose)
      AND NOT EXISTS (
          SELECT 1 FROM user_assessments ua
          WHERE ua.user_id = auth.uid()
            AND ua.assessment_id = a.id
            AND ua.status IN ('pending', 'in_progress')
      );
END;
$$;

REVOKE ALL ON FUNCTION fn_refill_user_assessments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_refill_user_assessments() TO authenticated;

-- Replace the open (p_user_id, p_days) signature with a hardened one.
DROP FUNCTION IF EXISTS fn_dev_seed_category_history(uuid, integer);

CREATE FUNCTION fn_dev_seed_category_history(p_days integer DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_day integer;
    v_user_id uuid := auth.uid();
BEGIN
    PERFORM fn_assert_creator_role();

    FOR v_day IN 1..p_days LOOP
        -- Per-category rows
        INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
        SELECT
            ucl.user_id,
            ucl.category_id,
            GREATEST(1, LEAST(100,
                ucl.level_score
                - (p_days - v_day)                          -- linear base trend (lower in the past)
                + floor(random() * 5 - 2)::integer          -- ±2 noise
            )),
            (NOW() - ((p_days - v_day) || ' days')::interval)
        FROM user_category_levels ucl
        WHERE ucl.user_id = v_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_category_level_history h
              WHERE h.user_id     = ucl.user_id
                AND h.category_id = ucl.category_id
                AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
          );

        -- Overall row (NULL category_id)
        INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
        SELECT
            v_user_id,
            NULL,
            GREATEST(1, LEAST(100,
                ROUND(AVG(ucl.level_score))::integer
                - (p_days - v_day)
                + floor(random() * 5 - 2)::integer
            )),
            (NOW() - ((p_days - v_day) || ' days')::interval)
        FROM user_category_levels ucl
        WHERE ucl.user_id = v_user_id
        HAVING COUNT(*) > 0
        AND NOT EXISTS (
            SELECT 1 FROM user_category_level_history h
            WHERE h.user_id     = v_user_id
              AND h.category_id IS NULL
              AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION fn_dev_seed_category_history(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_dev_seed_category_history(integer) TO authenticated;
```

- [ ] **Step 2: Migration lokal anwenden**

Run: `npx supabase migration up` (lokaler Stack muss laufen; falls der Stack frisch ist, alternativ `npx supabase db reset`).
Expected: Migration wird ohne Fehler angewendet.

- [ ] **Step 3: Rollencheck in der DB verifizieren**

Run (im lokalen SQL-Editor oder `npx supabase db psql`; ohne JWT-Kontext ist `auth.uid()` NULL):

```sql
SELECT fn_refill_user_assessments();
```

Expected: FEHLER `creator tools require affiliate or admin role` — beweist, dass der Guard greift, wenn kein affiliate/admin-Kontext vorliegt.

- [ ] **Step 4: `database.types.ts` Functions-Block anpassen**

In `database.types.ts` (Functions-Block, ~Zeile 1761) den Eintrag von `fn_dev_seed_category_history` ändern und `fn_refill_user_assessments` alphabetisch einfügen:

```typescript
      fn_dev_seed_category_history: {
        Args: { p_days?: number }
        Returns: undefined
      }
      fn_refill_user_assessments: { Args: never; Returns: undefined }
```

(Der alte Eintrag hatte `Args: { p_days?: number; p_user_id: string }` — `p_user_id` entfällt.)

- [ ] **Step 5: Type-Check**

Run: `npx tsc --noEmit 2>&1 | grep -v "components/onboarding\|exercise-video-hero"`
Expected: Ein NEUER Fehler in `app/(tabs)/_layout.tsx` (Seed-History-Aufruf mit alter Signatur) — der wird in Task 3 behoben und ist hier erwartet. Keine weiteren neuen Fehler.

- [ ] **Step 6: Commit (nur nach Freigabe, siehe Global Constraints)**

```bash
git add supabase/migrations/20260728130000_add_creator_tools.sql database.types.ts
git commit -m "feat: add role-checked creator-tools RPCs (assessment refill, hardened history seed)"
```

---

### Task 2: Rollen-Helper `canUseCreatorTools` (TDD)

**Files:**
- Create: `utils/creator-tools.ts`
- Test: `utils/__tests__/creator-tools.test.ts`

**Interfaces:**
- Produces: `canUseCreatorTools(role: string | null | undefined): boolean` — true nur für `'affiliate'` und `'admin'`. Wird in Task 4 vom UI-Gate konsumiert.
- Consumes: nichts.

- [ ] **Step 1: Failing Test schreiben**

Datei `utils/__tests__/creator-tools.test.ts`:

```typescript
import { canUseCreatorTools } from '../creator-tools';

describe('canUseCreatorTools', () => {
    it('allows affiliate and admin', () => {
        expect(canUseCreatorTools('affiliate')).toBe(true);
        expect(canUseCreatorTools('admin')).toBe(true);
    });

    it('denies user, tester and missing role', () => {
        expect(canUseCreatorTools('user')).toBe(false);
        expect(canUseCreatorTools('tester')).toBe(false);
        expect(canUseCreatorTools(null)).toBe(false);
        expect(canUseCreatorTools(undefined)).toBe(false);
    });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx jest utils/__tests__/creator-tools.test.ts`
Expected: FAIL — `Cannot find module '../creator-tools'`.

- [ ] **Step 3: Implementierung**

Datei `utils/creator-tools.ts`:

```typescript
export function canUseCreatorTools(role: string | null | undefined): boolean {
    return role === 'affiliate' || role === 'admin';
}
```

- [ ] **Step 4: Test laufen lassen — muss grün sein**

Run: `npx jest utils/__tests__/creator-tools.test.ts`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit (nur nach Freigabe)**

```bash
git add utils/creator-tools.ts utils/__tests__/creator-tools.test.ts
git commit -m "feat: add canUseCreatorTools role helper"
```

---

### Task 3: Reset-Onboarding-Helper extrahieren + Dev-Toolbar anpassen

**Files:**
- Create: `utils/reset-onboarding.ts`
- Modify: `app/(tabs)/_layout.tsx:186-211` (Reset-Onboarding-Button) und `app/(tabs)/_layout.tsx:293-309` (Seed-History-Button)

**Interfaces:**
- Produces: `resetOnboardingProfile(userId: string): Promise<void>` — setzt die Onboarding-relevanten Profilfelder zurück, wirft `Error` bei Supabase-Fehler. Wird in Task 4 konsumiert.
- Consumes: `supabase` aus `@/services/supabase/client`; neue RPC-Signatur `fn_dev_seed_category_history({ p_days })` aus Task 1.

- [ ] **Step 1: Helper schreiben**

Datei `utils/reset-onboarding.ts`:

```typescript
import { supabase } from '@/services/supabase/client';

/**
 * Clears the onboarding-relevant profile fields so the user runs
 * through onboarding again. Store reset and profile refresh stay
 * with the caller (they need React context).
 */
export async function resetOnboardingProfile(userId: string): Promise<void> {
    const { error } = await supabase
        .from('user_profiles')
        .update({
            has_onboarded: false,
            first_name: null,
            last_name: null,
            birth_date: null,
            gender: null,
            sport_id: null,
            height_in_cm: null,
            weight_in_kg: null,
            preferred_workout_days: [],
            preferred_session_duration: null,
            timezone: null,
        })
        .eq('id', userId);
    if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Dev-Button "Reset Onboarding" auf den Helper umstellen**

In `app/(tabs)/_layout.tsx` den Import ergänzen (bei den anderen `@/utils/`-Imports):

```typescript
import { resetOnboardingProfile } from '@/utils/reset-onboarding';
```

Den `onPress` des Reset-Onboarding-Buttons (Zeilen 186-211) ersetzen durch:

```typescript
                onPress={async () => {
                  if (!session) return;
                  await resetOnboardingProfile(session.user.id);
                  resetOnboardingStore();
                  await refreshProfile();
                }}
```

(Der Button "🔁 Reset All", Zeilen 232-246, bleibt unverändert — er setzt nur `has_onboarded` zurück, nicht die Profilfelder.)

- [ ] **Step 3: Dev-Button "Seed History" auf neue RPC-Signatur umstellen**

In `app/(tabs)/_layout.tsx` (Zeilen 293-309) den RPC-Aufruf ändern von:

```typescript
                  const { error } = await supabase.rpc('fn_dev_seed_category_history', {
                    p_user_id: session.user.id,
                    p_days: 10,
                  });
```

zu:

```typescript
                  const { error } = await supabase.rpc('fn_dev_seed_category_history', {
                    p_days: 10,
                  });
```

Hinweis in den Task-Notizen: Der Dev-Button erfordert jetzt auch lokal einen Account mit Rolle `affiliate`/`admin` (Rollencheck sitzt in der Funktion).

- [ ] **Step 4: Type-Check**

Run: `npx tsc --noEmit 2>&1 | grep -E "_layout.tsx|reset-onboarding"`
Expected: keine Treffer (der in Task 1 erwartete `_layout.tsx`-Fehler ist damit behoben).

- [ ] **Step 5: Commit (nur nach Freigabe)**

```bash
git add utils/reset-onboarding.ts "app/(tabs)/_layout.tsx"
git commit -m "refactor: extract reset-onboarding helper, adapt seed-history call to hardened RPC"
```

---

### Task 4: `CreatorToolsSection`-Komponente + i18n

**Files:**
- Create: `components/creator-tools-section.tsx`
- Modify: `i18n/locales/de.ts` (nach `'ui.no_assessments_all_done_body'`), `i18n/locales/en.ts` (gleiche Stelle)

**Interfaces:**
- Consumes: `canUseCreatorTools` (Task 2), `resetOnboardingProfile` (Task 3), `devResetPlan(userId): Promise<{ sessionsCreated: number }>` aus `@/utils/dev-reset-plan`, RPCs aus Task 1, `useCurrentUser()` → `{ profile, refreshProfile }`, `useOnboardingStore(s => s.reset)`.
- Produces: `<CreatorToolsSection />` — rendert `null` für nicht berechtigte Rollen; wird in Task 5 in `profile.tsx` eingebunden.

- [ ] **Step 1: i18n-Keys ergänzen**

In `i18n/locales/de.ts` direkt nach `'ui.no_assessments_all_done_body'` einfügen:

```typescript
    'ui.creator_tools': 'Creator-Tools',
    'ui.creator_refill_assessments': 'Tests auffüllen',
    'ui.creator_refill_done': 'Tests wurden aufgefüllt',
    'ui.creator_reset_onboarding': 'Onboarding zurücksetzen',
    'ui.creator_reset_onboarding_done': 'Onboarding zurückgesetzt',
    'ui.creator_reset_plan': 'Plan zurücksetzen',
    'ui.creator_reset_plan_done': '{{count}} Sessions neu geplant',
    'ui.creator_seed_history': 'Verlauf generieren',
    'ui.creator_seed_history_done': 'Verlauf für 10 Tage generiert',
    'ui.creator_confirm_title': 'Bist du sicher?',
    'ui.creator_confirm_reset_onboarding': 'Dein Profil wird zurückgesetzt und du durchläufst das Onboarding erneut.',
    'ui.creator_confirm_reset_plan': 'Alle Sessions deines aktiven Plans werden gelöscht und ab heute neu geplant.',
```

In `i18n/locales/en.ts` an der gleichen Stelle:

```typescript
    'ui.creator_tools': 'Creator Tools',
    'ui.creator_refill_assessments': 'Refill assessments',
    'ui.creator_refill_done': 'Assessments refilled',
    'ui.creator_reset_onboarding': 'Reset onboarding',
    'ui.creator_reset_onboarding_done': 'Onboarding reset',
    'ui.creator_reset_plan': 'Reset plan',
    'ui.creator_reset_plan_done': '{{count}} sessions rescheduled',
    'ui.creator_seed_history': 'Seed history',
    'ui.creator_seed_history_done': 'Seeded 10 days of history',
    'ui.creator_confirm_title': 'Are you sure?',
    'ui.creator_confirm_reset_onboarding': 'Your profile will be reset and you will go through onboarding again.',
    'ui.creator_confirm_reset_plan': 'All sessions of your active plan will be deleted and rescheduled starting today.',
```

(`'ui.cancel'` existiert bereits in beiden Dateien und wird wiederverwendet.)

- [ ] **Step 2: Komponente schreiben**

Datei `components/creator-tools-section.tsx`:

```tsx
import { JempText } from '@/components/jemp-text';
import { SettingsRow } from '@/components/profile/SettingRow';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { canUseCreatorTools } from '@/utils/creator-tools';
import { devResetPlan } from '@/utils/dev-reset-plan';
import { resetOnboardingProfile } from '@/utils/reset-onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

type CreatorAction = 'refill' | 'resetOnboarding' | 'resetPlan' | 'seedHistory';

export function CreatorToolsSection() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const resetOnboardingStore = useOnboardingStore(s => s.reset);
    const queryClient = useQueryClient();

    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState<CreatorAction | null>(null);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    if (!profile || !canUseCreatorTools(profile.role)) return null;

    async function run(action: CreatorAction, fn: () => Promise<string>) {
        setBusy(action);
        setStatus(null);
        try {
            const text = await fn();
            setStatus({ ok: true, text });
        } catch (e: any) {
            setStatus({ ok: false, text: e?.message ?? 'Error' });
        } finally {
            setBusy(null);
        }
    }

    const refillAssessments = () => run('refill', async () => {
        const { error } = await supabase.rpc('fn_refill_user_assessments');
        if (error) throw new Error(error.message);
        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        return t('ui.creator_refill_done');
    });

    const resetOnboarding = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_reset_onboarding'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_reset_onboarding'),
                style: 'destructive',
                onPress: () => run('resetOnboarding', async () => {
                    await resetOnboardingProfile(profile.id);
                    resetOnboardingStore();
                    await refreshProfile();
                    return t('ui.creator_reset_onboarding_done');
                }),
            },
        ],
    );

    const resetPlan = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_reset_plan'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_reset_plan'),
                style: 'destructive',
                onPress: () => run('resetPlan', async () => {
                    const { sessionsCreated } = await devResetPlan(profile.id);
                    await queryClient.invalidateQueries({ queryKey: ['plan'] });
                    await queryClient.invalidateQueries({ queryKey: ['session-detail'] });
                    await queryClient.invalidateQueries({ queryKey: ['plan-exercise-progress'] });
                    return t('ui.creator_reset_plan_done', { count: sessionsCreated });
                }),
            },
        ],
    );

    const seedHistory = () => run('seedHistory', async () => {
        const { error } = await supabase.rpc('fn_dev_seed_category_history', { p_days: 10 });
        if (error) throw new Error(error.message);
        await queryClient.invalidateQueries({ queryKey: ['category-history'] });
        return t('ui.creator_seed_history_done');
    });

    return (
        <View style={styles.section}>
            <SettingsRow
                icon={<Ionicons name="videocam-outline" size={20} color="#fff" />}
                label={t('ui.creator_tools')}
                onPress={() => setExpanded(e => !e)}
                rightElement={<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSubtle} />}
            />
            {expanded && (
                <>
                    <SettingsRow
                        icon={<Ionicons name="clipboard-outline" size={20} color="#fff" />}
                        label={t('ui.creator_refill_assessments')}
                        onPress={refillAssessments}
                        loading={busy === 'refill'}
                    />
                    <SettingsRow
                        icon={<Ionicons name="refresh-outline" size={20} color="#fff" />}
                        label={t('ui.creator_reset_onboarding')}
                        onPress={resetOnboarding}
                        loading={busy === 'resetOnboarding'}
                    />
                    <SettingsRow
                        icon={<Ionicons name="repeat-outline" size={20} color="#fff" />}
                        label={t('ui.creator_reset_plan')}
                        onPress={resetPlan}
                        loading={busy === 'resetPlan'}
                    />
                    <SettingsRow
                        icon={<Ionicons name="trending-up-outline" size={20} color="#fff" />}
                        label={t('ui.creator_seed_history')}
                        onPress={seedHistory}
                        loading={busy === 'seedHistory'}
                    />
                    {status && (
                        <JempText type="caption" color={status.ok ? '#22c55e' : '#ef4444'} style={styles.status}>
                            {status.text}
                        </JempText>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { gap: 10 },
    status: { textAlign: 'center', paddingTop: 2 },
});
```

Bewusste Entscheidungen (nicht ändern): kein `SectionLabel` über der Sektion (unauffällig, wenn zugeklappt); `expanded` nicht persistiert (beim nächsten Tab-Besuch wieder zu); Bestätigungs-Alerts nur bei den destruktiven Aktionen; Rollencheck zusätzlich server-seitig in den RPCs (Task 1) — das UI-Gate ist nur Komfort.

- [ ] **Step 3: Type-Check**

Run: `npx tsc --noEmit 2>&1 | grep -E "creator-tools-section|locales"`
Expected: keine Treffer.

- [ ] **Step 4: Commit (nur nach Freigabe)**

```bash
git add components/creator-tools-section.tsx i18n/locales/de.ts i18n/locales/en.ts
git commit -m "feat: add collapsible creator-tools section for affiliate/admin roles"
```

---

### Task 5: Integration in den Profil-Tab + Gesamtverifikation

**Files:**
- Modify: `app/(tabs)/profile.tsx` (Import + Render zwischen Account- und DEV-Sektion)

**Interfaces:**
- Consumes: `<CreatorToolsSection />` aus Task 4.
- Produces: fertiges Feature.

- [ ] **Step 1: Einbinden**

In `app/(tabs)/profile.tsx` Import ergänzen (bei den anderen `@/components/`-Imports):

```typescript
import { CreatorToolsSection } from '@/components/creator-tools-section';
```

Render zwischen der Account-Sektion (endet Zeile ~195 mit `</View>`) und dem `{__DEV__ && (`-Block einfügen:

```tsx
                {/* ── Creator tools (affiliate/admin only) ── */}
                <CreatorToolsSection />
```

- [ ] **Step 2: Type-Check gesamt**

Run: `npx tsc --noEmit 2>&1 | grep -E "profile.tsx|creator-tools|_layout.tsx|reset-onboarding|locales"`
Expected: keine Treffer.

- [ ] **Step 3: Jest gesamt**

Run: `npx jest`
Expected: alle Tests grün (inkl. `utils/__tests__/creator-tools.test.ts` aus Task 2).

- [ ] **Step 4: Manuelle Verifikation (durch den User)**

1. Lokalen Account per Web-Admin-Dropdown auf `admin` oder `affiliate` stellen → Profil-Tab zeigt zugeklappte Zeile „Creator-Tools"; als `user`/`tester` ist sie unsichtbar.
2. „Tests auffüllen" → Assessments-Tab zeigt sofort neue pending Tests, auch wenn kürzlich welche abgeschlossen wurden.
3. „Plan zurücksetzen" (mit Bestätigung) → Plan-Tab zeigt frische Sessions ab heute.
4. „Onboarding zurücksetzen" (mit Bestätigung) → App führt durchs Onboarding.
5. „Verlauf generieren" → Progress-Tab zeigt 10 Tage Kurvenverlauf.
6. Mit Rolle `user` per SQL direkt `SELECT fn_refill_user_assessments();` als dieser User (z.B. via Supabase Studio Impersonation) → Fehlermeldung `creator tools require affiliate or admin role`.

- [ ] **Step 5: Commit (nur nach Freigabe)**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: show creator-tools section in profile tab"
```
