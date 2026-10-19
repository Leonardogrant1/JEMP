# Exercise Swap: Übungen gegen gleichwertige Alternativen tauschen

**Datum:** 2026-10-19
**Status:** Design freigegeben (Chat-Review 19.10.), Spec zur User-Review
**Kontext:** Wiederkehrender Feature-Request. User sollen eine Übung in einer
Session gegen eine gleichwertige austauschen können — nicht gegen irgendeine,
sondern exakt gegen eine aus dem Pool, den der Generator an diesem Slot selbst
hätte wählen können. Zusätzlich (Chat 19.10.): zu schwere Übungen erscheinen
als gesperrte Einträge mit "Ab Level X" — sichtbare Motivation, besser zu
werden.

## §0 Entscheidungen (Chat, 19.10.)

1. **Scope: nur aktueller Plan.** Tausch gilt für "nur diese Session" oder
   "diese und alle folgenden Sessions dieses Plans". Neue Pläne generieren
   wieder frei — keine dauerhafte Präferenz, keine Generator-Änderung.
2. **Gruppe = Generator-Pool.** Alternativen sind exakt die Übungen, die
   Eligibility (Equipment, Tages-Umgebung, Level, Sport-Gate) UND
   Blockzugehörigkeit (`exerciseMatchesBlock`) bestehen. Heavy-Slots behalten
   den Heavy-Filter (sagittal, Intensität ≥ 5). Das Rotations-Fenster
   (`rotatedPoolWindow`/`patternSlugWindow`) wird NICHT angewandt — beim
   manuellen Tausch zählt der volle Pool, die Verknappung ist Anti-Monotonie
   fürs LLM.
3. **Vorgaben werden neu abgeleitet,** nicht 1:1 kopiert: Satzzahl,
   Rep-Schema und Pause bleiben vom Slot; Last-Modus und Mess-Typ werden
   übungsgerecht gesetzt (gleiche Helper wie der Generator).
4. **Alle Blöcke tauschbar** — Warmup, Mobility, Core, Plyo, Kraft,
   Accessory, Conditioning — jeweils innerhalb des eigenen Pools.
5. **Berechnung lebt in jemp-api** (User-Vorschlag, ersetzt die zuerst
   erwogene Materialisierung bei Generierung): Der Endpoint importiert die
   echte Worker-Filterlogik per relativem Import (gleiche Repo, esbuild
   bundelt). Vorteil: funktioniert sofort für bestehende Pläne, Pool ist zur
   Swap-Zeit frisch (Equipment-Änderungen wirken). Preis: Deploy-Kopplung —
   ändert sich die Filterlogik im Worker, muss auch jemp-api deployed werden.
6. **Locked-Mechanik:** Übungen, die NUR am Level scheitern (User-Level <
   `min_level`), erscheinen ausgegraut mit Schloss und "Ab Level X". Zu
   leichte Übungen (User über `max_level`) bleiben unsichtbar. Equipment-
   oder Umgebungs-Fails bleiben ebenfalls unsichtbar — keine zweite
   "im Gym könntest du…"-Mechanik.

## §1 Datenmodell

Die materialisierten Sessions existieren bereits vollständig (4 Wochen, bis zu
5 Occurrences pro Blueprint-Session, verlinkt via
`workout_plan_session_block_exercise_id`). Der Swap ist ein reines UPDATE auf
`workout_session_block_exercises` — niemals Delete+Insert, weil geloggte Sätze
(`workout_session_performed_sets`) per `ON DELETE CASCADE` an der Zeile hängen.

**Migration** (eine, additiv):

- Neue Spalte `swapped_from_exercise_id uuid null references exercises(id)`
  auf `workout_session_block_exercises` — markiert getauschte Zeilen
  (Debugging, späteres "Zurücksetzen" möglich, kostet nichts).
