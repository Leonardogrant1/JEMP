# Session Composition Rework (Primary-Rotation, Fokus-Block-Budget, Movement-Type) — Design

> §1.1–§1.3 und §1.6.1 sind durch `docs/superpowers/specs/2026-10-10-upper-lower-strength-blocks-design.md` ersetzt (Upper/Lower-Strength-Blöcke, Lead-Rotation, Säulen-Lead + Kraft-Floor).

**Status:** Design (Brainstorming abgeschlossen 2026-10-09)
**Branch:** feat/session-structure
**Ersetzt:** Teile von `2026-10-07-session-structure-redesign-design.md` — §1.2 (feste Block-Sequenz), §1.3 (Exercise-Metadaten, erweitert), §2.4 (Pattern-Blocks), §2.9 (Scaling-Lever). Der Rest jenes Specs (Säulen, Session-Types, Fatigue/Week-Layout, Scores, Rollout) bleibt gültig.

## Overview

Die erste Redesign-Phase hat eine **feste Block-Pflichtsequenz** eingeführt (warmup → push → pull → lower_body → rotation → core → plyo → accessory → optional → cooldown), bei der jeder Block in *jeder* Session vorkommen muss. Die QA-Phase hat gezeigt, dass das fachlich falsche Pläne produziert: ~10–12 Content-Blöcke pro Session, ohne Hierarchie (jeder Block gleichwertig), Plyo maximal *und* submaximal in jeder Einheit. Das ist eine Inventarliste, kein Coaching.

Der Denkfehler: **Vollständigkeit pro Session statt pro Woche.** Ein Coach plant die Woche komplett und verteilt; eine einzelne Session hat 4–6 Übungen, davon eine oder zwei, die zählen. Die Drop-Logik (§2.9 alt) ist nur ein Pflaster — sie kürzt eine überladene Session nachträglich, statt sie schlank zu planen.

Dieser Rework dreht das um: **Wochenabdeckung statt Session-Abdeckung, mit Hierarchie.**

### Goals

- Sessions mit 3–6 Content-Blöcken, genau einem Primary (der schweren Hauptübung).
- Kraft-Grundbewegungen (Squat/Hinge/Push/Pull) über eine feste Primary-Rotation garantiert, nicht wegpriorisierbar.
- Fokus-Punkte der Säulen werden zum **Wochen-Block-Budget**: jeder Punkt = ein Block dieses Typs mehr pro Woche.
- Plyo getrennt nach Ober-/Unterkörper, vor dem Primary, ZNS-geschützt gegen die Speed-Session.
- Core als fester Standard-Block mit sauberer movement_type-Taxonomie.
- Universelles `movement_type` (Bewegungsebene) auf allen Übungen für präzise Pool-Queries und „alle drei Ebenen"-Abdeckung.

### Non-goals

- Keine Änderung an Session-Types, Week-Layout-Placement (72h-Regel, Speed/Mobility/Conditioning-Tage), Scores oder Rollout-Gate — die bleiben wie in `2026-10-07`.
- Keine Hypertrophie-Programmierung (bleibt post-v1).

---

## 1. Kompositions-Modell

### 1.1 Primary-Rotation (Kraft-Grundgerüst)

Jede Training-Session hat **genau einen Primary-Block** — die schwere Hauptübung, 4–5 Sätze, `emphasis: 'heavy'`. Der Primary-Fokus rotiert zyklisch über die Trainingstage der Woche:

```
Tag 1 → lower_body (knee_dominant, heavy)
Tag 2 → push
Tag 3 → pull
Tag 4 → lower_body (hinge, heavy)
Tag 5 → push
...
```

- Die Rotation ist **fest und säulenunabhängig** — sie sichert die Kraft-Basis (Squat/Hinge/Push/Pull) über die Woche, egal wie der User priorisiert. Kraft ist nicht wegpriorisierbar (analog dazu, dass man eine Säule nicht auf 0 setzen kann).
- Der Lower-Primary-Tag ist der `heavy_lower`-Tag des Week-Layouts (bestehendes Flag). Bei zwei Lower-Primaries pro Woche wechseln sich `knee_dominant` und `hinge` ab.
- **2-Tage-Woche:** nur Lower + Push als Primaries (Pull wandert in den Komplement-Slot, s. 1.3). Pull-Primary erst ab 3 Tagen.

### 1.2 Session-Größe (nach Dauer)

Content-Blöcke pro Session (ohne Warmup/Cooldown — die sind immer da, ~1 Übung je):

