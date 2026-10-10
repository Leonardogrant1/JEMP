# Upper/Lower-Strength-Blöcke + Lead-Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersetzt die Kraft-Blöcke `push`/`pull`/`lower_body` durch `upper_strength`/`lower_strength` mit Pattern-Anforderungen im Block, Lead-Rotation (heavy wechselt Lower↔Upper), Säulen-Lead für Plyo Level 3 und nicht verhandelbarem Kraft-Floor.

**Architecture:** Die Blockstruktur bleibt deterministisch (composeWeek), die Kraftmuster wandern vom Block-Typ in eine `patterns`-Liste pro Block (Generator-intern, nicht persistiert). Der Validator erzwingt pro gefordertem Pattern ≥1 Übung aus dem Pattern-Pool. DB-Änderung: nur 2 neue `block_types`-Rows; App bekommt Labels + Übergangs-Check für die Beintag-Warnung.

**Tech Stack:** TypeScript (Worker: vitest@2, `npx vitest run` aus `externals/jemp-temporal-worker/`), Supabase-Migrationen (`supabase migration up`, NIE `db reset`), App: jest (`npx jest` aus Repo-Root).

**Spec:** `docs/superpowers/specs/2026-10-10-upper-lower-strength-blocks-design.md` (ergänzt `2026-10-09-session-composition-rework-design.md`, dessen §1.4/§1.5/§1.7 weiter gelten).

## Global Constraints

- Migrationen tragen den Header `-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip` und `SET LOCAL lock_timeout = '5s';` in einer Transaktion; Anwendung NUR via `supabase migration up` (Repo-Root), nie `db reset`, nie Prod.
- `block_types`-Rows `push`, `pull`, `lower_body` werden NICHT gelöscht (Alt-Pläne).
- Worker-Tests: `cd externals/jemp-temporal-worker && npx vitest run` muss am Ende jedes Tasks grün sein (Stand vor Plan: 157 Tests).
- App: `npx tsc --noEmit` hat vorbestehende Fehler in `externals/`, `icon-symbol`, `i18n/index.ts` — nur eigene Dateien zählen. `npx jest` muss grün sein (Stand: 132).
- Upper-Block enthält als Anforderung immer Push UND Pull (Begleitblock in Kompakt-Sessions: nur Pull — Push fällt zuerst).
- Kraft-Floor: jede Session ≥1 Kraftblock; Plyo-Säulen-Lead liegt auf dem Lead-Tag der EIGENEN Region (die andere Region behält ihren heavy Kraft-Lead), verschiebt höchstens eine Plyo-Zuweisung (nie Menge reduzieren), max. 1/Woche, nie bei n=1.
- Heavy-Biases bei nur einem Lead pro Region und Woche: Pull-heavy und Hinge-heavy zuerst (Spec §1.2 — das Wochen-Template wiederholt sich 4 Wochen identisch).
- Git-Commits pro Task mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Review Focus

1. **1-Tages-Woche** (n=1): kein Säulen-Lead, Lower-Lead heavy + Upper-Begleitblock normal; Session enthält auch bei 3 Slots ≥1 Kraftblock → Test in Task 3.
2. **Beide Plyo-Säulen Level 3 bei 2 Tagen:** genau EIN Säulen-Lead (lower gewinnt, liegt auf dem Lower-Lead-Tag), der Upper-Kraft-Lead bleibt heavy und die Plyo-Gesamtmenge sinkt nicht → Tests in Task 4.
3. **Leeres Pattern-Pool** (User ohne Pull-Equipment): Validator darf das LLM nicht in eine unerfüllbare Anforderung zwingen — Anforderung wird mit Note pre-degradiert → Test in Task 6.
4. **Alt-Pläne mit push/pull/lower_body:** App rendert Labels/Hero weiter, Beintag-Warnung erkennt beide Welten → Test in Task 8.
5. **Kompakt-Session (≤45 min) mit Plyo-Fokus:** picks = Lead + Plyo + Begleit(Pull-only); Core fällt, Kraft nie → Test in Task 3.

---

### Task 1: Migration — neue `block_types`-Rows

**Files:**
- Create: `supabase/migrations/20261010120000_add_strength_block_types.sql`

**Interfaces:**
- Produces: `block_types`-Rows mit `slug IN ('lower_strength','upper_strength')` — Task 6 (save-plan löst Slugs auf) und Task 9 (E2E) hängen daran.

- [ ] **Step 1: Migration schreiben**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Upper/Lower-Strength-Blöcke (Spec 2026-10-10): push/pull/lower_body werden
-- nicht mehr komponiert, ihre Rows bleiben für Alt-Pläne bestehen. Idempotent.

BEGIN;
SET LOCAL lock_timeout = '5s';

INSERT INTO block_types (slug)
SELECT s FROM unnest(ARRAY['lower_strength', 'upper_strength']) AS s
WHERE NOT EXISTS (SELECT 1 FROM block_types bt WHERE bt.slug = s);

COMMIT;
```

- [ ] **Step 2: Anwenden und verifizieren**

Run: `cd /Users/leonardogranetto/Projects/jemp && supabase migration up && docker exec supabase_db_jemp psql -U postgres -d postgres -c "SELECT slug FROM block_types WHERE slug LIKE '%strength';"`
Expected: 2 Rows (`lower_strength`, `upper_strength`)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261010120000_add_strength_block_types.sql
git commit -m "feat(db): add lower_strength/upper_strength block types"
```

---

### Task 2: Typen + Konstanten (Worker)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/week-layout.ts:282-288` (WorkoutBlockType, PlannedWorkoutBlock)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/week-layout-constants.ts:29-31` (BLOCK_MINUTES)
- Test: `externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts` (estimateMinutes-Test der neuen Keys)

**Interfaces:**
- Produces: `WorkoutBlockType` enthält zusätzlich `'lower_strength' | 'upper_strength'`; `PlannedWorkoutBlock` bekommt `patterns?: BlockPattern[]` mit `export type BlockPattern = { pattern: string; emphasis: 'heavy' | 'normal' }`; `BLOCK_MINUTES.lower_strength === 10`, `BLOCK_MINUTES.upper_strength === 12`; `export function blockMinutes(b: PlannedWorkoutBlock): number` — für Kraftblöcke pattern-skaliert (`upper_strength` mit 1 Pattern = 6 min statt 12 — Review-Befund: der Kompakt-Begleitblock mit nur Pull würde sonst überschätzt und andere Blöcke unnötig gedroppt). Die Minuten-Summierer (estimate/applyScalingLevers in week-layout.ts) stellen von direktem `BLOCK_MINUTES[bt]`-Zugriff auf `blockMinutes(b)` um. Alle folgenden Tasks konsumieren `BlockPattern`.

