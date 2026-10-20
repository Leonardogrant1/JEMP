# Upper/Lower-Strength-Blöcke + Lead-Rotation — Design

**Datum:** 2026-10-10
**Status:** Entwurf (User-Review ausstehend)
**Ersetzt/ergänzt:** `2026-10-09-session-composition-rework-design.md` §1.1 (Primary-Rotation), §1.3 (Block-Komposition), §1.6.1 (Plyo-Verträglichkeit). Alle übrigen Abschnitte des Composition-Rework bleiben gültig.

## Overview

Die drei Kraft-Block-Typen `push`, `pull`, `lower_body` werden durch zwei ersetzt: **`upper_strength`** und **`lower_strength`**. Die Kraftmuster (push/pull bzw. knee/hinge) wandern als Anforderungsliste *in* den Block. Statt der 3er-Primary-Rotation rotiert, welcher Block eine Session **führt** (Lead = heavy). Säulen-Prioritäten (Level 3) dürfen den Lead einer Session übernehmen — die Kraft-Basis hat aber einen nicht verhandelbaren Floor.

### Goals

- **Pull-Untergewicht strukturell lösen:** Push und Pull leben als Antagonisten-Paar im selben Block statt um Komplement-Slots zu konkurrieren (Befund 09.10.: Push 2× / Pull 1× pro Woche, jede Woche identisch).
- **Coach-Template abbilden:** Hauptteil = ein schwerer Lead-Lift + ein Begleit-Kraftblock, nicht drei konkurrierende Muster-Blöcke.
- **Frequenz erhalten:** Beide Kraftblöcke koexistieren in einer Session (Dauer erlaubend) — ein 2-Tage-User trainiert weiterhin jede Region 2×/Woche, kein Upper/Lower-*Tages*-Split.
- **Prio-Sichtbarkeit:** Eine Level-3-Säule (Plyo) darf eine Session sichtbar anführen (heavy Lead), statt nur als light-Akzent mitzulaufen.
- **48h-Garantie vereinfachen:** Lead-Alternierung Lower ↔ Upper macht „nie dieselbe Region an aufeinanderfolgenden Tagen heavy" konstruktiv trivial.

### Non-goals

- **Kein Split der Strength-Säule** in upper/lower (Wizard-Komplexität, keine getrennte Assessment-Grundlage, Säule steuert in v2 ohnehin kaum etwas). Richtungs-Bias läuft später über das Sport-Profil (→ §6 Follow-ups).
- **Kein deterministisches Übungs-Fetchen** statt LLM-Auswahl (eigene Design-Runde).
- **Keine Woche-zu-Woche-Variation** (Schema kennt weiterhin ein Wochen-Template).
- Speed-/Mobility-/Conditioning-Sessions unverändert.

## 1. Block-Taxonomie

### 1.1 Neue Block-Typen

| Block | Inhalt | Muster-Pool |
|---|---|---|
| `lower_strength` | Unterkörper-Kraft | `knee_dominant`, `hinge` |
| `upper_strength` | Oberkörper-Kraft | `push_vertical`, `push_horizontal`, `pull_vertical`, `pull_horizontal` |

`push`, `pull`, `lower_body` werden nicht mehr komponiert. Die `block_types`-Rows bleiben für Alt-Pläne bestehen (nur Deprecation-Kommentar, kein Drop).

### 1.2 Muster-Anforderungen pro Block (ersetzt Block-Varianten)

Ein Kraftblock trägt eine Liste `patterns: Array<{ pattern: StrengthPattern; emphasis: 'heavy' | 'normal' }>`:

- **`upper_strength`:** enthält IMMER Push UND Pull (je 1 Übung), als Antagonisten-Paar (Supersatz-Empfehlung im Prompt). Welche Seite heavy ist, alterniert über die Upper-**Leads** der Woche, **beginnend Pull-heavy** — bei nur einem Upper-Lead pro Woche ist Pull damit dauerhaft die schwere Seite (bewusster Bias auf die chronisch unterversorgte Seite; das Template ist über die 4 Wochen identisch, echte Wochen-Alternierung → §6). Vertikal/horizontal alterniert wie bisher über die Tage.
- **`lower_strength`:** 1–2 Übungen; knee/hinge alterniert über die Lower-**Leads** (Begleit-Lower zählt separat und gegenläufig), **beginnend Hinge-heavy** — bei nur einem Lower-Lead pro Woche trägt damit die hintere Kette (Hamstring-Schutz) den schweren Reiz; Wochen-Alternierung → §6.
- Der Validator (`findV2Violations`) prüft hart: Für jedes geforderte Pattern enthält der Block ≥1 Übung aus dem Pattern-Pool. Pools pro Pattern kommen aus `strength_pattern` (+ Coarse-Fallback über `exercise_regions`/`body_region` wie bisher).

