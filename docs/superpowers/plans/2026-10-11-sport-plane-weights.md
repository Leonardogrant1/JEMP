# Sport-Plane-Weights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sportabhängige Bewegungsebenen-Betonung (frontal/transversal) in den normal-emphasis-Kraftmuster-Fenstern des v2-Generators, gesteuert über eine `sport_plane_weights`-Tabelle und einen 10-Slot-Zyklus.

**Architecture:** Eine neue Gewichtstabelle (Zwilling von `sport_conditioning_weights`, aber pro Muster-Familie) speist einen pro Familie laufenden Largest-Remainder-Zyklus (generalisiert aus `conditioning-format.ts`). An Ebenen-Tagen pinnt `patternSlugWindow` eine Übung der Ziel-Ebene ins 4er-Fenster (Ersetzung eines preferred-Pins, Fenster wächst nie) und der Prompt bekommt eine EBENEN-FOKUS-Zeile. Heavy-Muster bleiben unberührt, kein Validator-Zwang.

**Tech Stack:** Supabase-Migration (SQL, lokale CLI `supabase migration up`), TypeScript im Temporal-Worker (`externals/jemp-temporal-worker/`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-sport-plane-weights-design.md`

## Global Constraints

- Jede Migration beginnt mit `-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip` und der Zeile `-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)`.
- Jede Migration läuft in `begin; … commit;` mit `set local lock_timeout = '5s';` als erster Anweisung, ist idempotent, und wird NUR mit `supabase migration up` (installierte CLI, nie npx, nie `db reset`) angewandt. Nie auf Prod pushen.
- Enum-Spalten in VALUES-Joins brauchen explizite Casts (`::movement_pattern`, `::movement_type`, `::laterality`, `::exercise_image_group`, `::strength_pattern`, `::core_type`).
- Worker-Tests: `npx vitest run` aus `externals/jemp-temporal-worker/` (vor dieser Arbeit: 243/243 grün). TypeScript: `npx tsc --noEmit` dort. Arbeitsverzeichnis persistiert NICHT zwischen Shell-Aufrufen — absolute Pfade bzw. `cd … &&` in einem Aufruf.
- Commits enden mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Heavy-Muster nehmen am Ebenen-Zyklus NICHT teil (weder Zähler noch Pin) — Spec §0.1/§3.3.
- Fallback-Prinzip (Spec §2): Datenlöcher (fehlende Tabelle, Gruppe, Muster, leerer Ebenen-Pool) führen IMMER zum heutigen Verhalten, nie zu Fehlern oder verengten Fenstern.

## Review Focus

Spec-implizierte Fälle, je mit pinnendem Test im Besitzer-Task:

1. **Gewichte summieren nicht auf 100** (Admin editiert später eine Zeile): Zyklus muss über die Gesamtsumme normalisieren, nicht über 100 — Test in Task 3 (`buildWeightedCycle` mit Summe 60).
2. **Gruppe hat Zeilen für manche Muster, aber nicht alle** (partieller Seed): fehlende Familie → `DEFAULT_PLANE_WEIGHTS`, vorhandene unverändert — Test in Task 4 (`resolvePlaneWeights` partial).
3. **planePin-Slug doppelt im Fenster** (Pin + rotierter Rest enthalten dieselbe Übung): verschenkter Slot, Fenster effektiv 3 — Test in Task 5 (Pin wird aus Rest entfernt, keine Doppelung).
4. **Alle Gewichte einer Familie 0** (Zeilen vorhanden, aber weight 0): Zyklus fällt auf `sagittal` zurück, kein Fokus — Test in Task 4 (`pickPlaneEmphasis` mit 0/0/0).
5. **Entfernter preferred-Pin verschwindet komplett aus dem Fenster** (Ersetzung wirft Sport-Präferenz raus statt sie nach hinten zu reihen): sie gehört ans Rest-Ende, nicht ins Nichts — Test in Task 5 (ersetzter preferred-Slug ist bei heavy weiterhin enthalten, bei normal hinter dem Fenster-Cut, aber nicht aus `all` gelöscht).

---

### Task 1: Migration `sport_plane_weights` (Tabelle + Seeds)

**Files:**
- Create: `supabase/migrations/20261011110000_add_sport_plane_weights.sql`

**Interfaces:**
- Produces: Tabelle `sport_plane_weights (group_name text, pattern text check in ('knee_dominant','hinge','push','pull'), plane movement_type, weight smallint 0–100, pk (group_name, pattern, plane))`, RLS select für authenticated, 84 Seed-Zeilen (7 Gruppen × 4 Muster × 3 Ebenen). Task 7 lädt sie mit `select('group_name, pattern, plane, weight')`.

- [ ] **Step 1: Migration schreiben**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Bewegungsebenen-Gewichte je Sportgruppe UND Muster-Familie (Spec 2026-10-11
-- §1/§2): Zwilling von sport_conditioning_weights. Steuert, wie oft ein
-- normal-emphasis-Kraftmuster eine frontale/transversale Betonung bekommt.
-- 'sagittal' ist das Komplement ("kein Ebenen-Fokus"). Idempotent.

begin;
set local lock_timeout = '5s';

create table sport_plane_weights (
  group_name text not null,
  pattern text not null check (pattern in ('knee_dominant', 'hinge', 'push', 'pull')),
  plane movement_type not null,
  weight smallint not null check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (group_name, pattern, plane)
);

alter table sport_plane_weights enable row level security;
create policy "Authenticated users can view sport plane weights"
  on sport_plane_weights for select to authenticated using (true);

-- Seeds (Spec §2, Review-korrigiert 11.10.): sagittal/frontal/transverse.
-- athletics sprint-ausgelegt (Werfer = bekannter Sonderfall via 'other'/spätere
-- Gruppe); combat hinge 60/10/30 setzt die Content-Migration (Task 2) voraus.
insert into sport_plane_weights (group_name, pattern, plane, weight)
select v.g, v.p, v.plane::movement_type, v.w
from (values
  ('combat_sports', 'knee_dominant', 'sagittal', 50), ('combat_sports', 'knee_dominant', 'frontal', 10), ('combat_sports', 'knee_dominant', 'transverse', 40),
  ('combat_sports', 'hinge',         'sagittal', 60), ('combat_sports', 'hinge',         'frontal', 10), ('combat_sports', 'hinge',         'transverse', 30),
  ('combat_sports', 'push',          'sagittal', 40), ('combat_sports', 'push',          'frontal',  0), ('combat_sports', 'push',          'transverse', 60),
  ('combat_sports', 'pull',          'sagittal', 60), ('combat_sports', 'pull',          'frontal',  0), ('combat_sports', 'pull',          'transverse', 40),
  ('team_sports',   'knee_dominant', 'sagittal', 50), ('team_sports',   'knee_dominant', 'frontal', 40), ('team_sports',   'knee_dominant', 'transverse', 10),
  ('team_sports',   'hinge',         'sagittal', 55), ('team_sports',   'hinge',         'frontal', 20), ('team_sports',   'hinge',         'transverse', 25),
  ('team_sports',   'push',          'sagittal', 75), ('team_sports',   'push',          'frontal',  0), ('team_sports',   'push',          'transverse', 25),
  ('team_sports',   'pull',          'sagittal', 80), ('team_sports',   'pull',          'frontal',  0), ('team_sports',   'pull',          'transverse', 20),
  ('racket_sports', 'knee_dominant', 'sagittal', 50), ('racket_sports', 'knee_dominant', 'frontal', 25), ('racket_sports', 'knee_dominant', 'transverse', 25),
  ('racket_sports', 'hinge',         'sagittal', 60), ('racket_sports', 'hinge',         'frontal', 10), ('racket_sports', 'hinge',         'transverse', 30),
  ('racket_sports', 'push',          'sagittal', 50), ('racket_sports', 'push',          'frontal',  0), ('racket_sports', 'push',          'transverse', 50),
  ('racket_sports', 'pull',          'sagittal', 60), ('racket_sports', 'pull',          'frontal',  0), ('racket_sports', 'pull',          'transverse', 40),
  ('athletics',     'knee_dominant', 'sagittal', 80), ('athletics',     'knee_dominant', 'frontal', 15), ('athletics',     'knee_dominant', 'transverse',  5),
  ('athletics',     'hinge',         'sagittal', 85), ('athletics',     'hinge',         'frontal', 10), ('athletics',     'hinge',         'transverse',  5),
  ('athletics',     'push',          'sagittal', 90), ('athletics',     'push',          'frontal',  0), ('athletics',     'push',          'transverse', 10),
  ('athletics',     'pull',          'sagittal', 90), ('athletics',     'pull',          'frontal',  0), ('athletics',     'pull',          'transverse', 10),
  ('endurance',     'knee_dominant', 'sagittal', 80), ('endurance',     'knee_dominant', 'frontal', 15), ('endurance',     'knee_dominant', 'transverse',  5),
  ('endurance',     'hinge',         'sagittal', 90), ('endurance',     'hinge',         'frontal',  5), ('endurance',     'hinge',         'transverse',  5),
  ('endurance',     'push',          'sagittal', 95), ('endurance',     'push',          'frontal',  0), ('endurance',     'push',          'transverse',  5),
  ('endurance',     'pull',          'sagittal', 95), ('endurance',     'pull',          'frontal',  0), ('endurance',     'pull',          'transverse',  5),
  ('strength',      'knee_dominant', 'sagittal', 85), ('strength',      'knee_dominant', 'frontal', 10), ('strength',      'knee_dominant', 'transverse',  5),
  ('strength',      'hinge',         'sagittal', 90), ('strength',      'hinge',         'frontal',  5), ('strength',      'hinge',         'transverse',  5),
  ('strength',      'push',          'sagittal', 90), ('strength',      'push',          'frontal',  0), ('strength',      'push',          'transverse', 10),
  ('strength',      'pull',          'sagittal', 90), ('strength',      'pull',          'frontal',  0), ('strength',      'pull',          'transverse', 10),
  ('other',         'knee_dominant', 'sagittal', 60), ('other',         'knee_dominant', 'frontal', 25), ('other',         'knee_dominant', 'transverse', 15),
  ('other',         'hinge',         'sagittal', 75), ('other',         'hinge',         'frontal', 15), ('other',         'hinge',         'transverse', 10),
  ('other',         'push',          'sagittal', 80), ('other',         'push',          'frontal',  0), ('other',         'push',          'transverse', 20),
  ('other',         'pull',          'sagittal', 80), ('other',         'pull',          'frontal',  0), ('other',         'pull',          'transverse', 20)
) as v(g, p, plane, w)
on conflict (group_name, pattern, plane) do nothing;

commit;
```