- [ ] **Step 1: Failing Test — estimateMinutes kennt die neuen Blöcke**

In `week-layout.test.ts` ergänzen (der bestehende estimateMinutes-Test summiert die Blöcke der Session — gleiche Bauweise):

```ts
it('estimateMinutes kennt lower_strength/upper_strength (Spec 2026-10-10)', () => {
  const blocks = [
    { block_type: 'warmup', variant: null, emphasis: 'normal' },
    { block_type: 'lower_strength', variant: null, emphasis: 'heavy' },
    { block_type: 'upper_strength', variant: null, emphasis: 'normal' },
    { block_type: 'cooldown', variant: null, emphasis: 'normal' },
  ] as any
  // 8 + 10 + 12 + 4 = 34
  expect(estimateMinutes(blocks, 60)).toBe(34)
})

it('blockMinutes skaliert Kraftblöcke nach Pattern-Zahl (Kompakt-Begleitblock = 1 Pattern)', () => {
  expect(blockMinutes({ block_type: 'upper_strength', variant: null, emphasis: 'normal', patterns: [{ pattern: 'pull_vertical', emphasis: 'normal' }] } as any)).toBe(6)
  expect(blockMinutes({ block_type: 'upper_strength', variant: null, emphasis: 'heavy', patterns: [{ pattern: 'push_vertical', emphasis: 'heavy' }, { pattern: 'pull_horizontal', emphasis: 'normal' }] } as any)).toBe(12)
  expect(blockMinutes({ block_type: 'core', variant: null, emphasis: 'normal' } as any)).toBe(5) // Nicht-Kraft: unverändert BLOCK_MINUTES
})
```

`blockMinutes`-Implementierung (in week-layout-constants.ts, neben BLOCK_MINUTES):

```ts
/** Minuten eines Blocks — Kraftblöcke skalieren mit der Pattern-Zahl
 *  (Review 10.10.: der Pull-only-Begleitblock darf nicht wie 2 Übungen zählen). */
export function blockMinutes(b: { block_type: WorkoutBlockType; patterns?: Array<{ pattern: string }> }): number {
  if ((b.block_type === 'upper_strength' || b.block_type === 'lower_strength') && b.patterns?.length === 1) {
    return b.block_type === 'upper_strength' ? 6 : BLOCK_MINUTES.lower_strength
  }
  return BLOCK_MINUTES[b.block_type]
}
```

(Falls `estimateMinutes` nicht exportiert/anders heißt: den bestehenden BLOCK_MINUTES-Summen-Test im selben File als Vorlage nehmen und exakt dessen Aufrufform verwenden.)

- [ ] **Step 2: Run — FAIL** (`lower_strength` fehlt im Record-Typ → tsc/Test-Fehler)

Run: `cd externals/jemp-temporal-worker && npx vitest run src/plan-generation/__tests__/week-layout.test.ts`

- [ ] **Step 3: Implementieren**

In `week-layout.ts`:

```ts
export type WorkoutBlockType =
  | 'warmup' | 'push' | 'pull' | 'lower_body' | 'lower_strength' | 'upper_strength'
  | 'core' | 'conditioning' | 'plyo' | 'accessory' | 'optional' | 'cooldown' | 'rotation'

/** Pattern-Anforderung eines Kraftblocks (Spec 2026-10-10 §1.2) — Generator-
 *  intern, nicht persistiert. */
export type BlockPattern = { pattern: string; emphasis: 'heavy' | 'normal' }

export type PlannedWorkoutBlock = {
  block_type: WorkoutBlockType
  variant: string | null
  emphasis: 'heavy' | 'normal' | 'light'
  patterns?: BlockPattern[]
}
```

In `week-layout-constants.ts` BLOCK_MINUTES ergänzen: `lower_strength: 10, upper_strength: 12,` (upper trägt 2 Übungen Push+Pull).

- [ ] **Step 4: Run — PASS + volle Suite grün**

Run: `npx vitest run`
Expected: alle Tests grün (157 + 1)

- [ ] **Step 5: Commit**

```bash
git add src/plan-generation/week-layout.ts src/plan-generation/week-layout-constants.ts src/plan-generation/__tests__/week-layout.test.ts
git commit -m "feat(worker): strength block types + BlockPattern type"
```

---

### Task 3: composeWeek — Lead-Rotation, Begleitblock, Kompakt-Pull

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/composition.ts:59-214`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/composition.test.ts`

**Interfaces:**
- Consumes: `BlockPattern`, `PlannedWorkoutBlock` aus Task 2; `COMPACT_SESSION_THRESHOLD_MINUTES` aus week-layout-constants.
- Produces: `composeWeek` liefert pro Tag Blöcke mit `block_type: 'lower_strength' | 'upper_strength'` statt push/pull/lower_body; Kraftblöcke tragen `patterns`; der Lead-Block hat `emphasis: 'heavy'`, der Begleitblock `'normal'`. Bestehende Signatur `composeWeek({ trainingDays, pillarLevels, hasSpeedSession })` unverändert.

**Rotations-Regeln (verbindlich, aus Spec §1.2/§2):**
- Leads alternieren `lower → upper → lower → …` über die sortierten Trainingstage; der `heavy_lower`-Tag des Placements bekommt per Slot-Tausch den Lower-Lead (wie heute `heavyIdx`-Swap).
- Lower-Pattern-Alternierung läuft über die Lower-**LEADS** (eigener Zähler, beginnend **hinge**: bei nur einem Lower-Lead/Woche trägt die hintere Kette den schweren Reiz — das Template wiederholt sich 4 Wochen identisch, Spec §1.2/§6). Begleit-Lower hat einen SEPARATEN, gegenläufigen Zähler (beginnend knee). Lead-Lower: 1 Pattern (heavy). Begleit-Lower: 1 Pattern (normal).
- Upper-Block-Achsen: pro Tag `i % 2 === 0 → push_vertical + pull_horizontal`, sonst `push_horizontal + pull_vertical` (eine vertikale + eine horizontale Übung pro Session, wie heutiges coarseToBlock-Pairing).
- Upper-Lead heavy-Seite: alterniert über die Upper-LEADS, beginnend **Pull-heavy** (Spec §1.2 — bewusster Bias, bei einem Upper-Lead/Woche ist Pull dauerhaft schwer). Begleit-Upper: beide Patterns normal; bei Kompakt-Session (`day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES`) nur `[pull_x normal]` (Push fällt zuerst, Spec §2.2).
- Slot-Priorität (Spec §2.2): `[lead, ...plyoFokus, begleit, core, accessory, optional]`, dann `slice(0, slots)`. Session-Reihenfolge: warmup → plyo → Lead → Begleit → core → accessory → optional → cooldown.
- Core-Rotation, Fokus-Budget, Plyo-Tages-Verteilung bleiben UNVERÄNDERT (Code 1:1 behalten); nur `reserved` ändert sich zu `n /* leads */ + n /* begleit */ + coreCount`.

