
// ── Call 1: Plan Overview ─────────────────────────────────────────────────────

export const GENERATE_PLAN_OVERVIEW_PROMPT = (planContext: string) => `
Du bist ein professioneller Trainer für Athleten.
Generiere einen kurzen, motivierenden Namen und eine Beschreibung für den folgenden Wochenplan.

Plankontext:
${planContext}

Regeln:
- Name: Kurz, prägnant, auf die Sportart und den Fokus abgestimmt (max. 5 Wörter)
- Beschreibung: 1–2 Sätze, erklärt den Trainingsschwerpunkt der Woche
- Keine Erwähnung von Wochentagen im Namen
`

// ── Call 2a: Primary + Secondary Selection (full/reduced only) ────────────────

type PrimarySecondaryPromptInput = {
  spec: { day_of_week: number; mode_slug: string }
  exercisesString: string
  exerciseSlugs: string
  userContext: string
  planName: string
  planDescription: string
  planContext: PlanContextEntry[]
}

export const GENERATE_PRIMARY_SECONDARY_PROMPT = (input: PrimarySecondaryPromptInput) => {
  const { spec, exercisesString, exerciseSlugs, userContext, planName, planDescription, planContext } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const usedPrimaryCategories = planContext
    .filter((s) => s.mode_slug === "full" || s.mode_slug === "reduced")
    .map((s) => s.primary_category)
    .filter(Boolean)

  const previousSessionsText = planContext.length === 0
    ? "Keine — das ist die erste Session."
    : planContext.map((s) =>
        `- ${DAY_NAMES[s.day_of_week]} [${s.mode_slug}] primary=${s.primary_category}, secondary=${s.secondary_category}`
      ).join("\n")

  const usedSlugs = planContext.flatMap((s) => s.exercise_slugs)

  return `
Du bist ein professioneller Trainer. Wähle die primary- und secondary-Übungen für diese Session.

## Plan
Name: ${planName}
Beschreibung: ${planDescription}

## Nutzerdaten
${userContext}

## Bereits geplante Sessions
${previousSessionsText}

${usedPrimaryCategories.length > 0 ? `Bereits verwendete primary-Categories (NICHT nochmals verwenden): ${usedPrimaryCategories.join(", ")}` : ""}
${usedSlugs.length > 0 ? `Bereits verwendete Übungen (NICHT wiederverwenden): ${usedSlugs.join(", ")}` : ""}

## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}

## Verfügbare Übungen

${exercisesString}

## Regeln

- primary: 1–2 Übungen aus EINER Category — die intensitätshöchsten Übungen der Session
- secondary: 1–2 Übungen — komplementäre oder ergänzende Category, niemals dieselbe wie primary
- primary-Category darf sich diese Woche NICHT wiederholen (siehe oben)
- Sport-Pflicht-Categories (Relevanz 3) müssen mindestens einmal pro Woche primary sein

Verwende **ausschließlich** Slugs aus dieser Liste:
${exerciseSlugs}
`
}

// ── Call 2b–N: Full Session Generation ───────────────────────────────────────

type PlanContextEntry = {
  day_of_week: number
  mode_slug: string
  name: string
  primary_category: string
  secondary_category: string
  exercise_slugs: string[]
}

type PreDecidedBlocks = {
  primary: { category_slug: string; exercise_slugs: string[] }
  secondary: { category_slug: string; exercise_slugs: string[] }
  loadedBodyRegions: string[]
}

type SessionPromptInput = {
  sessionIndex: number
  totalSessions: number
  spec: { day_of_week: number; mode_slug: string }
  duration: { min: number; max: number }
  exercisesString: string
  exerciseSlugs: string
  warmupCooldownExercisesString?: string
  warmupCooldownSlugs?: string
  preDecided?: PreDecidedBlocks
  userContext: string
  planName: string
  planDescription: string
  planContext: PlanContextEntry[]
}

function getBlockStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `\
Jede Session hat genau 5 Blöcke in dieser Reihenfolge:
1. warmup — 4 Übungen (Mobility, Activation, Dynamic Prep; max 1–2 Foam Roll)
2. primary — 1–2 Übungen (Hauptziel, lange Pausen)
3. secondary — 1–2 Übungen (komplementäre Category)
4. accessory — 2–4 Übungen (Core, Stabilität)
5. cooldown — genau 3 Übungen (Mobility, Static Stretch, Recovery)`

    case "reduced":
      return `\
Jede Session hat 5 Blöcke, aber mit reduziertem Volumen:
1. warmup — 3 Übungen (Mobility, Activation; KEINE intensiven Sprint-Drills)
2. primary — 1 Übung (moderate Intensität, keine Max-Lifts)
3. secondary — 1 Übung (komplementär, moderater Reiz)
4. accessory — 2 Übungen (Core, Stability, Injury Prevention)
5. cooldown — 3 Übungen (Mobility, Static Stretch)`

    case "activation":
      return `\
Activation Session: 3 Blöcke, kurze Einheit (20–30 Min):
1. warmup — 2–3 Übungen (Mobility, leichte Activation)
2. accessory — 2–3 Übungen (Core, Stability, leichte Drills — KEINE Sprints, KEINE Plyos, KEINE Lifts)
3. cooldown — 2–3 Übungen (Static Stretch, Mobility)`

    case "recovery":
      return `\
Recovery Session: 2 Blöcke, sehr kurz (15–25 Min):
1. warmup — 2–3 Übungen (sanfte Mobility)
2. cooldown — 3–4 Übungen (Foam Roll, Static Stretch, Breathing)
KEINE Strength, KEINE Power, KEINE Sprints.`

    default:
      return ""
  }
}

const DAY_NAMES: Record<number, string> = {
  1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
  5: "Freitag", 6: "Samstag", 7: "Sonntag",
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  full:       "Full Session (60–90 min) — vollständige Trainingseinheit, alle Blöcke",
  reduced:    "Reduced Session (45–60 min) — reduziertes Volumen, Fokus auf Hauptreize",
  activation: "Activation (20–30 min) — kurze Aktivierung, kein schweres Training",
  recovery:   "Recovery (15–25 min) — Regeneration, Mobility, leichte Auslastung",
}

