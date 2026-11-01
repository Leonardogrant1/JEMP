# Verletzungs-Constraints Plan A: Daten + deterministisches Enforcement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verletzungs-Constraints (Kontraindikations-Tags) wirken deterministisch in der Übungsauswahl des Plan-Generators und des Exercise-Swaps — gegeben die Daten (Tags an Übungen, bestätigte User-Constraints) werden blockierte Übungen aus allen Pools entfernt, `light_only`-Übungen aus Heavy-Slots ferngehalten, und ein finaler Strip-Pass garantiert, dass kein Plan mit Verstoß ausgeliefert wird.

**Architecture:** Neue Taxonomie-Tabelle `contraindication_tags` + Join `exercise_contraindications` + User-Tabelle `user_injury_constraints`. Ein pures Worker-Modul (`injury-constraints.ts`) berechnet aus Constraints × Übungs-Tags die Ausschluss-Sets; `prepare-v2.ts` filtert am Raw-Row-Chokepoint (wirkt auf ALLE Pool-Ableitungen), `patternSlugWindow` schließt `light_only` aus Heavy-Fenstern aus, `run-session-v2.ts` bekommt einen deterministischen Strip-Pass. jemp-api importiert dieselben geprüften Funktionen (bestehende Source-Level-Kopplung).

**Tech Stack:** Supabase/Postgres (Migrationen, RLS), TypeScript, vitest (Worker), esbuild (jemp-api), Next.js Server Actions (Admin `web/`), OpenAI gpt-5-mini (nur Batch-Prefill-Script, kein Laufzeit-LLM).

**Spec:** `docs/superpowers/specs/2026-11-01-injury-constraints-design.md`

## Global Constraints

