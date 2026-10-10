# Conditioning-Formate: Sportart-gewichtete Format-Verteilung — Design

**Datum:** 2026-10-10
**Status:** Entwurf (User-Review ausstehend)
**Kontext:** Aufbauend auf Plan-Generierung v2 (`2026-10-10-upper-lower-strength-blocks-design.md`), Branch `feat/session-structure`.

## 0. Motivation

Conditioning für Athleten heißt nicht „lange laufen können", sondern **Leistung wiederholen können**: nach dem zehnten Sprint noch so schnell sein wie beim ersten, in Runde fünf dieselbe Schlagfrequenz wie in Runde eins. Das zerfällt in zwei trainierbare Teile:

- **Aerobe Basis** — wie schnell sich der Athlet zwischen intensiven Aktionen erholt. Trainiert über längere Einheiten bei moderater Intensität.
- **Wiederholte Belastung** — wie lange hohe Intensität gehalten werden kann, bevor die Leistung einbricht. Trainiert über Intervalle: kurz hart, kurz Pause, mehrfach.

**Kraftausdauer ist explizit kein Ziel** dieser Säule (nebensächlich für die meisten Sportarten). Conditioning-Übungen müssen nicht schwer sein — sie müssen Intensität über Zeit bei sicherer Technik leisten, nicht maximale Last. Daraus folgt der bereits umgesetzte Pool-Filter (kein `plyo_type = 'maximal'`, Intensität ≤ 7 — QA 10.10.).

Heute kennt der Generator nur zwei Formate, beide intensiv (`interval_30_30`, `circuit_40_20`). Die aerobe Basis existiert nicht.

## 0.1 Leitplanken (entschieden 10.10.)

1. Conditioning bleibt **eine Säule**. Keine Wizard-/Nutzer-Entscheidung zwischen Basis und Intervallen — das ist eine Trainerfrage, keine Nutzerfrage.
2. Gesteuert wird die **Format-Verteilung**: eine Gewichtung pro Sportgruppe, mehrere Formate gleichzeitig möglich (wie bei den Bewegungsebenen), kein Entweder/Oder.
3. **v1: Sportart gibt die Verteilung vor, fertig.** Die Assessment-Ableitung (Repeated Sprint Test) kommt erst, wenn Nutzer den RST tatsächlich machen (§9 — nur Hook, keine Implementierung).
4. Der 10-min-**Finisher kennt nur Intensiv und Rounds**, nie Extensiv — 10 Minuten moderates Tempo nach einem Kraft-Workout trainieren die Basis nicht sinnvoll.
5. Extensiv ist **environment-abhängig** (Outdoor: Laufen; Gym/Home: Maschine oder moderater Zirkel) und erfordert die Equipment-Erweiterung (§7).
6. Alle Builder bleiben **deterministisch** (kein LLM) — wie Speed/Mobility/Conditioning heute.

## 1. Die drei Formate

Das Format ist die Verschreibung, Übungen füllen es. Dieselbe Übung (z. B. `rowing_erg`) kann extensiv (lange moderate Intervalle) oder intensiv (30/30) dosiert werden.

### 1.1 `extensive` — aerobe Basis

