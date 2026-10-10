# Session Composition Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ersetze die feste Block-Pflichtsequenz durch ein Kompositionsmodell: eine Primary-Hauptübung pro Session (Kraft-Rotation), 3–6 Content-Blöcke je nach Dauer, Fokus-Punkte als Wochen-Block-Budget, Plyo regionsabhängig, Core als Standard-Block mit movement_type-Taxonomie.

**Architecture:** Deterministische Wochenplanung im Temporal-Worker (`week-layout.ts`) plant künftig die Woche als Ganzes statt Session für Session. Neue Übungs-Metadaten (`movement_type`, `is_explosive`) in Supabase steuern Pool-Matching. Die LLM-Session-Generierung (`run-session-v2`) füllt die vorgegebenen Blöcke; die Hierarchie steuert `emphasis`.

**Tech Stack:** Supabase (Migrationen via `supabase migration up`), Temporal-Worker (TypeScript, **npm**, vitest@2), v2-Generator-Pfad hinter `shouldUseV2`. Debug via `supabase/test-scripts/debug-plan-generation-v2.ts` (gitignored).

**Spec:** `docs/superpowers/specs/2026-10-09-session-composition-rework-design.md`

## Global Constraints

- Jede neue Migration trägt den Rollout-Gate-Header: `-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.` + `SET LOCAL lock_timeout = '5s';`.
- **Niemals** `supabase db reset` (prod-synchronisierter Katalog) und **niemals** auf Prod pushen. Migrationen nur lokal via `supabase migration up`.
- Worker nutzt **npm**, nicht pnpm; Tests via `npx vitest run` im Worker-Verzeichnis; vitest@2 bleibt gepinnt.
- TDD für jede Verhaltensänderung (RED→GREEN), Worker-Suite muss nach jedem Task grün sein.
- Types regen nur mit installierter CLI: `supabase gen types typescript --local` (nicht npx — zieht 2.120.0).
- `web/lib/score-calculators` byte-identisch halten (hier nicht betroffen, aber Regel beachten falls lib berührt).
- v2-Gate unverändert: nur `user_pillar_levels.set_by_wizard = true` aktiviert v2.

## Review Focus

Fünf Input-Klassen, die die Task-Tests leicht übersehen, mit erwartetem Verhalten:

1. **Upper-Plyo = 3 bei nur 2 Trainingstagen** — Platzierung kann Push-Primary nicht ausweichen → Deckel greift (Plyo 3×3, Push-Primary `normal`), die Upper-Plyo-Säule geht NICHT verloren. (Test in Task 7.)
2. **Alle Fokus-Säulen auf Level 3, wenige Tage** — freies Budget zu klein → proportionaler Clamp kürzt niedrigste zuerst, Schwerpunkt überlebt, keine Session überläuft ihre Blockzahl. (Test in Task 6.)
3. **30-min-Session** — genau 3 Content-Blöcke, Primary bleibt immer drin, nie nur Warmup+Cooldown. (Test in Task 5.)
4. **Sportart mit Plyo-Fokus 0** (nicht relevant) — kein Plyo-Block, aber Kraft-Grundgerüst (Squat/Hinge/Push/Pull über die Woche) vollständig. (Test in Task 5/6.)
5. **Pool ohne frontal/transverse-Übung für eine Säule** — weiche Ebenen-Abdeckung degradiert graceful (kein leerer Block, keine Endlosschleife), Note im Protokoll. (Test in Task 9.)

---

## File Structure

**Migrationen (neu):**
- `supabase/migrations/2026100910XXXX_add_movement_type_is_explosive.sql` — Spalten + Enum
- `supabase/migrations/...reinstate_core_block_plyo_variants.sql` — block_types core zurück, Plyo-Varianten
- `supabase/migrations/...backfill_movement_type_explosive.sql` — Label-Backfill + rotation aus strength_pattern

**Worker (geändert):**
- `externals/jemp-temporal-worker/src/plan-generation/week-layout-constants.ts` — Kompositions-Konstanten
- `.../week-layout.ts` — `planWorkoutBlocks` (Wochen-Komposition), `applyScalingLevers` (Sanity-Clamp)
- `.../v2/composition.ts` (neu) — pure Verteilungs-Logik (Primary-Rotation, Fokus-Budget, Plyo-Platzierung)
- `.../v2/pool.ts` — Matcher für plyo-Variante + core
- `.../v2/prepare-v2.ts` — `movement_type`/`is_explosive` in V2Exercise laden
- `.../v2/v2-prompts.ts` — emphasis-Hierarchie + Plyo-Deckel-Anweisung
- Tests in `.../__tests__/` je Modul