- [ ] **Step 2: Anwenden**

Run: `supabase migration up`
Expected: `Applying migration 20261011110000_add_sport_plane_weights.sql...` ohne Fehler.

- [ ] **Step 3: Verifizieren (Zeilenzahl + Summen)**

Run:
```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -c "
select count(*) as rows_total from sport_plane_weights;
" -c "
select group_name, pattern, sum(weight) as s from sport_plane_weights
group by 1,2 having sum(weight) <> 100;"
```
Expected: `rows_total = 84`; zweite Query **0 Zeilen** (jede Gruppe×Muster-Kombi summiert auf 100).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261011110000_add_sport_plane_weights.sql
git commit -m "feat: add sport_plane_weights table + seeds (spec 2026-10-11 §1/§2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Content-Migration — transversale Push/Pull- & hinge-Lücken

**Files:**
- Create: `supabase/migrations/20261011120000_add_transverse_upper_hinge_exercises.sql`

**Interfaces:**
- Produces: 6 Übungen (Spec §5): `split_stance_landmine_press`, `single_arm_cable_press_rotation`, `rotational_cable_row`, `single_arm_dumbbell_row_rotation`, `cross_body_kettlebell_deadlift`, `single_leg_rdl_lateral_reach` — alle `category strength`, `laterality unilateral`, mit `strength_pattern` + `movement_type` gesetzt, damit sie in den Pattern-Pools (nicht im Accessory-Pool) landen.

- [ ] **Step 1: Migration schreiben**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Transversale Push/Pull- und hinge-Lücken schließen (Spec 2026-10-11 §5):
-- Push transversal hatte 1 Übung (explosive_rotational_cable_press), Pull 0,
-- hinge transversal 1 / frontal 0. Gehört in DASSELBE Deployment wie der
-- sport_plane_weights-Seed (combat hinge 30 % setzt den Pool voraus).
-- Ohne Video/Thumbnail (nachpflegen). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, strength_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select v.name, v.slug, c.id, v.region::body_region, v.pattern::movement_pattern,
  v.strength_pattern::strength_pattern, v.min_level, 100, v.intensity, 'dynamic', 'reps',
  'unilateral'::laterality, v.movement_type::movement_type, false,
  v.image_group::exercise_image_group, v.descr::jsonb
from (values
  ('Split Stance Landmine Press', 'split_stance_landmine_press', 'shoulder', 'push', 'push_vertical', 20, 6, 'transverse', 'upper_push',
   '{"de": "Im Schrittstand die Landmine-Stange einarmig schräg nach vorn-oben drücken — Hüfte und Rumpf übertragen die Kraft vom Boden in den Arm. Der Schlag als Kraftübung: schwer, geführt, kontrolliert.", "en": "In a split stance, press the landmine bar up and forward with one arm — hips and trunk transfer force from the ground into the arm. The punch as a strength exercise: heavy, guided, controlled."}'),
  ('Single-Arm Cable Press with Rotation', 'single_arm_cable_press_rotation', 'chest', 'push', 'push_horizontal', 25, 6, 'transverse', 'upper_push',
   '{"de": "Kabel auf Brusthöhe, Schrittstand mit Rücken zur Maschine: einarmig nach vorn drücken und dabei Hüfte und Rumpf in den Stoß eindrehen. Druckkraft aus der Rotationskette statt aus der Bank.", "en": "Cable at chest height, split stance facing away: press forward with one arm while hips and trunk rotate into the push. Pressing power from the rotational chain, not the bench."}'),
  ('Rotational Cable Row', 'rotational_cable_row', 'upper_back', 'pull', 'pull_horizontal', 15, 5, 'transverse', 'upper_pull',
   '{"de": "Kabel einarmig aus leichter Rotation heranziehen und den Rumpf mit dem Zug aufdrehen. Zugkraft plus Rotationskontrolle — die Gegenbewegung zu jedem Schlag und Wurf.", "en": "Row the cable with one arm out of a slight rotation, opening the trunk as you pull. Pulling strength plus rotational control — the counter-movement to every punch and throw."}'),
  ('Single-Arm Dumbbell Row with Rotation', 'single_arm_dumbbell_row_rotation', 'upper_back', 'pull', 'pull_horizontal', 20, 5, 'transverse', 'upper_pull',
   '{"de": "Einarmiges Rudern, am obersten Punkt den Oberkörper leicht zur Zugseite aufdrehen und kontrolliert zurück. Rücken und Rumpf arbeiten gegen Rotation unter Last.", "en": "Single-arm row; at the top, rotate the torso slightly toward the pulling side and return under control. Back and trunk work against rotation under load."}'),
  ('Cross-Body Kettlebell Deadlift', 'cross_body_kettlebell_deadlift', 'hamstring', 'pull', 'hinge', 20, 5, 'transverse', 'hip_hinge',
   '{"de": "Kettlebell steht außen neben dem gegenüberliegenden Fuß: in der Hüftbeuge diagonal über den Körper greifen, aufrichten, kontrolliert zurück. Hüftzug mit Rotationsanteil — die hintere Kette lernt Drehen unter Last.", "en": "Kettlebell placed outside the opposite foot: hinge, reach diagonally across the body, stand tall, return under control. A hip hinge with a rotational component — the posterior chain learns to turn under load."}'),
  ('Single-Leg RDL with Lateral Reach', 'single_leg_rdl_lateral_reach', 'hamstring', 'pull', 'hinge', 25, 5, 'frontal', 'hip_hinge',
   '{"de": "Einbeiniges Kreuzheben, die Hantel in der Hüftbeuge seitlich neben das Standbein führen statt gerade nach unten. Die hintere Kette arbeitet, während die Hüfte seitlich stabilisiert — Bremskraft für Richtungswechsel.", "en": "Single-leg RDL, guiding the weight laterally beside the stance leg instead of straight down. The posterior chain works while the hip stabilizes laterally — braking strength for change of direction."}')
) as v(name, slug, region, pattern, strength_pattern, min_level, intensity, movement_type, image_group, descr)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Equipment (any-match): Landmine/Cable ortsgebunden, Hantel-Übungen flexibel.
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('split_stance_landmine_press', 'landmine'),
  ('single_arm_cable_press_rotation', 'cable_machine'),
  ('rotational_cable_row', 'cable_machine'),
  ('single_arm_dumbbell_row_rotation', 'dumbbell'), ('single_arm_dumbbell_row_rotation', 'bench'),
  ('cross_body_kettlebell_deadlift', 'kettlebell'), ('cross_body_kettlebell_deadlift', 'dumbbell'),
  ('single_leg_rdl_lateral_reach', 'dumbbell'), ('single_leg_rdl_lateral_reach', 'kettlebell')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

