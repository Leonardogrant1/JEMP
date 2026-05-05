
// ── Call 1: Plan Overview ─────────────────────────────────────────────────────
// Ask the AI to think freely and describe the plan in markdown.
// No JSON structure pressure — just good training logic.

export const GENERATE_PLAN_OVERVIEW_PROMPT = (exercises: string, userData: string) => `
Du bist ein professioneller Trainer für Athleten.
Erstelle für den User einen Wochenplan. Hier sind die Übungen aus denen du ihn zusammenstellst:

${exercises}

Nutzerdaten:
${userData}

## Umgebungs-Regeln

Jede Übung in der Liste kann ein optionales Feld \`environments: [slug, ...]\` haben.
- Fehlt das Feld komplett → die Übung funktioniert in allen Umgebungen.
- Steht \`environments: [outdoor]\` → **nur draußen möglich** (z. B. Sprints, Treppenläufe). Verwende diese Übungen **nur**, wenn der User \`outdoor\` in seinen \`user_environments\` hat.
- Steht \`environments: [gym]\` → **nur im Gym möglich** (z. B. Sled, Kabelzug). Verwende diese Übungen **nur**, wenn der User \`gym\` in seinen \`user_environments\` hat.
Halte dich strikt an diese Regel — plane keine Übungen, die der User in seiner Umgebung nicht ausführen kann.

## Messtyp-Regeln (sehr wichtig)

Jede Übung hat ein Feld \`measurement: [typ]\`:
- \`reps\` → setze \`reps_min\` und \`reps_max\`, \`duration_seconds\` = 0
- \`duration\` → setze \`duration_seconds\` (z. B. 30–60s), \`reps_min\` = \`reps_max\` = 0
- \`distance\` → notiere die Distanz in \`notes\`, setze \`reps\` = 0, \`duration\` = 0
- \`reps_or_duration\` → du entscheidest basierend auf Kontext und Block-Typ

Halte dich strikt daran — weise keiner \`duration\`-Übung Wiederholungen zu.

## Struktur jeder Session

Jede Trainingseinheit besteht aus genau diesen Blöcken in dieser Reihenfolge:
1. warmup
2. primary
3. secondary
4. accessory
5. cooldown

Jede Übung hat ein Feld \`blocks: [...]\` das angibt, in welchen Blöcken sie verwendet werden darf.
**Harte Regel:** Eine Übung darf **ausschließlich** in einem Block eingesetzt werden, dessen Typ in ihrer \`blocks\`-Liste steht.
Steht \`cooldown\` nicht in der Liste → die Übung darf **niemals** im cooldown verwendet werden.
Steht \`primary\` nicht in der Liste → die Übung darf **niemals** im primary verwendet werden. Usw.

## Wichtige Regel für primary und secondary

Jeder dieser Blöcke darf nur Übungen aus **einer einzigen Category** enthalten — kein Mischen. Ein Block = ein Kategoriefokus.

- **primary** = Hauptkategorie der Session. Legt den zentralen Trainingsfokus fest.
- **secondary** = darf entweder dieselbe Category wie primary unterstützen (andere Übungen, gleicher Fokus) **oder** eine sportlich passende Komplementär-Category nutzen — aber **niemals** denselben Movement-Reiz doppeln (z. B. kein zweites explosives Sprungkraft-Training direkt nach primary Sprungkraft mit identischen Bewegungsmustern).
- **primary und secondary dürfen niemals die exakt gleiche Category haben**, wenn dadurch keine neue Qualität trainiert wird. Wähle im Zweifel eine ergänzende Category.

## Sport-spezifische Pflicht-Categories (sport_required_categories)

Die \`sport_required_categories\` in den Nutzerdaten geben an, welche Categories für die Sportart wichtig sind (Relevanz 1–3):
- **3 = Kern**: Jede Woche muss mindestens eine Session diese Category im primary-Block haben.
- **2 = Wichtig**: Alle zwei Wochen mindestens einmal einbauen.
- **1 = Ergänzend**: Gelegentlich einbauen.

## Persönliche Fokus-Categories (user_focus_categories)

Die \`user_focus_categories\` geben an, was der User explizit verbessern möchte (priority 1 = höchste). Diese zusätzlich häufiger einbauen.

## Zusätzliche Hinweise des Users (schedule_notes)

Falls \`schedule_notes\` vorhanden ist, enthält es persönliche Hinweise des Users zu seinem Alltag und Trainingsrhythmus — z. B. Nebensportarten, Erholungsbedarf an bestimmten Tagen oder andere Einschränkungen.
**Berücksichtige diese Hinweise bei der Sessionplanung.** Wenn der User z. B. mittwochs Fußball hat, plane an diesem Tag keine intensive Session oder reduziere die Belastung entsprechend.

## Session-Name

Wähle für jede Session einen kurzen, beschreibenden Titel, der den Trainingsfokus widerspiegelt.
**Niemals** den Wochentag im Namen verwenden.

Gute Beispiele: "Power & Beinkraft", "Explosivität & Sprungkraft", "Oberkörper Kraft", "Mobility & Recovery"

## Block-Limits (sehr wichtig)

- warmup: 4 Übungen (Mobility, Activation, Dynamic Prep; max 1–2 Foam Roll)
- primary: 1–2 Übungen (Hauptziel, lange Pausen)
- secondary: 1–2 Übungen (anderer Reiz, gleiche Category wie primary)
- accessory: 2–4 Übungen (Core, Stabilität, Schwächen)
- cooldown: **genau 3 Übungen** (Mobility, Static Stretch, Recovery — kein Kampfsport, kein Cardio)

## Duplikat-Verbot (sehr wichtig)

Jede Übung darf **pro Session maximal einmal** vorkommen — auch nicht in verschiedenen Blöcken.
Innerhalb eines Blocks **niemals** dieselbe Übung mehrfach verwenden.

## Sportartpassung (sehr wichtig)

Wähle Übungen die zur Sportart des Users passen. Kampfsport-Übungen (z. B. shadow_boxing) gehören **nicht** in einen Fußball-Plan. Orientiere dich an den \`sport_required_categories\` und wähle Übungen aus Kategorien, die für die Sportart relevant sind.

## Ausgabe

Schreibe den Plan als \`plan_markdown\` — ein detaillierter Markdown-String mit folgender Struktur pro Session:

\`\`\`
## [Session Name] | Tag: [day_of_week 1=Mo…7=So] | Typ: [training|recovery] | Dauer: [X min] | Pause: [X]s

### warmup | Fokus: [category_slug]
- [exercise_slug]: [sets]x[reps_min]-[reps_max] reps, [duration_seconds]s, [rest_seconds]s Pause, load: [load_type] [load_value], notes: [notes]

### primary | Fokus: [category_slug]
...
\`\`\`

Verwende **exakt die Slugs** aus der Übungsliste. Gib für jede Übung alle Felder an (auch wenn 0).
`

