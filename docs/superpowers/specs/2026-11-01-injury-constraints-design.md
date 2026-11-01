# Verletzungs-Constraints: schedule_notes → deterministische Übungs-Filter

**Datum:** 2026-11-01
**Status:** Design (brainstormed, vom User abgenommen)
**Auslöser:** Survey-Analyse der 3er-Bewertungen nach 3.0.0 — Userin mit
`schedule_notes` „Leichter Knieschaden – keine tiefen Kniebeugen" bekam Assisted
Pistol Squat (AMRAP), Loaded Curtsy Lunge und Bulgarian Split Squat 4×3–5 @RPE 8.

## Intent & Warum

`schedule_notes` landen heute ausschließlich als `user_notes` im LLM-Prompt
(`prepare-v2.ts` → `userContext`); die deterministische Pool-/Fenster-Auswahl
(exercise-filter, pool, weighted-cycle) ignoriert sie vollständig. Verletzungs-
Angaben sind damit wirkungslos — ein Vertrauens- UND Verletzungsrisiko-Thema.

Ist-Zustand Prod (01.11.2026, Stichprobe 150 von 2.495 Notes; 24 % aller
10.233 User haben Notes):

- ~60–65 % Verletzungen/medizinische Einschränkungen. Bandbreite: explizites
  Verbot („keine tiefen Kniebeugen", „no nordics"), reine Diagnose ohne
  Anweisung („Kreuzbandriss vor 10 Monaten"), vage („Schulter knackt"),
  akute Reha („Woche 14 nach Kreuzband-OP").
- ~25 % Scheduling („Dienstag Basketball", „Sonntag Spiel") — redundant zum
  weekly_schedule-Feature.
- ~10 % Ziele/Noise.

Grundsatzentscheidung (User): Das Feld ist künftig **nur für Verletzungen und
körperliche Einschränkungen** gedacht.

## Ziele

1. Verletzungs-Angaben wirken **deterministisch** in der Übungsauswahl
   (Generator UND Exercise-Swap), nicht nur als Prompt-Hinweis.
2. Der User bestätigt explizit, was gefiltert wird (keine stillen LLM-Raten).
3. Constraints haben einen Weg zurück (Heilung) und veralten nicht stumm.
4. Bestandsuser (2.495 mit Notes) werden ohne Sondermigration abgeholt.

## Nicht-Ziele

- Keine Reha-Programmierung. Akute Fälle bekommen einen konservativen Plan
  plus Arzt/Physio-Hinweis — die App steuert keine Reha-Progression.
- Kein Laufzeit-LLM im Generator. LLM nur als einmaliger Übersetzer beim
  Onboarding/Re-Check (Linie: Generator-Qualität programmatisch sichern).
- Keine Freitext-Interpretation von Zielen/Wünschen („will abnehmen") — wird
  erkannt und ignoriert bzw. Richtung passender Features gelenkt.

## Anti-Ziele

- Ganze Blöcke/Sessions dürfen durch Constraints **nie** verschwinden. Es
  filtert immer nur der Übungs-Pool; dünne Fenster fängt der bestehende
  Fallback („Pattern ohne Pool-Übungen — Anforderung entfällt").
- Kein Overblocking über Körperregionen: „betrifft die Region" ist falsch
  (Push Press braucht Beine, lädt sie kaum; stehender Curl ist bei
  Knieproblemen harmlos). Gefiltert wird über **kontraindizierte Bewegungen**.

## Entschiedene Architektur

### 1. Kontraindikations-Taxonomie (Bewegungen, nicht Regionen)

Kleine, feste Taxonomie von Kontraindikations-Tags. Entwurf (Builder
verfeinert mit User-Review; Zielgröße 12–16, getrieben von den realen Notes —
Knie/Sprunggelenk/Schulter/Rücken/Handgelenk/Leiste/Hamstring dominieren):

| Tag | Beispiel-Übungen | typische Note |
|---|---|---|
| `deep_knee_flexion_loaded` | Pistol Squat, tiefe Kniebeuge, Curtsy Lunge | „keine tiefen Kniebeugen", Meniskus |
| `jumping_landing` | Box Jump, Depth Jump, Jump Squat | Patellasehne, Reha nach Kreuzband |
| `sprinting_max_velocity` | Sprints, Flying Runs | Hamstring-Zerrung |
| `hamstring_high_speed_load` | Nordics, RDL schwer, Sprint | „no nordics" |
| `overhead_pressing` | OHP, Push Press | Schulter-Luxation |
| `shoulder_end_range` | Behind-neck, tiefe Dips | Schulter instabil |
| `wrist_extension_loaded` | Push-ups, Front Squat (Rack), Handstand | Handgelenk gebrochen/geprellt |
| `spinal_flexion_loaded` | Sit-ups schwer, Jefferson Curl | Bandscheibe |
| `spinal_compression_heavy` | Back Squat schwer, Deadlift schwer | LWS, Skoliose |
| `hip_flexion_loaded_deep` | tiefe Hocke, Leg Raise schwer | Hüft-Impingement |
| `adductor_loaded_stretch` | Copenhagen, Cossack tief | Leiste |
| `ankle_lateral_stress` | Lateral Bounds, Skater Jumps, COD | Bänderriss Sprunggelenk |
| `ankle_plantar_load_explosive` | Pogos, Sprünge, Wadenheben schwer | Achillessehne |
| `elbow_extension_loaded` | Skull Crusher, Dips | Ellenbogen |
| `spinal_rotation_loaded` | Rotational Core (Cable Chop, Landmine Rotation), Med-Ball-Würfe mit Rotation | Bandscheibe, LWS |

Tags leben als **Daten** (Tabelle `contraindication_tags`), nicht als Enum im
Code — Erweiterung ohne Migration des Workers.

### 2. Übungs-Tagging

Neue Relation `exercise_contraindications (exercise_id, tag_slug)`. Befüllung
einmalig per KI-Prefill im Admin (bestehende Pipeline) + manuelles Review durch
den User; Sync über den bestehenden `exercises:pull/push`-Mechanismus
(updated_at-basiert — Builder prüft, ob der Sync Relationen mitnimmt, vgl.
`exercise_equipments`-Handling in `pull-exercises-from-prod.mjs`).

### 3. User-Constraints (Datenmodell)

Neue Tabelle `user_injury_constraints`:

- `user_id`, `tag_slug`
- `mode`: `block` | `light_only`
- `acute` (bool): Reha-/Akut-Fall → zusätzlich Arzt-Hinweis im Plan
- `source_note` (Textauszug, Nachvollziehbarkeit), `origin`: `onboarding` |
  `recheck` | `manual`
- `confirmed_at` (Pflicht — nur bestätigte Constraints wirken), `revoked_at`

Zusätzlich pro User (z. B. auf `user_profiles`):
`injury_extraction_status: pending | confirmed | failed` +
`injury_confirmed_at` (Zeitstempel der letzten Bestätigung, steuert den
Re-Check-Rhythmus in §5). `confirmed` heißt: Der User hat den Confirm-Flow
abgeschlossen — auch wenn dabei NULL Constraints übrig blieben („Ist ok" für
alles).

Semantik im Generator/Swap:

- `block`: Übungen mit dem Tag fliegen aus jedem Pool (Pattern-Fenster,
  Plyo, Core, Accessory, Conditioning, Warmup/Cooldown) und aus dem
  Swap-Pool (`jemp-api`-Endpoint nutzt denselben Filter).
- `light_only`: Übung bleibt im Pool, ist aber von heavy-Emphasis-Slots
  ausgeschlossen und bekommt eine Intensitäts-Kappung (Builder: konkrete
  Mechanik analog Band-Intensitäten/Pool-relative Intensität).
- Validator-Check ergänzen: kein Plan verlässt den Generator mit einer
  Übung, die gegen einen aktiven `block`-Constraint verstößt. Das ist eine
  **harte** Garantie (mein Call, Builder-Check): da blockierte Übungen schon
  aus dem Pool gefiltert sind, kann ein Verstoß nur eine LLM-Halluzination
  sein — nach den bestehenden Retries läuft ein finaler deterministischer
  Strip-Pass, der verstoßende Übungen entfernt (der Block selbst bleibt mit
  den restlichen Übungen bestehen; leert er sich, greift die bestehende
  Drop-Maschinerie mit Note). Kein „3 Versuche, dann ship it" für
  Sicherheits-Constraints.

### 4. Extraktion (LLM, einmalig)

Direkt im Onboarding, unmittelbar nach dem Verletzungs-Schritt (User-
Entscheidung): ein LLM-Call übersetzt den Freitext in ein striktes Schema —
Liste von `{ tag_slug, vorgeschlagener mode, acute, begründung }` +
Kategorie-Erkennung `scheduling` / `goal` / `noise` für Nicht-Verletzungs-
Inhalte. Scheduling-Inhalte werden NICHT verarbeitet, sondern dem User mit
Hinweis auf den Wochenplan gespiegelt. Geprüft (01.11.): `weekly_schedule`
kann externe Belastung abbilden — Sessions mit Typ (`team_training` /
`individual_training` / `game` / `tournament`), Wochentag und Intensität;
„Dienstag Basketball" ist also als team_training/Intensität erfassbar.
Bekannte kleine Lücke (Folgeticket, nicht Teil dieses Projekts): Sessions
haben kein Label-/Sportart-Feld — fürs Load-Modell irrelevant, fürs
User-Verständnis beim Umlenken ggf. wünschenswert. Extraktions-Fehler/Timeout → keine
Constraints, Flag für erneuten Versuch am Rest-Gate (§5); das Onboarding wird
nie blockiert.

Technische Platzierung des Calls (Edge Function vs. jemp-api) entscheidet der
Builder; Anforderung: Ergebnis liegt VOR dem Confirm-Screen vor, Schema-
validiert (Structured Output), unbekannte Tags werden verworfen.

**Prompt-Rolle (User-Entscheidung):** Die Ersetzung hängt am
`injury_extraction_status`, NICHT an der Existenz von Constraints: Bei
`confirmed` fliegt der `user_notes`-Rohtext aus dem Generator-Prompt
(`prepare-v2.ts` → `userContext`) und wird durch eine strukturierte
Constraint-Zusammenfassung ersetzt (bzw. entfällt ganz, wenn null Constraints
bestätigt wurden) — nie beides. Die bisherige undokumentierte Wirkung von
Scheduling-Notes über den Prompt entfällt damit bewusst; der Confirm-Flow
lenkt solche Inhalte zum Wochenplan-Feature. Bei `pending`/`failed` bleibt
übergangsweise der Status quo (Rohtext im Prompt).

**Nicht mappbare Verletzungsinhalte (User-Entscheidung):** Erkennt die
Extraktion Verletzungsinhalte, die auf keinen Tag der Taxonomie passen, werden
sie NIE still verworfen: Das Schema liefert sie als `unmapped`-Liste, der
Confirm-Screen zeigt sie als „erkannt, aber nicht gezielt filterbar" mit der
Option, manuell Tags aus der Liste zuzuordnen.

### 5. Confirm-Flow (UI)

Primärer Ort ist das **Onboarding** (User-Entscheidung): Confirm-Screens
liegen direkt nach dem Verletzungs-Schritt, im linearen Onboarding-Flow und
damit faktisch verpflichtend — wer zum Generieren-Button kommt, hat bestätigt.
Hinweis Builder-Check: Das Onboarding generiert heute KEINEN Plan; die
Generierung startet später aus dem Plan-Tab (vier Trigger-Callsites,
fire-and-forget POST an jemp-api).

- Onboarding: Feld umbenennen/umtexten zu „Verletzungen & körperliche
  Einschränkungen" (i18n de/en; Wizard-`ScheduleDetailStep` analog). Nach der
  Extraktion: pro erkanntem Constraint ein Bestätigungs-Element — „Verstanden:
  Knieproblem. Tiefe Kniebeugen unter Last: [Vermeiden / Nur leicht / Ist ok]".
  So viele Screens wie nötig (User-Entscheidung); User ohne Verletzung sehen
  nichts.
- Akut-Fälle: zusätzlicher Hinweis-Screen „Kläre die Belastung mit
  Arzt/Physio" + konservative Voreinstellung (alle betroffenen Tags `block`).
- Profil: Sektion „Einschränkungen" — aktive Constraints einsehen, Modus
  ändern, deaktivieren, manuell hinzufügen.
- **Rest-Gate am Generieren-Flow (blockierend, User-Entscheidung):** Vor dem
  POST prüft die App drei Fälle und blockiert den Start, bis sie beantwortet
  sind — (a) Bestandsuser mit Note, aber ohne Extraktion (die 2.495): jetzt
  Extraktion + Confirm nachholen (mein Call: kein separater Backfill-Job);
  (b) fehlgeschlagene Onboarding-Extraktion: Retry; (c) Re-Check bestehender
  Constraints: „Gilt noch: keine tiefen Kniebeugen?" [Ja / Ausgeheilt /
  Anpassen] — vorbelegt, ein Tap, und NUR wenn `injury_confirmed_at` älter
  als 7 Tage ist (User-Entscheidung — sonst kein Gate-Schritt). Alle vier
  Trigger-Callsites laufen über dieses Gate.
- **Gate ohne Sackgasse (User-Entscheidung):** „Blockierend" heißt: Die Frage
  muss beantwortet werden — NICHT: die Extraktion muss gelingen. Extraktion am
  Gate (Fälle a/b) läuft mit Timeout; bei Fehler/Timeout fällt das Gate auf
  manuelle Auswahl aus der Tag-Liste zurück, inklusive Option „Keine
  Einschränkungen". Der User kommt immer zum Plan.
- **Gate-Position (User-Entscheidung): VOR der Paywall.** Der Confirm-/
  Re-Check-Schritt liegt im Generieren-Flow vor dem Paywall-Screen — wer
  zahlt, hat die Einschränkungen bereits geklärt, und das Gate wirkt auch,
  wenn die Paywall den Flow abbricht.
- **Constraint-Änderung bei laufendem Plan (User-Entscheidung):** Fügt ein
  User einen `block`-Constraint hinzu (oder verschärft einen), wendet die App
  den deterministischen Strip-Pass (§3/§6) auf alle ZUKÜNFTIGEN
  materialisierten Sessions des aktiven Plans an (verstoßende Übungen werden
  entfernt; leert sich ein Block, greift die bestehende Drop-Maschinerie) und
  bietet zusätzlich an, den Plan neu zu generieren. Vergangene/abgeschlossene
  Sessions bleiben unverändert. Der Swap-Pool filtert ab sofort.
- **Sichtbarkeit im Plan (User-Entscheidung, 01.11., aus den Testfällen):**
  Constraints dürfen nie stillschweigend wirken — sonst fragt sich der User,
  warum Übungen fehlen. Zwei Anforderungen:
  - **Anpassungs-Hinweis:** Sobald aktive Constraints die Übungsauswahl
    beeinflusst haben, zeigt der Plan das sichtbar an (z. B. Badge/Hinweis am
    Plan „An deine Einschränkungen angepasst" + pro betroffener Session ein
    kurzer Hinweis). Datengrundlage existiert bereits (Exclusion-Sets im
    Worker); die konkrete Platzierung ist UI-Detail.
  - **Prio-Konflikt-Messaging:** Läuft die Säule einer User-Priorität durch
    Constraints praktisch leer (Referenzfall: `sprints=3` + Hamstring-Zerrung
    → Sprint-Block entfällt, Session enthält nur Technik-Drills), muss die
    App das aktiv erklären („Deine Sprint-Priorität kollidiert aktuell mit
    deiner Verletzungsangabe — die Einheit enthält vorerst Technik/CoD") und
    idealerweise eine temporäre Prio-Anpassung anbieten. Still degradierte
    Prio-Sessions sind nicht akzeptabel.

### 6. Akute Reha-Fälle

Erkannt als `acute`: Plan wird trotzdem generiert, betroffene Tags `block`,
deutlicher Arzt/Physio-Hinweis (Onboarding-Screen + dauerhaft sichtbar am
Plan, z. B. in `schedule_notes`-Nachfolge/Plan-Beschreibung). Keine
Reha-Progression, keine medizinischen Empfehlungen.

## Dem Builder überlassen

- Exakte Tag-Liste finalisieren (mit User-Review der Übungs-Zuordnung).
- Platzierung des Extraktions-Calls + Modellwahl; Prompt/Schema.
- Konkrete `light_only`-Mechanik im Pool/Emphasis-System.
- UI-Detailgestaltung der Confirm-/Profil-Screens (bestehende Sheet-/
  Glass-Patterns nutzen).
- Reihenfolge der Teilschritte/Deploys (DB-Migration → Tagging → Worker →
  App; Worker-Deploy-Kopplung mit jemp-api beachten, vgl. Exercise-Swap).
- Analytics: PostHog-Events für Extraktion/Confirm/Re-Check (Funnel).

## Risiken

- **Overblocking** → 3er-Bewertungen „zu lasch": begrenzt durch Confirm-Flow,
  `light_only`-Zwischenstufe und Re-Check bei jeder Generierung.
- **Tagging-Qualität** der ~500 Übungen: KI-Prefill allein reicht nicht —
  manuelles Review ist Pflicht, Taxonomie klein halten.
- **Dünne Pools** bei mehreren Constraints (z. B. Knie + Schulter): bestehender
  Fenster-Fallback greift; Validator-Note, wenn >N % eines Pools wegfallen,
  damit das sichtbar wird.