-- Environments: Landmine/Cable nur gym, Hantel-Übungen gym/home.
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
  (e.slug in ('split_stance_landmine_press', 'single_arm_cable_press_rotation', 'rotational_cable_row') and env.slug = 'gym')
  or (e.slug in ('single_arm_dumbbell_row_rotation', 'cross_body_kettlebell_deadlift', 'single_leg_rdl_lateral_reach') and env.slug in ('gym', 'home'))
)
where not exists (
  select 1 from exercise_environments xe
  where xe.exercise_id = e.id and xe.environment_id = env.id
);

-- exercise_regions: primäre Region konsistent zur body_region-Spalte.
insert into exercise_regions (exercise_id, region, role)
select e.id, e.body_region, 'primary'
from exercises e
where e.slug in ('split_stance_landmine_press', 'single_arm_cable_press_rotation', 'rotational_cable_row',
                 'single_arm_dumbbell_row_rotation', 'cross_body_kettlebell_deadlift', 'single_leg_rdl_lateral_reach')
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
```

Hinweis (wie `romanian_deadlift` im Bestand): hinge-Übungen tragen `movement_pattern 'pull'` — die Pool-Zuordnung läuft ausschließlich über `strength_pattern`.

- [ ] **Step 2: Anwenden**

Run: `supabase migration up`
Expected: `Applying migration 20261011120000_add_transverse_upper_hinge_exercises.sql...` ohne Fehler.

- [ ] **Step 3: Pool-Stände verifizieren**

Run:
```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -c "
select strength_pattern, movement_type, count(*) from exercises
where strength_pattern is not null and movement_type <> 'sagittal'
group by 1,2 order by 1,2;"
```
Expected enthält mindestens: `hinge/frontal 1`, `hinge/transverse 2`, `knee_dominant/frontal 4`, `knee_dominant/transverse 2`, `pull_horizontal/transverse 2`, `push_horizontal/transverse 1`, `push_vertical/transverse 1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261011120000_add_transverse_upper_hinge_exercises.sql
git commit -m "feat: add transverse push/pull + hinge plane-gap exercises (spec 2026-10-11 §5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `weighted-cycle.ts` — Generalisierung des Largest-Remainder-Zyklus

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/weighted-cycle.ts`
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/conditioning-format.ts:27-54` (buildFormatCycle delegiert)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/weighted-cycle.test.ts`

**Interfaces:**
- Produces: `buildWeightedCycle<T extends string>(weights: Record<T, number>, order: T[], fallback: T): T[]` (Länge 10, exportierte Konstante `CYCLE_LENGTH = 10`). Verhalten identisch zum heutigen `buildFormatCycle`: Largest Remainder (Gleichstand → kleineres Gewicht zuerst), Verschränkung über `(k + 0.5) / n` (Gleichstand: kleineres n, dann lexikografisch).
- Consumes: nichts.

- [ ] **Step 1: Failing Test schreiben**

```ts
// __tests__/weighted-cycle.test.ts
import { describe, it, expect } from 'vitest'
import { buildWeightedCycle, CYCLE_LENGTH } from '../weighted-cycle'

const count = (cycle: string[], v: string) => cycle.filter((x) => x === v).length

describe('buildWeightedCycle (Spec 2026-10-11 §3.1 — Generalisierung)', () => {
  const order = ['a', 'b', 'c'] as const

  it('verteilt nach Largest Remainder auf 10 Slots', () => {
    const cycle = buildWeightedCycle({ a: 50, b: 40, c: 10 }, [...order], 'a')
    expect(cycle).toHaveLength(CYCLE_LENGTH)
    expect(count(cycle, 'a')).toBe(5)
    expect(count(cycle, 'b')).toBe(4)
    expect(count(cycle, 'c')).toBe(1)
  })

  it('normalisiert über die Gesamtsumme, nicht über 100 (Review Focus 1)', () => {
    const cycle = buildWeightedCycle({ a: 30, b: 30, c: 0 }, [...order], 'a')
    expect(count(cycle, 'a')).toBe(5)
    expect(count(cycle, 'b')).toBe(5)
    expect(count(cycle, 'c')).toBe(0)
  })

  it('kleines Gewicht fällt nicht auf 0 (Tie → kleineres Gewicht gewinnt Rest-Slot)', () => {
    const cycle = buildWeightedCycle({ a: 90, b: 5, c: 5 }, [...order], 'a')
    expect(count(cycle, 'b')).toBeGreaterThanOrEqual(0) // b ODER c bekommt den Rest-Slot
    expect(count(cycle, 'b') + count(cycle, 'c')).toBe(1)
  })

  it('Ein-Slot-Kategorien landen in der Zyklus-Mitte (Verschränkung)', () => {
    const cycle = buildWeightedCycle({ a: 50, b: 40, c: 10 }, [...order], 'a')
    const idx = cycle.indexOf('c')
    expect(idx).toBeGreaterThanOrEqual(3)
    expect(idx).toBeLessThanOrEqual(6)
  })

  it('Gesamtgewicht 0 → Zyklus voll fallback', () => {
    const cycle = buildWeightedCycle({ a: 0, b: 0, c: 0 }, [...order], 'b')
    expect(cycle).toEqual(Array(CYCLE_LENGTH).fill('b'))
  })
})
```

- [ ] **Step 2: Test laufen lassen — RED**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/weighted-cycle.test.ts`
Expected: FAIL — `Cannot find module '../weighted-cycle'` (o. ä. Modul-Fehler).