### 1.3 Emphasis-Ebenen

- **Block-Ebene** (persistiert, `workout_plan_session_blocks.emphasis`): `heavy` = Lead-Block der Session. Die Beintag-Warnung der App fragt künftig `lower_strength` + heavy; während der Übergangszeit zusätzlich `lower_body` (Alt-Pläne).
- **Pattern-Ebene** (nicht persistiert, nur Generator/Prompt/Validator): die Binnen-Differenzierung im `upper_strength`-Block (heavy Push vs. normal Pull). Verschreibung: heavy = 4–5×3–5 schwer; normal = 3×5–8 solide; Erhaltung (light) = 2 Sätze submaximal.

## 2. Session-Komposition (Lead-Rotation)

### 2.1 Grundgerüst

Jede Trainings-Session enthält (Dauer erlaubend) **beide** Kraftblöcke:

```
Warmup → [Plyo] → Lead-Block (heavy) → Begleit-Kraftblock (normal) → Core → Füller → Cooldown
```

Der **Lead** rotiert über die Trainingstage: `lower_strength` ↔ `upper_strength`, Start bei lower. Heavy-Alignment: Der von `placeWeek` markierte `heavy_lower`-Tag bekommt den Lower-Lead (Slot-Tausch wie bisher, eine Wahrheit).

### 2.2 Slot-Priorität und Weich-Reihenfolge

Auswahl-Priorität pro Session (ersetzt §1.3 des Composition-Rework):

```
1. Lead-Block (heavy)                      — fällt nie
2. Fokus-Blöcke (Plyo lower/upper, Budget) — Säulen-Prios
3. Begleit-Kraftblock (normal)             — weicht den Fokus-Blöcken ZUERST
4. Core (Rotation transverse/sagittal/frei)
5. Accessory, Optional (Füller)
```

Konsequenz: Bei kurzen Sessions oder hohem Fokus-Budget schrumpft die Kraft auf den Lead, verschwindet aber nie (→ §3 Floor). Schrumpft der `upper_strength`-Block als *Begleit*-Block auf 1 Übung (Kompakt-Session), **bleibt Pull, Push fällt** — Pull ist chronisch unterversorgt und prophylaktisch wichtiger (Schulter-Balance).

### 2.3 Plyo-Verträglichkeit (§1.6.1 übersetzt)

- Lower-Plyo bevorzugt auf Lower-Lead-Tage (PAP vor dem schweren Heben), 3–4×3 vor dem Lead.
- Upper-Plyo bevorzugt auf Tage, deren `upper_strength` NICHT Push-heavy ist. Unvermeidbar am Push-heavy-Tag: Plyo-Deckel 3×3 + Push-Pattern wird auf `normal` gedämpft (nicht über ~85 %), Prompt-Zeile wie bisher.
- Max. 1 Plyo-Block pro Session (unverändert).

## 3. Prio-Regeln: Säulen-Lead und Kraft-Floor (Entscheidung 10.10.)

Antwort auf: „Plyo + Sprints auf Prio, 2 Tage — kann Kraft wegfallen?" → **Nein, aber sie darf bis zum Floor schrumpfen.**

### 3.1 Säulen-Lead (Plyo heavy)

- Eine Plyo-Säule auf **Level 3** darf **max. 1 Session pro Woche anführen**: Plyo-Block wird `heavy` (4–5 Sätze à 3–5 explosive Wdh., volle Pausen, höchste Qualität), der Kraft-Lead dieses Tages wird auf `normal` (kompakte Erhaltungsdosis) zurückgestuft.
- **Der Säulen-Lead liegt auf dem Lead-Tag der EIGENEN Region** (Lower-Plyo → Lower-Lead-Tag, Upper-Plyo → Upper-Lead-Tag): Die gedämpfte Region bekommt denselben Tag den schweren Explosiv-Reiz (Contrast-Logik) — die andere Region behält ihren heavy Kraft-Lead unangetastet. So hat jede Region jede Woche einen schweren Reiz, auch bei n=2/3.
- Der Säulen-Lead **verschiebt nur den eigenen Block-Tag, nie die Menge**: Das Fokus-Budget (Anzahl Plyo-Blöcke/Woche) bleibt unverändert; höchstens EINE bestehende Tages-Zuweisung der Säule wird auf den Lead-Tag umgezogen.
- Bei ZWEI Plyo-Säulen auf Level 3: nur eine bekommt den Lead (lower vor upper — höherer Transfer in Sprint/Spielleistung); die andere läuft als light-Block an einem anderen Tag.
- Level 1–2 führen nie; sie bleiben light-Akzente (Fokus-Budget unverändert aus §1.4 des Composition-Rework).

