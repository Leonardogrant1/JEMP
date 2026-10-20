# Conditioning-Formate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sportart-gewichtete Conditioning-Format-Verteilung (extensiv/intensiv/rounds) mit planCount-Rotation, inkl. neuer Cardio-Equipments/Übungen und Finisher-Monotonie-Fix.

**Architecture:** Eine neue pure Logik-Datei (`conditioning-format.ts`) baut aus `sport_conditioning_weights`-Zeilen einen deterministischen 10-Slot-Zyklus; `build-simple-sessions.ts` bekommt drei Format-Builder (Lauf/Maschine/Zirkel-Kette für extensiv, Single-Station-Runden, bestehendes Intervall); `prepare-v2.ts` lädt Gewichte + planCount und verdrahtet alles. Zwei additive Migrationen liefern Gewichts-Tabelle und Cardio-Equipment/Übungen.

**Tech Stack:** TypeScript (Temporal-Worker, vitest), Supabase/Postgres-Migrationen, React Native (ein Hook + i18n).

**Spec:** `docs/superpowers/specs/2026-10-10-conditioning-formats-design.md`

## Global Constraints

- Migrationen NUR via `supabase migration up` (installierte CLI, nie npx), NIE `db reset`, NIE auf Prod pushen.
- Jede Migration beginnt mit `-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip` und läuft in einer Transaktion mit `set local lock_timeout = '5s'`.
- Commits enden mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Worker-Tests: `npx vitest run` aus `externals/jemp-temporal-worker/` (Stand vor Plan: 198/198). `npx tsc --noEmit` dort muss sauber bleiben.
- Alle Builder deterministisch: kein `Math.random`, kein `Date.now` in Logik-Pfaden.
- Allokation/Platzierung (`week-layout.ts`) bleibt UNVERÄNDERT (Spec §5) — dieser Plan fasst `buildWeekLayout`/`placeWeek` nicht an.
- Session-Namen exakt: „Conditioning — Basis" / „Conditioning — Intervalle" / „Conditioning — Rounds".

## Review Focus

1. **User ohne jegliches Equipment** (Filter inaktiv, `userEquip.size === 0`): Maschinen-Übungen passieren den Filter → Extensiv wählt „Maschine" für einen User, der vielleicht keine hat. Das ist konsistent mit dem bestehenden Filterverhalten (Barbell-Pläne für Zero-Equipment-User sind heute „vollwertig") und wird als designtes Verhalten gepinnt. → Test in Task 4.
2. **Sehr kurzer Conditioning-Tag** (20 min): Rounds mit 5 Runden (28 min) würde überziehen — Rundenzahl muss aus `day.minutes` abgeleitet werden (`max(3, min(5, floor((minutes − 8) / 4)))`). → Test in Task 5.
3. **planCount-Query liefert null/Fehler**: Rotation darf nicht crashen — Fallback 0 (erster Plan). → Test in Task 3 (`pickSessionFormat` mit 0) + defensives `?? 0` in Task 7.
4. **Unbekannte/zukünftige Sportgruppe** ohne Zeilen in `sport_conditioning_weights` UND fehlende `other`-Zeilen: `resolveConditioningWeights` fällt zweistufig zurück (Gruppe → `other` → Konstante). → Test in Task 3.
5. **Finisher-Pool mit nur 2 Slugs + Offset**: Rotations-Offset mit Wrap darf keine Übung duplizieren und min-2-Verhalten nicht brechen. → Test in Task 6.

## Dateistruktur

- **Create:** `supabase/migrations/20261010130000_add_sport_conditioning_weights.sql` — Enum + Tabelle + RLS + Seed.
- **Create:** `supabase/migrations/20261010140000_add_cardio_equipment_exercises.sql` — 5 Equipments, env-Mappings, 5 Übungen.
- **Create:** `externals/jemp-temporal-worker/src/plan-generation/v2/conditioning-format.ts` — pure Format-Logik (Weights → Zyklus → Pick).
- **Create:** `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/conditioning-format.test.ts`
- **Modify:** `externals/jemp-temporal-worker/src/plan-generation/v2/build-simple-sessions.ts` — Format-Builder, Finisher-Format+Offset.
- **Modify:** `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`
- **Modify:** `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts` — zwei neue Context-Felder, Finisher-Aufruf.
- **Modify:** `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` — Weights/planCount laden, Builder-Verdrahtung.
- **Create:** `hooks/use-new-equipment-prompt.ts` + **Modify:** `app/(tabs)/plan.tsx`, `i18n/locales/de.ts`, `i18n/locales/en.ts`.
- **Modify:** `docs/plan-generation-overview.md` — Conditioning-Abschnitt.

---

### Task 1: Migration `sport_conditioning_weights`

**Files:**
- Create: `supabase/migrations/20261010130000_add_sport_conditioning_weights.sql`

**Interfaces:**
- Consumes: bestehende Tabellenkonventionen (RLS select für authenticated bei Referenzdaten).
- Produces: Tabelle `sport_conditioning_weights (group_name text, format conditioning_format, weight smallint)` mit 21 Seed-Zeilen — Task 7 liest sie mit `select group_name, format, weight`.

- [ ] **Step 1: Migration schreiben**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Conditioning-Format-Gewichte je Sportgruppe (Spec 2026-10-10 §2):
-- Zwilling des geplanten sport_plane_weights. Gewichte steuern die
-- Format-Rotation der Conditioning-Sessions (extensiv/intensiv/rounds).

begin;
set local lock_timeout = '5s';

create type conditioning_format as enum ('extensive', 'intensive', 'rounds');

create table sport_conditioning_weights (
  group_name text not null,
  format conditioning_format not null,
  weight smallint not null check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (group_name, format)
);

alter table sport_conditioning_weights enable row level security;
create policy "Authenticated users can view sport conditioning weights"
  on sport_conditioning_weights for select to authenticated using (true);

insert into sport_conditioning_weights (group_name, format, weight) values
  ('team_sports',   'extensive', 40), ('team_sports',   'intensive', 55), ('team_sports',   'rounds',  5),
  ('combat_sports', 'extensive', 25), ('combat_sports', 'intensive', 25), ('combat_sports', 'rounds', 50),
  ('racket_sports', 'extensive', 25), ('racket_sports', 'intensive', 45), ('racket_sports', 'rounds', 30),
  ('athletics',     'extensive', 50), ('athletics',     'intensive', 50), ('athletics',     'rounds',  0),
  ('endurance',     'extensive', 60), ('endurance',     'intensive', 40), ('endurance',     'rounds',  0),
  ('strength',      'extensive', 40), ('strength',      'intensive', 60), ('strength',      'rounds',  0),
  ('other',         'extensive', 40), ('other',         'intensive', 50), ('other',         'rounds', 10)