- [ ] **Step 3: Implementierung — Logik aus `buildFormatCycle` generisch extrahieren**

```ts
// weighted-cycle.ts
// Generischer Largest-Remainder-10-Slot-Zyklus (Spec 2026-10-11 §3.1) —
// extrahiert aus conditioning-format.ts, Verhalten identisch. Pure, kein IO.

export const CYCLE_LENGTH = 10

/** Largest Remainder auf 10 Slots (Gleichstand: kleineres Gewicht gewinnt, damit
 *  5 %-Gewichte nicht systematisch auf 0 fallen), dann Verschränkung über
 *  Positions-Schlüssel (k + 0.5) / n (Gleichstand: kleineres n zuerst) —
 *  so landen Ein-Slot-Kategorien in der Zyklus-Mitte statt am Ende. */
export function buildWeightedCycle<T extends string>(
  weights: Record<T, number>,
  order: T[],
  fallback: T,
): T[] {
  const total = order.reduce((s, f) => s + weights[f], 0)
  if (total <= 0) return Array(CYCLE_LENGTH).fill(fallback)

  const quota = order.map((f) => ({ f, exact: (weights[f] / total) * CYCLE_LENGTH }))
  const slots = new Map<T, number>(quota.map((q) => [q.f, Math.floor(q.exact)]))
  let remaining = CYCLE_LENGTH - [...slots.values()].reduce((a, b) => a + b, 0)
  const byRemainder = [...quota]
    .filter((q) => weights[q.f] > 0)
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || weights[a.f] - weights[b.f])
  for (const q of byRemainder) {
    if (remaining <= 0) break
    slots.set(q.f, (slots.get(q.f) ?? 0) + 1)
    remaining--
  }

  const keyed: Array<{ f: T; key: number; n: number }> = []
  for (const f of order) {
    const n = slots.get(f) ?? 0
    for (let k = 0; k < n; k++) keyed.push({ f, key: (k + 0.5) / n, n })
  }
  keyed.sort((a, b) => a.key - b.key || a.n - b.n || a.f.localeCompare(b.f))
  return keyed.map((e) => e.f)
}
```

In `conditioning-format.ts`: den Funktionskörper von `buildFormatCycle` (Zeilen 31–54) ersetzen durch Delegation, `CYCLE_LENGTH`-Konstante (Zeile 8) entfernen und aus `weighted-cycle` importieren:

```ts
import { buildWeightedCycle, CYCLE_LENGTH } from './weighted-cycle'
// …
export function buildFormatCycle(weights: ConditioningWeights): ConditioningFormat[] {
  return buildWeightedCycle(weights, FORMATS, 'intensive')
}
```
(`pickSessionFormat` nutzt `CYCLE_LENGTH` weiter — Import deckt das.)

- [ ] **Step 4: Tests laufen lassen — GREEN, Conditioning unverändert grün**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run`
Expected: alle Tests PASS, darunter die bestehenden conditioning-format-/build-simple-sessions-Tests OHNE Änderung an deren Testdateien, plus 5 neue weighted-cycle-Tests.

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/v2/weighted-cycle.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/conditioning-format.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/weighted-cycle.test.ts
git commit -m "refactor: extract generic buildWeightedCycle from conditioning-format

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `plane-emphasis.ts` — Familien-Mapping, Gewichts-Auflösung, Zyklus-Pick

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/plane-emphasis.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/plane-emphasis.test.ts`

**Interfaces:**
- Consumes: `buildWeightedCycle`, `CYCLE_LENGTH` aus `./weighted-cycle` (Task 3).
- Produces (Task 7 konsumiert alles):
  - `type Plane = 'sagittal' | 'frontal' | 'transverse'`
  - `type PlaneWeights = Record<Plane, number>`
  - `type PatternFamily = 'knee_dominant' | 'hinge' | 'push' | 'pull'`
  - `const DEFAULT_PLANE_WEIGHTS: PlaneWeights = { sagittal: 100, frontal: 0, transverse: 0 }`
  - `const PLANE_CYCLE_STRIDE = 3`
  - `toPatternFamily(pattern: string): PatternFamily`
  - `resolvePlaneWeights(rows: Array<{ group_name: string; pattern: string; plane: string; weight: number }>, groupName: string | undefined): Record<PatternFamily, PlaneWeights>`
  - `pickPlaneEmphasis(weights: PlaneWeights, position: number): Plane`

- [ ] **Step 1: Failing Test schreiben**

```ts
// __tests__/plane-emphasis.test.ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PLANE_WEIGHTS, PLANE_CYCLE_STRIDE,
  pickPlaneEmphasis, resolvePlaneWeights, toPatternFamily,
} from '../plane-emphasis'

const rows = (g: string, p: string, w: [number, number, number]) => [
  { group_name: g, pattern: p, plane: 'sagittal', weight: w[0] },
  { group_name: g, pattern: p, plane: 'frontal', weight: w[1] },
  { group_name: g, pattern: p, plane: 'transverse', weight: w[2] },
]

describe('toPatternFamily (Spec §1: push/pull auf Familien-Ebene)', () => {
  it('mappt die sechs Muster auf vier Familien', () => {
    expect(toPatternFamily('knee_dominant')).toBe('knee_dominant')
    expect(toPatternFamily('hinge')).toBe('hinge')
    expect(toPatternFamily('push_vertical')).toBe('push')
    expect(toPatternFamily('push_horizontal')).toBe('push')
    expect(toPatternFamily('pull_vertical')).toBe('pull')
    expect(toPatternFamily('pull_horizontal')).toBe('pull')
  })
})

describe('resolvePlaneWeights (Spec §2 Fallback)', () => {
  it('liefert die Gewichte der Gruppe pro Familie', () => {
    const w = resolvePlaneWeights(
      [...rows('combat_sports', 'push', [40, 0, 60]), ...rows('combat_sports', 'hinge', [60, 10, 30])],
      'combat_sports',
    )
    expect(w.push).toEqual({ sagittal: 40, frontal: 0, transverse: 60 })
    expect(w.hinge).toEqual({ sagittal: 60, frontal: 10, transverse: 30 })
  })

  it('partieller Seed: fehlende Familie → DEFAULT, vorhandene unverändert (Review Focus 2)', () => {
    const w = resolvePlaneWeights(rows('combat_sports', 'push', [40, 0, 60]), 'combat_sports')
    expect(w.push.transverse).toBe(60)
    expect(w.knee_dominant).toEqual(DEFAULT_PLANE_WEIGHTS)
    expect(w.pull).toEqual(DEFAULT_PLANE_WEIGHTS)
  })

  it('fehlende Gruppe / undefined → überall DEFAULT (heutiges Verhalten)', () => {
    expect(resolvePlaneWeights(rows('team_sports', 'push', [75, 0, 25]), 'combat_sports').push).toEqual(DEFAULT_PLANE_WEIGHTS)
    expect(resolvePlaneWeights([], undefined).hinge).toEqual(DEFAULT_PLANE_WEIGHTS)
  })
})

describe('pickPlaneEmphasis (Spec §3.2/§3.3)', () => {
  it('Verteilung über 10 Positionen entspricht den Gewichten', () => {
    const w = { sagittal: 40, frontal: 0, transverse: 60 }
    const picks = Array.from({ length: 10 }, (_, i) => pickPlaneEmphasis(w, i))
    expect(picks.filter((p) => p === 'transverse')).toHaveLength(6)
    expect(picks.filter((p) => p === 'sagittal')).toHaveLength(4)
    expect(picks.filter((p) => p === 'frontal')).toHaveLength(0)
  })

  it('alle Gewichte 0 → sagittal (kein Fokus, Review Focus 4)', () => {
    expect(pickPlaneEmphasis({ sagittal: 0, frontal: 0, transverse: 0 }, 3)).toBe('sagittal')
  })

  it('DEFAULT_PLANE_WEIGHTS → immer sagittal', () => {
    for (let i = 0; i < 10; i++) expect(pickPlaneEmphasis(DEFAULT_PLANE_WEIGHTS, i)).toBe('sagittal')
  })

  it('Position wrappt über die Zykluslänge', () => {
    const w = { sagittal: 50, frontal: 25, transverse: 25 }
    expect(pickPlaneEmphasis(w, 13)).toBe(pickPlaneEmphasis(w, 3))
  })

  it('Stride 3: zwei Vorkommen pro Woche überlappen zwischen Folgeplänen nicht (Spec §3.3)', () => {
    // Plan n belegt Positionen n*3 und n*3+1; Plan n+1 startet bei n*3+3.
    const plan0 = [0 * PLANE_CYCLE_STRIDE + 0, 0 * PLANE_CYCLE_STRIDE + 1]
    const plan1 = [1 * PLANE_CYCLE_STRIDE + 0, 1 * PLANE_CYCLE_STRIDE + 1]
    expect(new Set([...plan0, ...plan1]).size).toBe(4)
    // ggT(3,10)=1: ein Vorkommen/Woche durchläuft über 10 Pläne alle 10 Slots.
    const seen = new Set(Array.from({ length: 10 }, (_, plan) => (plan * PLANE_CYCLE_STRIDE) % 10))
    expect(seen.size).toBe(10)
  })
})
```