**App (geändert):**
- `constants/blocks.ts`, `i18n/locales/de.ts` + `en.ts` — Block-Labels (core, plyo lower/upper)
- `types/database.ts` — regen nach Migrationen

---

## Phase A — Datenmodell & Labels (verhaltensneutral bis der Generator sie nutzt)

### Task 1: Spalten `movement_type` + `is_explosive`

**Files:**
- Create: `supabase/migrations/2026100910XXXX_add_movement_type_is_explosive.sql`
- Test: manuelle Verifikation per psql (keine Code-Tests — reine DDL)

**Interfaces:**
- Produces: `exercises.movement_type` (enum `movement_type`: `sagittal|frontal|transverse`, NOT NULL default `sagittal`), `exercises.is_explosive` (boolean NOT NULL default false).

- [ ] **Step 1: Migration schreiben** — Enum-Typ `movement_type` anlegen (`CREATE TYPE movement_type AS ENUM ('sagittal','frontal','transverse')`), Spalte `movement_type movement_type NOT NULL DEFAULT 'sagittal'`, Spalte `is_explosive boolean NOT NULL DEFAULT false`. Rollout-Gate-Header + `SET LOCAL lock_timeout`.
- [ ] **Step 2: Anwenden** — `supabase migration up`. Expected: „Local database is up to date" nach Lauf, Version in `schema_migrations`.
- [ ] **Step 3: Verifizieren** — `psql \d exercises` zeigt beide Spalten mit korrekten Defaults.
- [ ] **Step 4: Commit** — `git add` migration; `git commit -m "feat: add movement_type and is_explosive to exercises"`.

### Task 2: Core-Block reinstate + Plyo-Varianten

**Files:**
- Create: `supabase/migrations/...reinstate_core_block_plyo_variants.sql`

**Interfaces:**
- Consumes: block_types-Tabelle (bestehend, enthält bereits `core`, `plyo`, `rotation`).
- Produces: `core` block_type aktiv/vorhanden; Plyo-Block nutzt künftig Varianten `lower`/`upper` (keine Schema-Änderung nötig — Variante lebt im geplanten Block, nicht in block_types). `rotation` block_type bleibt für Legacy-Pläne, wird vom Generator nicht mehr erzeugt.

- [ ] **Step 1: Prüfen** — `select slug from block_types;` — `core` ist vermutlich schon da (nur aus der Sequenz entfernt). Falls vorhanden: Migration ist ein No-op-Guard (`WHERE NOT EXISTS`), sonst INSERT.
- [ ] **Step 2: Migration schreiben** — idempotenter INSERT für `core` falls fehlend; Kommentar, dass `rotation` nur noch Legacy ist. Rollout-Gate-Header.
- [ ] **Step 3: Anwenden + verifizieren** — `supabase migration up`; `select slug from block_types` enthält `core`.
- [ ] **Step 4: Commit**.

### Task 3: Label-Backfill (movement_type, is_explosive, rotation-Abbau)

**Files:**
- Create: `supabase/migrations/...backfill_movement_type_explosive.sql`

**Interfaces:**
- Consumes: `exercises` mit den neuen Spalten (Task 1), bestehende `strength_pattern`, `plyo_type`, `category`.
- Produces: `movement_type`/`is_explosive` gesetzt; `strength_pattern = 'rotation'` entfernt (auf NULL); rotatorische Würfe in `upper_body_plyometrics`.