- [ ] **Step 1: Failing Tests schreiben**

Bestehende composition-Tests, die push/pull/lower_body-Blöcke erwarten, auf die neuen Erwartungen umschreiben (sie SOLLEN rot werden) und neu ergänzen:

```ts
describe('Lead-Rotation (Spec 2026-10-10)', () => {
  it('alterniert Lower/Upper-Lead und richtet den Lower-Lead am heavy_lower-Tag aus', () => {
    const days = [day2(2), day2(4, { heavy_lower: true }), day2(6)] // Helper: PlacedDay mit 60 min
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const leadOf = (dow: number) => week.get(dow)!.find((b) => b.emphasis === 'heavy')!
    expect(leadOf(4).block_type).toBe('lower_strength')          // heavy_lower-Tag
    expect(leadOf(2).block_type).toBe('upper_strength')          // getauscht
    expect(leadOf(6).block_type).toBe('lower_strength')
  })

  it('jede Session enthält beide Kraftblöcke; Begleitblock ist normal', () => {
    const week = composeWeek({ trainingDays: [day2(2), day2(4)], pillarLevels: {}, hasSpeedSession: false })
    for (const blocks of week.values()) {
      const strength = blocks.filter((b) => b.block_type === 'lower_strength' || b.block_type === 'upper_strength')
      expect(strength).toHaveLength(2)
      expect(strength.filter((b) => b.emphasis === 'heavy')).toHaveLength(1)
    }
  })

  it('Upper-Lead: Push UND Pull gefordert, heavy-Seite alterniert über Upper-Leads (Pull zuerst, §1.2-Bias)', () => {
    const days = [day2(1), day2(2), day2(3), day2(4)] // leads: L,U,L,U
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const upperLead = (dow: number) => week.get(dow)!.find((b) => b.block_type === 'upper_strength' && b.emphasis === 'heavy')!
    const p1 = upperLead(2).patterns!
    expect(p1.map((p) => p.pattern.split('_')[0]).sort()).toEqual(['pull', 'push'])
    expect(p1.find((p) => p.emphasis === 'heavy')!.pattern).toMatch(/^pull/)
    expect(upperLead(4).patterns!.find((p) => p.emphasis === 'heavy')!.pattern).toMatch(/^push/)
  })

  it('Lower-LEADS alternieren hinge → knee (Begleit-Lower zählt separat, Review 10.10.)', () => {
    const days = [day2(1), day2(2), day2(3), day2(4)] // lower-leads: Tag 1 + 3
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const lowerLead = (dow: number) => week.get(dow)!.find((b) => b.block_type === 'lower_strength' && b.emphasis === 'heavy')!
    expect(lowerLead(1).patterns![0].pattern).toBe('hinge')        // hintere Kette zuerst
    expect(lowerLead(3).patterns![0].pattern).toBe('knee_dominant')
    // Begleit-Lower (Upper-Lead-Tage) startet gegenläufig mit knee
    const companion = week.get(2)!.find((b) => b.block_type === 'lower_strength' && b.emphasis === 'normal')!
    expect(companion.patterns![0].pattern).toBe('knee_dominant')
  })

  it('Kompakt-Session: Begleit-Upper schrumpft auf Pull (Push fällt zuerst)', () => {
    const week = composeWeek({ trainingDays: [day2(1, { minutes: 40 }), day2(3, { minutes: 40 })], pillarLevels: {}, hasSpeedSession: false })
    const companionUpper = [...week.values()].flat()
      .find((b) => b.block_type === 'upper_strength' && b.emphasis === 'normal')
    expect(companionUpper!.patterns).toHaveLength(1)
    expect(companionUpper!.patterns![0].pattern).toMatch(/^pull/)
  })

  it('1-Tages-Woche: Lower-Lead heavy + Upper-Begleit normal, Kraft nie weggeschnitten', () => {
    const week = composeWeek({ trainingDays: [day2(3, { minutes: 30 })], pillarLevels: { lower_body_plyometrics: 2 }, hasSpeedSession: false })
    const blocks = week.get(3)!
    const strength = blocks.filter((b) => b.block_type === 'lower_strength' || b.block_type === 'upper_strength')
    expect(strength.length).toBeGreaterThanOrEqual(1)
    expect(strength[0]).toMatchObject({ block_type: 'lower_strength', emphasis: 'heavy' })
  })
})
```

(`day2(dow, over)` als Fixture-Helper analog zum bestehenden `day()` aus `fixtures.ts`, mit `minutes: 60` Default.)

- [ ] **Step 2: Run — FAIL** (`composeWeek` liefert noch push/pull/lower_body)

Run: `npx vitest run src/plan-generation/v2/__tests__/composition.test.ts`

- [ ] **Step 3: composeWeek umbauen**

In `composition.ts` die Abschnitte 1+2 (Primary + Komplement, Zeilen 59–117) ersetzen:

```ts
const STRENGTH_LEAD_ROTATION = ['lower_strength', 'upper_strength'] as const
const upperAxes = (i: number): { push: string; pull: string } =>
  i % 2 === 0 ? { push: 'push_vertical', pull: 'pull_horizontal' } : { push: 'push_horizontal', pull: 'pull_vertical' }

// ── 1. Lead-Rotation (Spec 2026-10-10 §2.1): lower ↔ upper, heavy_lower-Tag
// bekommt den Lower-Lead per Slot-Tausch (eine Wahrheit für den Beintag).
const leads = days.map((_, i) => STRENGTH_LEAD_ROTATION[i % 2] as string)
const heavyIdx = days.findIndex((d) => d.heavy_lower)
if (heavyIdx !== -1 && leads[heavyIdx] !== 'lower_strength') {
  const lowerIdx = leads.indexOf('lower_strength')
  if (lowerIdx !== -1) { leads[lowerIdx] = leads[heavyIdx]; leads[heavyIdx] = 'lower_strength' }
}

// Alternierungs-Zähler PRO ROLLE (Review 10.10.): Lead und Begleit zählen
// getrennt — sonst frisst der Begleitblock den Lead-Slot und ein Muster ist
// 4 Wochen lang nie heavy. Biases: hinge-heavy und pull-heavy zuerst (§1.2).
let lowerLeadCount = 0
const nextLowerLeadPattern = () => (lowerLeadCount++ % 2 === 0 ? 'hinge' : 'knee_dominant')
let lowerCompanionCount = 0
const nextLowerCompanionPattern = () => (lowerCompanionCount++ % 2 === 0 ? 'knee_dominant' : 'hinge')
let upperLeadCount = 0

const leadBlocks: PlannedWorkoutBlock[] = []
const companionBlocks: PlannedWorkoutBlock[] = []
days.forEach((day, i) => {
  const axes = upperAxes(i)
  const compact = day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES
  if (leads[i] === 'lower_strength') {
    leadBlocks.push({ block_type: 'lower_strength', variant: null, emphasis: 'heavy', patterns: [{ pattern: nextLowerLeadPattern(), emphasis: 'heavy' }] })
    companionBlocks.push({
      block_type: 'upper_strength', variant: null, emphasis: 'normal',
      // Begleit-Upper: Push+Pull als Paar; Kompakt: nur Pull (Spec §2.2)
      patterns: compact ? [{ pattern: axes.pull, emphasis: 'normal' }]
        : [{ pattern: axes.push, emphasis: 'normal' }, { pattern: axes.pull, emphasis: 'normal' }],
    })
  } else {
    const pullHeavy = upperLeadCount++ % 2 === 0 // Spec §1.2: beginnt Pull-heavy
    leadBlocks.push({
      block_type: 'upper_strength', variant: null, emphasis: 'heavy',
      patterns: [
        { pattern: axes.push, emphasis: pullHeavy ? 'normal' : 'heavy' },
        { pattern: axes.pull, emphasis: pullHeavy ? 'heavy' : 'normal' },
      ],
    })
    companionBlocks.push({ block_type: 'lower_strength', variant: null, emphasis: 'normal', patterns: [{ pattern: nextLowerCompanionPattern(), emphasis: 'normal' }] })
  }
})
```

`reserved` in Abschnitt 4 wird `n + n + coreCount` (unverändert in der Summe). In Abschnitt 5 die picks-Liste umstellen (Spec §2.2 — Fokus VOR Begleitblock):

```ts
const picks: PlannedWorkoutBlock[] = [leadBlocks[i]]
if (plyo) picks.push(plyo as PlannedWorkoutBlock)
picks.push(companionBlocks[i])
if (core) picks.push(core as PlannedWorkoutBlock)
picks.push({ block_type: 'accessory', variant: null, emphasis: 'light' } as PlannedWorkoutBlock)
picks.push({ block_type: 'optional', variant: null, emphasis: 'light' } as PlannedWorkoutBlock)
const selected = picks.slice(0, slots)

// Reihenfolge: plyo → Lead → Begleit → core → Füller
ordered.push(...inSelected('plyo'))
ordered.push(...selected.filter((b) => b === leadBlocks[i]))
ordered.push(...selected.filter((b) => b === companionBlocks[i]))
ordered.push(...inSelected('core'))
ordered.push(...inSelected('accessory'))
ordered.push(...inSelected('optional'))
```

Plyo-Tages-Präferenzen: `isLowerPrimary(i)` wird `leads[i] === 'lower_strength'`, `isPushPrimary(i)` wird `leads[i] === 'upper_strength' && leadBlocks[i].patterns!.some((p) => p.pattern.startsWith('push') && p.emphasis === 'heavy')`. Die alten Helfer `Coarse`/`COARSE_ORDER`/`coarseToBlock`/`blockTypeOfCoarse` ersatzlos löschen. Den §1.6.1-Deckel (Zeilen 169–172 alt) in diesem Task NUR auf die neuen Namen portieren (`primaryBlocks[i].emphasis = 'normal'` → wird in Task 4 durch Pattern-Dämpfung ersetzt; übergangsweise: `leadBlocks[i]`-Push-Pattern auf normal setzen und, wenn kein heavy-Pattern bleibt, Block-emphasis 'normal').

- [ ] **Step 4: Run — alle composition-Tests + volle Suite**

Run: `npx vitest run`
Expected: PASS. Bestehende Tests, die auf push/pull/lower_body prüften, wurden in Step 1 mit umgeschrieben; `pre-drop.test.ts`/`v2-prompts.test.ts`-Brüche hier nur notieren, sie werden in Task 5/6 gefixt — dann diese Dateien in Step 1 jener Tasks anpassen. Ist die Suite deshalb rot, die betroffenen Tests mit `it.skip` + Kommentar `// Task 5/6 fixes this` markieren und im jeweiligen Task entskippen.

- [ ] **Step 5: Commit**

```bash
git add src/plan-generation/v2/composition.ts src/plan-generation/v2/__tests__/composition.test.ts
git commit -m "feat(worker): lead rotation with pattern-carrying strength blocks"
```

---

### Task 4: Säulen-Lead + Kraft-Floor (§3)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/composition.ts` (nach der Plyo-Verteilung)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/composition.test.ts`

**Interfaces:**
- Consumes: `leadBlocks`, `plyoLowerAssigned`/`plyoUpperAssigned`, `leads` aus Task 3.
- Produces: Plyo-Block einer Session kann `emphasis: 'heavy'` tragen (Säulen-Lead); der Kraft-Lead dieses Tages steht auf `'normal'`.

**Regeln (Spec §3.1, Fassung nach Review 10.10.):** Der Säulen-Lead liegt auf dem Lead-Tag der EIGENEN Region (Lower-Plyo → Lower-Lead-Tag, Upper-Plyo → Upper-Lead-Tag) — die gedämpfte Region bekommt am selben Tag den schweren Explosiv-Reiz (Contrast), die andere Region behält ihren heavy Kraft-Lead. Der Säulen-Lead verschiebt höchstens EINE bestehende Tages-Zuweisung der Säule auf den Lead-Tag — er reduziert NIE die Gesamtzahl der Plyo-Blöcke (Fokus-Budget bleibt).

- [ ] **Step 1: Failing Tests**