- Die 15 Tag-Slugs exakt wie in Task 1 geseedet; Tags sind Daten (Tabelle), nie Code-Enum.
- Nur Constraints mit `confirmed_at IS NOT NULL AND revoked_at IS NULL` wirken. `mode ∈ {block, light_only}`.
- Kein Laufzeit-LLM im Generator; alle Enforcement-Logik deterministisch und getestet.
- Blöcke verschwinden nie durch Constraints — nur Pool-Inhalte; dünne Fenster fängt der bestehende Fallback („Anforderung entfällt").
- Scope ist der v2-Pfad. Legacy `generate-plan.ts` (v1) bleibt unverändert — v2-Gate ist seit 3.0.0 für alle Generierungen aktiv; v1-Löschung ist separater Fast-Follow (memory `project_release_3_0_0`).
- Deploy-Reihenfolge: `npm run db:push:prod` (Migration) → Übungs-Tagging-Content (Task 9 + Review + `exercises:push`) → Worker `deploy:prod` UND jemp-api-Deploy gemeinsam (Source-Level-Kopplung, `jemp-api/src/index.ts:2-3`).
- Keine Pushes auf Prod im Rahmen dieses Plans — nur lokal bauen/testen (memory `feedback_deployment`); Deploys macht der User.
- Plan B (Extraktion, Onboarding-Confirm, Rest-Gate, Profil, laufender Plan) ist NICHT Teil dieses Plans.

## Review Focus

1. Heavy-Fenster-Fallback zieht `light_only` zurück in den Heavy-Slot (der `<3 strong`-Fallback in `patternSlugWindow` nutzt den vollen Pool) → Test in Task 5.
2. Mehrere Constraints leeren ein Pattern-Fenster komplett (z. B. Knie+Sprunggelenk) → kein Crash, bestehender „Anforderung entfällt"-Fallback greift → Test in Task 5.
3. Revoked/unbestätigte Constraints filtern fälschlich mit → Test in Task 4.
4. LLM nennt trotz Enum-Constrained-Decoding einen verbotenen Slug (Truncation-/Korrektur-Pfad) und übersteht die 3 Retries → Strip-Pass-Test in Task 6.
5. Blockierte Übung erscheint im Swap als „locked"-Kandidat statt zu verschwinden → Test in Task 3 (`applyInjuryExclusions` entfernt vor jeder Locked-Berechnung), Verdrahtungs-Check in Task 7.

---

### Task 1: Migration + Seed + Types

**Files:**
- Create: `supabase/migrations/20261101120000_injury_constraints.sql`
- Modify: `database.types.ts` (regeneriert)

**Interfaces:**
- Produces: Tabellen `contraindication_tags(id uuid, slug text unique)`, `exercise_contraindications(exercise_id, contraindication_tag_id)`, `user_injury_constraints(...)`; Spalten `user_profiles.injury_extraction_status`, `user_profiles.injury_confirmed_at`.

- [ ] **Step 1: Migration schreiben** — `supabase/migrations/20261101120000_injury_constraints.sql`:

```sql
CREATE TABLE contraindication_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Seed (ON CONFLICT (slug) DO NOTHING), exakt diese 15 Slugs:
-- deep_knee_flexion_loaded, jumping_landing, sprinting_max_velocity,
-- hamstring_high_speed_load, overhead_pressing, shoulder_end_range,
-- wrist_extension_loaded, spinal_flexion_loaded, spinal_compression_heavy,
-- hip_flexion_loaded_deep, adductor_loaded_stretch, ankle_lateral_stress,
-- ankle_plantar_load_explosive, elbow_extension_loaded, spinal_rotation_loaded

CREATE TABLE exercise_contraindications (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  contraindication_tag_id UUID NOT NULL REFERENCES contraindication_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, contraindication_tag_id)
);

CREATE TABLE user_injury_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  contraindication_tag_id UUID NOT NULL REFERENCES contraindication_tags(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('block','light_only')),
  acute BOOLEAN NOT NULL DEFAULT false,
  source_note TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('onboarding','recheck','manual')),
  confirmed_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_injury_constraints_active_uniq
  ON user_injury_constraints (user_id, contraindication_tag_id) WHERE revoked_at IS NULL;

ALTER TABLE user_profiles
  ADD COLUMN injury_extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (injury_extraction_status IN ('pending','confirmed','failed')),
  ADD COLUMN injury_confirmed_at TIMESTAMPTZ;
```

RLS nach Bestandsmuster: `contraindication_tags` + `exercise_contraindications` → `ENABLE ROW LEVEL SECURITY` + eine Read-all-Policy `FOR SELECT TO authenticated USING (true)` (wie `exercise_environments` in `20260426100000`). `user_injury_constraints` → per-Verb-Policies `auth.uid() = user_id` für SELECT/INSERT (WITH CHECK)/UPDATE (USING+WITH CHECK)/DELETE + service_role-Bypass (wie `user_environments`).

- [ ] **Step 2: Migration anwenden und Seed prüfen**

Run: `npx supabase migration up` (lokale Instanz läuft), dann
`docker exec supabase_db_jemp psql -U postgres -d postgres -t -c "SELECT count(*) FROM contraindication_tags"`
Expected: `15`

- [ ] **Step 3: Types regenerieren + Typecheck**

Run: `npx supabase gen types typescript --local > database.types.ts && npx tsc --noEmit`
Expected: tsc exit 0 (App-Root)

- [ ] **Step 4: Commit** — `feat(db): contraindication tags + user injury constraints`

---

### Task 2: Sync-Scripts (LINK_DEFS)

**Files:**
- Modify: `scripts/pull-exercises-from-prod.mjs:25-28`, `scripts/push-exercises.mjs:24-27` (+ `neededLookups` `:100-104`), `scripts/seed-exercises-staging.mjs:95-97`

**Interfaces:**
- Consumes: Tabellen aus Task 1.
- Produces: `exercise_contraindications` wird von pull/push/seed wie die anderen Relationen synchronisiert.

- [ ] **Step 1: Tupel ergänzen** — 5-Tupel-Form in pull + seed-staging: `['exercise_contraindications', 'contraindication_tags', 'contraindication_tag_id', 'exercise:exercises(slug),contraindication_tag:contraindication_tags(slug)', (r) => r.contraindication_tag.slug]`; 3-Tupel-Form in push: `['exercise_contraindications', 'contraindication_tags', 'contraindication_tag_id']`; in push zusätzlich `contraindication_tags` in `neededLookups` aufnehmen.

- [ ] **Step 2: Syntax-Check**

Run: `node --check scripts/pull-exercises-from-prod.mjs && node --check scripts/push-exercises.mjs && node --check scripts/seed-exercises-staging.mjs`
Expected: kein Output, Exit 0

- [ ] **Step 3: Commit** — `feat(scripts): sync exercise_contraindications via LINK_DEFS`

---

### Task 3: Worker-Modul `injury-constraints.ts` (pure, getestet)

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/injury-constraints.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/injury-constraints.test.ts`

**Interfaces:**
- Produces (von Task 4–7 konsumiert):

```ts
export type InjuryConstraintInput = {
  tag_slug: string
  mode: 'block' | 'light_only'
  acute: boolean
}
export type InjuryExclusions = {
  blockedIds: Set<string>      // exercise ids, Modus block
  lightOnlyIds: Set<string>    // exercise ids, Modus light_only (block gewinnt bei Konflikt)
  acute: boolean               // mind. ein aktiver acute-Constraint
}
export function buildInjuryExclusions(
  constraints: InjuryConstraintInput[],
  tagsByExercise: Map<string, Set<string>>,   // exercise_id -> tag_slugs
): InjuryExclusions

// Für Pools, die bereits als Exercise-Arrays vorliegen (Swap, Task 7):
export function applyInjuryExclusions<T extends { id: string }>(
  pool: T[], exclusions: InjuryExclusions,
): T[]   // entfernt blockedIds; lightOnly bleibt (Heavy-Ausschluss macht der Aufrufer)
```

- [ ] **Step 1: Failing Tests schreiben** — `injury-constraints.test.ts`, Fixtures-Stil wie `exercise-filter.test.ts`:
  - `test('block entfernt Übungen mit dem Tag, andere bleiben')`
  - `test('light_only landet in lightOnlyIds, nicht in blockedIds')`
  - `test('block gewinnt, wenn dieselbe Übung block- und light_only-Tags trägt')`
  - `test('Übung ohne Tags ist nie betroffen')`
  - `test('acute ist true, sobald ein Constraint acute ist')`
  - `test('applyInjuryExclusions entfernt blockierte vor jeder weiteren Verarbeitung')` (Review Focus 5)
- [ ] **Step 2: Fail verifizieren** — Run: `cd externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/injury-constraints.test.ts` — Expected: FAIL (Modul existiert nicht)
- [ ] **Step 3: Modul implementieren** (pure, keine IO)
- [ ] **Step 4: Pass verifizieren** — gleicher Befehl, Expected: PASS
- [ ] **Step 5: Commit** — `feat(worker): injury-constraints exclusion module`

---

### Task 4: Worker-Datenladung + Threading

**Files:**
- Modify: `externals/jemp-temporal-worker/src/activities/prepare-plan-generation.ts` (Fan-out `:25-45`, Input-Bau `:130-141`)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` (Typ `:77-83`, Exercise-Query `:113-122`)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/injury-constraints.test.ts` (erweitern)

**Interfaces:**
- Produces: `PlanGenerationInputV2` erhält
  `injury_constraints?: InjuryConstraintInput[]` und
  `injury_extraction_status?: 'pending' | 'confirmed' | 'failed'`.
  In `prepareGenerationV2` wird zusätzlich `exercise_contraindications` geladen (`select('exercise_id, contraindication_tags(slug)')`) und zu `tagsByExercise: Map<string, Set<string>>` gemappt.

- [ ] **Step 1: Failing Test** — Mapping-Funktion `activeInjuryConstraints(rows)` (exportiert aus `injury-constraints.ts`): nimmt DB-Rows `{ mode, acute, revoked_at, confirmed_at, contraindication_tags: { slug } }` und liefert `InjuryConstraintInput[]`:
  - `test('revoked_at gesetzt → Constraint wirkt nicht')` (Review Focus 3)
  - `test('confirmed_at null → wirkt nicht')`
  - `test('aktive Rows werden auf tag_slug/mode/acute gemappt')`
- [ ] **Step 2: Fail verifizieren** — vitest, Expected: FAIL
- [ ] **Step 3: Implementieren** — `activeInjuryConstraints` in `injury-constraints.ts`; in `prepare-plan-generation.ts` Fetch `user_injury_constraints` (`select('mode, acute, revoked_at, confirmed_at, contraindication_tags(slug)')` per `user_id`) + `injury_extraction_status` aus dem bereits geladenen Profil; beide Felder in den `prepareGenerationV2({...})`-Call. In `prepare-v2.ts` den `exercise_contraindications`-Fetch in die bestehende `Promise.all`-Query-Gruppe aufnehmen.
- [ ] **Step 4: Pass + Typecheck** — `npx vitest run && npx tsc --noEmit -p tsconfig.json` (Worker) — Expected: PASS, Exit 0
- [ ] **Step 5: Commit** — `feat(worker): load user injury constraints + exercise tags`

---

### Task 5: Worker Pool-Enforcement (block + light_only)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` (Chokepoint `:200`, `byEnvCache` `:210`, `speedExercises` `:221`, `slugsForEnv` `:266`, `toV2` `:183-198`)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts` (`V2Exercise` `:9-44`, `patternSlugWindow` `:180-229`)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pool.test.ts` (erweitern) + `injury-enforcement.test.ts` (neu)

**Interfaces:**
- Consumes: `buildInjuryExclusions` (Task 3), `tagsByExercise` + Input-Felder (Task 4).
- Produces: `V2Exercise.light_only?: boolean`; alle Pool-Ableitungen basieren auf einer einmal vorgefilterten Row-Liste.

- [ ] **Step 1: Failing Tests**
  - `pool.test.ts`: `test('patternSlugWindow heavy: light_only-Übung erscheint nie im Heavy-Fenster — auch nicht im <3-strong-Fallback')` (Review Focus 1: Fixture mit 2 starken + 1 light_only; Fenster darf die light_only nicht enthalten) und `test('patternSlugWindow normal: light_only bleibt wählbar')`.
  - `injury-enforcement.test.ts`: `test('blockierte Übung fehlt in Basis-Pool, Env-Pool und Speed-Pool')` (prepareGenerationV2 ist IO-lastig — stattdessen die neue Hilfsfunktion testen, s. Step 3) und `test('Fenster komplett leer durch Constraints → patternSlugWindow liefert leeres Fenster, kein Throw')` (Review Focus 2).
- [ ] **Step 2: Fail verifizieren** — vitest, Expected: FAIL
- [ ] **Step 3: Implementieren**
  - Neue Hilfsfunktion in `injury-constraints.ts`: `filterRowsByInjury<T extends { id: string }>(rows: T[], exclusions: InjuryExclusions): T[]` — einmal auf `exerciseRows` anwenden (`const allowedRows = ...` vor `:200`) und die vier Ableitungen (`exercises`, `byEnvCache`, `speedExercises`, `slugsForEnv`) auf `allowedRows` umhängen.
  - `toV2` setzt `light_only: exclusions.lightOnlyIds.has(row.id)`.
  - `patternSlugWindow`: im Heavy-Zweig (`pool.ts:189-192`) zuerst `pool = pool.filter((e) => !e.light_only)`, DANN die bestehende strong-Logik inkl. Fallback — so kann der Fallback nie light_only zurückholen. Zusätzlich: Block-Pools für Blöcke mit `emphasis === 'heavy'` (Plyo-Säulen-Lead) filtern light_only analog (Einbaupunkt: `buildBlockPools`-Aufrufstelle `prepare-v2.ts:361`).
  - Sichtbarkeit (Spec „Risiken"): entfernt der Block-Filter mehr als 30 % der Basis-Pool-Rows, pusht `prepare-v2` eine Note `"Verletzungs-Constraints filtern <n> von <total> Übungen — Pool stark reduziert"` (gleiches `notes`-Array wie die Layout-Notes).
- [ ] **Step 4: Pass + volle Suite** — `npx vitest run` (Worker, alle Dateien) — Expected: alle PASS (inkl. Characterization-Snapshots unverändert, da ohne Constraints nichts gefiltert wird)
- [ ] **Step 5: Commit** — `feat(worker): enforce injury constraints in all exercise pools`

---

### Task 6: Worker Strip-Pass + Prompt-Ersetzung + Akut-Hinweis

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts` (deterministische Phase `:464-470`)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` (`userContext` `:426-430`, `weekPlan`-Description im Return)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/run-session-v2.test.ts` (erweitern oder neue Datei `strip-forbidden.test.ts`)

**Interfaces:**
- Produces: `export function stripForbiddenExercises(blocks: Array<{ block_type: string; exercises: Array<{ exercise_slug: string }> }>, forbiddenSlugs: Set<string>): string[]` (Rückgabe: entfernte Slugs, für die Session-Note). `runSessionV2` erhält `forbiddenSlugs` über seinen bestehenden Input (gleiches Threading wie `poolMap`).

- [ ] **Step 1: Failing Tests**
  - `test('stripForbiddenExercises entfernt verbotenen Slug und meldet ihn')` (Review Focus 4)
  - `test('Block wird durch Strip leer → Block wird entfernt, übrige Blöcke unangetastet')`
  - `test('ohne Verstöße: blocks identisch (keine Mutation nötig)')`
  - userContext (pure Funktion extrahieren, s. Step 3): `test('status confirmed → kein user_notes im Kontext, stattdessen constraints-Zeile')`, `test('status confirmed + null Constraints → weder user_notes noch constraints-Zeile')`, `test('status pending/failed → user_notes wie bisher')`
- [ ] **Step 2: Fail verifizieren** — vitest, Expected: FAIL
- [ ] **Step 3: Implementieren**
  - `stripForbiddenExercises` in `run-session-v2.ts`, aufgerufen in der deterministischen Phase VOR der Finisher-Insertion (`:471`); pro entferntem Slug eine Note an die Session.
  - `buildUserContext(input, constraints): string` als exportierte pure Funktion aus dem bisherigen Inline-Array (`prepare-v2.ts:426-430`): bei `injury_extraction_status === 'confirmed'` statt `user_notes` eine Zeile `injury_constraints: block=[tag,...] light_only=[tag,...]` (entfällt bei leeren Listen); sonst Status quo.
  - Akut: wenn `exclusions.acute`, hängt `prepare-v2` an `weekPlan.description` den Hinweis an: `"Hinweis: Du hast eine akute Verletzung angegeben — kläre die Belastung mit Arzt oder Physio."`
- [ ] **Step 4: Pass + volle Suite + Typecheck** — `npx vitest run && npx tsc --noEmit -p tsconfig.json` — Expected: PASS, Exit 0
- [ ] **Step 5: Commit** — `feat(worker): forbidden-slug strip pass + constraint-aware prompt context`

---

### Task 7: jemp-api Swap-Filter

**Files:**
- Modify: `externals/jemp-api/src/swap-route/index.ts` (Fan-out `:72-119`, Pool-Build `:209-216`)
- Modify: `externals/jemp-api/src/swap-route/swap-pool.ts` (`SwapPoolInput` `:8-21`, `inGroup` `:108-128`, Heavy-Gate `:85-86,126`)

**Interfaces:**
- Consumes: `buildInjuryExclusions`, `activeInjuryConstraints`, `applyInjuryExclusions` aus dem Worker-Modul (Import-Pfad analog `swap-pool.ts:4-6`); Tabellen aus Task 1.
- Produces: Swap-Kandidaten enthalten blockierte Übungen weder als wählbar noch als `locked`; `light_only`-Übungen fallen am Heavy-Gate raus.

- [ ] **Step 1: Implementieren** (Logik ist in Task 3/4 getestet; hier Verdrahtung)
  - Handler-Fan-out: `user_injury_constraints` + `exercise_contraindications` laden (service-role Supabase wie Bestand), `exclusions = buildInjuryExclusions(activeInjuryConstraints(rows), tagsByExercise)`.
  - `SwapPoolInput` + Feld `injuryExclusions?: InjuryExclusions`; in `inGroup` direkt neben dem bestehenden `excludeExerciseIds`-Check (`:110`): blocked → `return false`; am Heavy-Gate (`:126`-Bereich): `light_only` → `return false`, wenn der Slot heavy ist.
- [ ] **Step 2: Build + Typecheck** — Run: `cd externals/jemp-api && npm run build && npx tsc --noEmit` — Expected: Exit 0
- [ ] **Step 3: Verdrahtungs-Check (Review Focus 5)** — Grep-Verifikation: der blocked-Check liegt in `inGroup` VOR der `locked`-Berechnung (`swap-pool.ts:137-147`). Run: `grep -n "injuryExclusions" externals/jemp-api/src/swap-route/swap-pool.ts` — Expected: Treffer in `inGroup`, keiner nach der locked-Zeile.
- [ ] **Step 4: Commit** — `feat(api): swap alternatives respect injury constraints`

---

### Task 8: Admin-Erweiterung (web/)

**Files:**
- Modify: `web/app/actions/exercises.ts` (`getExerciseRelations` `:290-313`, `createExercise` `:266-276`, `updateExercise` `:209-227`, `getExercise` `:99-123`)
- Modify: `web/app/actions/exercise-ai.ts` (`ExercisePrefill` `:37-54`, Schema `:94-118`, ID-Mapping `:150-173`)
- Modify: `web/app/admin/exercises/new/ExerciseCreateForm.tsx`, `web/app/admin/[id]/ExerciseEditForm.tsx`

**Interfaces:**
- Consumes: Tabellen aus Task 1, regenerierte `database.types.ts`.
- Produces: Admin kann `contraindicationTagIds: string[]` pro Übung lesen/schreiben; KI-Prefill schlägt Tags vor (Enum aus Live-Slugs, wie bestehende Relation-Enums).

- [ ] **Step 1: Implementieren** — `contraindication_tags` in `getExerciseRelations` aufnehmen; Create/Update um die vierte Relation erweitern (gleiches delete-all-then-reinsert-Muster); Formulare: Checkbox-Gruppe wie Block-Types; `exercise-ai.ts`: `contraindicationTagSlugs` ins JSON-Schema (Enum aus geladenen Slugs) + Slug→ID-Mapping.
- [ ] **Step 2: Typecheck** — Run: `cd web && npx tsc --noEmit` — Expected: Exit 0
- [ ] **Step 3: Manuelle Verifikation** — Admin lokal starten, eine Übung öffnen, Tags setzen + speichern + neu laden. Expected: Tags persistiert.
- [ ] **Step 4: Commit** — `feat(admin): contraindication tags on exercises + AI prefill`

---

### Task 9: Batch-Prefill-Script (lokal)

**Files:**
- Create: `scripts/prefill-contraindications.mjs`

**Interfaces:**
- Consumes: lokale Dev-DB (Docker `supabase_db_jemp`, psql-Muster aus `pull-exercises-from-prod.mjs`), `OPENAI_API_KEY` aus Env.
- Produces: `exercise_contraindications`-Rows in der LOKALEN DB für alle Übungen ohne bestehende Tags + eine Zusammenfassung (`<slug>: tag1, tag2` pro Zeile) auf stdout fürs Review.

- [ ] **Step 1: Implementieren** — Übungen (slug, name, body_region, strength_pattern, plyo_type, movement_type, is_explosive) in Batches à 20 an gpt-5-mini (JSON-Schema: pro Übung `{ slug, tags: enum[] }`, Enum = die 15 Slugs); nur Übungen ohne bestehende Tags (idempotent, Re-Run-sicher); Schreiben via psql wie im pull-Script; am Ende Anzahl getaggter Übungen + Verteilung pro Tag ausgeben. KEIN Prod-/Staging-Zugriff.
- [ ] **Step 2: Lauf gegen lokale DB** — Run: `node scripts/prefill-contraindications.mjs` — Expected: Zusammenfassung, Exit 0; Stichprobe: `deep_knee_flexion_loaded` enthält Pistol/Front/Back Squat; `jumping_landing` enthält Box Jump/Depth Jump.
- [ ] **Step 3: Commit (nur Script)** — `feat(scripts): batch AI prefill for contraindication tags` — die getaggten DATEN gehen erst nach User-Review im Admin per `exercises:push` nach Prod (manueller Schritt, nicht Teil dieses Plans).