- [ ] **Step 1: Explosiv-Backfill** — `UPDATE exercises SET is_explosive = true WHERE plyo_type IS NOT NULL OR category ∈ (jumps, lower_body_plyometrics, upper_body_plyometrics) OR sprint_type IS NOT NULL;` (alle Plyos/Sprünge/Würfe/Sprints sind ballistisch).
- [ ] **Step 2: movement_type transverse** — `UPDATE ... SET movement_type='transverse' WHERE strength_pattern='rotation' OR slug IN (<rotatorische Würfe + Core-Rotationen: landmine_punch_throw, landmine_switch_punch, rotational_med_ball_slam, rotational_med_ball_throw, explosive_rotational_cable_press, pallof_press, russian_twist, ...>);`
- [ ] **Step 3: movement_type frontal** — `UPDATE ... SET movement_type='frontal' WHERE slug IN (<laterale: lateral_lunge, lateral_bounds, skater_jump, side_plank, copenhagen_plank, cossack_squat, lateral_band_walk, ...>);` (Rest bleibt Default `sagittal`).
- [ ] **Step 4: rotation aus strength_pattern** — `UPDATE exercises SET strength_pattern=NULL WHERE strength_pattern='rotation';` (die 7 sind jetzt über movement_type=transverse + Säule klassifiziert).
- [ ] **Step 5: Säulen-Korrektur** — rotatorische Würfe sind bereits `upper_body_plyometrics` (verifiziert); nur prüfen, kein Move nötig. Die 5 heimatlosen Würfe (`clap_push_up` etc.) bleiben `upper_body_plyometrics` — Anbindung passiert über den neuen Matcher (Task 8), nicht hier.
- [ ] **Step 6: core_type bleibt deprecated, nicht gedroppt** — `core_type` wird vom neuen Matcher (Task 8) nicht mehr gelesen, aber die Spalte bleibt bestehen, damit Legacy-Pläne in der App nicht brechen (§2.6). Kein DROP in dieser Migration; Kommentar in der Migration, dass `core_type` deprecated ist.
- [ ] **Step 7: Anwenden + verifizieren** — `supabase migration up`; Stichproben per psql: `landmine_punch_throw` → transverse/explosiv/strength_pattern NULL; `box_jump` → sagittal/explosiv; `back_squat` → sagittal/nicht-explosiv; `side_plank` → frontal.
- [ ] **Step 8: Commit**.

### Task 4: Types regen

- [ ] **Step 1:** `supabase gen types typescript --local > types/database.types.ts` (installierte CLI). Expected: `movement_type` enum + Spalten erscheinen; Zeilenzahl-Diff plausibel (keine −2000-Reshape).
- [ ] **Step 2: Worker-Typen** — falls der Worker eigene DB-Typen spiegelt, `V2Exercise` in Task 8 erweitern (nicht hier).
- [ ] **Step 3: Commit**.

---

## Phase B — Generator-Umbau (Worker)

### Task 5: Kompositions-Konstanten + Session-Größe

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/week-layout-constants.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts`

**Interfaces:**
- Produces: `CONTENT_BLOCKS_BY_DURATION` (Record: ≤30→3, ≤45→4, ≤60→5, sonst 6), `PRIMARY_ROTATION` (`['lower_body','push','pull']`), Entfernung von `WORKOUT_BLOCK_SEQUENCE` als Pflichtsequenz.

- [ ] **Step 1: RED** — Test `contentBlockCount(30)===3, contentBlockCount(45)===4, contentBlockCount(60)===5, contentBlockCount(90)===6`.
- [ ] **Step 2: Run** — `npx vitest run ...week-layout.test.ts` — FAIL (Funktion fehlt).
- [ ] **Step 3: GREEN** — `contentBlockCount(min)` + Konstanten in week-layout-constants.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**.

### Task 6: Pure Kompositions-Logik (`composition.ts`)

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/composition.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/composition.test.ts`

**Interfaces:**
- Consumes: `{ trainingDays: PlacedDay[], pillarLevels: PillarLevels, hasSpeedSession: boolean }`.
- Produces: `composeWeek(input) → Map<day_of_week, PlannedWorkoutBlock[]>` — enthält pro Tag: 1 Primary (rotiert lower/push/pull, heavy), Komplement-Kraftblock, ggf. Core, Fokus-Säulen-Blöcke nach Budget; begrenzt auf `contentBlockCount(minutes)`.
- Produces: `focusBlockBudget(pillarLevels, freeSlots, hasSpeedSession) → Record<pillarSlug, number>` — linear 1/2/3, min 1 pro gesetzter Säule, proportionaler Clamp auf `freeSlots`, Plyo −1 bei Speed-Session.

