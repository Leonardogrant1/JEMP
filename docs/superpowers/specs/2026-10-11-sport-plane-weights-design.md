# Sport-Plane-Weights: Bewegungsebenen in den Kraft-Pattern-Fenstern

**Datum:** 2026-10-11
**Status:** Design freigegeben (Chat-Review 11.10.), Seeds korrigiert
**Kontext:** Nach dem Conditioning-Formate-Paket (Spec 2026-10-10) und der
Multiplanar-Migration (`20261011100000`) ist die nächste Monotonie-Front die
Bewegungsebene: Die Bein-Kraftpools waren 28/30 sagittal, und selbst mit neuen
frontalen/transversalen Übungen garantiert nichts im Generator, dass sie je im
Fenster auftauchen oder gewählt werden. Athleten bewegen sich im Sport lateral
und rotierend — im Plan bisher praktisch nie unter Last.

## §0 Entscheidungen (Chat, 11.10.)

1. **Nur normal-Slots.** Heavy-Muster (der Schwerpunkt der Session) bleiben
   linear/sagittal — Maximalkraft wird mit der Langhantel aufgebaut, die
   multiplanaren Übungen sind mit KB/DB nicht schwer genug ladbar. Die
   Ebenen-Arbeit lebt ausschließlich in Mustern mit `emphasis: 'normal'`.
2. **Sportabhängig via Tabelle** `sport_plane_weights`, nicht sport-agnostische
   Pauschal-Garantie — ein Kickboxer braucht Rotation, ein Läufer fast nur
   Linearität.
3. **Alle vier Muster-Familien** (`knee_dominant`, `hinge`, `push`, `pull`)
   von Anfang an, Gewichte pro `(group_name, pattern, plane)` — eine
   Verteilung über alle Muster gemittelt passt für keines (Kampfsport:
   transversal im Push sehr relevant, im Pull mittel, Beine mittel).
4. **Mechanik B: Session-Zyklus.** Largest-Remainder-10-Slot-Zyklus wie bei
   den Conditioning-Formaten, pro Muster-Familie — die Gewichte steuern, wie
   oft ein Muster eine Ebenen-Betonung bekommt, nicht die
   Fensterzusammensetzung jeder einzelnen Session.
5. **Keine harte Validator-Regel.** Steuerung wie bei der Sport-Präferenz über
   Fenster-Sichtbarkeit + explizite Prompt-Ansage; dünne Pools dürfen keine
   Retries erzwingen.

## §1 Tabelle `sport_plane_weights`

Zwilling von `sport_conditioning_weights` (Migration-Konventionen identisch:
Rollout-Gate-Header, Transaktion, `lock_timeout '5s'`, RLS select für
authenticated, idempotenter Seed via `on conflict do nothing`):

```sql
create table sport_plane_weights (
  group_name text not null,
  pattern text not null check (pattern in ('knee_dominant', 'hinge', 'push', 'pull')),
  plane movement_type not null,          -- sagittal | frontal | transverse
  weight smallint not null check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (group_name, pattern, plane)
);
```

- `pattern` auf **Familien-Ebene**: `push` deckt `push_vertical` +
  `push_horizontal`, `pull` analog — ein rotationales Drücken ersetzt vertikal
  wie horizontal, eine Trennung würde nur Seed-Zeilen verdoppeln.
  Mapping im Worker: `push_vertical|push_horizontal → 'push'`,
  `pull_vertical|pull_horizontal → 'pull'`, `knee_dominant`/`hinge` identisch.
- `plane` nutzt das bestehende `movement_type`-Enum. Semantik von `sagittal`:
  „kein Ebenen-Fokus, Fenster wie heute" — es ist das Komplement, keine
  eigene Betonung.

## §2 Seed-Gewichte

Format `sagittal/frontal/transverse`, Summe je Zeile 100:

| group_name | knee_dominant | hinge | push | pull |
|---|---|---|---|---|
| combat_sports | 50/10/40 | 60/10/30 | 40/0/60 | 60/0/40 |
| team_sports | 50/40/10 | 55/20/25 | 75/0/25 | 80/0/20 |
| racket_sports | 50/25/25 | 60/10/30 | 50/0/50 | 60/0/40 |
| athletics | 80/15/5 | 85/10/5 | 90/0/10 | 90/0/10 |
| endurance | 80/15/5 | 90/5/5 | 95/0/5 | 95/0/5 |
| strength | 85/10/5 | 90/5/5 | 90/0/10 | 90/0/10 |
| other | 60/25/15 | 75/15/10 | 80/0/20 | 80/0/20 |