- Neue Spalten `assigned_pattern text null` und `pattern_emphasis text null`
  (`'heavy'|'normal'`) auf `workout_session_block_exercises`: Der Worker
  schreibt beim Materialisieren für Kraftblock-Übungen mit, welches Pattern
  die Zeile erfüllt und mit welcher Emphasis (Review 19.10.: die Heavy-
  Erkennung per Heuristik rät, und ohne Pattern-Bindung bricht der Swap die
  Pattern-Coverage-Garantie des Validators). Die Zuordnung ist zur Save-Zeit
  eindeutig: `patternReqs` trägt `{pattern, emphasis, slugs}` pro Muster, und
  `matchesStrengthPattern` matcht jede Übung auf genau ein Pattern.
  Nicht-Kraftblöcke und Alt-Pläne: null. Beide Spalten liegen AUCH auf
  `workout_plan_session_block_exercises` (Blueprint): `save-plan.ts` fügt
  erst Blueprint-Zeilen ein und kopiert sie per Select-back in die
  materialisierten Zeilen — ohne Blueprint-Spalten gäbe es keinen
  Durchreich-Pfad.
- RLS: Die Owner-UPDATE-Policy auf `workout_session_block_exercises`
  existiert bereits (Migration `20260419081707`, "Users can update own
  workout session block exercises") — kein Policy-Teil in der Migration
  nötig. Supabase kann Spalten nicht per RLS einschränken; die App schreibt
  ausschließlich `exercise_id`, `target_*`, `notes`/`recommended_load_value`
  (genullt) und `swapped_from_exercise_id`.

Keine neue Tabelle, keine Blueprint-Änderung (Blueprint-Zeilen bleiben
unberührt — Sessions werden nie re-materialisiert). **Eine kleine
Worker-Änderung** gibt es damit doch: `save-plan.ts` befüllt
`assigned_pattern`/`pattern_emphasis` beim Insert der materialisierten
Kraftblock-Zeilen aus den `patternReqs` der Generierung.

## §2 Endpoint (jemp-api)

`GET /sessions/block-exercises/:id/alternatives` — Auth identisch zur
bestehenden Plan-Generation-Route (Supabase-JWT, User-Scoping serverseitig:
die Zeile muss zu einer Session des anfragenden Users gehören, sonst 404).

**Ablauf:**

1. Lädt die Übungszeile + Block (`block_type_id`, `focused_category_id`,
   Pattern-Kontext) + Session (`scheduled_at`, Tages-Umgebung) + User-Presets
   (Equipment, Umgebungen, Kategorie-Levels, Sportgruppe) — dieselben Daten,
   die `prepareGenerationV2` lädt, reduziert auf einen Slot.
2. Baut die Filter mit dem **echten Worker-Code** (relativer Import aus
   `../jemp-temporal-worker/src/plan-generation/v2/`): `makeExerciseFilter`
   (mit `dayEnvId` der Session), `makeSportGate`, `exerciseMatchesBlock`.
   **Pattern-Bindung (Review 19.10., kritisch):** In Kraftblöcken reicht
   `exerciseMatchesBlock` NICHT — es matcht per `.some()` über alle Patterns
   des Blocks, der Validator erzwingt aber Coverage pro Pattern. Kandidaten
   werden deshalb zusätzlich auf das Pattern der getauschten Zeile
   eingegrenzt (`matchesStrengthPattern(candidate, assigned_pattern)`).
   Quelle: die Spalte `assigned_pattern`; bei Alt-Plänen (null) wird das
   Pattern aus der aktuellen Übung abgeleitet (`strength_pattern`, sonst
   Coarse-Fallback). Rudern tauscht nur gegen Rudern — die
   Pattern-Coverage-Garantie des Generators überlebt jeden Swap.
   **Heavy-Filter:** greift, wenn `pattern_emphasis = 'heavy'` (gespeichert,
   kein Raten); Filter wie in `patternSlugWindow` (sagittal,
   `intensity_score >= 5`). Fallback für Alt-Pläne ohne Spalte: like-for-like
   — Heavy-Filter nur, wenn die aktuelle Übung ihn selbst besteht.
   **Region-Bindung (QA 19.10.):** In den Nicht-Kraftblöcken (accessory,
   optional, warmup, cooldown) müssen Kandidaten dieselbe `effectiveRegion`
   wie die aktuelle Übung treffen — der Block-Pool allein ist dort
   regionsübergreifend (Accessory mischt groin/hip/calf/ankle), beim
   manuellen Tausch erwartet der User aber Waden gegen Waden. Kraft bindet
   übers Pattern, Plyo über die Variante, Core bleibt frei (alles Rumpf,
   Ebenen-Sortierung priorisiert like-for-like).
3. Teilt die Kandidaten:
   - `alternatives`: bestehen alle Filter; aktuelle Übung ausgenommen.
   - `locked`: bestehen alle Filter AUSSER Level, und zwar nur
     `userLevel < min_level`. Sortiert aufsteigend nach `min_level`
     (nächste Unlocks zuerst), gedeckelt auf 5.
   - **Ebenen-Hinweis (Review 19.10.):** Die `sport_plane_weights`-Steuerung
     lebt nur im Rotations-Fenster — beim Swap mit vollem Pool kann der User
     eine bewusst laterale/rotierende Übung zurück auf linear tauschen. Das
     bleibt seine Entscheidung (keine harte Durchsetzung), aber die
     `alternatives` werden so sortiert, dass Übungen mit derselben
     Bewegungsebene (`movement_type`) wie die aktuelle Übung zuerst stehen.
4. Berechnet pro `alternative` die Vorgabe (§3) und liefert:

```jsonc
{
  "alternatives": [{
    "exercise": { "id", "slug", "name", "image_url", "equipment": ["…"] },
    "prescription": {
      "target_sets", "target_reps_min", "target_reps_max",
      "target_duration_seconds", "target_rest_seconds",
      "target_load_type", "target_load_value"
    }
  }],
  "locked": [{ "exercise": { … }, "unlock_level": 62 }],
  "future_occurrence_count": 3   // steuert, ob die App die Scope-Wahl zeigt
}
```

Leerer Pool → `alternatives: []`, die App blendet die Swap-Affordance aus
bzw. zeigt den Leer-Hinweis im Sheet.

## §3 Vorgaben-Ableitung

Vom aktuellen Slot übernommen: `target_sets`, `target_reps_min/max` (falls
die neue Übung rep-basiert ist), `target_rest_seconds`, `is_amrap`/
`target_rounds`. Übungsgerecht neu gesetzt:

- **Mess-Typ-Wechsel:** Ziel-Übung ist zeitbasiert → `target_duration_seconds`
  aus dem Slot bzw. Block-Default, Reps genullt (und umgekehrt).
- **Last-Modus:** Bodyweight-Übung → `bodyweight`; Hantel-/Geräteübung ohne
  übertragbare Last → `rpe` mit Wert 7 als Einstieg (Generator-Konvention);
  `percent_1rm`/kg der alten Übung wird nie blind übernommen.
- Dieselben Helper wie der Generator (aus dem Worker-Code importiert), damit
  Validator-Semantik (`fixInvalidLoads`-Regeln) und Swap identisch bleiben.

## §4 Swap-Mutation (App, direkt via Supabase)

Neue Mutation `use-swap-exercise.ts` (Konvention wie `use-upsert-performed-set`):

- **"Nur diese Session":** UPDATE der einen Zeile (`exercise_id`, `target_*`,
  `swapped_from_exercise_id` = alte Übung).
- **"Diese und alle folgenden":** UPDATE aller Zeilen mit derselben
  `workout_plan_session_block_exercise_id`, deren Session
  `scheduled_at >= scheduled_at` der aktuellen Session und Status
  `scheduled` oder `in_progress` hat. Abgeschlossene, übersprungene und
  vergangene Sessions bleiben unberührt.
- Danach Invalidation der Session-Detail-Query (beide Oberflächen hängen an
  `useSessionDetailQuery`).
- **Sperre:** Existiert für die Zeile bereits ein `performed_set`, ist der
  Swap blockiert (UI ausgegraut + Hinweis; die Mutation prüft serverseitig
  nicht extra — die UI-Sperre plus Owner-RLS genügt, ein Self-Foot-Gun ist
  kein Angriffsvektor).

## §5 App-UX

Ein gemeinsames **Swap-Sheet** (bestehende Sheet-Bauweise/Glass-Rezeptur):

- **Einstieg Session-Overview** (`app/session/[id].tsx`): Swap-Icon an jeder
  Übungszeile.
- **Einstieg aktive Session** (`app/active-session/[id].tsx`): über die
  ExerciseCard; ausgegraut sobald ein Satz der Übung geloggt ist.
- **Sheet-Inhalt:** Loading-State während des API-Calls → Liste der
  Alternativen (Thumbnail, Name, Equipment-Badges, Kurz-Vorgabe) → darunter
  gedimmte **Locked-Sektion** (Schloss-Icon, "Ab Level X"; Tap = Haptic +
  Hinweis, keine Auswahl) → nach Auswahl die Scope-Wahl
  ("Nur diese Session" / "Diese und alle folgenden"), nur wenn
  `future_occurrence_count > 0`, sonst direkter Swap.
- i18n de/en für alle neuen Keys.

## §6 Testing

- **jemp-api Unit-Tests** (bestehendes `node --test`-Setup): Pool-Berechnung
  mit den echten Worker-Filtern gegen Fixture-Daten — Fälle: Equipment-Fail,
  Umgebungs-Fail, Level-Lock (erscheint in `locked`), Heavy-Filter über
  `pattern_emphasis` + Like-for-like-Fallback bei null, **Pattern-Bindung**
  (Pull-Zeile liefert keine Push-Kandidaten, gespeichert UND abgeleitet),
  Sport-Gate, leerer Pool, Mess-Typ-Wechsel in der Vorgaben-Ableitung,
  Ebenen-Sortierung (gleiche `movement_type` zuerst).
- **Worker:** Test, dass `save-plan` `assigned_pattern`/`pattern_emphasis`
  korrekt aus den `patternReqs` befüllt (Kraftblöcke) bzw. null lässt.
- **Mutation:** lokaler Test gegen die Dev-DB (Scope-Update trifft nur
  zukünftige Occurrences; geloggte Sätze überleben).
- **On-Device-QA** auf Staging: beide Einstiege, Locked-Sektion, Scope-Wahl,
  Sperre nach geloggtem Satz.

## §7 Bewusst NICHT im Scope (YAGNI)

- Undo-/Revert-UI (Spalte `swapped_from_exercise_id` hält die Tür offen).
- Dauerhafte Präferenzen / Einfluss auf künftige Plan-Generierungen.
- "Im Gym könntest du…"-Hinweise für Equipment-/Umgebungs-Fails.
- Anwendung des Rotations-Fensters auf die Alternativen-Liste.
- Harte Durchsetzung der Ebenen-Steuerung beim Swap (nur Sortierung,
  siehe §2) — der manuelle Tausch ist bewusst die Eskapade des Users.
- Backfill von `assigned_pattern`/`pattern_emphasis` für Alt-Pläne — der
  Ableitungs-Fallback in §2 deckt sie ab. Kein Ablaufdatum: Wer nie einen
  neuen Plan generiert, bleibt dauerhaft im Fallback — das ist akzeptiert,
  die Pattern-Ableitung ist exakt, nur die Heavy-Erkennung approximiert
  dort like-for-like.

## §8 Deploy-Hinweis

Die Filterlogik hat ab jetzt zwei Konsumenten (Worker + jemp-api). In
`deploy-fly.sh` bzw. im jemp-api-README einen Kommentar ergänzen: Änderungen
unter `jemp-temporal-worker/src/plan-generation/v2/` erfordern auch einen
jemp-api-Deploy, sonst filtert der Swap anders als der Generator.