- [ ] **Step 1: RED (Budget)** — Test: `focusBlockBudget({sprints:3,conditioning:2,mobility:1}, 6, false)` → `{sprints:3,conditioning:2,mobility:1}`; bei `freeSlots=3` → Clamp kürzt niedrigste zuerst, Schwerpunkt (sprints) behält am meisten, Summe ≤ 3, jede gesetzte Säule ≥ 1.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: GREEN (Budget)** — `focusBlockBudget` implementieren (Wunsch = Level, dann `normalizeToBudget`-analoge Kürzung, min-1-Garantie, Plyo −1 bei Speed).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: RED (Primary-Rotation)** — Test: `composeWeek` mit 3 Tagen → Tag1 Primary `lower_body`(heavy), Tag2 `push`, Tag3 `pull`; mit 2 Tagen → nur lower+push Primaries, Pull als Komplement.
- [ ] **Step 6: Run** — FAIL.
- [ ] **Step 7: GREEN** — Primary-Rotation + Komplement-Wahl + Core-Einplanung + Fokus-Blöcke verteilen, auf `contentBlockCount` begrenzen.
- [ ] **Step 8: Run** — PASS, plus Review-Focus-Tests 2+4 (alle Level 3 → Clamp; Plyo-Fokus 0 → kein Plyo, Kraft komplett).
- [ ] **Step 9: RED (Ebenen-Diversität, §1.7 weich)** — Test: Bei zwei gleichwertigen Fokus-Block-Kandidaten bevorzugt die Auswahl die noch nicht in der Woche vertretene `movement_type`-Ebene (frontal/transverse vor einer dritten sagittal-Übung), sofern der Pool sie hergibt. Ist keine solche Übung da, degradiert es still auf sagittal (kein leerer Block).
- [ ] **Step 10: Run** — FAIL → GREEN (Ebenen-Tiebreak in der Fokus-Block-Auswahl), dann PASS.
- [ ] **Step 11: Commit**.

### Task 7: Plyo-Platzierung (regionsabhängig)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/composition.ts`
- Test: `.../__tests__/composition.test.ts`

**Interfaces:**
- Consumes: composeWeek-Zwischenstand.
- Produces: `upper`-Plyo bevorzugt auf Nicht-Push-Primary-Tage; bei Zwang auf Push-Tag → Plyo-Volumen-Flag `capped` + Push-Primary `emphasis` von `heavy` auf `normal`. `lower`-Plyo auf Lower-Primary-Tag erlaubt (heavy bleibt).

- [ ] **Step 1: RED** — Test (Review Focus 1): 2 Tage, `upper_body_plyometrics: 3` → mindestens ein Upper-Plyo landet mit Push-Primary am selben Tag; dieser Tag: Plyo-Block vorhanden **und** Push-Block `emphasis==='normal'`. Upper-Plyo-Säule hat ≥1 Block (nicht verloren).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: GREEN** — Platzierungs-Präferenz (upper-Plyo meidet Push-Primary-Tage) + Fallback-Dämpfung.
- [ ] **Step 4: Run** — PASS; zusätzlich Test: 4 Tage, upper_plyo=2 → Upper-Plyo liegt auf Pull/Lower-Tagen, Push-Primary bleibt `heavy`.
- [ ] **Step 5: Commit**.

### Task 8: Pool-Matcher (plyo-Variante + core)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts`, `.../prepare-v2.ts`
- Test: `.../__tests__/pool.test.ts`

**Interfaces:**
- Consumes: `V2Exercise` erweitert um `movement_type`, `is_explosive` (aus prepare-v2 geladen).
- Produces: `exerciseMatchesBlock` — `plyo` matcht `category ∈ {lower_body_plyometrics, upper_body_plyometrics, jumps}` nach Variante (`lower`=lower_body_plyometrics/jumps, `upper`=upper_body_plyometrics), `sprint_type` ausgeschlossen; `core` matcht nach `movement_type` + `is_explosive` gemäß geforderter Block-Spezifikation.

- [ ] **Step 1: RED (plyo upper)** — Test: `clap_push_up` (upper_body_plyometrics) matcht `block('plyo','upper')`, nicht `block('plyo','lower')`; `box_jump` matcht `lower`, nicht `upper`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: GREEN** — plyo-Matcher auf Säule→Variante umstellen.
- [ ] **Step 4: RED (core)** — Test: `pallof_press` (transverse, nicht explosiv) matcht `block('core', {movement_type:'transverse'})`; `plank` (sagittal, nicht explosiv) matcht `block('core',{movement_type:'sagittal'})`; Box-Push-off (sagittal, explosiv) matcht `block('core',{explosive:true})`.
- [ ] **Step 5: Run** — FAIL.
- [ ] **Step 6: GREEN** — core-Matcher über movement_type + is_explosive; `V2Exercise` + prepare-v2-Query um die zwei Felder erweitern.
- [ ] **Step 7: Run** — PASS (inkl. Review Focus 5: leerer frontal/transverse-Pool → Matcher liefert leer, kein Crash).
- [ ] **Step 8: Commit**.