Begründungen aus dem Review (11.10.):

- **team_sports hinge 55/20/25**: Fußball/Basketball bremsen und drehen aus
  der Hüfte; Hamstring-Verletzungen passieren fast nie rein sagittal.
- **team_sports push 75/0/25**: Der Schuss ist eine Rotationskette, der
  Oberkörper überträgt dabei.
- **athletics sprint-ausgelegt** (80/15/5): Die Gruppe mischt Sprinter (rein
  sagittal) und Werfer (transversal dominant) — ein Mittelwert passt für
  keinen. Ausgelegt Richtung Sprint; **Werfer sind ein bekannter Sonderfall**
  und laufen bis zu einer eigenen Gruppen-Aufteilung über `other` oder eine
  spätere Gruppe (außerhalb dieses Scopes).
- **Push frontal überall 0**: seitliches Drücken kommt in kaum einem Sport vor.
- **combat_sports hinge 60/10/30 setzt §5 voraus**: Ohne die zwei neuen
  hinge-Übungen aus §5 stünde der transversale hinge-Pool bei 1 Übung
  (`rotational_single_leg_rdl`) und frontal bei 0 — 30 % Gewicht hieße
  dieselbe Übung in 3 von 10 Plänen. §5 und der Seed gehören in dasselbe
  Deployment.

Fallback im Worker (analog `resolveConditioningWeights`): fehlt eine Gruppe
oder ein Muster in der Tabelle, gilt `DEFAULT_PLANE_WEIGHTS = { sagittal: 100,
frontal: 0, transverse: 0 }` — kein Ebenen-Fokus, exakt heutiges Verhalten.
Dieser Default ist bewusst neutral: Ein Datenloch darf nie Fenster verengen.

## §3 Zyklus-Mechanik: generischer Helper + Stride 3

### §3.1 Generalisierung `weighted-cycle.ts`

`buildFormatCycle` aus `conditioning-format.ts` wird zu einem generischen
Helper extrahiert (neues Modul `src/plan-generation/v2/weighted-cycle.ts`):

```ts
export function buildWeightedCycle<T extends string>(
  weights: Record<T, number>,
  order: T[],          // deterministische Reihenfolge der Kategorien
  fallback: T,         // Gesamtgewicht 0 → Zyklus voll mit fallback
): T[]                 // Länge 10
```

Verhalten identisch zur heutigen Implementierung: Largest-Remainder auf 10
Slots (Gleichstand → kleineres Gewicht zuerst, damit 5 %-Gewichte nicht
systematisch auf 0 fallen), Verschränkung über Positions-Schlüssel
`(k + 0.5) / n` (Gleichstand: kleineres n zuerst) — Ein-Slot-Kategorien landen
in der Zyklus-Mitte. `conditioning-format.ts` delegiert
(`buildFormatCycle(weights) = buildWeightedCycle(weights, FORMATS,
'intensive')`); alle bestehenden Conditioning-Tests bleiben unverändert grün.

### §3.2 `plane-emphasis.ts`

```ts
export type Plane = 'sagittal' | 'frontal' | 'transverse'
export type PlaneWeights = Record<Plane, number>
export type PatternFamily = 'knee_dominant' | 'hinge' | 'push' | 'pull'

export const DEFAULT_PLANE_WEIGHTS: PlaneWeights = { sagittal: 100, frontal: 0, transverse: 0 }
export const PLANE_CYCLE_STRIDE = 3

export function toPatternFamily(pattern: string): PatternFamily
export function resolvePlaneWeights(
  rows: Array<{ group_name: string; pattern: string; plane: string; weight: number }>,
  groupName: string | undefined,
): Record<PatternFamily, PlaneWeights>   // fehlende Einträge → DEFAULT_PLANE_WEIGHTS
export function pickPlaneEmphasis(weights: PlaneWeights, position: number): Plane
// = buildWeightedCycle(weights, ['sagittal','frontal','transverse'], 'sagittal')[position mod 10]
```

### §3.3 Zyklusposition: `planCount × 3 + Vorkommens-Index`

