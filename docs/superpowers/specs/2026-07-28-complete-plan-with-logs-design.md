# Creator-Tool „Plan abschließen mit Logs" — Design

**Datum:** 2026-07-28
**Status:** Genehmigt
**Baut auf:** `2026-07-28-affiliate-creator-tools-design.md` (Creator-Tools-Sektion, `fn_assert_creator_role()`)

## Ziel

Sechstes Creator-Tool: Der aktive Plan des Users wird rückdatiert und vollständig „durchtrainiert" — alle Sessions completed, realistische Set-Logs mit Wochen-Progression, Level-Snapshots. Ergebnis: Plan-Tab und Home zeigen die Completed-Card mit sichtbaren Steigerungen („Deine Steigerungen" grün, „Deine Level-Entwicklung" mit Deltas), damit Affiliates den Abschluss-Moment filmen können.

## Kontext (relevante Mechanik)

- Completed-State: `plan.end_date < heute` bei `status = 'active'` (`app/(tabs)/plan.tsx:77`).
- „Deine Steigerungen" (`queries/use-plan-exercise-progress-query.ts`): pro Übung `max(performed_*)` je Session, Vergleich erste vs. letzte Session mit Logs; nur Blöcke `primary/secondary/accessory`; Übung muss in ≥2 Sessions geloggt sein.
- „Level-Entwicklung" (`PlanCompletedCard`): liest `user_category_level_history` seit Planstart; zeigt Deltas nur bei mindestens einer Änderung, sonst Assessment-Hinweis.
- Set-Logs: `workout_session_performed_sets` (`performed_reps`, `performed_load_value`, `performed_duration_seconds`, `performed_rpe`, `side` NOT NULL — die App loggt normale Sätze als `'bilateral'` —, `set_number`, Pflicht-FKs `workout_session_id`, `workout_session_block_id`, `workout_session_block_exercise_id`). Unique-Constraint `(workout_session_block_exercise_id, set_number, side)`; Idempotenz zusätzlich über `NOT EXISTS`-Guard pro Übung.
- Zielwerte liegen pro Session-Übung vor: `target_sets`, `target_reps_min/max`, `target_load_type`, `target_load_value`, `recommended_load_value`, `target_duration_seconds`.

## Entscheidung

Bestehenden aktiven Plan rückdatieren (kein künstlicher Alt-Plan, kein Teil-Abschluss). RPC-basiert mit demselben Rollen-Guard wie die übrigen Creator-Tools.

## Design

### RPC `fn_dev_complete_active_plan()` — neue Migration

SECURITY DEFINER, `SET search_path = public`, `PERFORM fn_assert_creator_role()` als erstes. Wirkt ausschließlich auf den aktiven Plan von `auth.uid()`; Exception `no active plan`, wenn keiner existiert. Ein Aufruf, eine Transaktion (Funktionskörper), vier Schritte:

1. **Rückdatieren.** `v_offset := plan.end_date - (CURRENT_DATE - 1)` (Tage). Nur wenn `v_offset > 0`: `start_date`/`end_date` und alle `scheduled_at` der Plan-Sessions um `v_offset` Tage zurückschieben. Plan-`status` bleibt `active`.
2. **Sessions abschließen.** Alle Sessions des Plans mit Status `scheduled`/`in_progress` → `completed`, `started_at` = `scheduled_at`, `completed_at` = `scheduled_at + interval '1 hour'`, `updated_at = NOW()`.
3. **Set-Logs seeden.** Für jede Übung in Blöcken vom Typ `primary`/`secondary`/`accessory` aller Plan-Sessions, sofern für diese `workout_session_block_exercise_id` noch KEINE performed sets existieren (`NOT EXISTS`-Guard = Idempotenz): `COALESCE(target_sets, 3)` Zeilen mit `set_number` 1..n, `side = 'bilateral'`, Werte abgeleitet mit Wochen-Faktor `v_week := LEAST(3, GREATEST(0, floor((scheduled_at::date - start_date) / 7)))`:
   - **Load** (`COALESCE(recommended_load_value, target_load_value) IS NOT NULL` und `target_load_type <> 'bodyweight'`): `performed_load_value = round(basis * (0.92 + 0.04 * v_week) * 2) / 2` (0,5-kg-Schritte); `performed_reps = COALESCE((target_reps_min + target_reps_max) / 2, target_reps_min, target_reps_max, 8)`.
   - **Bodyweight/Reps** (kein Load, aber `target_reps_min` oder `target_reps_max` vorhanden): `performed_reps = COALESCE(target_reps_min, target_reps_max, 8) + v_week`.
   - **Duration** (`target_duration_seconds IS NOT NULL`): `performed_duration_seconds = round(target_duration_seconds * (0.90 + 0.05 * v_week))`.
   - Immer: `performed_rpe = 6 + floor(random() * 3)` (6–8).
   - Übungen ohne verwertbare Zielwerte (weder Load noch Reps noch Duration) werden übersprungen.
4. **Level-Snapshots.** Zuerst werden alle vorhandenen `user_category_level_history`-Zeilen des Users auf `start_date` und `end_date` gelöscht (ein täglicher Cron — `fn_take_category_level_snapshot` — schreibt dort eigene Zeilen, die den geseedeten Start-Dip und End-Wert sonst maskieren würden). Danach: pro Kategorie aus `user_category_levels` zwei neue Einträge: am `start_date` mit `GREATEST(1, level_score - 8)`, am `end_date` mit `level_score`. Zusätzlich je ein Overall-Eintrag (`category_id IS NULL`, `ROUND(AVG(...))`) für beide Daten. Idempotenz für Snapshots bedeutet: bestehende Zeilen auf den beiden Snapshot-Daten werden ersetzt.

`REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (Rollencheck sitzt in der Funktion). `database.types.ts`: Functions-Eintrag `fn_dev_complete_active_plan: { Args: never; Returns: undefined }`.

### Client: sechste Zeile in `CreatorToolsSection`

- Neue Aktion `completePlan` (`CreatorAction`-Union erweitern), Icon `trophy-outline`, mit Bestätigungs-Alert (destruktiv formatiert — verändert den echten Plan).
- Bei Erfolg: Invalidierung `['plan']`, `['session-detail']`, `['plan-exercise-progress']`, `['category-history']`.
- Drei i18n-Keys (de/en): `ui.creator_complete_plan` („Plan abschließen" / „Complete plan"), `ui.creator_complete_plan_done` („Plan abgeschlossen – sieh dir den Plan-Tab an" / „Plan completed – check the plan tab"), `ui.creator_confirm_complete_plan` (Warntext: Plan wird rückdatiert, alle Sessions als absolviert geloggt; „Plan zurücksetzen" macht daraus wieder einen frischen Plan).

### Fehlerbehandlung & Verifikation

- RPC-Fehler (keine Rolle, kein aktiver Plan) erscheinen wie bei den anderen Tools inline am Button.
- Verifikation: Migration lokal anwenden; SQL-Aufruf ohne Rolle → Exception; `npx tsc --noEmit` ohne neue Fehler; `npx jest` grün; manuell durch den User: Tool ausführen → Plan-Tab zeigt Completed-Card mit grünen Steigerungen und Level-Deltas, Home zeigt Completed-Karte; „Plan zurücksetzen" stellt den Normalzustand wieder her.

## Nicht-Ziele

- Kein Einfluss auf Streak-Optimierung (Streak ergibt sich, wie er sich ergibt).
- Keine Konfigurierbarkeit (Wochenfaktoren, RPE-Bereich sind fest).
- Kein künstlicher Zweit-Plan, keine Änderungen an `devResetPlan` oder den bestehenden fünf Tools.