Dauerarbeit bei moderater Intensität (RPE 4–6, „Nasenatmung möglich"). Nur als eigenständige Conditioning-Session, nie als Finisher. Drei Varianten, gewählt nach Verfügbarkeit (Reihenfolge = Priorität):

| Variante | Bedingung | Verschreibung |
|---|---|---|
| **Lauf** | Session-Environment ist outdoor, oder User hat `outdoor` als Environment | `easy_jog` als Kern: Dauerlauf über `min(35, day.minutes − 8)` Minuten (Warmup/Cooldown-Abzug, **Deckel 35 min**) — ein Block, eine Übung. Wer 60 min eingestellt hat, erwartet Krafttraining, keinen einstündigen Lauf; der Rest bleibt unverplant und `estimated_duration_minutes` wird entsprechend kürzer gesetzt. `easy_jog` lebt in der `sprints`-Kategorie und wird wie im Speed-Builder als Anker-Slug geholt, nicht über den Conditioning-Pool. |
| **Maschine** | User-Equipment enthält `treadmill`, `stationary_bike`, `air_bike` oder `rowing_erg` | 3 × 7 min Arbeit / 90 s locker auf EINER Maschine (deterministische Wahl: niedrigste Intensität zuerst, Rotation über `planCount`) |
| **Zirkel** | sonst | 3 Stationen × 3 min Arbeit / 60 s Wechsel, 2 Runden — aus dem Extensiv-Pool: Conditioning-Pool-Übungen mit `measurement_type` Dauer und Intensität ≤ 5 (z. B. `jump_rope_standard`, `shadow_boxing`, `bear_crawl`, `jumping_jacks`, `mountain_climber`) |

Fallback-Kette: Ist keine Variante füllbar (Zirkel-Pool < 3), degradiert die Session auf `intensive` mit Log-Notiz.

### 1.2 `intensive` — wiederholte Belastung

Bestehende Formate bleiben unverändert: `interval_30_30` (30 s Arbeit / 30 s Pause × 10) und `circuit_40_20` (40/20 × 4 Runden), Auswahl wie heute nach Pool-Intensität. Pool: bestehender Conditioning-Pool (`isConditioningExercise`).

### 1.3 `rounds` — Rundenformat (Kampfsport-nah)

Simuliert Wettkampfrunden: **3 min Arbeit / 1 min Rundenpause × 3–5 Runden** (Standalone: 4–5 Runden je nach `day.minutes`; Finisher: 2 Runden). Eine echte Runde ist **drei Minuten eine Tätigkeit** — die Authentizität ist der Grund, warum das Format existiert:

- **Standard:** EINE Übung pro Runde — `target_duration_seconds: 180`, `target_rest_seconds: 60`, `target_rounds` = Rundenzahl. Rundentauglich sind Übungen, die 3 min am Stück tragen (Allowlist `ROUNDS_CONTINUOUS_SLUGS`): `heavy_bag_work`, `shadow_boxing`, `jump_rope_standard`, `air_bike_ride`, `rowing_erg`, `stationary_bike_ride`. Auswahl: bei `sport_group_name = 'combat_sports'` Priorität `heavy_bag_work` → `shadow_boxing` (analog `COMBAT_SPRINT_PREFERENCE`); sonst Rotation über `planCount`. Bei ≥ 4 Runden dürfen zwei verschiedene rundentaugliche Übungen alternieren (zwei Blöcke-Einträge mit halbierter Rundenzahl).
- **Fallback (Dreiteilung):** Nur wenn der gefilterte Pool keine rundentaugliche Übung hergibt, wird die Runde aus 3 Conditioning-Pool-Übungen à 60 s gebaut (`target_rest_seconds: 0` auf den ersten beiden, 60 auf der letzten — die Rundenpause hängt an der letzten Station). Das fühlt sich nach Circuit an, nicht nach Runde, und ist bewusst letzte Wahl.

## 2. Sportgruppen-Gewichte

Neue Tabelle, Zwilling des geplanten `sport_plane_weights` (gleicher Lade-/Normalisierungs-Code im Worker, eigenes Enum):

```sql
create type conditioning_format as enum ('extensive', 'intensive', 'rounds');

create table sport_conditioning_weights (
  group_name text not null,          -- sports.group_name
  format conditioning_format not null,
  weight smallint not null check (weight between 0 and 100),
  primary key (group_name, format)
);
-- RLS: select für authenticated (Referenzdaten), Schreibzugriff nur service_role.
```

Seed (Gewichte pro Gruppe, Summe 100):

| group_name | extensive | intensive | rounds | Begründung |
|---|---|---|---|---|
| team_sports | 40 | 55 | 5 | Die aerobe Basis trägt über 90 Minuten die Erholung zwischen den Aktionen — halbe Leistung, nicht nur Unterbau. Rounds minimal: das Spiel kennt keine Wettkampfrunden. |
| combat_sports | 25 | 25 | 50 | Rundenstruktur ist das Spiel; Basis + Intervalle als Unterbau |
| racket_sports | 25 | 45 | 30 | Ein Satz ist strukturell näher an Runden als an 30/30-Intervallen |
| athletics | 50 | 50 | 0 | Ein Sprinter braucht kaum Intervall-Conditioning — er braucht Erholung zwischen Qualitätsläufen |
| endurance | 60 | 40 | 0 | Basis dominiert, Intervalle ergänzen |
| strength | 40 | 60 | 0 | GPP: Erholungsfähigkeit fürs Training selbst |
| other | 40 | 50 | 10 | neutraler Default |

Fehlt eine Gruppe in der Tabelle (oder `sport_group_name` leer), gilt der `other`-Default. Gewichte mit `weight = 0` nehmen nie an der Rotation teil.

## 3. Auswahl-Mechanik: Rotation über Plan-Generationen

Pläne sind Ein-Wochen-Templates — echte Mehr-Wochen-Verteilung kommt erst mit Multi-Week-Templates (deferred). v1 rotiert über Plan-Generationen:

1. **`planCount`** = Anzahl bisheriger `workout_plans` des Users (Query in `prepare-v2`, wo bereits der SupabaseClient lebt). Deterministisch, kein neuer Zustand.
2. Aus den Gewichten wird ein **10-Slot-Zyklus** gebaut: Slots per Largest-Remainder auf die Formate verteilt (bei Remainder-Gleichstand gewinnt das Format mit dem **kleineren** Gewicht, damit kleine Gewichte wie `rounds: 5` nicht systematisch auf 0 Slots fallen). Verschränkung über Positions-Schlüssel: Slot k von Format f (mit n_f Slots) bekommt den Schlüssel `(k + 0.5) / n_f`, alle Slots werden danach sortiert (Gleichstand: kleineres n_f zuerst). So landen Ein-Slot-Formate in der **Zyklus-Mitte** statt dekorativ am Ende. Beispiel team_sports (40/55/5 → i: 5, e: 4, r: 1): `[i, e, i, e, r, i, e, i, e, i]` — rounds beim fünften Plan, nicht beim zehnten. Kein `Math.random`.
3. **Standalone-Session:** Format = `cycle[planCount % 10]`. Hat die Woche zwei Conditioning-Slots (heute nicht möglich, zukunftssicher), bekommen sie `cycle[planCount]` und das nächste davon verschiedene Format im Zyklus.
4. **Finisher:** dominantes Format aus {intensive, rounds} nach Gewicht; bei Gleichstand intensive. Zusätzlich wird die heutige **alphabetische Übungs-Monotonie** behoben: Auswahl-Offset = `planCount % poolLänge` statt `sort().slice(0, 3)` (sortiert bleibt der Pool — rotiert wird der Startpunkt).
5. Nicht füllbare Formate degradieren entlang `extensive → intensive`, `rounds → intensive` (Log-Notiz; `intensive` ist immer füllbar, sonst entfällt die Session wie heute bei Pool < 3).

Bewusst nicht persistiert: das gewählte Format (Rotation hängt nur an `planCount`; eine Gewichtsänderung verschiebt die Sequenz — akzeptiert für v1).

## 4. Builder-Umbau (`build-simple-sessions.ts`)

`buildConditioningSession` bekommt `format: ConditioningFormat` + `planCount` + `sportGroup` + `runAnchor` (easy_jog aus dem Outdoor-Pool, null = kein Outdoor) als Input und delegiert an drei Format-Builder. Equipment-Verfügbarkeit braucht KEINEN eigenen Input: der Übungs-Pool ist bereits equipment-/env-gefiltert — eine Maschinen-Übung im Pool heißt, der User hat die Maschine.

- `buildExtensiveBlock` — Varianten-Kette aus §1.1 (`runAnchor` gesetzt → Lauf; Maschinen-Slug im Pool → Maschine; sonst Zirkel).
- `buildIntensiveBlock` — heutige Logik, unverändert extrahiert.
- `buildRoundsBlock` — §1.3.

Warmup/Cooldown (2 Mobility-Übungen à 45 s) bleiben für alle Formate gleich. `session.description` kommuniziert das Format und seine Absicht (z. B. extensiv: „Lockere Dauerarbeit — du solltest dich nebenbei unterhalten können."). Greift der 35-min-Lauf-Deckel (§1.1), erklärt die Description die kürzere Dauer, damit „43 Minuten" bei eingestellten 60 nicht wie ein Fehler wirkt (z. B. „Bewusst kürzer als dein Zeitfenster — für die aerobe Basis bringt mehr Umfang heute nichts, er würde nur ermüden."). Session-Name: „Conditioning — Basis" / „Conditioning — Intervalle" / „Conditioning — Rounds".

`buildConditioningFinisherBlock` bekommt `format: 'intensive' | 'rounds'` + Rotations-Offset.

## 5. Keine Änderung an Allokation und Platzierung

Wann Conditioning einen eigenen Tag bekommt (Level 3, oder Level 2 bei low Load), wann der Finisher fährt (Level ≥ 2, gedämpft bei high Load) und die Platzierungsregeln (nie mit Speed-Tag, nicht vor Speed) bleiben unangetastet. Diese Spec ändert nur, **was in den Slots passiert**, nicht wann sie existieren.

## 6. App-Querschnitt

- Keine neuen Spalten an Sessions/Blöcken; Format steckt in Name + Description (v1).
- Session-Titel-Logik (`session-title.ts`) kennt nur Workout-Sessions — unberührt; Conditioning-Sessions setzen den Namen im Builder.
- i18n: nichts Neues nötig, Namen/Descriptions kommen wie heute als Strings aus dem Worker. *(Bestehender Zustand, bewusst nicht in dieser Spec gelöst.)*

## 7. Equipment-Erweiterung + neue Übungen

### 7.1 Neue `equipments` (Migration, rollout-gated wie alle)

`treadmill`, `stationary_bike`, `air_bike`, `rowing_erg`, `heavy_bag` — jeweils + `environment_equipments`-Mapping: alle fünf für `gym`; für `home` alle fünf (wählbar, wer sie hat); für `outdoor` keines.

### 7.2 Neue Übungen (Kategorie `conditioning`, `measurement_type: 'duration'`)

| Slug | Equipment | Intensität | dient |
|---|---|---|---|
| `treadmill_run` | treadmill | 4 | extensive (Maschine), intensive |
| `stationary_bike_ride` | stationary_bike | 4 | extensive (Maschine), intensive |
| `air_bike_ride` | air_bike | 6 | extensive (Maschine), intensive |
| `rowing_erg` | rowing_erg | 5 | extensive (Maschine), intensive |
| `heavy_bag_work` | heavy_bag | 6 | rounds (Prio combat), intensive |

Alle: `body_region: 'full_body'`, `exercise_type: 'dynamic'`, keine `strength_pattern`/`plyo_type`/`sprint_type`-Tags (damit sie exklusiv im Conditioning-Pool leben), `min_level: 1`. Beschreibungen + i18n wie bei `hill_sprint` (Migration mit description_i18n). Videos/Thumbnails folgen separat (wie bei bisherigen Neuzugängen).

### 7.3 App-Folgen

- Equipment-Picker (Onboarding + Profil): Labels kommen aus `equipments.name_i18n` (DB), ein Icon-Mapping existiert in der App nicht — neue Geräte erscheinen automatisch, sobald die Migration live ist. Kein App-Code nötig außer dem Re-Prompt.
- Bestandsuser haben die neuen Equipments nicht angehakt → der bestehende **Re-Prompt-Hook** (Equipment-Onboarding-Fix) soll einmalig erneut fragen, sobald die neuen Equipments live sind.

## 8. Worker-Plumbing

- `prepare-v2`: lädt `sport_conditioning_weights` (ein Select, gecacht pro Lauf), zählt `workout_plans` des Users, reicht `{ format, planCount, sportGroup, runAnchor }` an die Builder; der Finisher bekommt `{ format, offset }` über den `V2SessionContext`.
- `types.ts` / Workflow-Input: unverändert — alles wird in `prepare-v2` aus der DB abgeleitet.
- Mit `sport_plane_weights` (nächste Design-Runde) teilt sich diese Tabelle den Lade-/Normalisierungs-Helper (`loadGroupWeights(table, groupName, fallback)`), aber nicht das Schema.

## 9. Später: RST-Ableitung (nur Hook, nicht bauen)

Der Repeated Sprint Test (6 Läufe) liefert Abfall % und Absolutzeit:

- Hoher Abfall + gute Absolutzeit → aerobe Basis fehlt → Multiplikator auf `extensive` (z. B. ×1.5, dann renormalisieren).
- Niedriger Abfall + schwache Absolutzeit → kein Conditioning-Problem, sondern Speed — keine Format-Änderung.

Die Ableitung ist ein **Multiplikator auf die Sportgruppen-Gewichte**, kein eigenes System. Voraussetzung: RST-Daten in `metric_entries` existieren in nennenswerter Zahl. Bis dahin: nicht bauen.

## 10. Tests & Rollout

**Tests (vitest, deterministisch):**
- Zyklus-Bau: Gewichte → 10-Slot-Zyklus (Largest Remainder, Verschränkung, weight 0 nie enthalten), `planCount`-Rotation stabil.
- Extensive-Varianten-Kette: outdoor → Lauf; Maschine bei Equipment; sonst Zirkel; Pool < 3 → Degradierung auf intensive mit Notiz. Lauf-Deckel: 60-min-Tag → 35 min Dauerlauf, `estimated_duration_minutes` schrumpft mit.
- Rounds-Block: Standard EINE Übung à 180 s / 60 s Pause; combat bevorzugt heavy_bag → shadow_boxing; Dreiteilungs-Fallback (3×60 s, Pause an letzter Station) nur ohne rundentaugliche Übung im Pool.
- Finisher: dominantes Format, Rotations-Offset statt Alphabet (Monotonie-Regression pinnen).
- Degradierungs-Notizen tauchen in `notes` auf.

**Rollout-Reihenfolge:**
1. Migrationen lokal (`supabase migration up`): Enum + Tabelle + Seed, Equipments + Übungen. Alle mit ROLLOUT GATE (§6.3) + `lock_timeout`.
2. Worker-Code + Tests, Worker-Neustart lokal, Plan-Regeneration leo2 (On-Device-QA: alle drei Formate per Gewichts-Override erzwingen).
3. Prod erst nach 3.0.0-Kette (wie alle offenen Migrationen auf `feat/session-structure`).

## 11. Nicht in Scope

- RST-Modulation (§9), Multi-Week-Templates, Persistierung des Formats, Kraftausdauer als Trainingsziel, Cardio-Maschinen in Warmups, Admin-UI für Gewichte.
