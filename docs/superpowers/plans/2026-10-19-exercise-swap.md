# Exercise Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User kann eine Übung in Session-Overview und aktiver Session gegen eine gleichwertige aus dem Generator-Pool tauschen ("nur diese Session" / "diese und alle folgenden"), inkl. gesperrter Level-Alternativen als Motivation.

**Architecture:** jemp-api bekommt einen GET-Endpoint, der die ECHTE Worker-Filterlogik per relativem Import bundelt (keine Duplikation). Die Pattern-/Emphasis-Zuordnung wird vom Worker beim Materialisieren mitgeschrieben. Der Swap selbst ist ein reines Supabase-UPDATE aus der App (Owner-RLS existiert).

**Tech Stack:** Express (jemp-api, node:test), Temporal-Worker (vitest), Supabase/Postgres, Expo Router + TanStack Query (App), i18n de/en.

**Spec:** `docs/superpowers/specs/2026-10-19-exercise-swap-design.md`

## Global Constraints

- Branch: `feat/session-structure`. Commits pro Task sind Teil des Workflows; NIEMALS pushen oder deployen (Staging/Prod) — das macht der User explizit.
- Migrationen laufen nur LOKAL (`npx supabase migration up`), nie gegen Staging/Prod.
- Worker-Filterlogik wird importiert, nie kopiert (Spec §0.5). Neue Module im Worker sind pure (kein Import von `openai`, `zod`, `@temporalio/*`, `src/`-Aliassen).
- Swap ist UPDATE, nie DELETE+INSERT (`workout_session_performed_sets` hängt per CASCADE an der Zeile).
- Verifikation pro App-Task: `npx tsc --noEmit` + `npx eslint <geänderte Dateien>` — Repo hat vorbestehende tsc-Fehler (exercise-video-hero, onboarding-steps, icon-symbol, supabase/functions), nur eigene Dateien zählen.
- i18n: Keys IMMER in `i18n/locales/de.ts` UND `i18n/locales/en.ts`.
- Keine nativen `Alert.alert` — `ConfirmDialog`/`useToastStore` verwenden (Repo-Konvention).

## Review Focus

1. **Zeile mit geloggten Sätzen** → Swap muss verweigert werden (sonst zeigt die Historie Sätze einer anderen Übung). Test: Task 8 (Mutation prüft `performed_sets`-Count und wirft).
2. **`reps_or_duration`-Kandidat, aktuelle Zeile zeitbasiert** → Ableitung muss den Dauer-Pfad wählen, nicht 8–12 Reps auf einen Plank schreiben. Test: Task 4 (prescription.test).
3. **Accessory-/Warmup-Zeile ohne `strength_pattern`** → Pattern-Bindung darf NICHT greifen (sonst leerer Pool); Tausch läuft rein über `exerciseMatchesBlock`. Test: Task 5 (pool.test).
4. **Session ohne `environment_id` (null)** → Filter läuft mit Any-Env-Semantik weiter statt zu crashen oder alles zu verwerfen. Test: Task 5 (pool.test, dayEnvId null).
5. **User ohne Level-Daten (`category_levels` leer)** → `hasLevelData=false` überspringt den Level-Check: alles landet in `alternatives`, `locked` bleibt leer (nie umgekehrt). Test: Task 5 (pool.test).

---

### Task 1: Worker-Refactor — pure Module extrahieren (taxonomy + exercise-filter)

`pool.ts` importiert `BODY_REGION_TO_PATTERN`/`effectiveRegion` als Werte aus `generate-plan.ts`, das `openai`/`zod` zieht — jemp-api hat die nicht. Extraktion in Leaf-Module, Re-Exports halten alle bestehenden Importe stabil.

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/taxonomy.ts`
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/exercise-filter.ts`
- Modify: `externals/jemp-temporal-worker/src/plan-generation/generate-plan.ts` (Definitionen raus, Re-Export rein; `BODY_REGION_TO_PATTERN` steht bei ~L97, `effectiveRegion` bei ~L120)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` (Definitionen `ExerciseFilterMaps` L74–83, `makeExerciseFilter` L89–121, `makeSportGate` L147–159 raus, Re-Export rein)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts:6` (Import auf `../taxonomy` umstellen)

**Interfaces:**
- Produces: `taxonomy.ts` exportiert `BODY_REGION_TO_PATTERN: Record<string, string>` und `effectiveRegion(e: { body_region?: string | null; dominant_region?: string | null }): string | null` (Code 1:1 aus generate-plan.ts verschieben, nicht neu schreiben).
- Produces: `exercise-filter.ts` exportiert `type ExerciseFilterMaps`, `makeExerciseFilter(maps: ExerciseFilterMaps, dayEnvId: string | null)`, `makeSportGate(sportGroupsByExercise: Map<string, Set<string>>, groupName: string | undefined)` (Code 1:1 aus prepare-v2.ts verschieben, inkl. des lokalen Typs `FilterableRow`).

- [ ] **Step 1: `taxonomy.ts` anlegen** — `BODY_REGION_TO_PATTERN` + `effectiveRegion` samt zugehöriger Kommentare per Cut&Paste aus `generate-plan.ts` verschieben. Kopfkommentar: `// Pure Übungs-Taxonomie — auch von jemp-api (Swap-Endpoint) gebundelt: hier NIE openai/zod/temporal importieren.`

- [ ] **Step 2: `generate-plan.ts` re-exportieren** — an der alten Stelle:

```typescript
export { BODY_REGION_TO_PATTERN, effectiveRegion } from './taxonomy'
```

- [ ] **Step 3: `exercise-filter.ts` anlegen** — `FilterableRow`, `ExerciseFilterMaps`, `makeExerciseFilter`, `makeSportGate` per Cut&Paste aus `prepare-v2.ts` verschieben (gleicher Kopfkommentar wie Step 1). In `prepare-v2.ts` ersetzen durch:

```typescript
import { makeExerciseFilter, makeSportGate, type ExerciseFilterMaps } from './exercise-filter'
export { makeExerciseFilter, makeSportGate, type ExerciseFilterMaps }
```

- [ ] **Step 4: `pool.ts:6` umstellen** auf `import { BODY_REGION_TO_PATTERN, effectiveRegion } from '../taxonomy'`

- [ ] **Step 5: Worker-Tests + Build laufen lassen**

Run: `cd externals/jemp-temporal-worker && npx vitest run && npm run build`
Expected: alle bestehenden Tests grün, Build ok (reiner Move, keine Verhaltensänderung).

- [ ] **Step 6: Commit** — `git add -A externals/jemp-temporal-worker && git commit -m "refactor(worker): pure Taxonomie-/Filter-Module extrahiert (jemp-api-Bundling)"`

---

### Task 2: Migration — Swap-Spalten auf Blueprint- und Session-Tabelle

**Files:**
- Create: `supabase/migrations/20261019100000_add_exercise_swap_columns.sql`
- Modify: `database.types.ts` (regenerieren)

**Interfaces:**
- Produces: Spalten `assigned_pattern text null`, `pattern_emphasis text null` auf `workout_plan_session_block_exercises` UND `workout_session_block_exercises`; zusätzlich `swapped_from_exercise_id uuid null` auf `workout_session_block_exercises`. Owner-UPDATE-RLS existiert bereits (Migration `20260419081707`) — kein Policy-Teil.

