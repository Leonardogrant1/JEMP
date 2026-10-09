# Flexible Session Window (Sprint/Mobility als Wochen-To-do) — Design

**Status:** In-Chat-Design approved 2026-10-09. **Branch:** feat/session-structure.

## Modell (Hybrid: Empfehlung + Fenster)

Sprint- und Mobility-Sessions bleiben vom Week-Layout **empfohlen platziert** (`day_of_week` unverändert = Empfehlung, Legacy-kompatibel), bekommen aber ein **`flexible_window`**: die Wochentage, an denen der User sie stattdessen ausführen darf.

- **Speed-Session-Fenster** = alle 7 Wochentage minus Spieltage minus Tage <72h vor einem Spiel (dieselbe `speedLegal`-Regel wie die Platzierung — nur nicht mehr auf einen Tag kollabiert). Bewusst NICHT auf die gewählten Trainingstage beschränkt: Sprints macht man draußen, wann es passt.
- **Mobility-Fenster** = alle 7 Tage (Ermüdungskosten 0, keine Constraints).
- Workouts bleiben gepinnt (`flexible_window = null`).
- Der Abzug vom Trainings-Budget bleibt unverändert (Speed kostet Ermüdung 4) — nur die Tages-Bindung fällt.

## Datenmodell

`workout_plan_sessions.flexible_window smallint[] NULL` — erlaubte Wochentage (1–7), null = gepinnt. `day_of_week` bleibt NOT NULL als Empfehlung; die Expansion in `workout_sessions` (scheduled_at) läuft unverändert auf den Empfehlungstag.

## Worker

`placeWeek` berechnet das Fenster (speed: 72h-/Spieltags-Regel über alle 7 Tage; mobility: 1–7) und hängt es an die PlacedDays; `buildSpeedSession`/`buildMobilitySession` reichen es in die Session durch; `save-plan` schreibt die Spalte.

## App (Plan-Tab)

- Sessions mit `flexible_window` erscheinen in einer Sektion **„Flexibel diese Woche"** als Karte: Icon, Name, Dauer, Empfehlungstag, Mini-Tagesreihe (legale Tage normal, gesperrte grau + 🔒), primäre Aktion **„Starten"**.
- „Starten" an einem legalen Tag ≠ Empfehlung → bestehende Reschedule-Mutation auf heute, dann Navigation in die Session. Heute nicht im Fenster → `JempDialog` mit Grund („<72h bis zum Spiel …").
- Erledigt → Karte kollabiert zur Checkmark-Zeile. Dringlichkeit nur am letzten legalen Tag („Letzte Chance: heute").
- Tagestiles bleiben unberührt; die Instanz liegt weiterhin am Empfehlungstag, bis der User sie startet/verschiebt.

## Entscheidungen

- **Hybrid statt frei/fix**: Default erhält den Coach-Charakter, Fenster erhält die Realität (Wetter, Alltag). Schutzlogik bleibt vollständig.
- **Wochentage statt Daten** im Fenster — konsistent mit day_of_week, wiederholt sich pro Woche.
- **Kein Reschedule-Screen-Umbau in v1** — „Starten heute" deckt den Hauptfall; der bestehende Verschiebe-Flow bleibt unangetastet.