| Session-Dauer | Content-Blöcke |
|---|---|
| 30 min | 3 (Primary + 2) |
| 45 min | 4 (Primary + 3) |
| 60 min | 5 (Primary + 4) |
| 75–90 min | 6 (Primary + 5) |

Das ersetzt das minuten-basierte Drop-Modell (§2.9 alt) als *primären* Mechanismus. Das Minuten-Budget (`BLOCK_MINUTES`) bleibt als Sanity-Obergrenze bestehen, greift aber nur noch selten, weil die Session von vornherein schlank geplant ist.

### 1.3 Block-Komposition pro Session

Nach dem Primary werden die restlichen Slots in dieser Priorität gefüllt:

1. **Komplement-Kraftblock** (sichert die Wochenabdeckung der Muster, die der Primary nicht trifft — z. B. an einem Push-Primary-Tag ein Pull- oder Hinge-Komplement, `emphasis: 'normal'`, 3 Sätze).
2. **Core** (fast immer, s. 1.5), `emphasis: 'normal'`/`'light'`.
3. **Fokus-Säulen-Blöcke** nach Wochen-Budget (s. 1.4): Plyo, Conditioning, dedizierte Rotation/Mobility — `emphasis: 'light'`/`'normal'`, 2–3 Sätze.

Die **Volumen-Hierarchie** folgt dem `emphasis`-Feld (existiert bereits):
- `heavy` → Primary, 4–5 Sätze, lange Pausen, volle Übungsqualität.
- `normal` → Sekundär, 3 Sätze.
- `light` → Ergänzung, 2 Sätze.

### 1.4 Fokus-Punkte → Wochen-Block-Budget

Die Säulen-Level aus dem Pillar-Stepper (1 = Erhalt, 2 = Fokus, 3 = Schwerpunkt) übersetzen sich **linear** in Blöcke pro Woche, für die optionalen Fokus-Säulen (`lower_body_plyometrics`, `upper_body_plyometrics`, `sprints`, `cod`, `conditioning`, `mobility`):

- **Level → Blöcke/Woche: 1 → 1, 2 → 2, 3 → 3.**
- **Min-1-Garantie:** Jede gesetzte Säule taucht mindestens 1× pro Woche auf (sonst wäre der Fokus-Punkt wirkungslos).
- **Proportionaler Clamp:** Reicht das freie Block-Budget nicht für alle Wünsche, wird von den niedrigsten Leveln nach unten gekürzt (Schwerpunkt überlebt zuletzt) — dieselbe Logik wie `normalizeToBudget` im Pillar-Stepper.

Das freie Budget = (Summe Content-Blöcke aller Sessions) − (Primary-Slots) − (Komplement-Kraft-Slots) − (Core-Slots). Beispiel 4 Tage à 5 Blöcke = 20; minus ~4 Primary, ~4 Komplement, ~3 Core = ~9 frei für Fokus-Säulen.

**Kraft-Primaries und Core zählen NICHT gegen das Fokus-Budget** — sie sind das feste Fundament.

### 1.5 Core-Block

Core ist **keine Fokus-Säule** (Rumpfstabilität ist universell, nicht wegpriorisierbar), sondern ein **fester Standard-Block, 2–3× pro Woche** über die Sessions verteilt. Der `movement_type`-Mix richtet sich nach dem Sport:

- Kampf-/Wurfsport → mehr `transverse` (rotational).
- Laufsport → mehr `sagittal` (Anti-Extension-Stabilität).
- Explosive Sportarten → auch mal explosiv (via `is_explosive`).

Das genaue Mix-Mapping pro Sport-Gruppe wird in der Planung als Tabelle festgelegt (analog zum bestehenden Preset-Matrix-Ansatz).

### 1.6 Plyo-Block

**Ein `plyo`-Block mit Variante `lower` / `upper`** (nicht zwei Blocktypen — konsistent zur `push`-Variante vertical/horizontal). Die Säule der Übung bestimmt die Variante:
- `lower_body_plyometrics` → Variante `lower` (Sprünge).
- `upper_body_plyometrics` → Variante `upper` (Würfe, Plyo-Push).

Regeln:
- Plyo kommt **vor dem Primary** (frisch, unermüdet — Reaktivkraft braucht einen ausgeruhten Zustand). Das ist Kontrast-/PAP-Training: der explosive Reiz bahnt die schwere Übung.
- **Frequenz = Fokus-Level der jeweiligen Plyo-Säule** (1/2/3 Blöcke/Woche, getrennt lower/upper), über das Budget aus 1.4.
- **ZNS-Schutz (Wochenebene):** Existiert eine eigene Speed-Session (Sprint-/COD-Fokus ≥ 2), zählt sie als Teil des Wochen-Explosivvolumens → die Plyo-Frequenz wird um 1 reduziert (Minimum bleibt bei gesetzter Säule 1).

