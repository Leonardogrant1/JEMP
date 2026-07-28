# Affiliate Creator-Tools — Design

**Datum:** 2026-07-28
**Status:** Genehmigt

## Ziel

Affiliates sollen einfach Content für die App produzieren können. Vier bisher `__DEV__`-exklusive Utilities werden in Production für die Rollen `affiliate` und `admin` zugänglich: Assessments füllen, Reset Onboarding, Reset Plan, Seed History. Die `__DEV__`-Toolbar selbst bleibt unverändert bestehen.

## Kontext (Ist-Zustand)

- Dev-Toolbar mit allen Utilities: `app/(tabs)/_layout.tsx:160-367`, Sichtbarkeits-Toggle in `app/(tabs)/profile.tsx` via `stores/dev-tools-store.ts`.
- `profile.role` (`user | admin | tester | affiliate`) ist client-seitig über `useCurrentUser()` verfügbar (`providers/current-user-provider.tsx`). Es gibt bisher kein rollenbasiertes UI-Gating.
- RLS erlaubt vollen CRUD auf eigene `workout_plans`/`workout_sessions`/Blocks/Exercises (`supabase/migrations/20260419081707_create_rls_policies.sql`) → Reset Plan und Reset Onboarding funktionieren client-seitig auch in Production.
- Der Dev-Button „Create Assessments" ruft die Edge Function `create-user-assessments` auf, die Assessments für **alle** User erneuert und Push-Notifications verschickt — für Affiliates ungeeignet.
- `fn_create_user_assessments` hat einen 28-Tage-Cooldown pro Assessment; ein simpler user-scoped Aufruf füllt daher nichts wieder auf.
- Sicherheits-Nebenbefund: `fn_dev_seed_category_history(p_user_id, p_days)` ist für alle authenticated User aufrufbar und akzeptiert fremde User-IDs.

## Entscheidungen (aus Klärung)

1. Assessment-Refill: neue user-scoped RPC ohne Cooldown (kein Löschen, keine Edge Function).
2. UI-Ort: aufklappbare Sektion im Profil-Tab, standardmäßig zugeklappt (damit sie in Screen-Recordings des Profils nicht auffällt). Kein Floating-Button.
3. Sichtbar für Rollen `affiliate` und `admin`.
4. Tool-Set bewusst nur die vier genannten Utilities.
5. Ansatz A: Client-Gating + eine DB-Migration; Rollenchecks sitzen in den DB-Funktionen.

## Design

### 1. UI: `components/creator-tools-section.tsx`

- Eingebunden in `app/(tabs)/profile.tsx`, gerendert nur bei `profile.role === 'affiliate' || profile.role === 'admin'`.
- Zugeklappte Zeile „Creator-Tools" mit Chevron im Stil der bestehenden Profil-Settings; Aufklappen per Tap (lokaler `useState`, nicht persistiert).
- Vier Buttons: Assessments füllen, Reset Onboarding, Reset Plan, Seed History.
- Destruktive Aktionen (Reset Onboarding, Reset Plan) mit nativem Bestätigungs-Alert.
- Pro Button Lade-Zustand und Erfolg/Fehler kurz inline (Pattern der Dev-Toolbar).
- Alle Texte über i18n (`de.ts`/`en.ts`).

### 2. Aktionen (Client)

| Aktion | Implementierung | Danach |
|---|---|---|
| Assessments füllen | RPC `fn_refill_user_assessments()` | `userAssessments`-Query invalidieren |
| Reset Onboarding | Bestehende Logik aus Dev-Button, extrahiert nach `utils/reset-onboarding.ts`; Dev-Toolbar nutzt denselben Helper | Profil refresh, Onboarding-Store reset |
| Reset Plan | Bestehendes `utils/dev-reset-plan.ts` unverändert | Plan-/Session-Queries invalidieren |
| Seed History | RPC `fn_dev_seed_category_history` (gehärtete Version, 10 Tage) | Progress-Queries invalidieren |

### 3. Backend: eine Migration `supabase/migrations/<timestamp>_add_creator_tools.sql`

- **Neu** `fn_refill_user_assessments()`:
  - SECURITY DEFINER, keine Parameter, wirkt ausschließlich auf `auth.uid()`.
  - Wirft Exception, wenn die Rolle des Aufrufers nicht `affiliate`/`admin` ist.
  - Insert-Logik wie `fn_create_user_assessments` (Sport, `sport_category_relevance`, Equipment-Check, keine Duplikate bei pending/in_progress), aber **ohne** 28-Tage-Cooldown.
  - `GRANT EXECUTE TO authenticated` — der Rollencheck sitzt in der Funktion.
- **Härtung** `fn_dev_seed_category_history`: neue Signatur ohne Fremd-`p_user_id` (wirkt nur auf `auth.uid()`), gleicher Rollencheck. Aufrufstelle im Dev-Button wird angepasst.

### 4. Fehlerbehandlung & Verifikation

- RPC-Fehler (z.B. Rolle inzwischen entzogen) erscheinen als Fehlertext inline am Button; kein Crash, kein stiller Fehlschlag.
- Verifikation: `npx tsc --noEmit` (keine neuen Fehler in geänderten Dateien), bestehende Jest-Tests, manueller Test durch den Entwickler: Sektion sichtbar als admin/affiliate, unsichtbar als user/tester; Refill erzeugt sofort neue pending Assessments trotz kürzlich abgeschlossener; Reset Plan erzeugt frische Sessions ab heute.

## Nicht-Ziele

- Keine Änderungen an der `__DEV__`-Toolbar über den geteilten Onboarding-Helper und den angepassten Seed-History-Aufruf hinaus.
- Kein Floating-Button in Production, keine weiteren Dev-Utilities für Affiliates.
- Kein Audit-Log / keine Edge Function.
