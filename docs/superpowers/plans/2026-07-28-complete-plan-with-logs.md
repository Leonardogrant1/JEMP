# „Plan abschließen mit Logs" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sechstes Creator-Tool: RPC `fn_dev_complete_active_plan()` datiert den aktiven Plan zurück, schließt alle Sessions ab und seedet Set-Logs mit Wochen-Progression plus Level-Snapshots; die `CreatorToolsSection` bekommt die zugehörige sechste Zeile.

**Architecture:** Eine SQL-Migration (Funktion nutzt den bestehenden `fn_assert_creator_role()`-Guard, wirkt nur auf `auth.uid()`), ein Hand-Edit in `database.types.ts`, drei i18n-Keys und eine neue Aktion in der bestehenden Komponente. Kein neuer Client-Code außerhalb der Komponente.

**Tech Stack:** Supabase (plpgsql, PostgREST RPC), TypeScript/React Native, TanStack Query, react-i18next.

**Spec:** `docs/superpowers/specs/2026-07-28-complete-plan-with-logs-design.md`

## Global Constraints

- **Git:** Lokale Commits pro Task sind FREIGEGEBEN (User-Ansage von heute). NICHT pushen. Ausschließlich die in den Tasks genannten Dateien stagen — der Working Tree enthält fremde unkommittete Änderungen.
- **Deployment:** Migration nur lokal anwenden (`npx supabase migration up`); niemals auf Production deployen.
- **i18n:** Alle UI-Texte über `t('ui.…')`-Keys in `i18n/locales/de.ts` UND `en.ts`.
- **tsc:** Vorbestehende Fehler in `components/onboarding/steps/*` und `components/exercise-video-hero.tsx` ignorieren; in geänderten Dateien keine neuen Fehler.
- **Stil:** 4-Spaces-Einrückung, bestehende Patterns der `CreatorToolsSection` exakt fortführen.

---

### Task 1: Migration `fn_dev_complete_active_plan` + Typen

**Files:**
- Create: `supabase/migrations/20260728150000_add_complete_active_plan.sql`
- Modify: `database.types.ts` (Functions-Block, alphabetisch zwischen `fn_dev_seed_category_history` und `fn_refill_user_assessments`)

**Interfaces:**
- Consumes: `fn_assert_creator_role()` (existiert seit Migration `20260728130000_add_creator_tools.sql`; wirft Exception, wenn `auth.uid()` nicht Rolle affiliate/admin hat).
- Produces: RPC `fn_dev_complete_active_plan()` — keine Args, Returns void; Exceptions: `creator tools require affiliate or admin role` (Guard), `no active plan`. Client-Aufruf: `supabase.rpc('fn_dev_complete_active_plan')`.

- [ ] **Step 1: Migration schreiben**

Datei `supabase/migrations/20260728150000_add_complete_active_plan.sql` mit exakt diesem Inhalt:

```sql
-- ─────────────────────────────────────────────────────────────
-- Creator tool: complete the caller's active plan with seeded logs.
-- Backdates the plan so it ended yesterday, marks all sessions
-- completed, seeds performed sets derived from the target values
-- with a weekly progression (so first→last session shows gains),
-- and writes start/end category-level snapshots. Idempotent:
-- exercises that already have performed sets are skipped, as are
-- snapshot dates that already exist.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_dev_complete_active_plan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    uuid := auth.uid();
    v_plan_id    uuid;
    v_start_date date;
    v_end_date   date;
    v_offset     integer;
BEGIN
    PERFORM fn_assert_creator_role();

    SELECT id, start_date, end_date
    INTO v_plan_id, v_start_date, v_end_date
    FROM workout_plans
    WHERE user_id = v_user_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'no active plan';
    END IF;

    -- 1) Backdate so the plan ended yesterday
    v_offset := v_end_date - (CURRENT_DATE - 1);
    IF v_offset > 0 THEN
        UPDATE workout_plans
        SET start_date = start_date - v_offset,
            end_date   = end_date   - v_offset,
            updated_at = NOW()
        WHERE id = v_plan_id;

        UPDATE workout_sessions
        SET scheduled_at = scheduled_at - make_interval(days => v_offset),
            updated_at   = NOW()
        WHERE workout_plan_id = v_plan_id;

        v_start_date := v_start_date - v_offset;
        v_end_date   := v_end_date   - v_offset;
    END IF;

    -- 2) Complete all remaining sessions
    UPDATE workout_sessions
    SET status       = 'completed',
        started_at   = scheduled_at,
        completed_at = scheduled_at + interval '1 hour',
        updated_at   = NOW()
    WHERE workout_plan_id = v_plan_id
      AND status IN ('scheduled', 'in_progress');

    -- 3) Seed performed sets with weekly progression.
    --    Only primary/secondary/accessory blocks; exercises that
    --    already have any performed sets are skipped (idempotency).
    INSERT INTO workout_session_performed_sets (
        workout_session_id,
        workout_session_block_id,
        workout_session_block_exercise_id,
        set_number,
        side,
        performed_reps,
        performed_load_value,
        performed_duration_seconds,
        performed_rpe
    )
    SELECT
        ws.id,
        wsb.id,
        wsbe.id,
        gs.set_number,
        'bilateral',
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
                 AND wsbe.target_load_type IS DISTINCT FROM 'bodyweight'
                THEN COALESCE(
                    (wsbe.target_reps_min + wsbe.target_reps_max) / 2,
                    wsbe.target_reps_min, wsbe.target_reps_max, 8)
            WHEN wsbe.target_reps_min IS NOT NULL OR wsbe.target_reps_max IS NOT NULL
                THEN COALESCE(wsbe.target_reps_min, wsbe.target_reps_max, 8) + wk.week
            ELSE NULL
        END,
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
                 AND wsbe.target_load_type IS DISTINCT FROM 'bodyweight'
                THEN round((COALESCE(wsbe.recommended_load_value, wsbe.target_load_value)
                     * (0.92 + 0.04 * wk.week))::numeric * 2) / 2
            ELSE NULL
        END,
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NULL
                 AND wsbe.target_reps_min IS NULL AND wsbe.target_reps_max IS NULL
                 AND wsbe.target_duration_seconds IS NOT NULL
                THEN round(wsbe.target_duration_seconds * (0.90 + 0.05 * wk.week))::integer
            ELSE NULL
        END,
        6 + floor(random() * 3)::integer
    FROM workout_sessions ws
    JOIN workout_session_blocks wsb
        ON wsb.workout_session_id = ws.id
    JOIN block_types bt
        ON bt.id = wsb.block_type_id
        AND bt.slug IN ('primary', 'secondary', 'accessory')
    JOIN workout_session_block_exercises wsbe
        ON wsbe.workout_session_block_id = wsb.id
    CROSS JOIN LATERAL (
        SELECT LEAST(3, GREATEST(0, (ws.scheduled_at::date - v_start_date) / 7)) AS week
    ) wk
    CROSS JOIN LATERAL generate_series(1, COALESCE(wsbe.target_sets, 3)) AS gs(set_number)
    WHERE ws.workout_plan_id = v_plan_id
      -- exercise must have at least one usable target value
      AND (
          COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
          OR wsbe.target_reps_min IS NOT NULL
          OR wsbe.target_reps_max IS NOT NULL
          OR wsbe.target_duration_seconds IS NOT NULL
      )
      AND NOT EXISTS (
          SELECT 1 FROM workout_session_performed_sets p
          WHERE p.workout_session_block_exercise_id = wsbe.id
      );

    -- 4) Category-level snapshots at plan start (levels - 8) and plan end (current levels)
    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, ucl.category_id, GREATEST(1, ucl.level_score - 8),
           v_start_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
      AND NOT EXISTS (
          SELECT 1 FROM user_category_level_history h
          WHERE h.user_id = v_user_id
            AND h.category_id = ucl.category_id
            AND h.recorded_at::date = v_start_date
      );

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, NULL, GREATEST(1, ROUND(AVG(ucl.level_score))::integer - 8),
           v_start_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
    HAVING COUNT(*) > 0
       AND NOT EXISTS (
           SELECT 1 FROM user_category_level_history h
           WHERE h.user_id = v_user_id
             AND h.category_id IS NULL
             AND h.recorded_at::date = v_start_date
       );

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, ucl.category_id, ucl.level_score,
           v_end_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
      AND NOT EXISTS (
          SELECT 1 FROM user_category_level_history h
          WHERE h.user_id = v_user_id
            AND h.category_id = ucl.category_id
            AND h.recorded_at::date = v_end_date
      );

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, NULL, ROUND(AVG(ucl.level_score))::integer,
           v_end_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
    HAVING COUNT(*) > 0
       AND NOT EXISTS (
           SELECT 1 FROM user_category_level_history h
           WHERE h.user_id = v_user_id
             AND h.category_id IS NULL
             AND h.recorded_at::date = v_end_date
       );
END;
$$;

REVOKE ALL ON FUNCTION fn_dev_complete_active_plan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_dev_complete_active_plan() TO authenticated;
```

- [ ] **Step 2: Migration lokal anwenden**

Run: `npx supabase migration up`
Expected: wird ohne Fehler angewendet. Falls der lokale Stack nicht läuft: BLOCKED melden, nicht selbst starten/resetten.

- [ ] **Step 3: Rollencheck verifizieren**