#### 1.6.1 Plyo + Primary am selben Tag — regionsabhängige Verträglichkeit

Die Überschneidung Plyo + schwere Grundübung in *einer* Session wird **nach Region unterschiedlich** behandelt. Grund: Der Unterkörper hat eine große Streckerkette, die ein paar Sprünge nicht beeinträchtigen; der Oberkörper hat weniger Muskelmasse und erholt sich innerhalb der Session langsamer.

- **Unterkörper (Plyo `lower` + Lower-Primary):** Standard und erwünscht. Plyo-Volumen am unteren Ende (3–4 × 3), dann die schwere Übung bei voller Intensität (`heavy` bleibt). Keine Dämpfung.
- **Oberkörper (Plyo `upper` + Push-Primary):** erlaubt, aber mit strengerem Deckel. Plyo-Push max 3 × 3, **und** der Push-Primary wird von `heavy` auf `normal` reduziert (nicht ~90 %). Sollen beide schwer sein, gehören sie auf verschiedene Tage.

**Platzierung zuerst, Dämpfung als Fallback — keine harte Ausschlussregel.** Der Week-Layout-Planer legt `upper`-Plyo-Blöcke **bevorzugt auf Tage ohne Push-Primary** (also Pull- oder Lower-Primary-Tage, wo die Druckmuskulatur frisch ist). Nur wenn das nicht aufgeht — z. B. Upper-Plyo = 3 bei nur 2 Trainingstagen, an denen zwangsläufig auch gedrückt wird — fallen Plyo und Push-Primary auf denselben Tag, und dann greift der Deckel oben (Plyo 3 × 3 + Primary auf `normal`). Eine harte Ausschlussregel würde dem Kampfsportler mit Upper-Plyo-Schwerpunkt sonst verbieten, seine Hauptsäule überhaupt zu trainieren.

### 1.7 Wochenabdeckung (Sicherheitsnetz)

Garantiert über die Woche, nicht pro Session:
- **Kraft-Muster** (Squat/Hinge/Push/Pull): durch Primary-Rotation + Komplement-Slots. Harte Garantie.
- **Drei Bewegungsebenen** (sagittal/frontal/transverse): weiche Abdeckungsregel — wenn der Pool es hergibt, soll jede Ebene über die Woche mindestens einmal vorkommen (gerade frontal/transverse, die klassische Pläne vernachlässigen). Priorisiert nach Sport (Kampf/Team → transverse/frontal wichtiger).
- **Fokus-Säulen**: durch das Block-Budget (1.4).

---

## 2. Datenmodell-Update

### 2.1 `movement_type` (neu, universell)

Neue Spalte `movement_type` auf `exercises`, **auf allen Übungen** gesetzt:

- Werte: `sagittal` | `frontal` | `transverse` (anatomische Bewegungsebene).
- **Default `sagittal`** (die große Mehrheit: Squat, Bankdrücken, Rudern, Box Jump, Laufen).
- `frontal`: seitliche Bewegungen (Lateral Lunge, Side Plank, Skater Jump, Cossack Squat).
- `transverse`: Rotationen (Würfe, Russian Twist, Landmine Punch, Pallof Press).