export const GENERATE_SESSION_PROMPT = (input: SessionPromptInput) => {
  const {
    sessionIndex, totalSessions, spec, duration,
    exercisesString, exerciseSlugs,
    warmupCooldownExercisesString, warmupCooldownSlugs,
    preDecided, userContext,
    planName, planDescription, planContext,
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const previousSessionsText = planContext.length === 0
    ? "Keine — das ist die erste Session."
    : planContext.map((s) =>
        `- ${DAY_NAMES[s.day_of_week]} [${s.mode_slug}] "${s.name}": primary=${s.primary_category}, secondary=${s.secondary_category}, Übungen: ${s.exercise_slugs.join(", ")}`
      ).join("\n")

  const usedSlugs = planContext.flatMap((s) => s.exercise_slugs)

  const preDecidedSection = preDecided ? `
## Bereits festgelegt: Primary & Secondary

primary (category: ${preDecided.primary.category_slug}): ${preDecided.primary.exercise_slugs.join(", ")}
secondary (category: ${preDecided.secondary.category_slug}): ${preDecided.secondary.exercise_slugs.join(", ")}
Belastete Körperregionen: ${preDecided.loadedBodyRegions.join(", ") || "nicht spezifiziert"}

Übernimm diese Übungen EXAKT in die entsprechenden Blöcke. Baue warmup, accessory und cooldown kohärent darauf auf.
` : ""

  const exerciseSection = warmupCooldownExercisesString ? `
## Verfügbare Übungen für primary, secondary, accessory

${exercisesString}

## Verfügbare Übungen für warmup und cooldown (bereits nach Körperregion gefiltert)

${warmupCooldownExercisesString}
` : `
## Verfügbare Übungen

${exercisesString}
`

  const allSlugs = warmupCooldownSlugs
    ? `${exerciseSlugs}\n${warmupCooldownSlugs}`
    : exerciseSlugs

  return `
Du bist ein professioneller Trainer. Generiere Session ${sessionIndex + 1} von ${totalSessions} für diesen Wochenplan.

## Plan
Name: ${planName}
Beschreibung: ${planDescription}

## Nutzerdaten
${userContext}

## Bereits geplante Sessions
${previousSessionsText}
${preDecidedSection}
## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min
${usedSlugs.length > 0 ? `\nBereits verwendete Übungen (NICHT wiederverwenden): ${usedSlugs.join(", ")}` : ""}
${exerciseSection}

## Regeln

### Umgebungs-Regeln

Jede Übung kann ein optionales Feld \`environments: [slug, ...]\` haben.
- Fehlt das Feld → die Übung funktioniert in allen Umgebungen.
- Steht \`environments: [outdoor]\` → **nur** wenn der User \`outdoor\` in \`user_environments\` hat.
- Steht \`environments: [gym]\` → **nur** wenn der User \`gym\` in \`user_environments\` hat.

### Messtyp-Regeln

- \`reps\` → setze \`reps_min\` und \`reps_max\`, \`duration_seconds\` = 0
- \`duration\` → setze \`duration_seconds\`, \`reps_min\` = \`reps_max\` = 0
- \`distance\` → Distanz in \`notes\`, \`reps\` = 0, \`duration\` = 0
- \`reps_or_duration\` → du entscheidest basierend auf Kontext

### Volumen-Regeln (intensity_score)

Jede Übung hat ein optionales Feld \`intensity_score\` (1–10).

- intensity 1–3: 1–2 Sätze
- intensity 4–5: 2–3 Sätze
- intensity 6–7: max. 3–4 Sätze, mind. 90 s Pause
- intensity 8–9: max. 5–6 Sätze, mind. 2 min Pause (nur full)
- intensity 10: max. 3–5 Sätze, mind. 3 min Pause (nur full)

In **reduced**: max. EINE Übung mit intensity ≥ 7 pro Session.

### Blockstruktur

${getBlockStructure(spec.mode_slug)}

### Block-Kohärenz (sehr wichtig)

Jeder Block hat einen klar definierten Charakter. Übungen müssen zum Block-Charakter passen, nicht nur zu den Block-Type-Tags der Übung.

**Pflicht-Schritt vor der Block-Auswahl:**
Bevor du Übungen für warmup und cooldown wählst, leite die belasteten Körperregionen dieser Session ab:
1. Schau dir die \`body_region\`-Werte der primary- und secondary-Übungen an.
2. Notiere diese Regionen intern (z.B. quad, glute, hamstring).
3. warmup und cooldown MÜSSEN ausschließlich Übungen enthalten, die genau diese Regionen ansprechen.

Beispiel: primary = box_jump (body_region: glute) + bulgarian_split_squat (body_region: quad)
→ Cooldown: quad-Stretch, glute-Foam-Roll, hip-Flexor-Stretch ✓
→ NICHT: neck, wrist, shoulder, spinal_rotation — diese Regionen wurden nicht belastet ✗

**warmup** — Zweck: Vorbereitung auf die kommende Session
- Dynamische Mobility, Activation, Movement Prep
- Körperregionen MÜSSEN mit primary/secondary übereinstimmen (siehe Pflicht-Schritt)
- KEINE statischen Stretches länger als 30 Sekunden
- KEINE Übungen mit \`exercise_type = restorative\`
- Bei activation-Modus: max 1–2 Sprint-Technik-Drills (A-Skip, High Knees)
- Bei reduced-Modus: KEINE intensiven Sprint-Drills im warmup

**primary** — Zweck: Hauptreiz der Session
- 1–2 Übungen aus EINER Category
- Die intensitätshöchsten Übungen der Session
- \`focused_category_slug\` MUSS mit Category der Übungen übereinstimmen

**secondary** — Zweck: Komplementärer Reiz
- 1–2 Übungen
- Entweder dieselbe Category wie primary (anderer Bewegungsreiz) ODER komplementäre Category
- Niemals denselben Bewegungsreiz wie primary doppeln
- \`focused_category_slug\` MUSS mit Category der Übungen übereinstimmen

**accessory** — Zweck: Schwächen, Stabilität, Injury Prevention
- 2–3 Übungen
- Fokus auf Core, Stability, Unilateral, Mobility-unter-Last
- \`focused_category_slug\` reflektiert den Hauptreiz (meist strength oder core)
- KEINE reinen Mobility-Übungen (die gehören in warmup/cooldown)

**cooldown** — Zweck: Recovery der belasteten Körperregionen (strikt)
- Genau 3 Übungen
- AUSSCHLIESSLICH Übungen mit \`exercise_type = restorative\` ODER \`intensity_score ≤ 2\`
- Körperregionen MÜSSEN mit primary/secondary übereinstimmen (siehe Pflicht-Schritt)
- NIEMALS Regionen dehnen, die in dieser Session nicht trainiert wurden
- NIEMALS Strength-, Core-Power-, Plyo- oder Activation-Übungen
- Bevorzugt: Foam Roll, Static Stretches, Restorative Mobility
- \`focused_category_slug = mobility\`

### Kategorie-Regeln

Jede Übung hat ein Feld \`blocks: [...]\` — sie darf **nur** in aufgeführten Blöcken verwendet werden.

primary und secondary dürfen **niemals** dieselbe Category haben.

Sport-Pflicht-Categories (\`sport_required_categories\`):
- Relevanz 3 = Kern: Jede Woche ≥1 Session mit dieser Category im primary.
- Relevanz 2 = Wichtig: Alle 2 Wochen einmal.
- Relevanz 1 = Ergänzend: Gelegentlich.

Berücksichtige was in vorherigen Sessions schon trainiert wurde.

### Variation innerhalb der Woche (sehr wichtig)

Bei mehreren Sessions pro Woche müssen sich die Trainingsreize unterscheiden.

**Regel: primary-Category darf sich nicht wiederholen**

Wenn die Woche mehrere full- oder reduced-Sessions hat, muss jede Session eine ANDERE primary-Category haben.

Beispiel für 3 Sessions:
- Session 1 primary: jumps
- Session 2 primary: sprint_acceleration
- Session 3 primary: strength

NICHT erlaubt: Session 1 + 2 beide primary = jumps

Ausnahmen:
- activation und recovery Sessions zählen nicht mit (haben kein primary)
- Bei nur 1 training-Session pro Woche: Regel entfällt

Sportartspezifische Priorisierung: Eine Kern-Category (Relevanz 3) muss mindestens einmal pro Woche primary sein. Die Bereits geplanten Sessions zeigen welche Categories schon vergeben sind — wähle für diese Session eine noch nicht verwendete primary-Category.

### Wochenbelastung

load_profile bestimmt die Intensität:
- \`low\`: Intensivere Sessions möglich.
- \`medium\`: Ausgewogene Belastung.
- \`high\`: Leichtere Sessions, mehr Regeneration.

### Session-Name

Kurz, beschreibend, kein Wochentag im Namen.
Beispiele: "Power & Beinkraft", "Explosivität & Sprungkraft", "Mobility & Recovery"

### Duplikat-Verbot

Jede Übung darf pro Session **maximal einmal** vorkommen.
Übungen aus "Bereits verwendete Übungen" → **niemals** nochmals einsetzen.

### Ausgabe

- Blöcke haben eine fixe Reihenfolge: warmup=0, primary=1, secondary=2, accessory=3, cooldown=4 — setze \`order_index\` entsprechend
- order_index der Übungen innerhalb eines Blocks beginnt bei 0
- Fehlende numerische Werte → 0 (nie null)
- estimated_duration_minutes muss im Bereich ${duration.min}–${duration.max} liegen
- mode_slug muss "${spec.mode_slug}" sein
- day_of_week muss ${spec.day_of_week} sein

Verwende **ausschließlich** Slugs aus dieser Liste:
${allSlugs}
`
}