on conflict (group_name, format) do nothing;

commit;
```

- [ ] **Step 2: Migration anwenden**

Run (aus Repo-Root): `supabase migration up`
Expected: `Applying migration 20261010130000_add_sport_conditioning_weights.sql...` ohne Fehler.

- [ ] **Step 3: Seed verifizieren**

Run: `docker exec supabase_db_jemp psql -U postgres -d postgres -c "select group_name, sum(weight) from sport_conditioning_weights group by 1 order by 1;"`
Expected: 7 Zeilen, jede mit `sum = 100`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261010130000_add_sport_conditioning_weights.sql
git commit -m "feat: sport_conditioning_weights table + seed"
```

---

### Task 2: Migration Cardio-Equipment + Übungen

**Files:**
- Create: `supabase/migrations/20261010140000_add_cardio_equipment_exercises.sql`

**Interfaces:**
- Consumes: Spaltenkonventionen aus `20261009170000_add_hill_sprint.sql` (idempotente not-exists-Inserts); Conditioning-Übungs-Konventionen (burpee: `movement_pattern 'cardio'`, `image_group 'conditioning'`, `exercise_type 'dynamic'`, `laterality 'bilateral'`, `body_region 'full_body'`, min 1 / max 100).
- Produces: 5 Equipments (`treadmill`, `stationary_bike`, `air_bike`, `rowing_erg`, `heavy_bag`) + 5 Übungen (`treadmill_run`, `stationary_bike_ride`, `air_bike_ride`, `rowing_erg`, `heavy_bag_work`) — Tasks 4/5 referenzieren die Übungs-Slugs.

- [ ] **Step 1: Migration schreiben**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Cardio-Equipment + Dauer-Übungen (Spec 2026-10-10 §7): eine Übung pro Gerät,
-- das Format dosiert sie (extensiv = lange moderate Intervalle, intensiv =
-- 30/30, rounds = 3-min-Runden). Equipment-Labels kommen aus name_i18n —
-- die App braucht kein neues Icon-/i18n-Mapping. Ohne Video/Thumbnail
-- (werden nachgepflegt). Idempotent.

begin;
set local lock_timeout = '5s';

insert into equipments (slug, name_i18n, is_location_specific)
select v.slug, v.name_i18n::jsonb, true
from (values
  ('treadmill',       '{"de": "Laufband", "en": "Treadmill"}'),
  ('stationary_bike', '{"de": "Ergometer / Fahrrad", "en": "Stationary Bike"}'),
  ('air_bike',        '{"de": "Air Bike / Assault Bike", "en": "Air Bike"}'),
  ('rowing_erg',      '{"de": "Rudergerät", "en": "Rowing Machine"}'),
  ('heavy_bag',       '{"de": "Boxsack", "en": "Heavy Bag"}')
) as v(slug, name_i18n)
where not exists (select 1 from equipments e where e.slug = v.slug);

-- Ortsbindung: gym + home (outdoor bewusst nicht)
insert into environment_equipments (environment_id, equipment_id)
select env.id, eq.id
from equipments eq
join environments env on env.slug in ('gym', 'home')
where eq.slug in ('treadmill', 'stationary_bike', 'air_bike', 'rowing_erg', 'heavy_bag')
  and not exists (
    select 1 from environment_equipments ee
    where ee.environment_id = env.id and ee.equipment_id = eq.id
  );

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level,
  intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select v.name, v.slug, c.id, 'full_body', 'cardio', 1, 100,
  v.intensity, 'dynamic', 'duration', 'bilateral', 'conditioning', v.movement_type, false, v.descr::jsonb
from (values
  ('Treadmill Run', 'treadmill_run', 4, 'sagittal',
   '{"de": "Laufen auf dem Laufband — das Tempo bestimmt die Verschreibung: locker für die aerobe Basis, zügig für Intervalle.", "en": "Running on the treadmill — the prescription sets the pace: easy for the aerobic base, brisk for intervals."}'),
  ('Stationary Bike', 'stationary_bike_ride', 4, 'sagittal',
   '{"de": "Fahren auf dem Ergometer — gelenkschonende Dauerarbeit oder Intervalle, der Widerstand folgt der Verschreibung.", "en": "Riding the stationary bike — joint-friendly steady work or intervals, resistance follows the prescription."}'),
  ('Air Bike', 'air_bike_ride', 6, 'sagittal',
   '{"de": "Air Bike mit Arm- und Beinarbeit — der Luftwiderstand skaliert mit deinem Einsatz, ideal für harte Intervalle.", "en": "Air bike with arm and leg drive — air resistance scales with your effort, ideal for hard intervals."}'),
  ('Rowing', 'rowing_erg', 5, 'sagittal',
   '{"de": "Rudern am Ergometer — Ganzkörper-Dauerarbeit mit sauberem Rhythmus: Beine, Rumpf, Arme.", "en": "Rowing on the erg — full-body steady work with clean rhythm: legs, trunk, arms."}'),
  ('Heavy Bag Work', 'heavy_bag_work', 6, 'transverse',
   '{"de": "Schlag- und Tritt-Arbeit am Sack — Runden bei sauberer Technik, Intensität über Schlagfrequenz steuern.", "en": "Punch and kick work on the bag — rounds with clean technique, control intensity via strike rate."}')
) as v(name, slug, intensity, movement_type, descr)
join categories c on c.slug = 'conditioning'
where not exists (select 1 from exercises e where e.slug = v.slug);

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('treadmill_run', 'treadmill'), ('stationary_bike_ride', 'stationary_bike'),
  ('air_bike_ride', 'air_bike'), ('rowing_erg', 'rowing_erg'), ('heavy_bag_work', 'heavy_bag')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug in ('treadmill_run', 'stationary_bike_ride', 'air_bike_ride', 'rowing_erg', 'heavy_bag_work')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