```ts
describe('Säulen-Lead + Kraft-Floor (Spec 2026-10-10 §3, Review-Fassung)', () => {
  it('Lower-Plyo Level 3 führt den Lower-Lead-Tag; der Upper-Lead bleibt heavy', () => {
    const days = [day2(2), day2(4)] // leads: lower(2), upper(4)
    const week = composeWeek({ trainingDays: days, pillarLevels: { lower_body_plyometrics: 3 }, hasSpeedSession: false })
    const heavyPlyoDays = [...week.entries()].filter(([, b]) => b.some((x) => x.block_type === 'plyo' && x.emphasis === 'heavy'))
    expect(heavyPlyoDays).toHaveLength(1)
    const [dow, blocks] = heavyPlyoDays[0]
    expect(dow).toBe(2) // eigener Region-Lead-Tag (lower)
    expect(blocks.find((b) => b.block_type === 'lower_strength')!.emphasis).toBe('normal')
    expect(week.get(4)!.find((b) => b.block_type === 'upper_strength')!.emphasis).toBe('heavy') // andere Region unangetastet
  })

  it('Upper-Plyo Level 3 führt den Upper-Lead-Tag; der Lower-Lead bleibt heavy', () => {
    const days = [day2(2), day2(4)]
    const week = composeWeek({ trainingDays: days, pillarLevels: { upper_body_plyometrics: 3 }, hasSpeedSession: false })
    const heavy = [...week.entries()].find(([, b]) => b.some((x) => x.block_type === 'plyo' && x.emphasis === 'heavy'))!
    expect(heavy[0]).toBe(4)
    expect(week.get(2)!.find((b) => b.block_type === 'lower_strength')!.emphasis).toBe('heavy')
  })

  it('Säulen-Lead reduziert die Plyo-Menge NICHT (Review-Befund: kein Zuweisungs-Wipe)', () => {
    const days = [day2(1), day2(3), day2(5)] // lange Tage → Budget 3 bei Level 3
    const base = composeWeek({ trainingDays: days, pillarLevels: { lower_body_plyometrics: 2 }, hasSpeedSession: false })
    const withLead = composeWeek({ trainingDays: days, pillarLevels: { lower_body_plyometrics: 3 }, hasSpeedSession: false })
    const countPlyo = (w: Map<number, any[]>) => [...w.values()].flat().filter((b) => b.block_type === 'plyo').length
    expect(countPlyo(withLead)).toBeGreaterThanOrEqual(countPlyo(base))
  })

  it('beide Plyo-Säulen Level 3: nur EIN Säulen-Lead, lower gewinnt', () => {
    const days = [day2(1), day2(3), day2(5)]
    const week = composeWeek({ trainingDays: days, pillarLevels: { lower_body_plyometrics: 3, upper_body_plyometrics: 3 }, hasSpeedSession: false })
    const heavyPlyos = [...week.values()].flat().filter((b) => b.block_type === 'plyo' && b.emphasis === 'heavy')
    expect(heavyPlyos).toHaveLength(1)
    expect(heavyPlyos[0].variant).toBe('lower')
  })

  it('n=1: kein Säulen-Lead, auch bei Level 3', () => {
    const week = composeWeek({ trainingDays: [day2(2)], pillarLevels: { lower_body_plyometrics: 3 }, hasSpeedSession: false })
    expect([...week.values()].flat().filter((b) => b.block_type === 'plyo' && b.emphasis === 'heavy')).toHaveLength(0)
  })

  it('Level 2 führt nie', () => {
    const week = composeWeek({ trainingDays: [day2(2), day2(4)], pillarLevels: { lower_body_plyometrics: 2 }, hasSpeedSession: false })
    expect([...week.values()].flat().filter((b) => b.block_type === 'plyo' && b.emphasis === 'heavy')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — FAIL** (Plyo bleibt überall light)

- [ ] **Step 3: Implementieren** — nach der Plyo-Verteilung, vor Abschnitt 5:

```ts
// ── 4b. Säulen-Lead (Spec §3.1, Review 10.10.): Plyo Level 3 führt max. 1
// Session — auf dem Lead-Tag der EIGENEN Region (Contrast: die Region tauscht
// heavy Kraft gegen heavy Explosiv), nie bei n=1. lower vor upper.
// Verschiebt höchstens EINE Zuweisung, reduziert nie die Plyo-Menge.
let plyoLeadDow: number | null = null
if (n >= 2) {
  const leadPillar = (['lower_body_plyometrics', 'upper_body_plyometrics'] as PillarSlug[])
    .find((p) => (input.pillarLevels[p] ?? 0) === 3)
  if (leadPillar) {
    const ownLead = leadPillar === 'lower_body_plyometrics' ? 'lower_strength' : 'upper_strength'
    const assigned = leadPillar === 'lower_body_plyometrics' ? plyoLowerAssigned : plyoUpperAssigned
    const other = leadPillar === 'lower_body_plyometrics' ? plyoUpperAssigned : plyoLowerAssigned
    const candidates = days
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => leads[i] === ownLead)
      // Tage, die den Plyo-Block der Säule ohnehin tragen, zuerst
      .sort((a, b) => (assigned.has(a.d.day_of_week) ? 0 : 1) - (assigned.has(b.d.day_of_week) ? 0 : 1) || a.d.day_of_week - b.d.day_of_week)
    const chosen = candidates[0]
    if (chosen && assigned.size > 0) {
      plyoLeadDow = chosen.d.day_of_week
      if (!assigned.has(plyoLeadDow)) {
        // Genau EINE Zuweisung umziehen (höchster dow zuerst — deterministisch),
        // Rest bleibt unangetastet (Review: kein Wipe).
        const moved = [...assigned].sort((a, b) => b - a)[0]
        assigned.delete(moved)
        assigned.add(plyoLeadDow)
        // max 1 Plyo-Block pro Session: belegt die ANDERE Säule den Lead-Tag,
        // zieht sie auf den freigewordenen Tag um.
        if (other.has(plyoLeadDow)) { other.delete(plyoLeadDow); other.add(moved) }
      }
      leadBlocks[chosen.i].emphasis = 'normal' // Kraft-Lead → Erhaltungsdosis
      leadBlocks[chosen.i].patterns = leadBlocks[chosen.i].patterns!.map((p) => ({ ...p, emphasis: 'normal' as const }))
    }
  }
}
```

In Abschnitt 5 beim Bauen des Plyo-Picks: `emphasis: dow === plyoLeadDow ? 'heavy' : 'light'`. Picks-Reihenfolge am Säulen-Lead-Tag: Plyo (heavy) VOR dem (jetzt normalen) Kraftblock — die bestehende Reihenfolge plyo→Lead erfüllt das bereits.

- [ ] **Step 4: Run — PASS + volle Suite** — `npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(worker): pillar lead (plyo heavy) with strength floor"`

---

### Task 5: Pools + Region-Matching für die neuen Blöcke

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts` (exerciseMatchesBlock, BLOCK_PREP_REGIONS, neue Pattern-Pool-Hilfe)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pool.test.ts`