// ── Call 2: Markdown → JSON ───────────────────────────────────────────────────
// Pure conversion task — no creative decisions needed.
// The AI receives a clear markdown plan and a slug whitelist.

export const GENERATE_PLAN_JSON_PROMPT = (planMarkdown: string, exerciseSlugs: string) => `
Konvertiere den folgenden Trainingsplan (Markdown) in das geforderte JSON-Format.

## Trainingsplan

${planMarkdown}

## Gültige Exercise-Slugs

Verwende **ausschließlich** Slugs aus dieser Liste (exakt so geschrieben):

${exerciseSlugs}

## Regeln

- day_of_week: 1=Montag, 2=Dienstag, …, 7=Sonntag
- order_index: beginnt bei 0, aufsteigend innerhalb jeder Ebene (sessions, blocks, exercises)
- Fehlende numerische Werte → 0 (nie null, da das Schema number erwartet)
- session_type: "training" oder "recovery"
- block_type: "warmup", "primary", "secondary", "accessory", "cooldown"
- target_load_type: "bodyweight", "kg", "rpe", "pace"
- focused_category_slug: category_slug des Blocks aus dem Markdown
- pause_between_sets: Pause in Sekunden zwischen Sätzen (aus dem Session-Header "Pause: Xs"), als Zahl
- Gib für jede Session exakt 5 Blöcke aus (warmup, primary, secondary, accessory, cooldown)
`