- [ ] **Step 2: Test laufen lassen — RED**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/plane-emphasis.test.ts`
Expected: FAIL — Modul `../plane-emphasis` nicht gefunden.

- [ ] **Step 3: Implementierung**

```ts
// plane-emphasis.ts
// Bewegungsebenen-Betonung (Spec 2026-10-11): Gewichte je Sportgruppe und
// Muster-Familie → 10-Slot-Zyklus → deterministische Ebene pro Vorkommen.
// Pure, kein IO.

import { buildWeightedCycle, CYCLE_LENGTH } from './weighted-cycle'

export type Plane = 'sagittal' | 'frontal' | 'transverse'
export type PlaneWeights = Record<Plane, number>
export type PatternFamily = 'knee_dominant' | 'hinge' | 'push' | 'pull'

const PLANES: Plane[] = ['sagittal', 'frontal', 'transverse']
export const FAMILIES: PatternFamily[] = ['knee_dominant', 'hinge', 'push', 'pull']

/** Neutraler Default (Spec §2): Datenlöcher verhalten sich wie heute — nie
 *  Fenster verengen. Bewusst KEIN 'other'-Fallback wie beim Conditioning. */
export const DEFAULT_PLANE_WEIGHTS: PlaneWeights = { sagittal: 100, frontal: 0, transverse: 0 }

/** Zyklusposition = planCount * STRIDE + Vorkommens-Index (Spec §3.3):
 *  Stride 3 beseitigt den Überlapp bei 2 Vorkommen/Woche, und ggT(3, 10) = 1
 *  garantiert volle Zyklusabdeckung bei 1 Vorkommen/Woche. */
export const PLANE_CYCLE_STRIDE = 3

/** push_vertical|push_horizontal → push usw. — ein rotationales Drücken
 *  ersetzt vertikal wie horizontal (Spec §1). */
export function toPatternFamily(pattern: string): PatternFamily {
  if (pattern === 'knee_dominant' || pattern === 'hinge') return pattern
  return pattern.startsWith('push') ? 'push' : 'pull'
}

export function resolvePlaneWeights(
  rows: Array<{ group_name: string; pattern: string; plane: string; weight: number }>,
  groupName: string | undefined,
): Record<PatternFamily, PlaneWeights> {
  const result = {} as Record<PatternFamily, PlaneWeights>
  for (const fam of FAMILIES) {
    const g = groupName ? rows.filter((r) => r.group_name === groupName && r.pattern === fam) : []
    if (g.length === 0) { result[fam] = DEFAULT_PLANE_WEIGHTS; continue }
    const w = { ...DEFAULT_PLANE_WEIGHTS, sagittal: 0 }
    for (const p of PLANES) w[p] = g.find((r) => r.plane === p)?.weight ?? 0
    result[fam] = w
  }
  return result
}