commit;
```

- [ ] **Step 2: Migration anwenden**

Run (aus Repo-Root): `supabase migration up`
Expected: Migration läuft ohne Fehler durch.

- [ ] **Step 3: Verifizieren**

Run: `docker exec supabase_db_jemp psql -U postgres -d postgres -c "select e.slug, e.intensity_score, e.measurement_type, count(distinct xe.equipment_id) as equip, count(distinct xv.environment_id) as envs from exercises e left join exercise_equipments xe on xe.exercise_id = e.id left join exercise_environments xv on xv.exercise_id = e.id where e.slug in ('treadmill_run','stationary_bike_ride','air_bike_ride','rowing_erg','heavy_bag_work') group by 1,2,3 order by 1;"`
Expected: 5 Zeilen, je `equip = 1`, `envs = 2`, `measurement_type = duration`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261010140000_add_cardio_equipment_exercises.sql
git commit -m "feat: cardio equipment + duration exercises for conditioning formats"
```

---

### Task 3: Format-Logik (`conditioning-format.ts`)

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/conditioning-format.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/conditioning-format.test.ts`

**Interfaces:**
- Consumes: nichts (pure).
- Produces (Task 4/5/6/7 verwenden exakt diese Namen):

```typescript
export type ConditioningFormat = 'extensive' | 'intensive' | 'rounds'
export type ConditioningWeights = Record<ConditioningFormat, number>
export const DEFAULT_CONDITIONING_WEIGHTS: ConditioningWeights // = other-Zeile: {extensive: 40, intensive: 50, rounds: 10}
export function resolveConditioningWeights(rows: Array<{ group_name: string; format: string; weight: number }>, groupName: string | undefined): ConditioningWeights
export function buildFormatCycle(weights: ConditioningWeights): ConditioningFormat[] // Länge 10
export function pickSessionFormat(weights: ConditioningWeights, planCount: number): ConditioningFormat
export function pickFinisherFormat(weights: ConditioningWeights): 'intensive' | 'rounds'
```

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildFormatCycle, pickSessionFormat, pickFinisherFormat,
  resolveConditioningWeights, DEFAULT_CONDITIONING_WEIGHTS,
} from '../conditioning-format'

describe('buildFormatCycle (Spec §3.2)', () => {
  it('team_sports 40/55/5 → Spec-Beispiel, rounds in der Zyklus-Mitte', () => {
    expect(buildFormatCycle({ extensive: 40, intensive: 55, rounds: 5 }))
      .toEqual(['intensive', 'extensive', 'intensive', 'extensive', 'rounds',
                'intensive', 'extensive', 'intensive', 'extensive', 'intensive'])
  })
  it('weight 0 erscheint nie im Zyklus', () => {
    expect(buildFormatCycle({ extensive: 50, intensive: 50, rounds: 0 })).not.toContain('rounds')
  })
  it('Remainder-Gleichstand: kleineres Gewicht gewinnt (rounds 5 → genau 1 Slot)', () => {
    const cycle = buildFormatCycle({ extensive: 40, intensive: 55, rounds: 5 })
    expect(cycle.filter((f) => f === 'rounds')).toHaveLength(1)
    expect(cycle.filter((f) => f === 'intensive')).toHaveLength(5)
    expect(cycle.filter((f) => f === 'extensive')).toHaveLength(4)
  })
  it('alle Gewichte 0 → reiner intensive-Zyklus (defensiv)', () => {
    expect(buildFormatCycle({ extensive: 0, intensive: 0, rounds: 0 })).toEqual(Array(10).fill('intensive'))
  })
})

describe('pickSessionFormat', () => {
  const w = { extensive: 40, intensive: 55, rounds: 5 }
  it('rotiert deterministisch über planCount % 10', () => {
    expect(pickSessionFormat(w, 0)).toBe('intensive')
    expect(pickSessionFormat(w, 4)).toBe('rounds')
    expect(pickSessionFormat(w, 14)).toBe('rounds') // Wrap
  })
})

describe('pickFinisherFormat (Spec §3.4)', () => {
  it('rounds nur bei striktem Übergewicht, Gleichstand → intensive', () => {
    expect(pickFinisherFormat({ extensive: 25, intensive: 25, rounds: 50 })).toBe('rounds')
    expect(pickFinisherFormat({ extensive: 40, intensive: 55, rounds: 5 })).toBe('intensive')
    expect(pickFinisherFormat({ extensive: 50, intensive: 25, rounds: 25 })).toBe('intensive')
  })
})

describe('resolveConditioningWeights (Review Focus 4)', () => {
  const rows = [
    { group_name: 'combat_sports', format: 'extensive', weight: 25 },
    { group_name: 'combat_sports', format: 'intensive', weight: 25 },
    { group_name: 'combat_sports', format: 'rounds', weight: 50 },
    { group_name: 'other', format: 'extensive', weight: 40 },
    { group_name: 'other', format: 'intensive', weight: 50 },
    { group_name: 'other', format: 'rounds', weight: 10 },
  ]
  it('findet die Gruppe', () => {
    expect(resolveConditioningWeights(rows, 'combat_sports')).toEqual({ extensive: 25, intensive: 25, rounds: 50 })
  })
  it('unbekannte Gruppe → other-Zeilen', () => {
    expect(resolveConditioningWeights(rows, 'esports')).toEqual({ extensive: 40, intensive: 50, rounds: 10 })
  })
  it('leere Tabelle → Konstante', () => {
    expect(resolveConditioningWeights([], undefined)).toEqual(DEFAULT_CONDITIONING_WEIGHTS)
  })
})
```

- [ ] **Step 2: Tests laufen lassen — Fehlschlag verifizieren**

Run (aus `externals/jemp-temporal-worker/`): `npx vitest run src/plan-generation/v2/__tests__/conditioning-format.test.ts`
Expected: FAIL — Modul `../conditioning-format` existiert nicht.

- [ ] **Step 3: Implementieren**