### Task 9: `planWorkoutBlocks` → composeWeek verdrahten, `applyScalingLevers` zu Sanity-Clamp

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/week-layout.ts`, `.../prepare-v2.ts`
- Test: `.../__tests__/week-layout.test.ts`

**Interfaces:**
- Consumes: `composeWeek` (Task 6/7).
- Produces: `buildWeekLayout` ruft `composeWeek` statt der Pflichtsequenz; `applyScalingLevers` nur noch Minuten-Sanity-Clamp (droppt niedrigste-Priorität bei Überlauf), Kompakt-Modus bleibt.

- [ ] **Step 1: RED** — Test: `buildWeekLayout` mit 4 Tagen liefert Sessions mit ≤ `contentBlockCount`-Blöcken, genau 1 Primary `heavy` je Session, kein `core`-via-alte-Sequenz-Zwang.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: GREEN** — `planWorkoutBlocks` durch `composeWeek`-Aufruf ersetzen; `applyScalingLevers` entschlacken.
- [ ] **Step 4: Run** — PASS; **volle Worker-Suite** `npx vitest run` grün (Alt-Tests anpassen, die die Pflichtsequenz erwarteten).
- [ ] **Step 5: Commit**.

### Task 10: Prompt-Hierarchie + Plyo-Deckel

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/v2-prompts.ts`, `run-session-v2.ts`
- Test: `.../__tests__/run-session-v2.test.ts` (Prompt-String-Assertions)

**Interfaces:**
- Consumes: Blöcke mit `emphasis` (heavy/normal/light).
- Produces: Prompt weist Satz-/Intensitäts-Hierarchie an (heavy 4–5 Sätze / normal 3 / light 2); bei gedeckeltem Upper-Plyo-Tag Anweisung „Plyo-Push max 3×3, Push-Primary nicht >85%".

- [ ] **Step 1: RED** — Test: Prompt enthält bei `emphasis:'heavy'`-Block die Satz-Anweisung; bei gedeckeltem Tag die Deckel-Zeile.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: GREEN** — Prompt-Bausteine ergänzen.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**.

---

## Phase C — App & Verifikation

### Task 11: Block-Labels (App)

**Files:**
- Modify: `constants/blocks.ts`, `i18n/locales/de.ts`, `i18n/locales/en.ts`

**Interfaces:**
- Produces: `core` wieder in CONTENT_BLOCK_TYPES/HERO_BLOCK_ORDER; Plyo-Label bleibt „Sprungkraft", Varianten lower/upper brauchen kein eigenes Label (Variante wird nicht als Blockname gezeigt). `block_type.rotation`-Label kann entfallen oder bleibt für Legacy.

- [ ] **Step 1:** `core` in `constants/blocks.ts` sicherstellen (war für Legacy drin — prüfen).
- [ ] **Step 2:** i18n `block_type.core` prüfen/vorhanden; `block_type.rotation` als Legacy belassen.
- [ ] **Step 3: tsc** `npx tsc --noEmit -p .` auf betroffene Dateien grün.
- [ ] **Step 4: Commit**.

### Task 12: End-to-End-Verifikation per Debug-Script

**Files:**
- Nutzt: `supabase/test-scripts/debug-plan-generation-v2.ts` (gitignored, bereits vorhanden)

- [ ] **Step 1:** Worker neu bauen/starten (lokal), falls nötig.
- [ ] **Step 2:** `npx tsx supabase/test-scripts/debug-plan-generation-v2.ts supabase/test-scripts/debug-input-v2-boxing-sprints.json` — prüfen: 3–6 Blöcke/Session, genau 1 Primary heavy, Core taucht 2–3×/Woche auf, Upper-Plyo (Boxing) auf Nicht-Push-Tagen bzw. gedeckelt, kein überladenes Inventar.
- [ ] **Step 3:** Zweiter Lauf mit einem 2-Tage-/Upper-Plyo-3-Profil (Review Focus 1) + einem All-Level-3-Profil (Review Focus 2). Beobachtungen notieren.
- [ ] **Step 4:** Keine Code-Änderung — reine Verifikation; Abweichungen werden zu Folge-Fixes.

---

## Rollout

Alle Migrationen tragen das Rollout-Gate: Prod-Deploy erst nach App 3.0.0 + MIN_SUPPORTED_VERSION-Flip (bestehende Kette aus `2026-10-07`-Spec §6.3). Lokal/dev jederzeit sicher. Worker-Deploy (`deploy:prod`) nach db push, Reihenfolge wie im Haupt-Spec.