**Interfaces:**
- Consumes: `BlockPattern` (Task 2); bestehendes Pattern-Matching der push/pull/lower_body-Cases (Zeilen 53–70 in pool.ts: strength_pattern exakt, covered_patterns, Coarse-Fallback über BODY_REGION_TO_PATTERN — dieselbe Logik wiederverwenden, NICHT duplizieren: in eine Hilfsfunktion `matchesStrengthPattern(ex, pattern)` extrahieren, die alte Cases UND neue Cases nutzen).
- Produces: `exerciseMatchesBlock(ex, block)` matcht `lower_strength`/`upper_strength`, wenn die Übung IRGENDEINEM `block.patterns`-Eintrag entspricht. `export function strengthPatternPools(exercises: V2Exercise[], patterns: BlockPattern[]): Map<string, V2Exercise[]>` (Pattern → Pool) für Prompt/Validator (Task 6/7).

- [ ] **Step 1: Failing Tests**

```ts
describe('upper/lower_strength Pools (Spec 2026-10-10)', () => {
  const upperBlock = { block_type: 'upper_strength', variant: null, emphasis: 'heavy', patterns: [
    { pattern: 'push_vertical', emphasis: 'heavy' }, { pattern: 'pull_horizontal', emphasis: 'normal' },
  ] } as any
  it('matcht Übungen jedes geforderten Patterns, andere nicht', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'ohp', strength_pattern: 'push_vertical' }), upperBlock)).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'row', strength_pattern: 'pull_horizontal' }), upperBlock)).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'bench', strength_pattern: 'push_horizontal' }), upperBlock)).toBe(false)
    expect(exerciseMatchesBlock(ex({ slug: 'squat', strength_pattern: 'knee_dominant' }), upperBlock)).toBe(false)
  })
  it('Coarse-Fallback greift pro Pattern (chest → push)', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), upperBlock)).toBe(true)
  })
  it('strengthPatternPools liefert einen Pool je Pattern', () => {
    const pools = strengthPatternPools([
      ex({ slug: 'ohp', strength_pattern: 'push_vertical' }),
      ex({ slug: 'row', strength_pattern: 'pull_horizontal' }),
    ], upperBlock.patterns)
    expect(pools.get('push_vertical')!.map((e: any) => e.slug)).toEqual(['ohp'])
    expect(pools.get('pull_horizontal')!.map((e: any) => e.slug)).toEqual(['row'])
  })
  it('Warmup-Region-Matching: lower_strength zieht Hüfte, upper_strength Schulter+Rücken', () => {
    const catalog = [
      ex({ slug: 'hip_90_90', category_slug: 'mobility', body_region: 'hip', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
      ex({ slug: 'shoulder_opener', category_slug: 'mobility', body_region: 'shoulder', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
      ex({ slug: 'upper_back_roll', category_slug: 'mobility', body_region: 'upper_back', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
    ]
    const pools = buildBlockPools(catalog as any, [block('warmup'), { block_type: 'upper_strength', variant: null, emphasis: 'heavy', patterns: upperBlock.patterns } as any, block('cooldown')])
    const warmup = pools.get('warmup' as any)!.map((e: any) => e.slug)
    expect(warmup).toEqual(expect.arrayContaining(['shoulder_opener', 'upper_back_roll']))
    expect(warmup).not.toContain('hip_90_90')
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implementieren**

1. Die Pattern-Match-Logik der bestehenden push/pull/lower_body-Cases in `matchesStrengthPattern(ex: V2Exercise, pattern: string): boolean` extrahieren (strength_pattern exakt → covered_patterns → Coarse-Fallback). Alte Cases rufen sie mit ihrer Block-Variante auf (Verhalten identisch, Alt-Tests bleiben grün).
2. Neue Cases: `case 'lower_strength': case 'upper_strength': return (blockDef.patterns ?? []).some((p) => matchesStrengthPattern(ex, p.pattern))`.
3. `export function strengthPatternPools(...)`: `new Map(patterns.map((p) => [p.pattern, exercises.filter((e) => matchesStrengthPattern(e, p.pattern))]))`.
4. `BLOCK_PREP_REGIONS`: `lower_strength: ['hip','glute','hamstring','quad','groin','ankle','calf']`, `upper_strength: ['shoulder','chest','thoracic','tricep','upper_back','neck','bicep']` (Union Push+Pull, Spec §4); alte Keys `lower_body`/`push`/`pull` behalten (Alt-Pfad-kompatibel).

- [ ] **Step 4: Run — PASS + volle Suite** — `npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(worker): pattern-based pools for upper/lower strength blocks"`

---

### Task 6: Validator + Kontext-Verdrahtung (prepare → runSessionV2)

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts` (findV2Violations, runSessionV2)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts:228-251` (SessionBuildInputs: patternReqs bauen, Pre-Degrade)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/run-session-v2.test.ts`

**Interfaces:**
- Consumes: `strengthPatternPools` (Task 5), `patterns` auf den Blöcken (Task 3).
- Produces: `export type PatternRequirement = { block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: Set<string> }`; `findV2Violations(session, pools, expectedBlocks, patternReqs: PatternRequirement[] = [])` — neue Verletzung, wenn ein Kraftblock keine Übung eines geforderten Patterns enthält. Pre-Degrade in prepare: Pattern mit leerem Pool wird aus `block.patterns` UND den Reqs entfernt + Note (`Tag X: Pattern pull_vertical ohne Pool-Übungen — Anforderung entfällt`); verliert ein Block ALLE Patterns, wird er wie bisher pre-gedroppt (preDropEmptyPools-Mechanik).

- [ ] **Step 1: Failing Tests**

```ts
describe('Pattern-Anforderungen im Validator (Spec 2026-10-10 §1.2)', () => {
  const reqs = [
    { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'heavy', slugs: new Set(['ohp']) },
    { block_type: 'upper_strength', pattern: 'pull_horizontal', emphasis: 'normal', slugs: new Set(['row']) },
  ] as any
  const pools = new Map([['upper_strength', { slugs: new Set(['ohp', 'row', 'bench']) }]])
  it('ok, wenn jedes Pattern vertreten ist', () => {
    const s = session([{ block_type: 'upper_strength', slugs: ['ohp', 'row'] }])
    expect(findV2Violations(s, pools as any, ['upper_strength'], reqs)).toEqual([])
  })
  it('Verletzung, wenn Pull fehlt (zwei Push-Übungen)', () => {
    const s = session([{ block_type: 'upper_strength', slugs: ['ohp', 'bench'] }])
    expect(findV2Violations(s, pools as any, ['upper_strength'], reqs).join(' ')).toMatch(/pull_horizontal/)
  })
})
```

- [ ] **Step 2: Run — FAIL** (4. Parameter existiert nicht)

- [ ] **Step 3: Implementieren**

In `findV2Violations` anhängen:

```ts
for (const req of patternReqs) {
  const b = session.blocks.find((x) => x.block_type === req.block_type)
  if (!b) continue // fehlender Block wird oben schon gemeldet
  if (!b.exercises.some((e) => req.slugs.has(e.exercise_slug))) {
    violations.push(`Block "${req.block_type}": kein ${req.pattern} vertreten — wähle 1 Übung aus: ${[...req.slugs].slice(0, 12).join(', ')}`)
  }
}
```

In `prepare-v2.ts` beim Bauen der SessionBuildInputs: für jeden Kraftblock `strengthPatternPools(dayExercises, block.patterns!)` ziehen; leere Patterns aus `block.patterns` filtern (+ Note); Reqs als `v2.patternReqs` in den `V2SessionContext` (Typ dort erweitern: `patternReqs: PatternRequirement[]`). `runSessionV2` reicht sie an `findV2Violations` durch. Serialisierbarkeit beachten (Temporal-Payload): `slugs` als `string[]` über die Activity-Grenze transportieren und erst in `runSessionV2` zu `Set` machen — `PatternRequirement.slugs: Set<string>` bleibt die Validator-Sicht, der Kontext-Typ nutzt `slugs: string[]`.

- [ ] **Step 4: Run — PASS + volle Suite; in Task 3 geskippte Tests entskippen und fixen**

Run: `npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(worker): pattern requirements enforced by validator with pre-degrade"`