Pro Muster-Familie läuft ein eigener Zyklus. Die Position für das k-te
normal-Vorkommen einer Familie innerhalb des Plans (Zählung über die Sessions
in Generierungsreihenfolge, pro Familie ein Zähler) ist:

```
position = planCount * PLANE_CYCLE_STRIDE + k        // PLANE_CYCLE_STRIDE = 3
```

**Warum Stride 3** (Review-Fund 11.10.): Mit `planCount + k` würde sich bei
zwei Vorkommen pro Woche die zweite Position im Folgeplan wiederholen (n, n+1
→ n+1, n+2). Stride 3 beseitigt den Überlapp, und ggT(3, 10) = 1 garantiert,
dass ein Muster mit einem Vorkommen pro Woche über 10 Pläne alle 10
Zyklus-Slots durchläuft (Stride 2 sähe nur die geraden). Heavy-Vorkommen
zählen nicht — sie nehmen am Zyklus nicht teil (§0.1).

## §4 Wirkung im Generator

### §4.1 Laden (prepare-v2)

`sport_plane_weights` wird im bestehenden `Promise.all` neben
`sport_conditioning_weights` + planCount geladen und via
`resolvePlaneWeights(rows, input.sport_group_name)` aufgelöst.

### §4.2 Fenster-Pinning (`patternSlugWindow`)

`patternSlugWindow(pool, emphasis, offset)` bekommt einen optionalen Parameter
`planeFocus?: Plane`:

- `emphasis === 'heavy'` → unverändert voller Pool, `planeFocus` wird
  ignoriert (§0.1).
- `emphasis === 'normal'` und `planeFocus` gesetzt (≠ sagittal): Vor dem
  4er-Fenster wird **genau 1 Slot** für die (in rotierter Reihenfolge) erste
  Übung mit `movement_type === planeFocus` reserviert und gepinnt — zusätzlich
  zu den bestehenden preferred-Pins, zusammen gedeckelt wie bisher
  (Pins verdrängen das Fenster nicht komplett: Fenstergröße bleibt
  `max(4, pinned.length)`). Fallback-Kette: keine Übung der Ziel-Ebene →
  erste andere nicht-sagittale Übung; auch keine → kein Pin, Fenster wie
  heute (leerer Pool darf nie Effekte erzwingen, §2 Fallback-Prinzip).
- `planeFocus` fehlt oder `sagittal` → exakt heutiges Verhalten.

`V2Exercise.movement_type` existiert bereits (Plyo-Fenster gruppiert danach).

### §4.3 Prompt-Zeile (run-session-v2 / v2-prompts)

`V2SessionContext.patternReqs`-Einträge werden erweitert:

```ts
{ block_type, pattern, emphasis, slugs: string[],
  planeFocus?: 'frontal' | 'transverse', planeSlugs?: string[] }
```

`planeSlugs` = die gepinnten Ebenen-Übungen (praktisch 1, Format als Array
für Vorwärtskompatibilität). `V2_SESSION_PROMPT` rendert daraus nach den
Pool-Zeilen eine Ansage analog SPORT-PRÄFERENZ:

```
EBENEN-FOKUS: Wähle für <pattern> heute eine dieser Übungen als
Sekundärmuster-Übung — <laterale|rotierende> Kraft gehört zum Sport des
Athleten: <planeSlugs>
```

(`frontal` → „laterale", `transverse` → „rotierende".) Der Validator prüft
weiterhin nur Pattern-Abdeckung, **nicht** die Ebene (§0.5) — gegen den
Lehrbuch-Bias steht die explizite Ansage plus die Fenster-Verknappung.

### §4.4 Nicht-Ziele

- Keine Ebenen-Steuerung für Core (hat Block-Varianten), Plyo
  (Rotations-Übungen laufen über Sport-Präferenz + movement_type-Fenster),
  Accessory, Conditioning.
- Keine App-Änderungen: `sport_plane_weights` ist reine Generator-Steuerung.
- Kein Persistieren der gewählten Ebene am Plan — der Zyklus ist aus
  planCount deterministisch rekonstruierbar.

## §5 Content-Migration: transversale/frontale Lücken schließen