```typescript
// Conditioning-Format-Logik (Spec 2026-10-10 §3): Gewichte → 10-Slot-Zyklus →
// deterministische Rotation über planCount. Pure, kein IO.

export type ConditioningFormat = 'extensive' | 'intensive' | 'rounds'
export type ConditioningWeights = Record<ConditioningFormat, number>

const FORMATS: ConditioningFormat[] = ['extensive', 'intensive', 'rounds']
const CYCLE_LENGTH = 10

/** Fallback = other-Seed (Spec §2): greift nur, wenn die Tabelle leer/unerreichbar ist. */
export const DEFAULT_CONDITIONING_WEIGHTS: ConditioningWeights = { extensive: 40, intensive: 50, rounds: 10 }

export function resolveConditioningWeights(
  rows: Array<{ group_name: string; format: string; weight: number }>,
  groupName: string | undefined,
): ConditioningWeights {
  const pick = (group: string): ConditioningWeights | null => {
    const g = rows.filter((r) => r.group_name === group)
    if (g.length === 0) return null
    const w = { ...DEFAULT_CONDITIONING_WEIGHTS }
    for (const f of FORMATS) w[f] = g.find((r) => r.format === f)?.weight ?? 0
    return w
  }
  return (groupName ? pick(groupName) : null) ?? pick('other') ?? DEFAULT_CONDITIONING_WEIGHTS
}

/** Largest Remainder auf 10 Slots (Gleichstand: kleineres Gewicht gewinnt, damit
 *  5 %-Gewichte nicht systematisch auf 0 fallen), dann Verschränkung über
 *  Positions-Schlüssel (k + 0.5) / n (Gleichstand: kleineres n zuerst) —
 *  so landen Ein-Slot-Formate in der Zyklus-Mitte statt am Ende. */
export function buildFormatCycle(weights: ConditioningWeights): ConditioningFormat[] {
  const total = FORMATS.reduce((s, f) => s + weights[f], 0)
  if (total <= 0) return Array(CYCLE_LENGTH).fill('intensive')

  const quota = FORMATS.map((f) => ({ f, exact: (weights[f] / total) * CYCLE_LENGTH }))
  const slots = new Map(quota.map((q) => [q.f, Math.floor(q.exact)]))
  let remaining = CYCLE_LENGTH - [...slots.values()].reduce((a, b) => a + b, 0)
  const byRemainder = [...quota]
    .filter((q) => weights[q.f] > 0)
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || weights[a.f] - weights[b.f])
  for (const q of byRemainder) {
    if (remaining <= 0) break
    slots.set(q.f, (slots.get(q.f) ?? 0) + 1)
    remaining--
  }

  const keyed: Array<{ f: ConditioningFormat; key: number; n: number }> = []
  for (const f of FORMATS) {
    const n = slots.get(f) ?? 0
    for (let k = 0; k < n; k++) keyed.push({ f, key: (k + 0.5) / n, n })
  }
  keyed.sort((a, b) => a.key - b.key || a.n - b.n || a.f.localeCompare(b.f))
  return keyed.map((e) => e.f)
}

export function pickSessionFormat(weights: ConditioningWeights, planCount: number): ConditioningFormat {
  return buildFormatCycle(weights)[((planCount % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH]
}

/** Finisher kennt nur intensiv/rounds (Spec §0.1.4); Gleichstand → intensive. */
export function pickFinisherFormat(weights: ConditioningWeights): 'intensive' | 'rounds' {
  return weights.rounds > weights.intensive ? 'rounds' : 'intensive'
}
```

- [ ] **Step 4: Tests laufen lassen — grün**

Run: `npx vitest run src/plan-generation/v2/__tests__/conditioning-format.test.ts`
Expected: PASS, alle Tests.

- [ ] **Step 5: Commit**

```bash
git add src/plan-generation/v2/conditioning-format.ts src/plan-generation/v2/__tests__/conditioning-format.test.ts
git commit -m "feat: conditioning format cycle + weighted rotation"
```

---