export function pickPlaneEmphasis(weights: PlaneWeights, position: number): Plane {
  const cycle = buildWeightedCycle(weights, PLANES, 'sagittal')
  return cycle[((position % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH]
}
```

- [ ] **Step 4: Tests laufen lassen — GREEN**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/plane-emphasis.test.ts`
Expected: PASS (alle neuen Tests).

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/v2/plane-emphasis.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/plane-emphasis.test.ts
git commit -m "feat: plane-emphasis module — family mapping, weight resolution, stride-3 cycle pick

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `pool.ts` — `pickPlanePin` + planePin in `patternSlugWindow`

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts:138-147` (patternSlugWindow) + neue Funktion davor
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pool.test.ts` (ergänzen, bestehende Tests unangetastet)

**Interfaces:**
- Consumes: `V2Exercise` (hat `movement_type: string`, `preferred?: boolean`), `rotateSlugs(slugs, offset)` — beides in pool.ts vorhanden.
- Produces (Task 7 konsumiert):
  - `pickPlanePin(pool: V2Exercise[], plane: string, offset: number): string | null` — erste Übung mit `movement_type === plane` in rotierter Reihenfolge; Fallback: erste andere nicht-sagittale; sonst null.
  - `patternSlugWindow(pool: V2Exercise[], emphasis: 'heavy' | 'normal', offset: number, planePin?: string | null): string[]` — 4. Parameter optional, Aufrufe ohne ihn verhalten sich exakt wie heute.

- [ ] **Step 1: Failing Tests schreiben** (in pool.test.ts anhängen; `ex`-Factory ggf. an vorhandene Test-Helpers der Datei anpassen — sie muss `slug`, `movement_type`, `preferred` setzen können)

```ts
describe('pickPlanePin + patternSlugWindow planePin (Spec 2026-10-11 §4.2)', () => {
  const pl = (slug: string, movement_type: string, preferred = false): V2Exercise => ({
    id: slug, slug, name: slug, category_slug: 'strength',
    body_region: 'quad', dominant_region: null, strength_pattern: 'knee_dominant',
    plyo_type: null, core_type: null, sprint_type: null, covered_patterns: null,
    laterality: 'bilateral', min_level: 1, max_level: 100, intensity_score: 5,
    measurement_type: 'reps', legacy_block_slugs: null, movement_type,
    is_explosive: false, regions: null, preferred,
  })
  const pool = [
    pl('back_squat', 'sagittal'), pl('front_squat', 'sagittal'),
    pl('split_squat', 'sagittal'), pl('reverse_lunge', 'sagittal'),
    pl('lateral_lunge', 'frontal'), pl('kb_split_squat_rotation', 'transverse'),
  ]

  it('pickPlanePin findet die Ziel-Ebene, rotiert mit offset', () => {
    expect(pickPlanePin(pool, 'frontal', 0)).toBe('lateral_lunge')
    expect(pickPlanePin(pool, 'transverse', 0)).toBe('kb_split_squat_rotation')
  })

  it('pickPlanePin: Ziel-Ebene leer → Fallback andere nicht-sagittale, sonst null', () => {
    const noFrontal = pool.filter((e) => e.movement_type !== 'frontal')
    expect(pickPlanePin(noFrontal, 'frontal', 0)).toBe('kb_split_squat_rotation')
    const onlySagittal = pool.filter((e) => e.movement_type === 'sagittal')
    expect(pickPlanePin(onlySagittal, 'frontal', 0)).toBeNull()
  })

  it('planePin steht vorn im normal-Fenster und verdoppelt sich nicht (Review Focus 3)', () => {
    const win = patternSlugWindow(pool, 'normal', 0, 'kb_split_squat_rotation')
    expect(win[0]).toBe('kb_split_squat_rotation')
    expect(win).toHaveLength(4)
    expect(win.filter((s) => s === 'kb_split_squat_rotation')).toHaveLength(1)
  })

  it('planePin ersetzt den letzten preferred-Pin — Fenstergröße wächst nicht (Spec §4.2)', () => {
    const withPref = pool.map((e) => ['back_squat', 'front_squat'].includes(e.slug) ? { ...e, preferred: true } : e)
    const before = patternSlugWindow(withPref, 'normal', 0)
    const after = patternSlugWindow(withPref, 'normal', 0, 'lateral_lunge')
    expect(after).toHaveLength(before.length)
    expect(after[0]).toBe('lateral_lunge')
    expect(after).toContain('back_squat')        // erster preferred-Pin bleibt
    expect(after).not.toContain('front_squat')   // letzter preferred-Pin weicht aus dem Fenster
  })

  it('ersetzter preferred-Pin ist nicht aus dem Gesamtpool gelöscht (Review Focus 5)', () => {
    const withPref = pool.map((e) => ['back_squat', 'front_squat'].includes(e.slug) ? { ...e, preferred: true } : e)
    const heavy = patternSlugWindow(withPref, 'heavy', 0, 'lateral_lunge')
    expect(heavy).toContain('front_squat')       // heavy = voller Pool, Ersetzung irrelevant
    expect(heavy).toHaveLength(pool.length)
  })

  it('Ebenen-Übung, die selbst preferred ist, zählt einmal — kein Ersetzen', () => {
    const prefPlane = pool.map((e) => e.slug === 'lateral_lunge' ? { ...e, preferred: true } : e)
    const win = patternSlugWindow(prefPlane, 'normal', 0, 'lateral_lunge')
    expect(win[0]).toBe('lateral_lunge')
    expect(win.filter((s) => s === 'lateral_lunge')).toHaveLength(1)
    expect(win).toHaveLength(4)
  })

  it('heavy ignoriert planePin (voller Pool, Reihenfolge wie heute)', () => {
    expect(patternSlugWindow(pool, 'heavy', 0, 'lateral_lunge')).toEqual(patternSlugWindow(pool, 'heavy', 0))
  })

  it('ohne planePin exakt heutiges Verhalten (Rückwärtskompatibilität)', () => {
    expect(patternSlugWindow(pool, 'normal', 2)).toEqual(patternSlugWindow(pool, 'normal', 2, null))
  })
})
```

(Import-Zeile der Testdatei um `pickPlanePin` ergänzen.)

- [ ] **Step 2: Tests laufen lassen — RED**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/pool.test.ts`
Expected: FAIL — `pickPlanePin` ist kein Export / neue Assertions schlagen fehl. Bestehende Tests der Datei weiter grün.

- [ ] **Step 3: Implementierung in pool.ts**

Vor `patternSlugWindow` einfügen:

```ts
/** Ebenen-Pin (Spec 2026-10-11 §4.2): erste Übung der Ziel-Ebene in rotierter
 *  Reihenfolge; Fallback andere nicht-sagittale; leerer Ebenen-Pool → null
 *  (kein Pin, Fenster wie heute — Datenlöcher erzwingen nie Effekte). */
export function pickPlanePin(pool: V2Exercise[], plane: string, offset: number): string | null {
  const target = rotateSlugs(pool.filter((e) => e.movement_type === plane).map((e) => e.slug), offset)
  if (target.length > 0) return target[0]
  const nonSagittal = rotateSlugs(pool.filter((e) => e.movement_type !== 'sagittal').map((e) => e.slug), offset)
  return nonSagittal[0] ?? null
}
```

`patternSlugWindow` ersetzen durch:

```ts
/** Pattern-Pool fürs Prompt + Validator (QA 10.10.): schwere Patterns behalten
 *  den vollen Pool (Hauptlift-Stabilität), normale Patterns bekommen ein
 *  rotierendes 4er-Fenster — Sport-Präferenzen stehen immer vorn und fallen
 *  nie aus dem Fenster. planePin (Spec 2026-10-11 §4.2): die Ebenen-Übung wird
 *  als erster Pin gesetzt und ERSETZT den letzten preferred-Pin, statt das
 *  Fenster zu vergrößern — die Verknappung ist der Steuerungsmechanismus. */
export function patternSlugWindow(
  pool: V2Exercise[], emphasis: 'heavy' | 'normal', offset: number,
  planePin?: string | null,
): string[] {
  let pinned = pool.filter((e) => e.preferred).map((e) => e.slug).sort()
  let rest = rotateSlugs(pool.filter((e) => !e.preferred).map((e) => e.slug), offset)
  if (planePin && emphasis === 'normal') {
    if (pinned.includes(planePin)) {
      pinned = [planePin, ...pinned.filter((s) => s !== planePin)]
    } else {
      const displaced = pinned.length > 0 ? pinned[pinned.length - 1] : null
      pinned = [planePin, ...pinned.slice(0, -1)]
      rest = rest.filter((s) => s !== planePin)
      if (displaced) rest = [...rest, displaced] // ans Rest-Ende, nicht ins Nichts
    }
  }
  const all = [...pinned, ...rest]
  return emphasis === 'heavy' ? all : all.slice(0, Math.max(4, pinned.length))
}
```

Achtung `pinned.slice(0, -1)` bei leerem Array ergibt `[]` — der Fall `pinned.length === 0` ist damit korrekt abgedeckt (`[planePin]`).

- [ ] **Step 4: Tests laufen lassen — GREEN, ganze Suite**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run`
Expected: alle Tests PASS (bestehende patternSlugWindow-Tests unverändert grün — der neue Parameter ist optional).

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pool.test.ts
git commit -m "feat: plane pin in patternSlugWindow — replaces preferred pin, window never grows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: EBENEN-FOKUS-Prompt-Zeile (run-session-v2 + v2-prompts)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts:53` (PatternRequirement), `:108-113` (V2SessionContext.patternReqs-Typ), `:179-184` (Prompt-Aufruf)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/v2-prompts.ts:26-37` (Input-Typ), `:110-111` (Rendering)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/v2-prompts.test.ts` (ergänzen)

**Interfaces:**
- Consumes: nichts Neues (Typ-Erweiterung ist additiv; Task 7 befüllt die Felder).
- Produces:
  - `V2SessionContext['patternReqs']`-Einträge erweitert um `planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[]` (auch im `PatternRequirement`-Typ — dort reisen `slugs` als Set, `planeSlugs` bleiben string[]).
  - `V2_SESSION_PROMPT`-Input erweitert um `planeFocusLines?: string[]`; gerendert direkt nach der SPORT-PRÄFERENZ-Zeile.

- [ ] **Step 1: Failing Test schreiben** (in v2-prompts.test.ts anhängen)

```ts
describe('EBENEN-FOKUS-Zeile (Spec 2026-10-11 §4.3)', () => {
  const base = {
    workout: { day_of_week: 4, blocks: [{ block_type: 'warmup', variant: null, emphasis: 'normal' }] },
    day: { day_of_week: 4, minutes: 60, dose: 'normal', suppress_micro_dose: false, carries_sprint_block: false },
    poolLines: ['- `warmup`: hip_cars'],
    sprintPoolLine: null, userContext: '', weekSummary: '', previousSummaries: [],
  }
  it('rendert übergebene EBENEN-FOKUS-Zeilen', () => {
    const p = V2_SESSION_PROMPT({ ...base, planeFocusLines: [
      'EBENEN-FOKUS: Wähle für knee_dominant heute eine dieser Übungen als Sekundärmuster-Übung — rotierende Kraft gehört zum Sport des Athleten: kb_split_squat_rotation',
    ] } as any)
    expect(p).toContain('EBENEN-FOKUS')
    expect(p).toContain('kb_split_squat_rotation')
  })
  it('ohne planeFocusLines keine Zeile', () => {
    expect(V2_SESSION_PROMPT({ ...base } as any)).not.toContain('EBENEN-FOKUS')
    expect(V2_SESSION_PROMPT({ ...base, planeFocusLines: [] } as any)).not.toContain('EBENEN-FOKUS')
  })
})
```

Zusätzlich ein Test für den Zeilen-Bau in run-session-v2 — neue Testdatei-Sektion in v2-prompts.test.ts ODER (sauberer, da die Funktion dort lebt) direkter Export-Test. Dafür in run-session-v2.ts eine kleine pure Funktion exportieren und in `__tests__/v2-prompts.test.ts` testen:

```ts
import { buildPlaneFocusLines } from '../run-session-v2'

describe('buildPlaneFocusLines (Spec §4.3 — Formulierung je Ebene)', () => {
  it('frontal → „laterale", transverse → „rotierende"; nur Einträge mit planeSlugs', () => {
    const lines = buildPlaneFocusLines([
      { block_type: 'lower_strength', pattern: 'knee_dominant', emphasis: 'normal', slugs: [], planeFocus: 'frontal', planeSlugs: ['lateral_lunge'] },
      { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'normal', slugs: [], planeFocus: 'transverse', planeSlugs: ['split_stance_landmine_press'] },
      { block_type: 'lower_strength', pattern: 'hinge', emphasis: 'heavy', slugs: [] },
    ] as any)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('laterale')
    expect(lines[0]).toContain('lateral_lunge')
    expect(lines[1]).toContain('rotierende')
    expect(lines[1]).toContain('push_vertical')
  })
})
```

- [ ] **Step 2: Tests laufen lassen — RED**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/v2-prompts.test.ts`
Expected: FAIL — `buildPlaneFocusLines` nicht exportiert; EBENEN-FOKUS fehlt im Prompt.

- [ ] **Step 3: Implementierung**

`run-session-v2.ts` — `PatternRequirement` (Zeile 53) erweitern:

```ts
export type PatternRequirement = {
  block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: Set<string>
  planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[]
}
```

`V2SessionContext.patternReqs` (Zeile 110) analog:

```ts
patternReqs?: Array<{ block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: string[];
  planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[] }>
```

Neue exportierte Funktion (nach `findV2Violations`):

```ts
/** EBENEN-FOKUS-Zeilen (Spec 2026-10-11 §4.3): explizite Ansage gegen den
 *  Lehrbuch-Bias — Fenster-Verknappung allein reicht nicht, das LLM greift
 *  sonst zur erstbesten Hantelübung. */
export function buildPlaneFocusLines(
  reqs: Array<{ pattern: string; planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[] }>,
): string[] {
  return reqs
    .filter((r) => r.planeFocus && (r.planeSlugs ?? []).length > 0)
    .map((r) => `EBENEN-FOKUS: Wähle für ${r.pattern} heute eine dieser Übungen als Sekundärmuster-Übung — ${r.planeFocus === 'frontal' ? 'laterale' : 'rotierende'} Kraft gehört zum Sport des Athleten: ${r.planeSlugs!.join(', ')}`)
}
```

Im `runSessionV2`-Body: beim Mapping `input.patternReqs → patternReqs` (Zeile 151) die neuen Felder mitnehmen (der Spread `{ ...r, slugs: new Set(r.slugs) }` tut das bereits — keine Änderung nötig), und beim Prompt-Aufruf (Zeile 179) ergänzen:

```ts
const basePrompt = V2_SESSION_PROMPT({
  workout, day, poolLines,
  sprintPoolLine: day.carries_sprint_block ? sprintPool.join(', ') : null,
  preferredLine: preferredInSession.length > 0 ? preferredInSession.join(', ') : null,
  planeFocusLines: buildPlaneFocusLines(input.patternReqs ?? []),
  userContext, weekSummary, previousSummaries,
})
```

`v2-prompts.ts` — Input-Typ um Feld ergänzen (nach `preferredLine`):

```ts
  /** EBENEN-FOKUS (Spec 2026-10-11 §4.3): pro normal-Pattern mit Ebenen-Tag
   *  eine explizite Wahl-Ansage. */
  planeFocusLines?: string[]
```

Destructuring (Zeile 38) um `planeFocusLines` erweitern und das Rendering (Zeile 111) ändern zu:

```ts
${poolLines.join('\n')}${preferredLine ? `\n\nSPORT-PRÄFERENZ: Diese Übungen passen besonders zum Sport des Athleten — wähle sie ihren generischen Alternativen vor, wenn sie die Block-Anforderung gleichwertig erfüllen: ${preferredLine}` : ''}${(planeFocusLines ?? []).length > 0 ? `\n\n${planeFocusLines!.join('\n')}` : ''}
```

- [ ] **Step 4: Tests laufen lassen — GREEN, ganze Suite + tsc**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run && npx tsc --noEmit`
Expected: alle Tests PASS, tsc ohne Fehler.

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/v2-prompts.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/v2-prompts.test.ts
git commit -m "feat: EBENEN-FOKUS prompt line from plane-focused pattern requirements

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: prepare-v2-Plumbing — Laden, Zähler, Pin & patternReqs

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts:134-150` (Loader) und `:301-317` (patternReqs-Loop)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/plane-emphasis.test.ts` (Zähler-Helper, ergänzen)

**Interfaces:**
- Consumes: `resolvePlaneWeights`, `pickPlaneEmphasis`, `toPatternFamily`, `PLANE_CYCLE_STRIDE`, `DEFAULT_PLANE_WEIGHTS`, Typen aus `./plane-emphasis` (Task 4); `pickPlanePin`, erweitertes `patternSlugWindow` aus `./pool` (Task 5); erweiterter `patternReqs`-Typ (Task 6).
- Produces: patternReqs-Einträge mit `planeFocus`/`planeSlugs` zur Laufzeit; neuer purer Helper `makePlaneCounter(planCount: number): (family: PatternFamily) => number` in `plane-emphasis.ts`.

- [ ] **Step 1: Failing Test für den Zähler-Helper** (in plane-emphasis.test.ts anhängen)

```ts
import { makePlaneCounter } from '../plane-emphasis'

describe('makePlaneCounter (Spec §3.3: position = planCount*3 + k, pro Familie)', () => {
  it('zählt pro Familie unabhängig und mit Stride-Basis', () => {
    const next = makePlaneCounter(2) // planCount 2 → Basis 6
    expect(next('knee_dominant')).toBe(6)
    expect(next('knee_dominant')).toBe(7)
    expect(next('push')).toBe(6)    // eigener Zähler
    expect(next('knee_dominant')).toBe(8)
  })
  it('planCount 0 startet bei 0', () => {
    expect(makePlaneCounter(0)('hinge')).toBe(0)
  })
})
```

- [ ] **Step 2: Test laufen lassen — RED**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/plane-emphasis.test.ts`
Expected: FAIL — `makePlaneCounter` nicht exportiert.

- [ ] **Step 3: Helper implementieren** (in plane-emphasis.ts anhängen)

```ts
/** Vorkommens-Zähler pro Muster-Familie über die Woche (Spec §3.3): liefert
 *  für jedes normal-Vorkommen die nächste Zyklusposition. Heavy ruft nicht auf. */
export function makePlaneCounter(planCount: number): (family: PatternFamily) => number {
  const counters = new Map<PatternFamily, number>()
  return (family) => {
    const k = counters.get(family) ?? 0
    counters.set(family, k + 1)
    return planCount * PLANE_CYCLE_STRIDE + k
  }
}
```

- [ ] **Step 4: Test laufen lassen — GREEN**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run src/plan-generation/v2/__tests__/plane-emphasis.test.ts`
Expected: PASS.

- [ ] **Step 5: prepare-v2 verdrahten**

Imports ergänzen:

```ts
import { makePlaneCounter, pickPlaneEmphasis, resolvePlaneWeights, toPatternFamily } from './plane-emphasis'
```
(`pickPlanePin` zum bestehenden `./pool`-Import hinzufügen.)

Loader (Zeile 134) — vierten Call in den bestehenden Promise.all aufnehmen:

```ts
const [{ data: weightRows }, { count: planCountRaw }, { data: sportGroupRows }, { data: planeRows }] = await Promise.all([
  supabase.from('sport_conditioning_weights').select('group_name, format, weight'),
  supabase.from('workout_plans').select('id', { count: 'exact', head: true }).eq('user_id', input.user_id),
  supabase.from('exercise_sport_groups').select('exercise_id, sport_group'),
  supabase.from('sport_plane_weights').select('group_name, pattern, plane, weight'),
])
```

Nach `priorPlans` (Zeile 148):

```ts
// Bewegungsebenen (Spec 2026-10-11): Gewichte je Muster-Familie + Zyklus-
// Zähler über die Woche. Fehlende Tabelle/Gruppe → DEFAULT (kein Fokus).
const planeWeights = resolvePlaneWeights(planeRows ?? [], input.sport_group_name || undefined)
const nextPlanePosition = makePlaneCounter(priorPlans)
```

WICHTIG: `makePlaneCounter` einmal VOR dem `layout.workouts.map(...)` aufrufen (der Zähler läuft über die ganze Woche, nicht pro Session) — also auf Modulebene der Funktion, direkt bei `planeWeights`.

patternReqs-Loop (Zeile 305–315) — den `patternReqs.push(...)`-Zweig ersetzen:

```ts
// Ebenen-Betonung (Spec 2026-10-11 §4): nur normal-Muster nehmen am Zyklus
// teil; sagittal oder leerer Ebenen-Pool → exakt heutiges Verhalten.
const poolForPattern = perPattern.get(p.pattern) ?? []
let planePin: string | null = null
let planeFocus: 'frontal' | 'transverse' | undefined
if (p.emphasis === 'normal') {
  const family = toPatternFamily(p.pattern)
  const plane = pickPlaneEmphasis(planeWeights[family], nextPlanePosition(family))
  if (plane !== 'sagittal') {
    planePin = pickPlanePin(poolForPattern, plane, priorPlans)
    if (planePin) planeFocus = plane
  }
}
patternReqs.push({
  block_type: block.block_type, pattern: p.pattern, emphasis: p.emphasis,
  slugs: patternSlugWindow(poolForPattern, p.emphasis, priorPlans, planePin),
  ...(planeFocus ? { planeFocus, planeSlugs: [planePin!] } : {}),
})
```

(`planeFocus` trägt die ZIEL-Ebene des Zyklus — auch wenn `pickPlanePin` per Fallback eine Übung der anderen nicht-sagittalen Ebene gewählt hat; die Formulierung folgt der Absicht. Ruling bei Abweichung ledgern.)

- [ ] **Step 6: Ganze Suite + tsc**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run && npx tsc --noEmit`
Expected: alle Tests PASS, tsc ohne Fehler.

- [ ] **Step 7: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/plane-emphasis.ts \
  externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/plane-emphasis.test.ts
git commit -m "feat: wire plane emphasis into prepare-v2 — loader, per-family counter, window pin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: E2E-Probe (deterministische Teile, ohne OpenAI)

**Files:**
- Create (temporär, nach Lauf löschen): `externals/jemp-temporal-worker/probe-plane.ts`
- Input: `/private/tmp/claude-501/-Users-leonardogranetto-Projects-jemp/eaf7ebfb-61ac-4bc9-a9fb-d98fda9b6aa1/scratchpad/leo2-input.json` (existiert aus früheren Proben; Patch-Werte s. u.)

**Interfaces:**
- Consumes: `prepareGenerationV2(input, supabase, {} as any)` — läuft ohne OpenAI für die deterministischen Teile; patternReqs der SessionBuildInputs enthalten jetzt ggf. `planeFocus`/`planeSlugs`.

- [ ] **Step 1: Probe-Skript schreiben**

```ts
// probe-plane.ts — Wegwerf-Probe (Spec §6): combat vs. endurance über mehrere planCounts.
import { createClient } from '@supabase/supabase-js'
import { prepareGenerationV2 } from './src/plan-generation/v2/prepare-v2'
import * as fs from 'fs'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const base = JSON.parse(fs.readFileSync(
  '/private/tmp/claude-501/-Users-leonardogranetto-Projects-jemp/eaf7ebfb-61ac-4bc9-a9fb-d98fda9b6aa1/scratchpad/leo2-input.json', 'utf8'))

async function run(label: string, patch: Record<string, unknown>) {
  const input = { ...base, ...patch, max_session_duration: 60, load_profile: 'medium' }
  const prep = await prepareGenerationV2(input as any, supabase as any, {} as any)
  for (const s of prep.sessionBuildInputs) {
    for (const r of s.v2?.patternReqs ?? []) {
      if (r.planeFocus) console.log(`${label} Tag ${s.v2!.day.day_of_week}: ${r.pattern} → ${r.planeFocus} [${(r.planeSlugs ?? []).join(', ')}] Fenster=[${r.slugs.join(', ')}]`)
    }
  }
}

;(async () => {
  await run('combat', { sport_group_name: 'combat_sports', sport_slug: 'kickboxing' })
  await run('endurance', { sport_group_name: 'endurance', sport_slug: 'running' })
})()
```

Hinweis: `prepareGenerationV2` zählt `workout_plans` des Users — planCount variiert man real über regenerierte Pläne; für die Probe genügt der aktuelle Stand (ein fester planCount): geprüft wird, DASS combat Ebenen-Fokus bekommt und endurance (fast) nicht, plus dass die gepinnte Übung im Fenster steht.

- [ ] **Step 2: Probe ausführen**

Run: `cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && set -a && source .env && set +a && npx tsx ./probe-plane.ts`
Expected: combat-Zeilen mit `planeFocus` (bei push: transverse mit `split_stance_landmine_press` o. ä.; die gepinnte Übung erscheint an Position 1 des Fensters). endurance: keine oder höchstens eine Zeile. Keine Exceptions.

- [ ] **Step 3: Probe löschen, Suite final**

Run: `rm /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker/probe-plane.ts && cd /Users/leonardogranetto/Projects/jemp/externals/jemp-temporal-worker && npx vitest run && npx tsc --noEmit`
Expected: Suite grün, tsc sauber, Probe-Datei weg (`git status` zeigt sie nicht).

- [ ] **Step 4: Kein Commit** (Task produziert keine bleibenden Dateien; Befund gehört in die Abschlussmeldung). Hinweis für On-Device-QA in der Abschlussmeldung: Worker neu starten (`npm run dev`, ts-node ohne Hot-Reload).