- [ ] **Step 1: Migration schreiben** (Konventionen: Transaktion, `lock_timeout`):

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Exercise Swap (Spec 2026-10-19): Pattern-/Emphasis-Zuordnung wird beim
-- Materialisieren mitgeschrieben (Heavy-Filter ohne Raten, Pattern-Bindung
-- gegen Coverage-Bruch); swapped_from markiert getauschte Zeilen.
-- Owner-UPDATE-Policy existiert seit 20260419081707 — hier nur Spalten.
begin;
set local lock_timeout = '5s';

alter table workout_plan_session_block_exercises
  add column if not exists assigned_pattern text,
  add column if not exists pattern_emphasis text check (pattern_emphasis in ('heavy', 'normal'));

alter table workout_session_block_exercises
  add column if not exists assigned_pattern text,
  add column if not exists pattern_emphasis text check (pattern_emphasis in ('heavy', 'normal')),
  add column if not exists swapped_from_exercise_id uuid references exercises(id);

commit;
```

- [ ] **Step 2: Lokal anwenden** — Run: `npx supabase migration up`
Expected: `Applying migration 20261019100000... Finished` ohne Fehler (Output NICHT filtern).

- [ ] **Step 3: Typen regenerieren** — Run: `npx supabase gen types typescript --local > database.types.ts`, dann `git diff database.types.ts` prüfen: neue Felder auf beiden Tabellen sichtbar.

- [ ] **Step 4: Commit** — `git add supabase/migrations/20261019100000_add_exercise_swap_columns.sql database.types.ts && git commit -m "feat(db): Swap-Spalten assigned_pattern/pattern_emphasis/swapped_from"`

---

### Task 3: Worker — Pattern-Zuordnung annotieren und durchreichen

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts` (neue Funktion + Aufruf nach `fixInvalidLoads(blocks)` bei ~L386)
- Modify: `externals/jemp-temporal-worker/src/activities/save-plan.ts` (L98–112 Typ, L192–211 Blueprint-Insert, L220 Select-back, L227–241 Record-Mapping, L312–334 materialisierter Insert)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pattern-assignment.test.ts`

**Interfaces:**
- Consumes: `PatternRequirement` (run-session-v2.ts L54–57: `{ block_type, pattern, emphasis, slugs: Set<string> }`).
- Produces: `attachPatternAssignment(blocks, patternReqs): void` — mutiert Übungen in Kraftblöcken um `assigned_pattern: string` und `pattern_emphasis: 'heavy' | 'normal'`. save-plan schreibt beide Felder in Blueprint- und Session-Zeilen.

- [ ] **Step 1: Failing Test schreiben** (`pattern-assignment.test.ts`):

```typescript
import { describe, expect, it } from 'vitest'
import { attachPatternAssignment } from '../run-session-v2'

const reqs = [
  { block_type: 'upper_strength', pattern: 'push_horizontal', emphasis: 'heavy' as const, slugs: new Set(['bench_press']) },
  { block_type: 'upper_strength', pattern: 'pull_horizontal', emphasis: 'normal' as const, slugs: new Set(['barbell_row']) },
]

describe('attachPatternAssignment', () => {
  it('weist jeder Kraft-Übung ihr Pattern + Emphasis aus den Reqs zu', () => {
    const blocks = [{ block_type: 'upper_strength', exercises: [
      { exercise_slug: 'bench_press' }, { exercise_slug: 'barbell_row' },
    ] }]
    attachPatternAssignment(blocks as any, reqs)
    expect((blocks[0].exercises[0] as any).assigned_pattern).toBe('push_horizontal')
    expect((blocks[0].exercises[0] as any).pattern_emphasis).toBe('heavy')
    expect((blocks[0].exercises[1] as any).assigned_pattern).toBe('pull_horizontal')
    expect((blocks[0].exercises[1] as any).pattern_emphasis).toBe('normal')
  })
  it('lässt Nicht-Kraftblöcke und unbekannte Slugs unberührt (null-Fall)', () => {
    const blocks = [
      { block_type: 'core', exercises: [{ exercise_slug: 'plank' }] },
      { block_type: 'upper_strength', exercises: [{ exercise_slug: 'mystery_move' }] },
    ]
    attachPatternAssignment(blocks as any, reqs)
    expect((blocks[0].exercises[0] as any).assigned_pattern).toBeUndefined()
    expect((blocks[1].exercises[0] as any).assigned_pattern).toBeUndefined()
  })
})
```

- [ ] **Step 2: Test rot sehen** — Run: `cd externals/jemp-temporal-worker && npx vitest run pattern-assignment`
Expected: FAIL (`attachPatternAssignment` existiert nicht).

- [ ] **Step 3: Implementieren** in `run-session-v2.ts` (neben `attachBlockEmphasis`):

```typescript
/** Swap-Grundlage (Spec 2026-10-19): schreibt pro Kraft-Übung das erfüllte
 *  Pattern + dessen Emphasis aus den patternReqs an die Übung — save-plan
 *  persistiert beides, der Swap-Endpoint filtert damit ohne zu raten.
 *  Übungen ohne Req-Treffer (z. B. Datenloch) bleiben unannotiert → null. */
export function attachPatternAssignment(
  blocks: Array<{ block_type: string; exercises: Array<{ exercise_slug: string }> }>,
  patternReqs: PatternRequirement[],
): void {
  for (const b of blocks) {
    const reqs = patternReqs.filter((r) => r.block_type === b.block_type)
    if (reqs.length === 0) continue
    for (const e of b.exercises ?? []) {
      const req = reqs.find((r) => r.slugs.has(e.exercise_slug))
      if (!req) continue
      ;(e as any).assigned_pattern = req.pattern
      ;(e as any).pattern_emphasis = req.emphasis
    }
  }
}
```

Aufruf in `runSessionV2` direkt nach `fixInvalidLoads(blocks)` (~L386): `attachPatternAssignment(blocks, patternReqs)`.

- [ ] **Step 4: Test grün sehen** — Run: `npx vitest run pattern-assignment` → PASS, dann `npx vitest run` (ganze Suite).

- [ ] **Step 5: save-plan durchreichen.** Vier Stellen:

1. `PlanExerciseRecord` (L98) um `assigned_pattern: string | null` und `pattern_emphasis: string | null` erweitern.
2. Blueprint-Insert-Objekt (im `.map((ex) => …)` ab L193) ergänzen:

```typescript
            assigned_pattern: (ex as any).assigned_pattern ?? null,
            pattern_emphasis: (ex as any).pattern_emphasis ?? null,