---

### Task 7: Prompts + Session-Titel

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/v2-prompts.ts` (blockLines, upperCap, poolLines-Aufbereitung in run-session-v2)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/session-title.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/v2-prompts.test.ts`, `.../session-title.test.ts`

**Interfaces:**
- Consumes: `patterns` auf Blöcken, `patternReqs` (Task 6), `VARIANT_LABELS` (bestehend — die Pattern-Slugs sind dieselben Keys: push_vertical etc.).
- Produces: Prompt-Blockzeile nennt je Pattern Label + Dosis; Pool-Sektion gruppiert Kraftblock-Pools pro Pattern; Titel kennt die neuen Blöcke und nennt Plyo-Lead-Sessions „Explosivität & Kraft".

- [ ] **Step 1: Failing Tests**

```ts
// v2-prompts.test.ts
it('upper_strength-Zeile nennt beide Patterns mit Dosis und Supersatz-Hinweis', () => {
  const prompt = V2_SESSION_PROMPT(promptInput({ blocks: [
    block('warmup'),
    { block_type: 'upper_strength', variant: null, emphasis: 'heavy', patterns: [
      { pattern: 'push_vertical', emphasis: 'heavy' }, { pattern: 'pull_horizontal', emphasis: 'normal' },
    ] },
    block('cooldown'),
  ] }))
  expect(prompt).toMatch(/upper_strength/)
  expect(prompt).toMatch(/vertikaler Push.*4–5 Sätze|4–5 Sätze.*vertikaler Push/s)
  expect(prompt).toMatch(/horizontaler Pull.*3 Sätze|3 Sätze.*horizontaler Pull/s)
  expect(prompt).toMatch(/Supersatz/)
})
it('OBERKÖRPER-DECKEL feuert bei Upper-Plyo + Push-heavy im upper_strength', () => { /* analog zum bestehenden upperCap-Test, hasPush über patterns statt block_type 'push' */ })

// session-title.test.ts
it('Kraft-Titel aus lower/upper_strength', () => {
  expect(trainingSessionTitle([{ block_type: 'lower_strength' }, { block_type: 'core' }], {})).toBe('Kraft & Rumpf')
})
it('Plyo-Lead-Session führt mit Explosivität', () => {
  expect(trainingSessionTitle([
    { block_type: 'plyo', emphasis: 'heavy' } as any, { block_type: 'upper_strength' },
  ], {})).toBe('Explosivität & Kraft')
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implementieren**

`v2-prompts.ts` blockLines: für Kraftblöcke statt der alten emphasis-Zeile pro Pattern eine Teilzeile aus `VARIANT_LABELS[p.pattern]` + Dosis-Text (heavy: „4–5 Sätze, 3–5 Wdh., schwer, lange Pausen"; normal: „3 Sätze, 5–8 Wdh., solide"); `upper_strength` zusätzlich „— als Antagonisten-Supersatz ausführen". `hasPush` für den upperCap: `workout.blocks.some((b) => (b.patterns ?? []).some((p) => p.pattern.startsWith('push') && p.emphasis === 'heavy'))`. Pool-Zeilen in `run-session-v2.ts`: für Kraftblöcke `patternReqs` nutzen — `- \`upper_strength\`: push_vertical: [ohp, …] | pull_horizontal: [row, …]`.

`session-title.ts`: `STRENGTH_BLOCKS` um `lower_strength`, `upper_strength` erweitern; `TitleBlock` um `emphasis?: string`; wenn ein Plyo-Block `emphasis === 'heavy'` hat → `themes.unshift('Explosivität')` statt push (Explosivität zuerst, Dedupe beachten).

- [ ] **Step 4: Run — PASS + volle Suite** — `npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(worker): pattern-aware prompts and titles"`

---

### Task 8: App-Übergang (Labels, Hero, Beintag-Warnung)

**Files:**
- Modify: `queries/use-plan-query.ts:86` (has_heavy_lower)
- Modify: `constants/blocks.ts:14-17` (HERO_BLOCK_ORDER)
- Modify: `i18n/locales/de.ts`, `i18n/locales/en.ts` (block_type-Labels)
- Test: `lib/__tests__/blocks.test.ts` (bestehende Datei — Bauweise übernehmen)

**Interfaces:**
- Consumes: Block-Slugs `lower_strength`/`upper_strength` aus Task 1.
- Produces: `has_heavy_lower` true für heavy `lower_strength` ODER heavy `lower_body` (Alt-Pläne); App-Labels „Unterkörper-Kraft"/„Oberkörper-Kraft" (en: „Lower-Body Strength"/„Upper-Body Strength").

- [ ] **Step 1: Failing Test** (in `lib/__tests__/blocks.test.ts`, Stil der Datei übernehmen):

```ts
it('HERO_BLOCK_ORDER enthält die v2-Kraftblöcke vor plyo', () => {
    const lower = HERO_BLOCK_ORDER.indexOf('lower_strength');
    const upper = HERO_BLOCK_ORDER.indexOf('upper_strength');
    expect(lower).toBeGreaterThan(-1);
    expect(upper).toBeGreaterThan(-1);
    expect(lower).toBeLessThan(HERO_BLOCK_ORDER.indexOf('plyo'));
});
```