### Task 4: Extensiv-Builder + neue Session-Signatur

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/build-simple-sessions.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`

**Interfaces:**
- Consumes: `ConditioningFormat` aus Task 3; `PlacedDay`, `V2Exercise`, `PlannedSessionLike`, bestehendes `durationExercise`/`isConditioningExercise`/`CONDITIONING_FORMATS`.
- Produces: neue Signatur (Task 7 ruft sie so auf):

```typescript
export type ConditioningSessionInput = {
  day: PlacedDay
  exercises: V2Exercise[]
  orderIndex: number
  format?: ConditioningFormat       // default 'intensive' (Back-Compat für Alt-Aufrufer)
  planCount?: number                // default 0
  sportGroup?: string
  runAnchor?: V2Exercise | null     // easy_jog aus dem Outdoor-Pool; null = kein Outdoor
}
export function buildConditioningSession(input: ConditioningSessionInput): { session: PlannedSessionLike; notes: string[] } | null
export const MACHINE_SLUGS: string[]          // ['treadmill_run','stationary_bike_ride','rowing_erg','air_bike_ride']
export const EXTENSIVE_RUN_CAP_MINUTES = 35
```

Verhalten extensiv (Spec §1.1), Varianten-Kette in dieser Reihenfolge:
1. **Lauf**: `runAnchor` gesetzt → ein Conditioning-Block mit einer Übung (`runAnchor.slug`), `target_duration_seconds = min(35, day.minutes − 8) * 60`, `target_rest_seconds: 0`, `target_rounds: 1`. `estimated_duration_minutes = min(35, day.minutes − 8) + 8`. Greift der Deckel (`day.minutes − 8 > 35`), erklärt die Description die kürzere Dauer: „Lockere Dauerarbeit für die aerobe Basis — bewusst kürzer als dein Zeitfenster: mehr Umfang bringt heute nichts, er würde nur ermüden." Sonst: „Lockere Dauerarbeit für die aerobe Basis — du solltest dich nebenbei unterhalten können."
2. **Maschine**: Pool-Übungen mit Slug in `MACHINE_SLUGS` (Pool ist bereits equipment-/env-gefiltert — Verfügbarkeit ist implizit). Auswahl: nach `byIntensityThenSlug` sortieren, Index `planCount % anzahl`. Ein Block, eine Übung: `target_duration_seconds: 420`, `target_rest_seconds: 90`, `target_rounds: 3`. `estimated_duration_minutes = 34` (3 × 8,5 min + 8 Rahmen). Description wie Lauf (ohne Deckel-Satz).
3. **Zirkel**: Extensiv-Pool = `exercises.filter(isConditioningExercise)` mit `intensity_score ≤ 5`, sortiert `byIntensityThenSlug`; braucht ≥ 3. 3 Übungen ab Offset `planCount % poolLänge` (mit Wrap, ohne Duplikate): je `target_duration_seconds: 180`, `target_rest_seconds: 60`, `target_rounds: 2`. `estimated_duration_minutes = 32`.
4. Keine Variante füllbar → Degradierung: Format intern auf `intensive` setzen, Note `'Extensiv nicht füllbar — degradiert auf intensiv'` in `notes`.

Session-Name extensiv: „Conditioning — Basis", `session_type: 'conditioning'`, `mode_slug: 'full'`, Warmup/Cooldown wie bestehend (2 Mobility à 45 s). Intensiv bleibt die heutige Logik unverändert (Name neu: „Conditioning — Intervalle", Description bestehend).

- [ ] **Step 1: Fehlschlagende Tests schreiben** (an bestehende `describe('buildConditioningSession')` anhängen; bestehende Aufrufe kompilieren weiter, da neue Felder optional sind)

```typescript
describe('buildConditioningSession — Formate (Spec 2026-10-10)', () => {
  const circuitPool = ['burpee', 'jumping_jacks', 'jump_rope_standard', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 4 }))
  const runAnchor = ex({ slug: 'easy_jog', category_slug: 'sprints', measurement_type: 'duration', intensity_score: 2 })
  const machine = ex({ slug: 'rowing_erg', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 5 })

  it('extensiv + runAnchor → Dauerlauf mit 35-min-Deckel (Review Focus 2/Spec §1.1)', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 60 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].exercise_slug).toBe('easy_jog')
    expect(block.exercises[0].target_duration_seconds).toBe(35 * 60)
    expect(r.session.estimated_duration_minutes).toBe(43)
    expect(r.session.name).toBe('Conditioning — Basis')
    expect(r.session.description).toContain('bewusst kürzer')
  })
  it('extensiv ohne Deckel: 30-min-Tag → 22 min Lauf, keine Deckel-Erklärung', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 30 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises[0].target_duration_seconds).toBe(22 * 60)
    expect(r.session.description).not.toContain('bewusst kürzer')
  })
  it('extensiv ohne Outdoor → Maschine (3×7 min / 90 s), Pool-Präsenz = Verfügbarkeit (Review Focus 1)', () => {
    const r = buildConditioningSession({ day: day({ minutes: 45 }), exercises: [...circuitPool, machine], orderIndex: 0, format: 'extensive', runAnchor: null })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].exercise_slug).toBe('rowing_erg')
    expect(block.exercises[0].target_duration_seconds).toBe(420)
    expect(block.exercises[0].target_rounds).toBe(3)
  })
  it('extensiv ohne Outdoor und Maschine → Zirkel 3×180 s, Rotation über planCount', () => {
    const r0 = buildConditioningSession({ day: day({ minutes: 45 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor: null, planCount: 0 })!
    const r1 = buildConditioningSession({ day: day({ minutes: 45 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor: null, planCount: 1 })!
    const slugs = (r: any) => r.session.blocks.find((b: any) => b.block_type === 'conditioning')!.exercises.map((e: any) => e.exercise_slug)
    expect(slugs(r0)).toHaveLength(3)
    expect(slugs(r0)[0]).not.toBe(slugs(r1)[0]) // Offset rotiert
    const first = r0.session.blocks.find((b: any) => b.block_type === 'conditioning')!.exercises[0]
    expect(first.target_duration_seconds).toBe(180)
    expect(first.target_rounds).toBe(2)
  })
  it('extensiv unfüllbar → degradiert auf intensiv mit Note', () => {
    const tiny = circuitPool.slice(0, 2).map((e) => ({ ...e, intensity_score: 7 })) // Zirkel braucht ≤5 und ≥3
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: [...tiny, ...circuitPool.slice(0, 1)], orderIndex: 0, format: 'extensive', runAnchor: null })!
    expect(r.notes.some((n) => n.includes('degradiert'))).toBe(true)
    expect(r.session.name).toBe('Conditioning — Intervalle')
  })
  it('default-Format bleibt intensiv (Back-Compat)', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: circuitPool, orderIndex: 0 })!
    expect(r.session.name).toBe('Conditioning — Intervalle')
  })
})
```

- [ ] **Step 2: Fehlschlag verifizieren**

Run: `npx vitest run src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`
Expected: FAIL — `format`/`runAnchor` unbekannt bzw. Name ist noch 'Conditioning-Einheit'.

- [ ] **Step 3: Implementieren** — `build-simple-sessions.ts`: Input-Typ erweitern, Warmup/Cooldown-Bau in Helper `prepBlocks(exercises)` extrahieren (bestehender Code), Kern von `buildConditioningSession` in `buildIntensiveBlock(pool, planCount)` (heutige Logik) und neu `buildExtensiveBlock(input)` nach obiger Verhaltensliste aufteilen. Session-Assembly (Name/Description/estimated_duration je Format) in `buildConditioningSession`. Import: `import type { ConditioningFormat } from './conditioning-format'`.

- [ ] **Step 4: Alte Tests anpassen, falls sie den alten Namen pinnen** (Suche nach `'Conditioning-Einheit'` in Tests — auf „Conditioning — Intervalle" umstellen).

- [ ] **Step 5: Grün verifizieren (ganze Datei + Suite)**

Run: `npx vitest run src/plan-generation/v2/__tests__/build-simple-sessions.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS, Suite komplett grün, tsc sauber.

- [ ] **Step 6: Commit**

```bash
git add src/plan-generation/v2/build-simple-sessions.ts src/plan-generation/v2/__tests__/build-simple-sessions.test.ts
git commit -m "feat: extensive conditioning builder (run/machine/circuit chain)"
```

---