```

3. Select-back (L220): `assigned_pattern, pattern_emphasis` an den Select-String anhängen; im Mapping nach `planExercisesByBlockId` (L227) beide Felder übernehmen.
4. Materialisierter Insert (`wsExercisesToInsert.push` ab L316): `assigned_pattern: planEx.assigned_pattern, pattern_emphasis: planEx.pattern_emphasis,` ergänzen.

- [ ] **Step 6: Lokal end-to-end verifizieren** (Pflicht-Testweg, Feedback 18.10. — lokales Debug-Script, kein Staging):

Run: `npx tsx supabase/test-scripts/debug-plan-generation-v2.ts <vorhandenes input.json aus test-scripts>`
Dann: `docker exec $(docker ps -qf name=supabase_db) psql -U postgres -c "select assigned_pattern, pattern_emphasis, count(*) from workout_session_block_exercises group by 1,2 order by 3 desc limit 10;"`
Expected: Kraftzeilen tragen Pattern+Emphasis (heavy und normal kommen vor), Warmup/Core/Accessory-Zeilen null.

- [ ] **Step 7: Commit** — `git add -A externals/jemp-temporal-worker && git commit -m "feat(worker): assigned_pattern/pattern_emphasis beim Materialisieren mitschreiben"`

---

### Task 4: jemp-api — Vorgaben-Ableitung (pure) + Tests

**Files:**
- Create: `externals/jemp-api/src/swap-route/prescription.ts`
- Test: `externals/jemp-api/src/swap-route/prescription.test.ts`

**Interfaces:**
- Produces:

```typescript
export type CurrentPrescription = {
  target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null
  target_duration_seconds: number | null; target_distance_meters: number | null
  target_rest_seconds: number | null; target_load_type: string | null; target_load_value: number | null
  is_amrap: boolean; target_rounds: number | null
}
export type SwapCandidateMeta = { measurement_type: string | null; requiresEquipment: boolean }
export function derivePrescription(current: CurrentPrescription, candidate: SwapCandidateMeta, blockType: string): CurrentPrescription
```

- [ ] **Step 1: Failing Tests schreiben** (`prescription.test.ts`, node:test wie bestehende jemp-api-Tests):

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivePrescription, type CurrentPrescription } from './prescription'

const base: CurrentPrescription = {
  target_sets: 4, target_reps_min: 6, target_reps_max: 8,
  target_duration_seconds: null, target_distance_meters: null,
  target_rest_seconds: 120, target_load_type: 'kg', target_load_value: 80,
  is_amrap: false, target_rounds: null,
}

test('kg-Last wird nie übernommen: Gerät-Kandidat bekommt RPE 7 im Kraftblock', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: true }, 'lower_strength')
  assert.equal(p.target_load_type, 'rpe'); assert.equal(p.target_load_value, 7)
  assert.equal(p.target_sets, 4); assert.equal(p.target_reps_min, 6); assert.equal(p.target_reps_max, 8)
})
test('Bodyweight-Kandidat bekommt bodyweight/-1', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: false }, 'lower_strength')
  assert.equal(p.target_load_type, 'bodyweight'); assert.equal(p.target_load_value, -1)
})
test('Mess-Typ-Wechsel reps→duration: Dauer gesetzt, Reps genullt', () => {
  const p = derivePrescription(base, { measurement_type: 'duration', requiresEquipment: false }, 'core')
  assert.equal(p.target_duration_seconds, 30)
  assert.equal(p.target_reps_min, null); assert.equal(p.target_reps_max, null)
})
test('reps_or_duration folgt der aktuellen Zeile: zeitbasiert bleibt zeitbasiert', () => {
  const cur = { ...base, target_reps_min: null, target_reps_max: null, target_duration_seconds: 45, target_load_type: 'bodyweight', target_load_value: -1 }
  const p = derivePrescription(cur, { measurement_type: 'reps_or_duration', requiresEquipment: false }, 'core')
  assert.equal(p.target_duration_seconds, 45); assert.equal(p.target_reps_max, null)
})
test('rpe/bodyweight der aktuellen Zeile bleibt erhalten (kein Downgrade)', () => {
  const cur = { ...base, target_load_type: 'rpe', target_load_value: 8 }
  const p = derivePrescription(cur, { measurement_type: 'reps', requiresEquipment: true }, 'upper_strength')
  assert.equal(p.target_load_type, 'rpe'); assert.equal(p.target_load_value, 8)
})
test('Nicht-Kraftblock-Default ist RPE 6 (fixInvalidLoads-Parität)', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: true }, 'accessory')
  assert.equal(p.target_load_value, 6)
})
```

- [ ] **Step 2: Rot sehen** — Run: `cd externals/jemp-api && npm test`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren** (`prescription.ts`):

```typescript
// Vorgaben-Ableitung beim Swap (Spec 2026-10-19 §3): Satzschema/Pause bleiben
// vom Slot, Last + Mess-Typ werden übungsgerecht gesetzt — Parität zu
// fixInvalidLoads im Worker (Kraft RPE 7, Rest RPE 6, bodyweight = -1).
const STRENGTH_BLOCK_TYPES = new Set(['lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'])

export type CurrentPrescription = {
  target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null
  target_duration_seconds: number | null; target_distance_meters: number | null
  target_rest_seconds: number | null; target_load_type: string | null; target_load_value: number | null
  is_amrap: boolean; target_rounds: number | null
}
export type SwapCandidateMeta = { measurement_type: string | null; requiresEquipment: boolean }

export function derivePrescription(
  current: CurrentPrescription, candidate: SwapCandidateMeta, blockType: string,
): CurrentPrescription {
  const p: CurrentPrescription = {
    ...current,
    target_reps_min: null, target_reps_max: null,
    target_duration_seconds: null, target_distance_meters: null,
  }
  const m = candidate.measurement_type ?? 'reps'
  const currentIsTimed = (current.target_duration_seconds ?? 0) > 0
  if (m === 'duration' || (m === 'reps_or_duration' && currentIsTimed)) {
    p.target_duration_seconds = currentIsTimed ? current.target_duration_seconds : 30
  } else if (m === 'distance') {
    p.target_distance_meters = (current.target_distance_meters ?? 0) > 0 ? current.target_distance_meters : 20
  } else {
    p.target_reps_min = current.target_reps_min ?? 8
    p.target_reps_max = current.target_reps_max ?? 12
  }
  if (!candidate.requiresEquipment) {
    p.target_load_type = 'bodyweight'; p.target_load_value = -1
  } else if (current.target_load_type === 'kg' || current.target_load_type === 'percent_1rm' || current.target_load_type === 'pace') {
    p.target_load_type = 'rpe'
    p.target_load_value = STRENGTH_BLOCK_TYPES.has(blockType) ? 7 : 6
  }
  return p
}
```

- [ ] **Step 4: Grün sehen** — Run: `npm test` → PASS.

- [ ] **Step 5: Commit** — `git add externals/jemp-api/src/swap-route && git commit -m "feat(api): Vorgaben-Ableitung für Exercise-Swap"`

---

### Task 5: jemp-api — Pool-Berechnung (pure) + Tests

**Files:**
- Create: `externals/jemp-api/src/swap-route/swap-pool.ts`
- Test: `externals/jemp-api/src/swap-route/swap-pool.test.ts`

**Interfaces:**
- Consumes (Worker-Importe, via Task 1 pure): `makeExerciseFilter`, `makeSportGate`, `ExerciseFilterMaps` aus `../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter`; `exerciseMatchesBlock`, `matchesStrengthPattern`, `type V2Exercise` aus `.../v2/pool`.
- Produces:

```typescript
export type SwapPoolInput = {
  exercises: V2Exercise[]                 // alle Übungen als V2Exercise (Mapping im Handler)
  maps: ExerciseFilterMaps
  sportGate: (row: { id: string; is_sport_specific?: boolean | null }) => boolean
  dayEnvId: string | null
  blockTypeSlug: string                   // z. B. 'upper_strength', 'accessory', 'warmup'
  currentExercise: V2Exercise
  assignedPattern: string | null          // aus DB-Spalte; null → Ableitung
  patternEmphasis: 'heavy' | 'normal' | null
}
export type SwapPoolResult = {
  alternatives: V2Exercise[]              // sortiert: gleiche movement_type zuerst, dann slug
  locked: Array<{ exercise: V2Exercise; unlock_level: number }>  // max 5, nach min_level aufsteigend
}
export function buildSwapPool(input: SwapPoolInput): SwapPoolResult
```