- [ ] **Step 2: Run — FAIL** — `npx jest lib/__tests__/blocks.test.ts`

- [ ] **Step 3: Implementieren**

`constants/blocks.ts`: in HERO_BLOCK_ORDER nach `'accessory',` einfügen: `'lower_strength', 'upper_strength',` (vor `'lower_body'`). `use-plan-query.ts`:

```ts
const hasHeavyLower = blocks.some((b: any) =>
    (b.block_type?.slug === 'lower_strength' || b.block_type?.slug === 'lower_body') && b.emphasis === 'heavy');
```

i18n de: `'block_type.lower_strength': 'Unterkörper-Kraft', 'block_type.upper_strength': 'Oberkörper-Kraft',` (neben den bestehenden block_type-Keys, Zeile ~150); en analog `'Lower-Body Strength'` / `'Upper-Body Strength'`.

- [ ] **Step 4: Run — PASS + App-Suite + tsc**

Run: `npx jest && npx tsc --noEmit 2>&1 | grep -E "blocks.ts|use-plan-query" ; true`
Expected: jest grün (132 + 1), kein tsc-Fehler in den beiden Dateien

- [ ] **Step 5: Commit** — `git commit -m "feat(app): render + heavy-lower transition for strength blocks"`

---

### Task 9: E2E-Verifikation + Spec-Supersede-Hinweis

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-session-composition-rework-design.md` (Hinweis-Zeile unter dem Titel)
- Kein Code; nutzt `supabase/test-scripts/debug-plan-generation-v2.ts` mit einem aus der lokalen DB exportierten Input.

- [ ] **Step 0: Test-Input aus der lokalen DB exportieren** (User leo2@mail.com, Kickboxer, 4 Tage, nur Gym):

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -t -A -c "
SELECT json_build_object(
  'sport', s.slug, 'gender', up.gender, 'age', 25, 'height_cm', up.height_in_cm, 'weight_kg', up.weight_in_kg,
  'preferred_workout_days', up.preferred_workout_days,
  'min_session_duration', 45, 'max_session_duration', 60,
  'weekly_schedule', up.weekly_schedule,
  'environment_ids', (SELECT coalesce(json_agg(ue.environment_id),'[]'::json) FROM user_environments ue WHERE ue.user_id=up.id),
  'equipment_ids', (SELECT coalesce(json_agg(uq.equipment_id),'[]'::json) FROM user_equipments uq WHERE uq.user_id=up.id),
  'equipment_environments', (SELECT coalesce(json_agg(json_build_object('equipment_id', uee.equipment_id, 'environment_ids', uee.environment_ids)),'[]'::json)
     FROM (SELECT equipment_id, array_agg(environment_id) AS environment_ids FROM user_equipment_environments WHERE user_id=up.id GROUP BY equipment_id) uee),
  'category_levels', (SELECT coalesce(json_agg(json_build_object('category_id', ucl.category_id, 'level_score', ucl.level_score)),'[]'::json) FROM user_category_levels ucl WHERE ucl.user_id=up.id),
  'pillar_levels', (SELECT coalesce(json_object_agg(c.slug, pl.level),'{}'::json) FROM user_pillar_levels pl JOIN categories c ON c.id=pl.category_id WHERE pl.user_id=up.id),
  'sprints_covered_by_club', up.sprints_covered_by_club, 'sprint_distance', up.sprint_distance,
  'day_environments', '[]'::json, 'day_minutes', up.preferred_day_durations, 'user_id', up.id)
FROM user_profiles up JOIN sports s ON s.id = up.sport_id JOIN auth.users u ON u.id = up.id
WHERE u.email='leo2@mail.com';" > /tmp/leo2-input.json
```

(ACHTUNG: `max_session_duration` ist bewusst als Zahl 60 hartkodiert — `up.preferred_session_duration` ist ein String wie '90min' und erzeugt NaN-Minuten.)

- [ ] **Step 1: Prepare-Lauf (deterministisch, ohne LLM)**

Run: `npx tsx supabase/test-scripts/debug-plan-generation-v2.ts /tmp/leo2-input.json --stop-after prepare`
Expected im weekPlanSummary: Trainingstage zeigen abwechselnd `lower_strength`/`upper_strength`-Leads; der `heavy lower`-Tag trägt den Lower-Lead; jede Session listet beide Kraftblöcke (60-min-Tage) bzw. Lead + Pull-only-Begleit (≤45 min); keine `push`/`pull`/`lower_body`-Blöcke mehr.

- [ ] **Step 2: Voller Lauf (mit LLM, braucht OPENAI_API_KEY)**

Run: ohne `--stop-after`
Expected: Upper-Blöcke enthalten je 1 Push- + 1 Pull-Übung; keine Validator-Endlos-Retries (Log prüfen); Titel ohne Sportart/Tag-Nummer.

- [ ] **Step 3: Supersede-Hinweis in die alte Spec**

Unter den Titel von `2026-10-09-session-composition-rework-design.md`: `> §1.1–§1.3 und §1.6.1 sind durch docs/superpowers/specs/2026-10-10-upper-lower-strength-blocks-design.md ersetzt.`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-09-session-composition-rework-design.md
git commit -m "docs: mark composition-rework sections superseded by upper/lower blocks"
```

---

## Self-Review-Protokoll

- **Spec-Coverage:** §1.1/1.2 → Task 2+3+5; §1.3 → Task 3 (Block-emphasis) + Task 8 (App-Check); §2.1–2.2 → Task 3; §2.3 → Task 3 (Portierung) + Task 7 (Deckel-Prompt); §3 → Task 4; §4 → Tasks 3–7; §5 → Task 1 + 8; §6 bewusst nicht geplant (Follow-ups). Lücke gefunden & geschlossen: Pre-Degrade leerer Pattern-Pools stand nur implizit in der Spec („Pools pro Pattern") — als harte Anforderung in Task 6 verankert (Review Focus 3).
- **Platzhalter:** keine TBD/„analog"-Steps ohne Code; Task 7 upperCap-Test verweist auf bestehenden Test als Bauvorlage MIT konkreter Änderungsangabe.
- **Typ-Konsistenz:** `BlockPattern` (Task 2) = `patterns`-Einträge (Task 3/5/7); `PatternRequirement` nur in Task 6 definiert und dort von run-session konsumiert; `strengthPatternPools` Task 5 → Task 6.
- **Review Focus:** alle 5 Zeilen haben einen Owner-Task mit Test (1/5 → Task 3, 2 → Task 4, 3 → Task 6, 4 → Task 8, 5 → Task 3).