Begründung anatomische statt funktionale Begriffe (`linear/lateral/rotational`): eindeutig, kein Kollisionsrisiko mit der Dynamik-Achse. UI kann verständliche Labels anzeigen („vor/zurück", „seitlich", „rotierend").

### 2.2 `is_explosive` (neu) — Dynamik getrennt von Ebene

`movement_type` (Ebene) und Dynamik sind **orthogonale Achsen**. Ein `rotational_med_ball_slam` ist `transverse` **und** explosiv; ein `back_squat` ist `sagittal` und nicht explosiv; ein `squat_jump` ist `sagittal` und explosiv.

Dynamik wird über **zwei getrennte Felder** abgebildet — bewusst nicht in einem zusammengefasst, weil sie unterschiedliche Reichweiten haben:

- **`is_explosive`** (boolean, neu, **universell**): „Wird die Übung ballistisch, mit maximaler Beschleunigung ausgeführt?" Gilt für jede Übung — Plyos, Sprünge, Würfe *und* explosive Nicht-Plyos wie Core-Katapulte (Box-Push-off). Dies ist die Dynamik-Achse für Queries und Block-Logik.
- **`plyo_type`** (maximal/submaximal, **bleibt unverändert**): eine Verfeinerung, die **nur im Plyometrie-Kontext** definiert ist (Schock-Methode/Depth Jump vs. extensive Plyos/Pogos). Kein Dynamik-Signal und wird auf Nicht-Plyo-Übungen nicht gesetzt.

Begründung gegen ein einziges `tempo`-Feld: Es würde die plyo-spezifische Stufe maximal/submaximal zwangsweise auf alle explosiven Übungen ausdehnen, wo sie keine Bedeutung hat (ein Med Ball Slam ist nicht sinnvoll „submaximal"). Zwei Felder mit klaren Geltungsbereichen sind sauberer als eine Skala, die zwei Konzepte vermischt.

Bei einem Plyo sind beide gesetzt (`is_explosive = true`, `plyo_type = maximal`); bei einem explosiven Core (`is_explosive = true`, `plyo_type = null`); bei einem Back Squat beide leer/false.

Query-Beispiel (Core-Block fetchen): „zwei rotational + ein Plank + ein explosives":
```sql
-- rotational:  movement_type = 'transverse'
-- plank-artig: movement_type = 'sagittal' AND is_explosive = false  (Halteübung)
-- explosiv:    is_explosive = true
```

### 2.3 Core-Taxonomie

Core-Übungen werden über die zwei Achsen `movement_type` + `is_explosive` klassifiziert; das bisherige `core_type` (stability/power) wird dadurch abgelöst:
- `plank`, `dead_bug` → `sagittal`, nicht explosiv (Anti-Extension).
- `side_plank`, `copenhagen_plank` → `frontal`, nicht explosiv (Anti-Lateral).
- `pallof_press`, `russian_twist` → `transverse`, nicht explosiv.
- `rotational_med_ball_slam` → `transverse`, explosiv.
- Box-Push-off-Katapult → `sagittal`, explosiv.

### 2.4 Label-Migration (Bestand)

- **Rotatorische Würfe** (`landmine_punch_throw`, `rotational_med_ball_slam`, `rotational_med_ball_throw`, `explosive_rotational_cable_press`) bleiben in `upper_body_plyometrics` (ballistischer Schlag/Wurf = Oberkörper-Explosivität, nicht Core). `movement_type = transverse`, `is_explosive = true`.
- **Fünf heimatlose Wurf-Übungen** (`clap_push_up`, `med_ball_chest_pass`, `med_ball_overhead_throw`, `med_ball_scoop_toss`, `explosive_cable_swing`) matchen heute keinen Block. Sie gehören in den Plyo-Block Variante `upper` → der neue Matcher (1.6) bindet sie über die Säule `upper_body_plyometrics` an.
- Alle übrigen Übungen bekommen `movement_type` (Default `sagittal`, gezielte Ausnahmen für frontal/transverse).

### 2.5 `strength_pattern` — nur noch die sechs Kraft-Muster

`strength_pattern` behält ausschließlich die echten Kraftlinien: `push_vertical`, `push_horizontal`, `pull_vertical`, `pull_horizontal`, `knee_dominant`, `hinge`.

Der bisherige siebte Wert **`rotation` entfällt** — Rotation ist eine Bewegungsebene, kein Kraftmuster, und war nur mangels movement_type-Feld dort gelandet. Die 7 betroffenen Übungen (die rotatorischen Würfe aus 2.4) verlieren `strength_pattern = rotation` und werden stattdessen über `movement_type = transverse` + ihre Säule (Upper-Plyo bzw. Core) klassifiziert. Damit sind die beiden Achsen sauber: `strength_pattern` = Kraftrichtung, `movement_type` = Ebene — keine Überschneidung mehr.

### 2.6 Abgelöste Felder

- `core_type` (stability/power) → ersetzt durch `movement_type` + `is_explosive`. Spalte kann nach Migration entfallen oder bleibt als deprecated für Legacy-Pläne.
- `strength_pattern = rotation` → entfällt (s. 2.5).
- Die harte `PLYO_CATEGORIES`-Begrenzung im Plyo-Matcher entfällt — der Block zieht nach Säule + Variante.

---

## 3. Generator-Umbau (Worker)

Betroffen: `week-layout.ts` (`planWorkoutBlocks`, `applyScalingLevers`), `week-layout-constants.ts`, `v2/pool.ts`, `v2/prepare-v2.ts`, `v2/v2-prompts.ts`.

### 3.1 `planWorkoutBlocks` — von Pflichtsequenz zu Komposition

Statt `WORKOUT_BLOCK_SEQUENCE.map(...)` (jeder Block immer):
1. Primary-Block aus der Rotation (1.1) bestimmen, `emphasis: 'heavy'`.
2. Komplement-Kraftblock wählen (Muster, das die Wochenabdeckung braucht).
3. Core einplanen, wenn die Session im Core-Frequenzfenster liegt (2–3×/Woche).
4. Fokus-Säulen-Blöcke aus dem Wochen-Budget (1.4) auf die Sessions verteilen — deterministisch, höchste Level zuerst, Plyo vor den Primary. **`upper`-Plyo bevorzugt auf Tage ohne Push-Primary legen (1.6.1); nur bei Platzmangel auf einen Push-Tag, dann Plyo-Deckel 3×3 + Push-Primary auf `normal`.** `lower`-Plyo darf ungedämpft auf den Lower-Primary-Tag.
5. Auf die Session-Größe (1.2) begrenzen.

Die Verteilung läuft **über die ganze Woche** (nicht pro Session isoliert), damit das Block-Budget und die Ebenen-Abdeckung global aufgehen. Das ist der Kern-Architekturwechsel: `planWorkoutBlocks` plant künftig die Woche als Ganzes, nicht Session für Session unabhängig.

### 3.2 `applyScalingLevers` — reduziert auf Sanity-Clamp

Die Drop-Rotation/Coverage-Logik entfällt als primärer Mechanismus. Bleibt nur: wenn eine Session (selten) das Minuten-Budget sprengt, droppt der niedrigste-Priorität-Block. Kompakt-Modus (§ bestehend) bleibt für kurze Sessions.

### 3.3 Pool-Matcher (`pool.ts`)

- `plyo`: `category ∈ {lower_body_plyometrics, upper_body_plyometrics, jumps}` und `variant` (`lower`/`upper`) matcht die Säule. `sprint_type` weiterhin ausgeschlossen.
- `core`: eigener Block-Typ wieder da; matcht über `movement_type` + `is_explosive` nach dem im Block geforderten Mix.
- `push`/`pull`/`lower_body`: unverändert über `strength_pattern`, aber explosive Oberkörper-Übungen (jetzt sauber in upper_plyo) verschmutzen den Fallback nicht mehr.

---

## 4. Offene Detailpunkte (in der Planung zu fixieren)

- Core-`movement_type`-Mix pro Sport-Gruppe (Mapping-Tabelle).
- Genaue Komplement-Kraft-Wahl pro Primary-Tag (Regel für „welches fehlende Muster").
- Verteilungs-Reihenfolge, wenn mehrere Fokus-Säulen gleiches Level haben (Tiebreak).
- Ob `core_type` hart gedroppt oder deprecated bleibt (Legacy-Pläne in der App).

---

## Decision log

- **Primary-Zuweisung: Hybrid** — feste Kraft-Rotation + Säulen-Akzent (nicht rein säulen-gesteuert, nicht reiner Split). Grund: Kraft-Basis darf nicht wegpriorisierbar sein.
- **Session-Größe: schlank, 3–6** — Coach-typisch, löst das Überladungsproblem an der Wurzel.
- **Fokus-Kurs: linear 1/2/3** (nicht progressiv 1/2/4) — ausgewogen für JEMPs 3–4-Tage-Wochen, Schwerpunkt mit Faktor 3 spürbar.
- **Plyo: ein Block + Variante**, ZNS-Schutz gegen Speed-Session.
- **Core: fester Standard-Block, keine Säule** — Rumpfstabilität ist universell.
- **movement_type anatomisch (sagittal/frontal/transverse), universell, Default sagittal** — orthogonal zur Dynamik (`is_explosive`), ermöglicht Ebenen-Abdeckung + präzise Core-Queries.
- **Dynamik in zwei Feldern (`is_explosive` universell + `plyo_type` plyo-spezifisch), nicht in einem `tempo`-Feld** — die maximal/submaximal-Stufe ist nur im Plyo-Kontext sinnvoll und soll nicht auf alle explosiven Übungen gezwungen werden.
- **Rotatorische Würfe bleiben Upper-Plyo, nicht Core** — Schulter/Arm macht die explosive Hauptarbeit.
- **Plyo+Primary regionsabhängig (1.6.1): unten ungedämpft, oben Platzierung weg vom Push-Primary + Soft-Deckel als Fallback** — keine harte Ausschlussregel, sonst kann ein Upper-Plyo-Schwerpunkt seine Hauptsäule nie trainieren.