Run: `supabase db query "SELECT fn_dev_complete_active_plan();"` (ohne JWT-Kontext ist `auth.uid()` NULL).
Expected: FEHLER `creator tools require affiliate or admin role` — der Guard greift.

- [ ] **Step 4: `database.types.ts` ergänzen**

Im Functions-Block (~Zeile 1767) alphabetisch zwischen `fn_dev_seed_category_history` und `fn_refill_user_assessments` einfügen:

```typescript
      fn_dev_complete_active_plan: { Args: never; Returns: undefined }
```

- [ ] **Step 5: Type-Check**

Run: `npx tsc --noEmit 2>&1 | grep -E "database.types"`
Expected: keine Treffer.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260728150000_add_complete_active_plan.sql database.types.ts
git commit -m "feat: add fn_dev_complete_active_plan RPC for seeded plan completion

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Sechste Zeile in `CreatorToolsSection` + i18n + Gesamtverifikation

**Files:**
- Modify: `components/creator-tools-section.tsx`
- Modify: `i18n/locales/de.ts` (nach `'ui.creator_confirm_reset_plan'`), `i18n/locales/en.ts` (gleiche Stelle)

**Interfaces:**
- Consumes: RPC `fn_dev_complete_active_plan()` aus Task 1 (`supabase.rpc('fn_dev_complete_active_plan')`, Returns void, Fehler als `error` im Response-Objekt).
- Produces: fertiges Feature.

- [ ] **Step 1: i18n-Keys ergänzen**

In `i18n/locales/de.ts` direkt nach `'ui.creator_confirm_reset_plan'` einfügen:

```typescript
    'ui.creator_complete_plan': 'Plan abschließen',
    'ui.creator_complete_plan_done': 'Plan abgeschlossen – sieh dir den Plan-Tab an',
    'ui.creator_confirm_complete_plan': 'Dein aktiver Plan wird rückdatiert und alle Sessions werden als absolviert geloggt. „Plan zurücksetzen" macht daraus wieder einen frischen Plan.',
```

In `i18n/locales/en.ts` an der gleichen Stelle:

```typescript
    'ui.creator_complete_plan': 'Complete plan',
    'ui.creator_complete_plan_done': 'Plan completed – check the plan tab',
    'ui.creator_confirm_complete_plan': 'Your active plan will be backdated and all sessions logged as completed. "Reset plan" turns it back into a fresh plan.',
```

- [ ] **Step 2: Komponente erweitern**

In `components/creator-tools-section.tsx` drei Edits:

(a) Union erweitern — aus

```typescript
type CreatorAction = 'refill' | 'resetOnboarding' | 'resetPlan' | 'seedHistory';
```

wird

```typescript
type CreatorAction = 'refill' | 'resetOnboarding' | 'resetPlan' | 'seedHistory' | 'completePlan';
```

(b) Neue Aktion direkt nach der `seedHistory`-Konstante einfügen:

```typescript
    const completePlan = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_complete_plan'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_complete_plan'),
                style: 'destructive',
                onPress: () => run('completePlan', async () => {
                    const { error } = await supabase.rpc('fn_dev_complete_active_plan');
                    if (error) throw new Error(error.message);
                    await queryClient.invalidateQueries({ queryKey: ['plan'] });
                    await queryClient.invalidateQueries({ queryKey: ['session-detail'] });
                    await queryClient.invalidateQueries({ queryKey: ['plan-exercise-progress'] });
                    await queryClient.invalidateQueries({ queryKey: ['category-history'] });
                    return t('ui.creator_complete_plan_done');
                }),
            },
        ],
    );
```

(c) Neue Zeile im JSX direkt nach der Seed-History-`SettingsRow` (vor dem `{status && (`-Block):

```tsx
                    <SettingsRow
                        icon={<Ionicons name="trophy-outline" size={20} color="#fff" />}
                        label={t('ui.creator_complete_plan')}
                        onPress={completePlan}
                        loading={busy === 'completePlan'}
                    />
```

- [ ] **Step 3: Type-Check**

Run: `npx tsc --noEmit 2>&1 | grep -E "creator-tools-section|locales"`
Expected: keine Treffer.

- [ ] **Step 4: Jest**

Run: `npx jest`
Expected: alle Suiten grün (Stand heute: 2 Suiten, 12 Tests).

- [ ] **Step 5: Commit**

```bash
git add components/creator-tools-section.tsx i18n/locales/de.ts i18n/locales/en.ts
git commit -m "feat: add complete-plan creator tool with seeded session logs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Manuelle Verifikation (durch den User)**

1. Als admin/affiliate: Creator-Tools → „Plan abschließen" → bestätigen.
2. Plan-Tab: Completed-Card mit grünen Steigerungen (erste→letzte Session) und Level-Deltas; Home: Completed-Karte.
3. „Plan zurücksetzen" → frischer Plan ab heute.