### Task 5: Rounds-Builder

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/build-simple-sessions.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`

**Interfaces:**
- Consumes: `ConditioningSessionInput` aus Task 4.
- Produces: `export const ROUNDS_CONTINUOUS_SLUGS: string[]` = `['heavy_bag_work', 'shadow_boxing', 'jump_rope_standard', 'air_bike_ride', 'rowing_erg', 'stationary_bike_ride']`; `format: 'rounds'`-Pfad in `buildConditioningSession` (Task 6 nutzt die Allowlist auch für den Finisher).

Verhalten (Spec §1.3): Rundenzahl `n = max(3, min(5, floor((day.minutes − 8) / 4)))`.
- **Standard** (Kandidaten = Conditioning-Pool ∩ `ROUNDS_CONTINUOUS_SLUGS`, sortiert `byIntensityThenSlug`): bei `sportGroup === 'combat_sports'` Priorität `heavy_bag_work` → `shadow_boxing` (sofern im Pool), sonst Index `planCount % anzahl`. Eine Übung: `target_duration_seconds: 180`, `target_rest_seconds: 60`, `target_rounds: n`. Bei `n ≥ 4` und ≥ 2 Kandidaten: ZWEI Block-Einträge (gewählte Übung + nächster Kandidat), `target_rounds: Math.ceil(n/2)` und `Math.floor(n/2)`.
- **Fallback** (keine rundentaugliche Übung im Pool): 3 Pool-Übungen à 60 s — `target_rest_seconds: 0` auf den ersten beiden, `60` auf der letzten, je `target_rounds: n`. Pool < 3 → Degradierung auf intensiv mit Note (wie Task 4).
- Name: „Conditioning — Rounds", Description: „Rundenformat wie im Wettkampf — 3 Minuten Arbeit, 1 Minute Pause. Teile dir die Runde ein." `estimated_duration_minutes = n * 4 + 8`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```typescript
describe('buildConditioningSession — Rounds (Spec §1.3)', () => {
  const pool = ['burpee', 'jumping_jacks', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 4 }))
  const bag = ex({ slug: 'heavy_bag_work', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 6 })
  const shadow = ex({ slug: 'shadow_boxing', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 5 })

  it('Standard: EINE Übung à 180 s / 60 s Rundenpause; combat bevorzugt heavy_bag', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: [...pool, bag, shadow], orderIndex: 0, format: 'rounds', sportGroup: 'combat_sports' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises[0].exercise_slug).toBe('heavy_bag_work')
    expect(block.exercises[0].target_duration_seconds).toBe(180)
    expect(block.exercises[0].target_rest_seconds).toBe(60)
    expect(r.session.name).toBe('Conditioning — Rounds')
  })
  it('Rundenzahl folgt day.minutes: 20-min-Tag → 3 Runden, 45-min-Tag → 5 (Review Focus 2)', () => {
    const rounds = (minutes: number) => {
      const r = buildConditioningSession({ day: day({ minutes }), exercises: [bag, ...pool], orderIndex: 0, format: 'rounds' })!
      const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
      return block.exercises.reduce((s: number, e: any) => s + e.target_rounds, 0)
    }
    expect(rounds(20)).toBe(3)
    expect(rounds(45)).toBe(5)
  })
  it('n ≥ 4 mit 2 Kandidaten → zwei alternierende Einträge mit geteilter Rundenzahl', () => {
    const r = buildConditioningSession({ day: day({ minutes: 45 }), exercises: [bag, shadow, ...pool], orderIndex: 0, format: 'rounds', sportGroup: 'combat_sports' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(2)
    expect(block.exercises.map((e: any) => e.exercise_slug)).toEqual(['heavy_bag_work', 'shadow_boxing'])
    expect(block.exercises[0].target_rounds + block.exercises[1].target_rounds).toBe(5)
  })
  it('Fallback-Dreiteilung ohne rundentaugliche Übung: 3×60 s, Pause an letzter Station', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: pool, orderIndex: 0, format: 'rounds' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(3)
    expect(block.exercises.map((e: any) => e.target_rest_seconds)).toEqual([0, 0, 60])
    expect(block.exercises.every((e: any) => e.target_duration_seconds === 60)).toBe(true)
  })
})
```

- [ ] **Step 2: Fehlschlag verifizieren**

Run: `npx vitest run src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`
Expected: FAIL — rounds-Pfad existiert nicht (fällt auf intensiv).

- [ ] **Step 3: `buildRoundsBlock` implementieren** (nach Verhaltensliste oben; `ROUNDS_CONTINUOUS_SLUGS` exportieren).

- [ ] **Step 4: Grün verifizieren**

Run: `npx vitest run src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plan-generation/v2/build-simple-sessions.ts src/plan-generation/v2/__tests__/build-simple-sessions.test.ts
git commit -m "feat: rounds conditioning format (single-station, combat preference)"
```

---

### Task 6: Finisher — Format + Rotations-Offset (Monotonie-Fix)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/build-simple-sessions.ts`
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts` (Context-Felder + Aufruf)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`

**Interfaces:**
- Consumes: `ROUNDS_CONTINUOUS_SLUGS` (Task 5).
- Produces: neue Finisher-Signatur (Task 7 befüllt die Context-Felder):

```typescript
export function buildConditioningFinisherBlock(
  poolSlugs: string[], orderIndex: number,
  format: 'intensive' | 'rounds' = 'intensive', offset = 0,
): { block_type: string; order_index: number; focused_category_slug: string; exercises: any[] } | null
```

`V2SessionContext` in `run-session-v2.ts` erhält `conditioningFinisherFormat?: 'intensive' | 'rounds'` und `conditioningFinisherOffset?: number`; der bestehende Aufruf (`if (day.carries_conditioning_finisher)`) reicht beide durch.

Verhalten:
- **intensive**: wie heute (`interval_30_30`, 3 Übungen, `target_rounds: max(4, rounds/2)`), aber Auswahl rotiert: `sorted = [...poolSlugs].sort()`, Start bei `offset % sorted.length`, 3 Slugs mit Wrap **ohne Duplikate** (bei Pool-Länge 2 → 2 Übungen, Review Focus 5).
- **rounds**: Kandidaten = `poolSlugs ∩ ROUNDS_CONTINUOUS_SLUGS` (sortiert); `heavy_bag_work` zuerst falls vorhanden, sonst `shadow_boxing`, sonst Rotation per Offset. Eine Übung: `target_duration_seconds: 180`, `target_rest_seconds: 60`, `target_rounds: 2`. Keine Kandidaten → intensive-Pfad.
- `poolSlugs.length < 2` → weiterhin `null`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```typescript
describe('buildConditioningFinisherBlock — Format + Rotation (Spec §3.4)', () => {
  const pool = ['burpee', 'jump_rope_standard', 'bear_crawl', 'mountain_climber', 'jumping_jacks']
  it('Offset rotiert den Startpunkt — Monotonie-Regression', () => {
    const p0 = buildConditioningFinisherBlock(pool, 7, 'intensive', 0)!
    const p2 = buildConditioningFinisherBlock(pool, 7, 'intensive', 2)!
    expect(p0.exercises[0].exercise_slug).not.toBe(p2.exercises[0].exercise_slug)
    expect(p2.exercises).toHaveLength(3)
  })
  it('Pool-Länge 2 + Offset: keine Duplikate (Review Focus 5)', () => {
    const b = buildConditioningFinisherBlock(['burpee', 'bear_crawl'], 7, 'intensive', 1)!
    const slugs = b.exercises.map((e: any) => e.exercise_slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('rounds-Finisher: eine Übung, 180/60, 2 Runden, bevorzugt heavy_bag_work', () => {
    const b = buildConditioningFinisherBlock([...pool, 'heavy_bag_work', 'shadow_boxing'], 7, 'rounds', 0)!
    expect(b.exercises).toHaveLength(1)
    expect(b.exercises[0].exercise_slug).toBe('heavy_bag_work')
    expect(b.exercises[0].target_duration_seconds).toBe(180)
    expect(b.exercises[0].target_rounds).toBe(2)
  })
  it('rounds ohne rundentaugliche Übung → intensive-Verhalten', () => {
    const b = buildConditioningFinisherBlock(['burpee', 'bear_crawl', 'mountain_climber'], 7, 'rounds', 0)!
    expect(b.exercises.length).toBeGreaterThanOrEqual(2)
    expect(b.exercises[0].target_duration_seconds).toBe(30)
  })
})
```