### 3.2 Kraft-Floor (nicht verhandelbar)

1. **Jede Trainings-Session enthält ≥1 Kraftblock** (mindestens `normal`-Dosis). Fokus-Blöcke können den Begleit-Kraftblock verdrängen, nie den letzten Kraftblock.
2. **Jede Region bekommt jede Woche einen schweren Reiz.** Ohne Säulen-Lead bei ≥2 Workout-Tagen: ≥1 Lower-Lead UND ≥1 Upper-Lead heavy. Mit Säulen-Lead (§3.1): Die Säulen-Region tauscht ihren heavy Kraft-Reiz gegen den heavy Explosiv-Reiz desselben Tages, die andere Region behält ihren heavy Kraft-Lead. Bei genau 1 Workout-Tag: Lower-Lead heavy, Upper als Begleitblock normal.
3. Der Säulen-Lead (§3.1) zählt nicht gegen den Floor: Er kann nur Sessions anführen, die der Floor übrig lässt — konkret bei 2 Tagen und Lower-Plyo Prio 3: Tag A (Lower-Lead-Tag) = Plyo heavy (lower) + Lower-Kraft normal + Upper-Begleit normal, Tag B = Upper-Lead heavy + Lower-Begleit normal. Bei 1 Workout-Tag gibt es keinen Säulen-Lead (der einzige Tag gehört dem Kraft-Lead; Plyo läuft light).

**Begründung** (für Prompt-Kontext und Doku): Sprint-/Plyo-Leistung baut auf maximaler Kraftproduktion auf; schweres, langsames Krafttraining schützt genau die Strukturen (Hamstrings, Achilles-/Patellarsehne), die Sprints und Plyo am stärksten belasten. Prios verschieben, *wer führt* — nie, *ob* Kraft stattfindet.

### 3.3 Kraft-Säule aktiviert (Nachtrag 10.10., Entscheidung „(a)")

Die Kraft-Säule bekommt pro Level eine eigene, kommunizierbare Wirkung:

- **Level 1 (Basis):** Status quo — Kraft ist das Gerüst jeder Session.
- **Level 2 (Fokus):** *Kraft weicht nie.* Der Begleit-Kraftblock rückt in der Slot-Priorität VOR die Fokus-Blöcke (bei knappen Slots fällt Plyo vor Kraft), und der Kompakt-Begleitblock behält Push+Pull statt auf Pull zu schrumpfen. Der Wizard-Stepper zeigt eine Hinweiszeile („Bei knapper Zeit bleibt Kraft erhalten — Plyo fällt zuerst"), sonst wirkt der Regler unsichtbar.
- **Level 3 (Priorität):** zusätzlich genau **ein Doppel-heavy-Tag pro Woche** — der Begleit-Kraftblock dieses Tages wird ebenfalls heavy (Begleit-Upper: Pull-Seite heavy, Push solide — nicht drei Maximal-Lifts). **Erholungs-Guard (Review 10.10.):** entfällt bei `load_profile = high` komplett (Dämpfung wie Conditioning §2.2 — zwei schwere Lifts in einer Session kosten bei hoher Vereinslast mehr Erholung, als sie bringen); Level 3 wirkt dann wie Level 2.
- **Konflikt- und 48h-Regeln:** Der Doppel-heavy-Tag liegt nie auf dem Plyo-Säulen-Lead-Tag (der Säulen-Lead gewinnt seinen Tag) und nie neben einem Tag, dessen Lead dieselbe Region heavy trainiert — **der 48h-Check gilt für ALLE heavy Kraftblöcke, Leads wie Begleit.** Findet sich kein legaler Tag, entfällt der Doppel-heavy-Tag.
- §4-Follow-up „Strength-Säule aktivieren" ist damit umgesetzt.

## 4. Generator-Umbau (Worker)

- **`composeWeek`:** Primary-/Komplement-Konstruktion (§1.1–1.3 alt) wird durch Lead-Rotation + Begleitblock ersetzt; Coverage-Zählung entfällt auf Block-Ebene (Muster-Coverage steckt in den Pattern-Anforderungen). Fokus-Budget, Core-Rotation, Füller unverändert.
- **`pool.ts`:** `exerciseMatchesBlock` bekommt die zwei neuen Block-Typen; Pools werden pro *Pattern* gebaut (Map `pattern → slugs`) und dem Prompt je Block gruppiert gereicht. Region-Matching für Warmup/Cooldown: `lower_strength` → bisherige Lower-Regionen, `upper_strength` → Union aus Push- und Pull-Regionen.
- **`v2-prompts.ts`:** Blockzeilen nennen die Pattern-Anforderungen samt Emphasis („\`upper_strength\` — Pull schwer (4–5×3–5), Push solide (3×5–8), als Antagonisten-Supersatz"); Kompakt-/Deckel-/Mikro-Dosis-Zeilen angepasst.
- **`findV2Violations`:** neue harte Regel „jedes geforderte Pattern ≥1 Übung aus dem Pattern-Pool".
- **`session-title.ts`:** Themen-Mapping auf neue Block-Typen (Kraft-Thema aus lower/upper_strength; Plyo-Lead-Sessions heißen nach Explosivität).
- **`BLOCK_MINUTES`:** `lower_strength` 15, `upper_strength` 15 (Lead), Begleitblock implizit kürzer über Verschreibung; genaue Kalibrierung in der Planung.
- **Beintag-Warnung (App):** `has_heavy_lower` prüft `lower_strength` ODER `lower_body` (Übergang).

## 5. Datenbank

- `block_types`: +2 Rows (`lower_strength`, `upper_strength`), idempotent, Rollout-Gate wie üblich. Keine Spalten-Änderungen — Pattern-Anforderungen sind Generator-interner Zustand, persistiert wird wie bisher Block + Übungen + `emphasis`.
- `exercise_blocks`-Tags (warmup/cooldown) unberührt.
- Alt-Pläne mit `push`/`pull`/`lower_body` bleiben lesbar; App-Anzeigen, die Block-Slugs mappen (Icons, Labels), bekommen die zwei neuen Slugs dazu.

## 6. Follow-ups (bewusst nicht in dieser Spec)

- **Wochen-Rotation:** Das Schema kennt EIN Wochen-Template (`workout_plan_sessions.day_of_week`), das 4 Wochen identisch expandiert — die Heavy-Seiten-/Pattern-Alternierung kann deshalb nur innerhalb der Woche stattfinden. Echte Woche-zu-Woche-Rotation (Pull-heavy ↔ Push-heavy, Hinge ↔ Knee) braucht Mehr-Wochen-Templates oder einen Rotations-Offset bei der Instanz-Expansion — eigenes Design-Thema. Bis dahin gelten die bewussten Biases aus §1.2 (Pull/Hinge zuerst).
- **Sportabhängige Lead-Gewichtung** (combat_sports → mehr Upper-Leads, Feldsport → mehr Lower-Leads): eine Sortier-Zeile in der Lead-Rotation, kommt nach On-Device-QA des Grundmodells.
- **Deterministisches Übungs-Fetchen** (LLM nur noch Reihenfolge/Notes): eigene Runde, baut auf `exercise_regions`-Kuratierung auf.
- **Strength-Säule aktivieren** (Level 3 → zweiter heavy Kraft-Lead pro Woche): erst sinnvoll, wenn die Säule überhaupt einen Hebel haben soll.

## Decision log

| Datum | Entscheidung | Begründung |
|---|---|---|
| 10.10. | push/pull/lower_body → upper_strength/lower_strength | Pull-Untergewicht ist Granularitäts-Artefakt; Coach-Template ist Lead + Begleitblock |
| 10.10. | Blöcke koexistieren in einer Session, kein Tages-Split | Frequenz-Erhalt für 2–3-Tage-User (jede Region 2×/Woche) |
| 10.10. | Muster als Block-Anforderung + Validator, nicht als Block-Typ | Garantie bleibt Code (§2.1 Session-Structure-Spec), rutscht nur auf Pattern-Ebene |
| 10.10. | Säulen-Lead: Plyo Level 3 darf max. 1 Session/Woche anführen | Prio-Sichtbarkeit („dein Fokus führt") aus der Prod-v1-Stärke übernommen |
| 10.10. | Kraft-Floor: ≥1 Kraftblock je Session, ≥1 heavy Kraft-Lead je Woche | Kraft trägt Sprint/Plyo (Physik + Prophylaxe); Prios verschieben Führung, nie Existenz |
| 10.10. | Begleit-Upper schrumpft auf Pull (Push fällt zuerst) | Pull chronisch unterversorgt, Schulter-Prophylaxe |
| 10.10. | KEIN Split der Strength-Säule | Kein Assessment-Unterbau, Wizard-Komplexität, Säule aktuell kaum Hebel |