- [ ] **Step 1: Failing Tests schreiben** (`swap-pool.test.ts`). Fixture-Helper + Fälle; `mkEx` liefert ein vollständiges `V2Exercise` mit Defaults, Overrides pro Test:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSwapPool } from './swap-pool'
import type { V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'
import type { ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'

let n = 0
function mkEx(over: Partial<V2Exercise>): V2Exercise {
  n += 1
  return {
    id: `id_${n}`, slug: `ex_${n}`, name: `Ex ${n}`, category_slug: 'strength',
    body_region: 'chest', dominant_region: null, strength_pattern: 'push_horizontal',
    plyo_type: null, core_type: null, sprint_type: null, covered_patterns: null,
    laterality: 'bilateral', min_level: 1, max_level: 100, intensity_score: 6,
    measurement_type: 'reps', exercise_type: null, legacy_block_slugs: null,
    movement_type: 'sagittal', is_explosive: false, regions: null,
    is_sport_specific: false, preferred: false, ...over,
  }
}
function mkMaps(over: Partial<ExerciseFilterMaps> = {}): ExerciseFilterMaps {
  return {
    envByExercise: new Map(), equipByExercise: new Map(),
    userEnvs: new Set(), userEquip: new Set(), equipmentEnvs: new Map(),
    levelByCategoryId: new Map([['cat_strength', 50]]), hasLevelData: true, ...over,
  }
}
const gate = () => true
// Hinweis: makeExerciseFilter prüft Level über row.categories.id — der Handler
// (Task 6) hängt categories an die V2Exercise-Rows an; die Tests tun dasselbe:
function withCat(e: V2Exercise): V2Exercise & { categories: { id: string } } {
  return { ...e, categories: { id: 'cat_strength' } }
}

test('Pattern-Bindung: Pull-Zeile liefert keine Push-Kandidaten (Coverage-Garantie)', () => {
  const pull = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const push = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const pull2 = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [pull, push, pull2], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: pull,
    assignedPattern: 'pull_horizontal', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['cable_row'])
})
test('Pattern-Ableitung bei Alt-Plan (assignedPattern null): strength_pattern der Übung zählt', () => {
  const pull = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const push = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const pull2 = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [pull, push, pull2], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: pull,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['cable_row'])
})
test('Heavy-Filter über pattern_emphasis: frontal/Activation fliegt raus', () => {
  const cur = withCat(mkEx({ slug: 'back_squat', strength_pattern: 'knee_dominant', intensity_score: 8 }))
  const strong = withCat(mkEx({ slug: 'front_squat', strength_pattern: 'knee_dominant', intensity_score: 7 }))
  const weak = withCat(mkEx({ slug: 'lateral_lunge', strength_pattern: 'knee_dominant', movement_type: 'frontal', intensity_score: 4 }))
  const r = buildSwapPool({
    exercises: [cur, strong, weak], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'heavy',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['front_squat'])
})
test('Accessory ohne Pattern: Bindung greift nicht, Block-Pool zählt (Review Focus 3)', () => {
  const cur = withCat(mkEx({ slug: 'calf_raise', strength_pattern: null, body_region: 'calf' }))
  const alt = withCat(mkEx({ slug: 'tib_raise', strength_pattern: null, body_region: 'ankle' }))
  const r = buildSwapPool({
    exercises: [cur, alt], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'accessory', currentExercise: cur,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['tib_raise'])
})
test('Level-Lock: zu schwere Übung landet in locked mit unlock_level (nie in alternatives)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const hard = withCat(mkEx({ slug: 'pistol_squat', strength_pattern: 'knee_dominant', min_level: 70 }))
  const easy = withCat(mkEx({ slug: 'goblet_squat', strength_pattern: 'knee_dominant' }))
  const r = buildSwapPool({
    exercises: [cur, hard, easy], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['goblet_squat'])
  assert.deepEqual(r.locked, [{ exercise: hard, unlock_level: 70 }])
})
test('Ohne Level-Daten: alles in alternatives, locked leer (Review Focus 5)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const hard = withCat(mkEx({ slug: 'pistol_squat', strength_pattern: 'knee_dominant', min_level: 70 }))
  const r = buildSwapPool({
    exercises: [cur, hard], maps: mkMaps({ hasLevelData: false, levelByCategoryId: new Map() }),
    sportGate: gate, dayEnvId: null, blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['pistol_squat'])
  assert.equal(r.locked.length, 0)
})
test('dayEnvId null crasht nicht und nutzt Any-Env (Review Focus 4)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const alt = withCat(mkEx({ slug: 'front_squat', strength_pattern: 'knee_dominant' }))
  const r = buildSwapPool({
    exercises: [cur, alt], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.equal(r.alternatives.length, 1)
})
test('Equipment-Fail und Sport-Gate halten Kandidaten draußen (Spec §6)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const barbell = withCat(mkEx({ slug: 'back_squat', strength_pattern: 'knee_dominant' }))
  const sporty = withCat(mkEx({ slug: 'keeper_squat', strength_pattern: 'knee_dominant', is_sport_specific: true }))
  const maps = mkMaps({ equipByExercise: new Map([[barbell.id, new Set(['equip_barbell'])]]) })
  const r = buildSwapPool({
    exercises: [cur, barbell, sporty], maps, sportGate: (row) => !row.is_sport_specific,
    dayEnvId: null, blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  // barbell: User besitzt kein Equipment → raus; sporty: Gate → raus (auch nicht in locked)
  assert.equal(r.alternatives.length, 0)
  assert.equal(r.locked.length, 0)
})
test('Ebenen-Sortierung: gleiche movement_type wie aktuelle Übung zuerst', () => {
  const cur = withCat(mkEx({ slug: 'rot_press', strength_pattern: 'push_horizontal', movement_type: 'transverse' }))
  const sag = withCat(mkEx({ slug: 'a_bench', strength_pattern: 'push_horizontal', movement_type: 'sagittal' }))
  const rot = withCat(mkEx({ slug: 'z_landmine', strength_pattern: 'push_horizontal', movement_type: 'transverse' }))
  const r = buildSwapPool({
    exercises: [cur, sag, rot], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: cur,
    assignedPattern: 'push_horizontal', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['z_landmine', 'a_bench'])
})
```

- [ ] **Step 2: Rot sehen** — Run: `cd externals/jemp-api && npm test` → FAIL.

- [ ] **Step 3: Implementieren** (`swap-pool.ts`):

```typescript
// Swap-Pool (Spec 2026-10-19 §2): exakt die Generator-Semantik — Worker-Code
// wird importiert und gebundelt, nie kopiert. Deploy-Kopplung beachten:
// Änderungen an v2/pool.ts oder v2/exercise-filter.ts brauchen API-Redeploy.
import { makeExerciseFilter, type ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'
import { exerciseMatchesBlock, matchesStrengthPattern, type V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'
import { BODY_REGION_TO_PATTERN, effectiveRegion } from '../../../jemp-temporal-worker/src/plan-generation/taxonomy'

export type SwapPoolInput = {
  exercises: V2Exercise[]
  maps: ExerciseFilterMaps
  sportGate: (row: { id: string; is_sport_specific?: boolean | null }) => boolean
  dayEnvId: string | null
  blockTypeSlug: string
  currentExercise: V2Exercise
  assignedPattern: string | null
  patternEmphasis: 'heavy' | 'normal' | null
}
export type SwapPoolResult = {
  alternatives: V2Exercise[]
  locked: Array<{ exercise: V2Exercise; unlock_level: number }>
}

const LOCKED_LIMIT = 5

/** Blockdefinition like-for-like aus der aktuellen Übung rekonstruieren —
 *  plyo-Variante ist nicht materialisiert (Spec §2): upper bleibt upper. */
function blockDefFor(blockTypeSlug: string, current: V2Exercise): any {
  if (blockTypeSlug === 'plyo') {
    return { block_type: 'plyo', variant: current.category_slug === 'upper_body_plyometrics' ? 'upper' : 'lower' }
  }
  if (blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength') {
    // Pattern-Bindung läuft separat über matchesStrengthPattern — hier alle
    // Patterns erlauben, damit exerciseMatchesBlock nicht doppelt gated.
    return { block_type: blockTypeSlug, variant: null, patterns: ALL_PATTERNS.map((p) => ({ pattern: p })) }
  }
  return { block_type: blockTypeSlug, variant: null }
}
const ALL_PATTERNS = ['push_vertical', 'push_horizontal', 'pull_vertical', 'pull_horizontal', 'knee_dominant', 'hinge', 'rotation']

/** Pattern der Zeile: Spalte, sonst Ableitung aus der Übung (eindeutig). */
function resolvePattern(current: V2Exercise, assignedPattern: string | null): string | null {
  if (assignedPattern) return assignedPattern
  if (current.strength_pattern) return current.strength_pattern
  if (current.category_slug !== 'strength') return null
  const region = effectiveRegion(current)
  const coarse = region ? BODY_REGION_TO_PATTERN[region] ?? null : null
  return coarse === 'squat' ? 'knee_dominant' : coarse
}

/** Heavy like-for-like-Fallback für Alt-Pläne ohne pattern_emphasis-Spalte. */
function isHeavy(current: V2Exercise, patternEmphasis: string | null, blockTypeSlug: string): boolean {
  if (patternEmphasis) return patternEmphasis === 'heavy'
  const isStrengthBlock = blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength'
  return isStrengthBlock && current.movement_type === 'sagittal' && (current.intensity_score ?? 5) >= 5
}

export function buildSwapPool(input: SwapPoolInput): SwapPoolResult {
  const { exercises, maps, sportGate, dayEnvId, blockTypeSlug, currentExercise } = input
  const blockDef = blockDefFor(blockTypeSlug, currentExercise)
  const pattern = (blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength')
    ? resolvePattern(currentExercise, input.assignedPattern)
    : null
  const heavy = pattern !== null && isHeavy(currentExercise, input.patternEmphasis, blockTypeSlug)

  const fullFilter = makeExerciseFilter(maps, dayEnvId)
  // Locked = alles außer Level: Filter-Klon ohne Level-Daten überspringt den Check.
  const noLevelFilter = makeExerciseFilter({ ...maps, hasLevelData: false }, dayEnvId)

  const inGroup = (e: V2Exercise): boolean => {
    if (e.id === currentExercise.id) return false
    if (!sportGate(e as any)) return false
    if (!exerciseMatchesBlock(e, blockDef)) return false
    if (pattern && !matchesStrengthPattern(e, pattern)) return false
    if (heavy && (e.movement_type !== 'sagittal' || (e.intensity_score ?? 5) < 5)) return false
    return true
  }

  const alternatives = exercises
    .filter((e) => inGroup(e) && fullFilter(e as any))
    .sort((a, b) =>
      Number(b.movement_type === currentExercise.movement_type) - Number(a.movement_type === currentExercise.movement_type)
      || a.slug.localeCompare(b.slug))

  const altIds = new Set(alternatives.map((a) => a.id))
  const locked = !maps.hasLevelData ? [] : exercises
    .filter((e) => inGroup(e) && !altIds.has(e.id) && noLevelFilter(e as any))
    .map((e) => ({ exercise: e, unlock_level: e.min_level }))
    // nur ZU SCHWERE (User unter min_level) — zu leichte bleiben unsichtbar
    .filter(({ exercise }) => {
      const catId = ((exercise as any).categories as { id?: string } | null)?.id
      const level = catId ? maps.levelByCategoryId.get(catId) : undefined
      return level !== undefined && level < exercise.min_level
    })
    .sort((a, b) => a.unlock_level - b.unlock_level)
    .slice(0, LOCKED_LIMIT)

  return { alternatives, locked }
}
```

- [ ] **Step 4: Grün sehen** — Run: `npm test` → PASS. Zur tsconfig: Es ist KEIN Change zu erwarten — `include` bestimmt nur die Root-Dateien, TypeScript folgt Imports außerhalb davon automatisch, und `rootDir` ist in `externals/jemp-api/tsconfig.json` nicht gesetzt. Sollte ts-node/node:test dennoch einen Auflösungsfehler werfen, ist die festgelegte Lösung: `include` um `"../jemp-temporal-worker/src/plan-generation/**/*.ts"` erweitern — `rootDir` wird in keinem Fall gesetzt (esbuild bundelt pfadbasiert, `outDir` bleibt unberührt).

- [ ] **Step 5: Commit** — `git add -A externals/jemp-api && git commit -m "feat(api): Swap-Pool-Berechnung mit echter Worker-Filterlogik"`

---

### Task 6: jemp-api — Route, Registrierung, Bundle-Beweis

**Files:**
- Create: `externals/jemp-api/src/swap-route/index.ts`
- Modify: `externals/jemp-api/src/index.ts` (Import + `app.get(...)` nach der Plan-Generation-Route)
- Modify: `externals/jemp-api/README.md` oder Datei-Kopf der Route (Deploy-Kopplungs-Hinweis, Spec §8)

**Interfaces:**
- Consumes: `buildSwapPool` (Task 5), `derivePrescription` (Task 4).
- Produces: `GET /api/swap-alternatives/:blockExerciseId` → `{ alternatives: [{ exercise: { id, slug, name, thumbnail_storage_path, equipment: string[] }, prescription: CurrentPrescription }], locked: [{ exercise: {…}, unlock_level }], future_occurrence_count: number }`; 401 ohne/mit ungültigem JWT, 404 wenn die Zeile nicht dem User gehört.

- [ ] **Step 1: Handler schreiben** (`swap-route/index.ts`). Struktur (Auth-Muster identisch zur Plan-Generation-Route in `index.ts:34–47`):

```typescript
// GET /api/swap-alternatives/:blockExerciseId (Spec 2026-10-19 §2).
// DEPLOY-KOPPLUNG: bundelt Worker-Filterlogik (v2/pool, v2/exercise-filter,
// taxonomy) — Änderungen dort erfordern auch einen jemp-api-Deploy.
import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { buildSwapPool } from './swap-pool'
import { derivePrescription, type CurrentPrescription } from './prescription'
import { makeSportGate, type ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'
import type { V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'

export async function swapAlternativesHandler(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) { res.status(401).json({ error: 'Unauthorized' }); return }

  // 1. Zeile + Kontext (Service-Role: Ownership selbst prüfen!)
  const { data: row } = await supabase
    .from('workout_session_block_exercises')
    .select(`id, exercise_id, assigned_pattern, pattern_emphasis,
      target_sets, target_reps_min, target_reps_max, target_duration_seconds,
      target_distance_meters, target_rest_seconds, target_load_type, target_load_value,
      is_amrap, target_rounds, workout_plan_session_block_exercise_id,
      workout_session_blocks!inner ( block_types ( slug ),
        workout_sessions!inner ( id, user_id, scheduled_at, environment_id ) )`)
    .eq('id', req.params.blockExerciseId)
    .maybeSingle()
  const session = (row as any)?.workout_session_blocks?.workout_sessions
  if (!row || session?.user_id !== user.id) { res.status(404).json({ error: 'Not found' }); return }
  const blockTypeSlug = (row as any).workout_session_blocks?.block_types?.slug as string

  // 2. User-Presets + Übungskatalog (Selects wie prepareGenerationV2/prepare-plan-generation)
  //    user_equipments, user_environments, user_equipment_environments,
  //    user_profiles(user_category_levels, sport_id) + sports.group_name,
  //    exercises mit vollem Taxonomie-Select + exercise_environments,
  //    exercise_equipments, exercise_blocks, exercise_regions, exercise_sport_groups.
  //    → ExerciseFilterMaps + V2Exercise[]-Mapping (toV2 wie in prepare-v2,
  //      zusätzlich categories-Objekt an der Row lassen für den Level-Check).

  // 3. Pool + Vorgaben
  //    const { alternatives, locked } = buildSwapPool({ ... dayEnvId: session.environment_id ?? null ... })
  //    prescription je Alternative: derivePrescription(current, {
  //      measurement_type: alt.measurement_type,
  //      requiresEquipment: (equipByExercise.get(alt.id)?.size ?? 0) > 0,
  //    }, blockTypeSlug)

  // 4. future_occurrence_count: Geschwister-Zeilen gleicher Blueprint-Übung
  //    in scheduled/in_progress-Sessions mit scheduled_at >= dieser Session (ohne diese Zeile).

  // 5. Response-Assembly (konkret):
  const toExerciseDto = (e: V2Exercise & { thumbnail_storage_path?: string | null }) => ({
    id: e.id, slug: e.slug, name: e.name,
    thumbnail_storage_path: e.thumbnail_storage_path ?? null,
    equipment: [...(equipByExercise.get(e.id) ?? [])].map((id) => equipmentNameById.get(id) ?? id),
  })
  res.json({
    alternatives: alternatives.map((alt) => ({
      exercise: toExerciseDto(alt),
      prescription: derivePrescription(currentPrescription, {
        measurement_type: alt.measurement_type,
        requiresEquipment: (equipByExercise.get(alt.id)?.size ?? 0) > 0,
      }, blockTypeSlug),
    })),
    locked: locked.map((l) => ({ exercise: toExerciseDto(l.exercise), unlock_level: l.unlock_level })),
    future_occurrence_count: count ?? 0,
  })
}
```

(`thumbnail_storage_path` und ein `equipments`-Lookup (`id, name_i18n`→`equipmentNameById`, Sprache aus `?lang=`-Query-Param mit Default `de`) gehören mit in die Selects von Abschnitt 2; `currentPrescription` ist das `CurrentPrescription`-Subset der geladenen Zeile.)

Die auskommentierten Abschnitte 2–4 sind im Task auszuprogrammieren — die Selects sind 1:1 die aus `prepare-plan-generation.ts:14–55` (User-Presets) und `prepare-v2.ts` Abschnitt 1 (Übungskatalog + `toV2`); `future_occurrence_count` per

```typescript
  const { count } = await supabase
    .from('workout_session_block_exercises')
    .select('id, workout_session_blocks!inner(workout_sessions!inner(scheduled_at, status))', { count: 'exact', head: true })
    .eq('workout_plan_session_block_exercise_id', (row as any).workout_plan_session_block_exercise_id)
    .neq('id', (row as any).id)
    .gte('workout_session_blocks.workout_sessions.scheduled_at', session.scheduled_at)
    .in('workout_session_blocks.workout_sessions.status', ['scheduled', 'in_progress'])
```

- [ ] **Step 2: Registrieren** in `src/index.ts` (nach der Plan-Generation-Route):

```typescript
import { swapAlternativesHandler } from './swap-route'
app.get('/api/swap-alternatives/:blockExerciseId', swapAlternativesHandler)
```

- [ ] **Step 3: Bundle-Beweis** — Run: `cd externals/jemp-api && npm test && npm run build`
Expected: Tests grün UND esbuild-Bundle ok (beweist: keine openai/zod/temporal-Importe im Graph; schlägt es fehl, fehlt eine Re-Export-Entkopplung aus Task 1 — dann dort nachziehen, nicht openai zu jemp-api hinzufügen).

- [ ] **Step 4: Smoke lokal** — `npm run dev` (jemp-api, `.env` zeigt auf lokale Supabase), dann mit einem lokalen User-JWT:
Run: `curl -s -H "Authorization: Bearer $JWT" localhost:3001/api/swap-alternatives/<id einer lokalen Kraftzeile> | head -c 600`
Expected: JSON mit `alternatives` (nur gleiches Pattern), `locked`, `future_occurrence_count` > 0. Zeilen-ID aus der lokalen DB: `docker exec $(docker ps -qf name=supabase_db) psql -U postgres -c "select x.id from workout_session_block_exercises x where x.assigned_pattern is not null limit 1;"`

- [ ] **Step 5: Commit** — `git add -A externals/jemp-api && git commit -m "feat(api): GET /api/swap-alternatives/:id — Alternativen + Locked + Occurrence-Count"`

---

### Task 7: App — Fetch-Wrapper + Select-Erweiterung

**Files:**
- Create: `lib/fetch-swap-alternatives.ts`
- Modify: `queries/session-detail-select.ts` (Zeile 11: `workout_plan_session_block_exercise_id` ergänzen)
- Test: bestehenden Select-Pin-Test (falls unter `__tests__`/jest vorhanden, per `grep -r SESSION_DETAIL_SELECT --include='*.test.*'` finden) um das neue Feld erweitern.

**Interfaces:**
- Produces:

```typescript
export type SwapAlternative = {
  exercise: { id: string; slug: string; name: string; thumbnail_storage_path: string | null; equipment: string[] }
  prescription: { target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_duration_seconds: number | null; target_distance_meters: number | null; target_rest_seconds: number | null; target_load_type: string | null; target_load_value: number | null; is_amrap: boolean; target_rounds: number | null }
}
export type SwapAlternativesResponse = {
  alternatives: SwapAlternative[]
  locked: Array<{ exercise: SwapAlternative['exercise']; unlock_level: number }>
  future_occurrence_count: number
}
export async function fetchSwapAlternatives(blockExerciseId: string): Promise<SwapAlternativesResponse>
```

- [ ] **Step 1: Wrapper schreiben** (Muster `lib/start-plan-generation.ts`):

```typescript
import { supabase } from '@/services/supabase/client';

export async function fetchSwapAlternatives(blockExerciseId: string): Promise<SwapAlternativesResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/swap-alternatives/${blockExerciseId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return res.json();
}
```

(Typen aus dem Interfaces-Block oben in dieselbe Datei.)

- [ ] **Step 2: Select erweitern** — in `SESSION_DETAIL_SELECT` nach `id, order_index,`: `workout_plan_session_block_exercise_id,` ergänzen (braucht die Scope-Mutation in Task 8); Pin-Test anpassen falls vorhanden.

- [ ] **Step 3: Verifizieren** — Run: `npx tsc --noEmit` (nur eigene Dateien relevant) + ggf. Select-Test.

- [ ] **Step 4: Commit** — `git add lib/fetch-swap-alternatives.ts queries/ && git commit -m "feat(app): Swap-Alternativen-Fetch + Blueprint-Ref im Session-Select"`

---

### Task 8: App — Swap-Mutation mit Scope + Sperre

**Files:**
- Create: `mutations/use-swap-exercise.ts`

**Interfaces:**
- Consumes: `SwapAlternative` (Task 7), `TablesUpdate<'workout_session_block_exercises'>` (database.types nach Task 2).
- Produces:

```typescript
export type SwapScope = 'this_session' | 'this_and_future'
export function useSwapExercise(): UseMutationResult<void, Error, {
  sessionId: string; blockExerciseId: string
  planBlockExerciseId: string | null   // workout_plan_session_block_exercise_id
  scheduledAt: string; currentExerciseId: string
  alternative: SwapAlternative; scope: SwapScope
}>
```

- [ ] **Step 1: Mutation schreiben** (Muster `use-upsert-performed-set.ts`):

```typescript
import { supabase } from '@/services/supabase/client';
import { useInvalidate } from '@/queries/use-invalidate';
import { useMutation } from '@tanstack/react-query';
import type { SwapAlternative } from '@/lib/fetch-swap-alternatives';

export type SwapScope = 'this_session' | 'this_and_future';

async function swapExercise(input: {
    sessionId: string; blockExerciseId: string;
    planBlockExerciseId: string | null;
    scheduledAt: string; currentExerciseId: string;
    alternative: SwapAlternative; scope: SwapScope;
}) {
    // Sperre (Spec §4): Zeilen mit geloggten Sätzen sind nie tauschbar —
    // die UI graut aus, hier die harte zweite Verteidigungslinie.
    const { count: performed } = await supabase
        .from('workout_session_performed_sets')
        .select('id', { count: 'exact', head: true })
        .eq('workout_session_block_exercise_id', input.blockExerciseId);
    if ((performed ?? 0) > 0) throw new Error('swap_blocked_logged_sets');

    const patch = {
        exercise_id: input.alternative.exercise.id,
        swapped_from_exercise_id: input.currentExerciseId,
        ...input.alternative.prescription,
        recommended_load_value: null,
        notes: null,
    };

    if (input.scope === 'this_session' || !input.planBlockExerciseId) {
        const { error } = await supabase
            .from('workout_session_block_exercises').update(patch).eq('id', input.blockExerciseId);
        if (error) throw error;
        return;
    }
    // Alle zukünftigen Occurrences derselben Blueprint-Übung (scheduled/in_progress).
    const { data: siblings, error: selError } = await supabase
        .from('workout_session_block_exercises')
        .select('id, workout_session_blocks!inner(workout_sessions!inner(scheduled_at, status))')
        .eq('workout_plan_session_block_exercise_id', input.planBlockExerciseId)
        .gte('workout_session_blocks.workout_sessions.scheduled_at', input.scheduledAt)
        .in('workout_session_blocks.workout_sessions.status', ['scheduled', 'in_progress']);
    if (selError) throw selError;
    const ids = [...new Set([input.blockExerciseId, ...(siblings ?? []).map(s => s.id)])];
    const { error } = await supabase
        .from('workout_session_block_exercises').update(patch).in('id', ids);
    if (error) throw error;
}

export function useSwapExercise() {
    const { invalidateSessionDetail } = useInvalidate();
    return useMutation({
        mutationFn: swapExercise,
        onSuccess: async (_, input) => { await invalidateSessionDetail(input.sessionId); },
    });
}
```

- [ ] **Step 2: Lokal gegen Dev-DB verifizieren** (Review Focus 1 + Scope): In der lokalen DB einer Kraftzeile einen `performed_set` einfügen, dann per kleinem tsx-Script (oder manuell via psql die gleichen Statements) prüfen: (a) Swap auf dieser Zeile wirft `swap_blocked_logged_sets`; (b) Scope `this_and_future` ändert nur Zeilen zukünftiger `scheduled`-Sessions (completed bleibt): vorher/nachher per
`docker exec $(docker ps -qf name=supabase_db) psql -U postgres -c "select ws.scheduled_at, ws.status, x.exercise_id, x.swapped_from_exercise_id from workout_session_block_exercises x join workout_session_blocks b on b.id=x.workout_session_block_id join workout_sessions ws on ws.id=b.workout_session_id where x.workout_plan_session_block_exercise_id='<blueprint-id>' order by ws.scheduled_at;"`

- [ ] **Step 3: tsc/eslint** — Run: `npx tsc --noEmit && npx eslint mutations/use-swap-exercise.ts`

- [ ] **Step 4: Commit** — `git add mutations/use-swap-exercise.ts && git commit -m "feat(app): Swap-Mutation mit Scope + Logged-Set-Sperre"`

---

### Task 9: App — Swap-Sheet (Route) + i18n

**Files:**
- Create: `app/swap-exercise.tsx`
- Modify: `app/_layout.tsx` (Screen-Registrierung bei den anderen Sheets, ~L169)
- Modify: `i18n/locales/de.ts` + `i18n/locales/en.ts`

**Interfaces:**
- Consumes: `fetchSwapAlternatives` (Task 7), `useSwapExercise`/`SwapScope` (Task 8), `useToastStore`, Sheet-Bauweise (Vorbilder `/edit-profile`, `/session-manage`; Lint-Fallen: Eintritts-Animation via `onLayout` + `entered`-Ref, KEIN useEffect; Shared-Value-Mutationen VOR `useAnimatedStyle`).
- Produces: Route `/swap-exercise?sessionId=…&blockExerciseId=…&planBlockExerciseId=…&scheduledAt=…&exerciseId=…&hasLoggedSets=0|1` — beide Oberflächen öffnen sie per `router.push`.

- [ ] **Step 1: i18n-Keys anlegen** (de/en):

```typescript
// de.ts
'swap.title': 'Übung tauschen',
'swap.subtitle': 'Gleichwertige Alternativen aus deinem Pool',
'swap.empty': 'Für diese Übung gibt es aktuell keine passenden Alternativen.',
'swap.locked_section': 'Noch gesperrt',
'swap.locked_level': 'Ab Level {{level}}',
'swap.locked_tap_hint': 'Diese Übung schaltest du mit steigendem Level frei.',
'swap.scope_title': 'Wo soll getauscht werden?',
'swap.scope_this': 'Nur diese Session',
'swap.scope_future': 'Diese und alle folgenden',
'swap.success': 'Übung getauscht',
'swap.blocked_logged': 'Bereits Sätze geloggt — Tausch nicht mehr möglich.',
// en.ts
'swap.title': 'Swap exercise',
'swap.subtitle': 'Equivalent alternatives from your pool',
'swap.empty': 'No matching alternatives for this exercise right now.',
'swap.locked_section': 'Still locked',
'swap.locked_level': 'From level {{level}}',
'swap.locked_tap_hint': 'You unlock this exercise as your level grows.',
'swap.scope_title': 'Where should it swap?',
'swap.scope_this': 'Only this session',
'swap.scope_future': 'This and all upcoming',
'swap.success': 'Exercise swapped',
'swap.blocked_logged': 'Sets already logged — swapping is no longer possible.',
```

- [ ] **Step 2: Sheet bauen** (`app/swap-exercise.tsx`). Aufbau nach Sheet-Konvention (Backdrop-Sibling-Struktur, Reanimated slide 600→0). Inhalt:
  - Params via `useLocalSearchParams`; `hasLoggedSets === '1'` → sofort Toast `swap.blocked_logged` + `router.back()`.
  - `useQuery({ queryKey: ['swap-alternatives', blockExerciseId], queryFn: () => fetchSwapAlternatives(blockExerciseId) })` → Loading-Spinner im Sheet.
  - Alternativen-Liste: Zeile = Thumbnail (`exerciseThumbnailUrl`), Name, Equipment-`SessionChip`s, Kurz-Vorgabe (z. B. `4×6–8` bzw. `3×30s` aus der prescription formatiert).
  - Locked-Sektion (nur wenn `locked.length > 0`): gedimmte Zeilen (`opacity: 0.45`) mit `lock-closed-outline`-Icon + `swap.locked_level`; `onPress` → `Haptics.notificationAsync(Warning)` + Toast `swap.locked_tap_hint`.
  - Auswahl einer Alternative: wenn `future_occurrence_count > 0` → Scope-Auswahl einblenden (zwei Buttons `swap.scope_this`/`swap.scope_future`), sonst direkt `scope: 'this_session'`.
  - `useSwapExercise().mutateAsync(…)` → Erfolg: Toast `swap.success`, `router.back()`; Fehler `swap_blocked_logged_sets` → Toast `swap.blocked_logged`.
  - Leerer Pool: `swap.empty`-Hinweis statt Liste.

- [ ] **Step 3: Route registrieren** (`app/_layout.tsx`, bei den anderen Sheets):

```tsx
<Stack.Screen name="swap-exercise" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
```

- [ ] **Step 4: tsc/eslint** — Run: `npx tsc --noEmit && npx eslint app/swap-exercise.tsx`

- [ ] **Step 5: Commit** — `git add app/swap-exercise.tsx app/_layout.tsx i18n/ && git commit -m "feat(app): Swap-Sheet mit Alternativen, Locked-Sektion und Scope-Wahl"`

---

### Task 10: App — Einstiegspunkte (Overview + aktive Session)

**Files:**
- Modify: `app/session/[id].tsx` (Übungszeilen-Render ab ~L250)
- Modify: `components/active-session/ExerciseCard.tsx` (titleRow, ~L39–44)

**Interfaces:**
- Consumes: Route `/swap-exercise` (Task 9). Beide Einstiege übergeben `sessionId`, `blockExerciseId` (= Zeilen-`id` aus `useSessionDetailQuery`), `planBlockExerciseId` (neues Select-Feld, Task 7), `scheduledAt` (Session), `exerciseId`, `hasLoggedSets`.

- [ ] **Step 1: Session-Overview** — in der Übungszeile (`styles.exerciseRow`) rechts ein Icon-Button:

```tsx
<TouchableOpacity
    hitSlop={8}
    onPress={() => router.push(`/swap-exercise?sessionId=${session.id}&blockExerciseId=${ex.id}&planBlockExerciseId=${ex.workout_plan_session_block_exercise_id ?? ''}&scheduledAt=${encodeURIComponent(session.scheduled_at)}&exerciseId=${ex.exercise.id}&hasLoggedSets=0`)}
>
    <Ionicons name="swap-horizontal" size={18} color={theme.textMuted} />
</TouchableOpacity>
```

Nur anzeigen, wenn `session.status` `scheduled` oder `in_progress` ist (abgeschlossene Sessions sind Historie). Der Zeilen-Tap (Exercise-Detail) bleibt unverändert.

- [ ] **Step 2: Aktive Session** — in `ExerciseCard` die `titleRow` um den gleichen Button ergänzen (rechts neben `titleLeft`). `hasLoggedSets` kommt aus `useActiveSessionStore` (stores/active-session-store.ts): dort liegt `pendingSets: PendingSet[]`, jeder Eintrag trägt `workout_session_block_exercise_id` —

```tsx
const pendingSets = useActiveSessionStore(s => s.pendingSets);
const hasLoggedSets = pendingSets.some(s => s.workout_session_block_exercise_id === current.id);
```

(Der Store ist via zustand/persist AsyncStorage-persistiert und überlebt App-Neustarts; die harte Verteidigung bleibt ohnehin der `performed_sets`-Count in der Mutation, Task 8.) Button bei `hasLoggedSets` mit `opacity: 0.35` rendern und im `onPress` `hasLoggedSets=1` übergeben — das Sheet zeigt dann den Hinweis. Die Zeilen-Daten (`blockExerciseId` = `current.id`, `planBlockExerciseId`, `scheduledAt`) kommen aus dem geflatteten `allExercises`-Eintrag bzw. der Session-Query; fehlt ein Feld im `FlatExercise`-Typ (stores/active-session-ui-store), dort beim Flatten aus `useSessionDetailQuery` mitgeben.

- [ ] **Step 3: tsc/eslint** — Run: `npx tsc --noEmit && npx eslint "app/session/[id].tsx" components/active-session/ExerciseCard.tsx`

- [ ] **Step 4: Commit** — `git add "app/session/[id].tsx" components/active-session/ExerciseCard.tsx stores/ && git commit -m "feat(app): Swap-Einstiege in Session-Overview und aktiver Session"`

---

### Task 11: End-to-End-Verifikation (lokal) + QA-Checkliste

**Files:** keine neuen — Verifikation.

- [ ] **Step 1: Frischen Plan lokal generieren** — `npx tsx supabase/test-scripts/debug-plan-generation-v2.ts <input.json>`; prüfen, dass Kraftzeilen `assigned_pattern`/`pattern_emphasis` tragen (psql-Query aus Task 3 Step 6).

- [ ] **Step 2: API-Roundtrip** — jemp-api lokal starten, für je eine Zeile aus heavy-Kraftblock, normal-Kraftblock, Accessory und Warmup den Endpoint curlen. Expected: heavy liefert nur sagittale Int≥5-Kandidaten desselben Patterns; normal nur gleiches Pattern; Accessory/Warmup block-typische Kandidaten ohne Pattern-Einschränkung; `locked` enthält Level-gesperrte mit plausiblem `unlock_level`.

- [ ] **Step 3: Alle Suites final** — Run: `cd externals/jemp-temporal-worker && npx vitest run && cd ../jemp-api && npm test && npm run build && cd ../.. && npx tsc --noEmit`
Expected: alles grün.

- [ ] **Step 4: On-Device-QA-Checkliste in den Abschlussbericht schreiben** (für den User auf Staging, NICHT selbst deployen): beide Einstiege öffnen; Loading-State; Alternativen-Auswahl mit Scope-Wahl (nur-diese vs. alle-folgenden in der Wochenansicht gegenprüfen); Locked-Zeile tappen (Haptic+Toast); Übung mit geloggtem Satz (ausgegrauter Button + Hinweis); leerer Pool (exotische Equipment-Kombi).

- [ ] **Step 5: Abschluss-Commit falls Restdateien** — `git status` prüfen, Reste gezielt committen.