- [ ] **Step 2: Fehlschlag verifizieren**

Run: `npx vitest run src/plan-generation/v2/__tests__/build-simple-sessions.test.ts`
Expected: FAIL — Signatur hat Format/Offset nicht.

- [ ] **Step 3: Implementieren** — Finisher-Signatur erweitern; in `run-session-v2.ts` den Typ `V2SessionContext` um die zwei optionalen Felder ergänzen und den Aufruf ändern zu `buildConditioningFinisherBlock(input.conditioningFinisherPool, insertAt, input.conditioningFinisherFormat ?? 'intensive', input.conditioningFinisherOffset ?? 0)`.

- [ ] **Step 4: Grün verifizieren (ganze Suite + tsc)**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, tsc sauber (Alt-Aufrufe kompilieren dank Default-Parametern).

- [ ] **Step 5: Commit**

```bash
git add src/plan-generation/v2/build-simple-sessions.ts src/plan-generation/v2/run-session-v2.ts src/plan-generation/v2/__tests__/build-simple-sessions.test.ts
git commit -m "feat: finisher format selection + rotation offset (kills alphabetic monotony)"
```

---

### Task 7: prepare-v2-Plumbing

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts`

**Interfaces:**
- Consumes: `resolveConditioningWeights`, `pickSessionFormat`, `pickFinisherFormat` (Task 3); `ConditioningSessionInput` (Task 4); Context-Felder (Task 6).
- Produces: vollständige Verdrahtung — kein neuer Export.

Änderungen in `prepareGenerationV2` (alle Zeilenangaben Stand vor Plan):

1. **Laden** (nach dem `exercise_regions`-Call, ~Z. 115): 
```typescript
const [{ data: weightRows }, { count: planCount }] = await Promise.all([
  supabase.from('sport_conditioning_weights').select('group_name, format, weight'),
  supabase.from('workout_plans').select('id', { count: 'exact', head: true }).eq('user_id', input.user_id),
])
const conditioningWeights = resolveConditioningWeights(weightRows ?? [], input.sport_group_name || undefined)
const priorPlans = planCount ?? 0  // Review Focus 3: null-Count → 0
const sessionFormat = pickSessionFormat(conditioningWeights, priorPlans)
const finisherFormat = pickFinisherFormat(conditioningWeights)
```
2. **runAnchor** (nach `outdoorEnvId`, ~Z. 187): Outdoor zählt, wenn der Conditioning-Tag eine Outdoor-Tages-Umgebung hat ODER `outdoorEnvId` in `input.environment_ids` liegt. Anker aus dem Outdoor-Pool: 
```typescript
const easyJog = outdoorEnvId
  ? (exerciseRows ?? []).filter(makeExerciseFilter(filterMaps, outdoorEnvId)).map(toV2).find((e) => e.slug === 'easy_jog') ?? null
  : null