Eigene Migration nach bestehendem Muster (Rollout-Gate, Transaktion, Casts,
idempotent, `category strength`, `exercise_regions` primary, ohne
Video/Thumbnail). **Gehört in dasselbe Deployment wie der §2-Seed** (combat
hinge 30 transversal setzt den erweiterten Pool voraus):

| slug | Familie / strength_pattern | movement_type | Equipment (any-match) | Envs | Int | min_level | laterality | image_group |
|---|---|---|---|---|---|---|---|---|
| `split_stance_landmine_press` | push / push_vertical | transverse | landmine | gym | 6 | 20 | unilateral | upper_push |
| `single_arm_cable_press_rotation` | push / push_horizontal | transverse | cable_machine | gym | 6 | 25 | unilateral | upper_push |
| `rotational_cable_row` | pull / pull_horizontal | transverse | cable_machine | gym | 5 | 15 | unilateral | upper_pull |
| `single_arm_dumbbell_row_rotation` | pull / pull_horizontal | transverse | dumbbell, bench | gym, home | 5 | 20 | unilateral | upper_pull |
| `cross_body_kettlebell_deadlift` | hinge / hinge | transverse | kettlebell, dumbbell | gym, home | 5 | 20 | unilateral | hip_hinge |
| `single_leg_rdl_lateral_reach` | hinge / hinge | frontal | dumbbell, kettlebell | gym, home | 5 | 25 | unilateral | hip_hinge |

Beschreibungen (de/en) in der Migration ausformuliert, Stil wie
`20261011100000` (was die Übung ist + warum sie dem Athleten dient).
Pool-Stand danach: hinge transversal 2, hinge frontal 1, push transversal 3
(inkl. `explosive_rotational_cable_press`), pull transversal 2. Die
knee_dominant-Lücken hat `20261011100000` bereits geschlossen (frontal 4,
transversal 2).

## §6 Tests

Vitest im Worker (`npx vitest run` aus `externals/jemp-temporal-worker/`):

1. **weighted-cycle.test.ts**: Generalisierung — Verteilung, Largest-Remainder-
   Tie-Breaks, Verschränkung, Gesamtgewicht 0 → fallback. Bestehende
   conditioning-format-Tests bleiben unverändert grün (Delegation).
2. **plane-emphasis.test.ts**: `toPatternFamily`-Mapping,
   `resolvePlaneWeights` (fehlende Gruppe/Muster → DEFAULT), `pickPlaneEmphasis`
   Verteilung über 10 Positionen gegen Seed-Gewichte, Stride-Eigenschaft
   (Positionen `planCount*3 + k` ohne Überlapp zwischen Folgeplänen).
3. **pool.test.ts**: `patternSlugWindow` mit `planeFocus` — Pin der
   Ziel-Ebene, Fallback auf andere nicht-sagittale, kein Pin bei leerem
   Ebenen-Pool, heavy ignoriert planeFocus, Zusammenspiel mit preferred-Pins
   (Fenstergröße).
4. **v2-prompts.test.ts**: EBENEN-FOKUS-Zeile erscheint mit planeSlugs,
   „laterale" vs. „rotierende" je Plane, keine Zeile ohne planeFocus.
5. **prepare-v2** (exercise-filter/prepare-Tests): Vorkommens-Zähler pro
   Familie über die Woche, patternReqs tragen planeFocus/planeSlugs,
   Loader-Fallback bei leerer Tabelle.

E2E-Probe (Scratchpad-Pattern, leo2-Input): combat/kickboxing →
über mehrere planCount-Werte erscheint rotationales Drücken als
Sekundärmuster-Pin in ~6/10 Plänen; Gegenprobe endurance → fast nie.

## §7 Rollout & Constraints

- Migrationen beginnen mit dem ⚠️-ROLLOUT-GATE-Header (§6.3,
  3.0.0-Batch), laufen in Transaktion mit `set local lock_timeout = '5s'`,
  nur via `supabase migration up`, nie auf Prod pushen.
- Worker-Deploy erst nach beiden Migrationen (Tabelle + Content) — der Loader
  toleriert eine fehlende/leere Tabelle aber via DEFAULT (kein harter Bruch).
- Seeds sind Daten, keine Architektur: Nachjustieren (z. B. combat hinge
  anheben, wenn der Pool weiter wächst; Werfer-Gruppe) braucht nur eine
  weitere Seed-Migration.