```
(`speedExercises` existiert bereits aus demselben Filter — wiederverwenden statt doppelt filtern: `speedExercises.find((e) => e.slug === 'easy_jog') ?? null`.)
3. **Conditioning-Aufruf** (~Z. 237): 
```typescript
const dayEnvIsOutdoor = dayEnvById.get(day.day_of_week) === outdoorEnvId
const userHasOutdoor = outdoorEnvId !== null && input.environment_ids.includes(outdoorEnvId)
const r = buildConditioningSession({
  day, exercises: dayExercises, orderIndex: orderIndex++,
  format: sessionFormat, planCount: priorPlans,
  sportGroup: input.sport_group_name || undefined,
  runAnchor: (dayEnvIsOutdoor || userHasOutdoor) ? easyJog : null,
})
if (r) { prebuiltSessions.push(r.session); notes.push(...r.notes) }
```
(Degradierungs-Notes landen so im Log — heute werden Conditioning-`notes` verschluckt.)
4. **Finisher-Context** (~Z. 273): `conditioningFinisherFormat: finisherFormat, conditioningFinisherOffset: priorPlans` ins `V2SessionContext`-Objekt.

- [ ] **Step 1: Verdrahtung implementieren** (kein eigener Unit-Test — `prepare-v2` ist IO-Komposition; die Logik ist in Tasks 3–6 getestet).

- [ ] **Step 2: Suite + Typen verifizieren**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 100 % PASS, tsc sauber.

- [ ] **Step 3: End-to-End lokal prüfen** — Worker neu starten (`npm run dev` im Worker-Verzeichnis, alter ts-node-Prozess cached Code!), Plan für leo2@mail.com regenerieren, dann:

Run: `docker exec supabase_db_jemp psql -U postgres -d postgres -c "select wps.name, wps.description from workout_plan_sessions wps join workout_plans wp on wp.id = wps.plan_id join auth.users u on u.id = wp.user_id where u.email = 'leo2@mail.com' and wps.session_type = 'conditioning' order by wps.created_at desc limit 3;"`
Expected: Session-Name entspricht einem der drei Formate („Conditioning — …"); bei combat-Testuser über mehrere Regenerationen wechselnde Formate.

- [ ] **Step 4: Commit**

```bash
git add src/plan-generation/v2/prepare-v2.ts
git commit -m "feat: wire conditioning format weights + planCount rotation into prepare-v2"
```

---

### Task 8: App — Einmal-Prompt für neues Equipment

**Files:**
- Create: `hooks/use-new-equipment-prompt.ts`
- Modify: `app/(tabs)/plan.tsx` (Mount neben `useEquipmentSanityCheck`, Z. 56)
- Modify: `i18n/locales/de.ts`, `i18n/locales/en.ts` (vier `ui.*`-Keys)

**Interfaces:**
- Consumes: Muster aus `hooks/use-equipment-sanity-check.ts` (Alert + Router `/equipment`); `@react-native-async-storage/async-storage` (installiert, 2.2.0).
- Produces: `export function useNewEquipmentPrompt(userId: string | undefined): void`.

Verhalten (Spec §7.3): Einmalig (persistiert via AsyncStorage-Key `jemp:cardio-equipment-prompt-v1`) werden User gefragt, ihr Equipment zu ergänzen, wenn: (a) die neuen Equipments in der DB existieren (`equipments.slug = 'treadmill'` gefunden — Gate gegen Prod-Lauf vor der Migration), (b) der User ≥ 1 `user_equipments`-Zeile hat (Zero-Equipment-User sind ungefiltert und sehen die Maschinen ohnehin), (c) keines der 5 neuen Slugs angehakt ist. Alert mit „Später"/„Equipment prüfen" → `router.push('/equipment')`; der Storage-Key wird beim ersten Anzeigen gesetzt (auch bei „Später" — einmalig heißt einmalig).

- [ ] **Step 1: Hook implementieren**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'jemp:cardio-equipment-prompt-v1';
const NEW_EQUIPMENT_SLUGS = ['treadmill', 'stationary_bike', 'air_bike', 'rowing_erg', 'heavy_bag'];

/** Einmal-Hinweis auf die neuen Cardio-Geräte (Conditioning-Formate 10.10.):
 *  Bestandsuser haben sie nie angehakt und bekämen sonst nie eine
 *  Maschinen-/Sack-Session. Zero-Equipment-User sind ungefiltert — kein Prompt. */
export function useNewEquipmentPrompt(userId: string | undefined) {
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        async function check() {
            if (await AsyncStorage.getItem(STORAGE_KEY)) return;
            const [{ data: available }, { data: owned }] = await Promise.all([
                supabase.from('equipments').select('slug').in('slug', NEW_EQUIPMENT_SLUGS),
                supabase.from('user_equipments').select('equipments!user_equipments_equipment_id_fkey(slug)').eq('user_id', userId!),
            ]);
            if (cancelled) return;
            const ownedSlugs = (owned ?? []).map((r: any) => r.equipments?.slug).filter(Boolean);
            const migrated = (available ?? []).length === NEW_EQUIPMENT_SLUGS.length;
            if (!migrated || ownedSlugs.length === 0) return;
            if (ownedSlugs.some((s: string) => NEW_EQUIPMENT_SLUGS.includes(s))) return;

            await AsyncStorage.setItem(STORAGE_KEY, '1');
            Alert.alert(
                t('ui.new_equipment_title'),
                t('ui.new_equipment_message'),
                [
                    { text: t('ui.new_equipment_later'), style: 'cancel' },
                    { text: t('ui.new_equipment_cta'), onPress: () => router.push('/equipment') },
                ],
            );
        }

        check();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}
```

- [ ] **Step 2: i18n-Keys ergänzen** (de/en, im `ui`-Block neben den `equipment_check_*`-Keys)

```typescript
// de.ts
new_equipment_title: 'Neue Geräte verfügbar',
new_equipment_message: 'Es gibt jetzt Laufband, Ergometer, Air Bike, Rudergerät und Boxsack. Hak an, was dir zur Verfügung steht — dein Plan nutzt sie für Conditioning-Einheiten.',
new_equipment_cta: 'Equipment prüfen',
new_equipment_later: 'Später',
// en.ts
new_equipment_title: 'New equipment available',
new_equipment_message: 'Treadmill, stationary bike, air bike, rowing machine and heavy bag are now available. Check what you have access to — your plan uses them for conditioning sessions.',
new_equipment_cta: 'Review equipment',
new_equipment_later: 'Later',
```

- [ ] **Step 3: Mount in `app/(tabs)/plan.tsx`** — Import + Aufruf direkt unter `useEquipmentSanityCheck(profile?.id);`:

```typescript
useNewEquipmentPrompt(profile?.id);
```

- [ ] **Step 4: Verifizieren**

Run (aus Repo-Root): `npx jest --silent 2>&1 | tail -3` und `npx tsc --noEmit 2>&1 | grep -v "externals/\|icon-symbol\|i18n/index" | head -5`
Expected: Jest grün (133/133, Hook hat bewusst keinen eigenen Test — wie `use-equipment-sanity-check`); keine NEUEN tsc-Fehler außerhalb des bekannten Rauschens.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-new-equipment-prompt.ts "app/(tabs)/plan.tsx" i18n/locales/de.ts i18n/locales/en.ts
git commit -m "feat: one-time prompt for new cardio equipment"
```

---

### Task 9: Doku — Overview aktualisieren

**Files:**
- Modify: `docs/plan-generation-overview.md` (Conditioning-Abschnitt + ggf. Spickzettel-Zeile)

**Interfaces:**
- Consumes: finalen Zustand aus Tasks 1–7.
- Produces: Doku, die das Format-System beschreibt (Formate, Sportgruppen-Gewichte als Tabelle, Rotation, Finisher-Regel). Die Claude-Doc-Kopie wird NICHT hier synchronisiert (manuell, außerhalb des Plans).

- [ ] **Step 1: Conditioning-Abschnitt umschreiben** — die drei Formate mit je einem Satz, die Gewichtstabelle aus Spec §2, ein Satz zur Rotation („wechselt mit jeder Plan-Generierung entlang der Gewichtung") und die Finisher-Regel (nur Intervalle/Rounds). Flughöhe wie der Rest des Docs: keine Code-Verweise.

- [ ] **Step 2: Konsistenz prüfen** — Suche im Doc nach „Conditioning": keine Aussage darf den alten Zustand („immer Intervall") behaupten.

- [ ] **Step 3: Commit**

```bash
git add docs/plan-generation-overview.md
git commit -m "docs: conditioning formats in plan generation overview"
```
