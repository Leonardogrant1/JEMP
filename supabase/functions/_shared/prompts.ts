
// ── Phase A: Week Planner — picks categories per block + body regions ─────────

type WeekPlanPromptInput = {
  sessions: Array<{ day_of_week: number; mode_slug: string; min: number; max: number }>
  userContext: string
  categorySlugs: string[]
}

const DAY_NAMES: Record<number, string> = {
  1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
  5: "Freitag", 6: "Samstag", 7: "Sonntag",
}

export const GENERATE_WEEK_PLAN_PROMPT = (input: WeekPlanPromptInput) => {
  const { sessions, userContext, categorySlugs } = input

  const sessionsText = sessions
    .map((s) => `- Tag ${s.day_of_week} (${DAY_NAMES[s.day_of_week]}): mode=${s.mode_slug}, Dauer ${s.min}–${s.max} min`)
    .join("\n")

  return `Du bist ein professioneller Trainer. Plane die Kategorien für den Wochentrainingsplan.
Entscheide für jede Session welche Categories in die Hauptblöcke kommen. Konkrete Übungen werden später gewählt.

## Nutzerdaten
${userContext}

## Sessions diese Woche
${sessionsText}

## Erlaubte Blöcke pro mode_slug

| mode_slug  | primary | secondary | accessory       |
|------------|---------|-----------|-----------------|
| full       | ✅      | ✅        | ✅ optional     |
| reduced    | ✅      | ✅        | ✅ optional     |
| activation | ❌      | ❌        | ✅              |
| recovery   | ❌      | ❌        | ❌              |

Sessions mit mode_slug \`recovery\` → \`blocks: []\`.

## Category-Regeln

Erlaubte Category-Slugs: ${categorySlugs.map((s) => `\`${s}\``).join(", ")}

- \`primary\`-Category darf sich über alle Sessions NICHT wiederholen (jede Session eine andere)
- Sport-Pflicht-Categories (höchste Relevanz) müssen mindestens einmal als primary erscheinen
- \`secondary\` muss eine andere Category als primary derselben Session sein
- \`accessory\` optional — nur wenn ein klarer Ergänzungsfokus sinnvoll ist (z.B. mobility, core)

### Erlaubte Block-Types pro Category-Typ

**NIEMALS als primary erlaubt** (nur secondary/accessory):
- \`core\` — ist immer Ergänzung, nie Hauptreiz

**Für primary geeignet** (klarer Trainingsreiz):
- Plyometrics, Jumps, Sprints, Strength, Power (z.B. \`jumps\`, \`lower_body_plyometrics\`, \`upper_body_plyometrics\`, \`lower_body_strength\`, \`upper_body_strength\`, \`power\`)
- \`mobility\` — wenn die Session explizit auf aktive Beweglichkeitsentwicklung ausgerichtet ist (z.B. Mobility-Fokus-Tag)

## body_regions

Gib für jede Session die Körperregionen an, die durch die Hauptblöcke hauptsächlich belastet werden.
Erlaubte Werte: quad, hamstring, glute, calf, hip, lower_back, core, chest, upper_back, shoulder, tricep, bicep, full_body
Sessions mit \`recovery\` oder keinen Blöcken → \`body_regions: []\`

## name & description

- Name: Kurz, prägnant, auf Sportart und Fokus abgestimmt, max. 5 Wörter, kein Wochentag
- Beschreibung: 1–2 Sätze zum Trainingsschwerpunkt der Woche
`
}

// ── Phase C: Session Assembly — all blocks in one call ────────────────────────

type BlockPool = {
  block_type: "primary" | "secondary" | "accessory"
  category_slug: string
  exercisesString: string
  slugs: string
}

type SessionPromptInput = {
  sessionIndex: number
  totalSessions: number
  spec: { day_of_week: number; mode_slug: string }
  duration: { min: number; max: number }
  blockPools: BlockPool[]
  warmupExercisesString: string
  warmupSlugs: string
  cooldownExercisesString: string
  cooldownSlugs: string
  weekPlanSummary: string
  userContext: string
  planName: string
  planDescription: string
}

function getMainBlockStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `\
- warmup — 4 Übungen (Dynamische Mobility, Activation, Movement Prep)
- primary — 1–2 Übungen (Hauptreiz, höchste Intensität)
- secondary — 1–2 Übungen (komplementäre Category)
- accessory — 2–4 Übungen (Core, Stabilität)
- cooldown — 3 Übungen (Foam Roll, Static Stretch, Breathing)`

    case "reduced":
      return `\
- warmup — 3 Übungen (Mobility, Activation; KEINE intensiven Sprint-Drills)
- primary — 1 Übung (moderate Intensität, keine Max-Lifts)
- secondary — 1 Übung (komplementär, moderater Reiz)
- accessory — 2 Übungen (Core, Stability, Injury Prevention)
- cooldown — 3 Übungen (Mobility, Static Stretch)`

    case "activation":
      return `\
- warmup — 2–3 Übungen (Mobility, leichte Activation)
- accessory — 2–3 Übungen (Core, Stability, leichte Drills — KEINE Sprints, KEINE Plyos, KEINE Lifts)
- cooldown — 2–3 Übungen (Static Stretch, Mobility)`

    case "recovery":
      return `\
- warmup — 2–3 Übungen (sanfte Mobility)
- cooldown — 3–4 Übungen (Foam Roll, Static Stretch, Breathing)`

    default:
      return ""
  }
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  full:       "Full Session (60–90 min) — vollständige Trainingseinheit",
  reduced:    "Reduced Session (45–60 min) — reduziertes Volumen",
  activation: "Activation (20–30 min) — kurze Aktivierung, kein schweres Training",
  recovery:   "Recovery (15–25 min) — Regeneration, Mobility",
}

export const GENERATE_MAIN_BLOCKS_PROMPT = (input: Omit<SessionPromptInput, "warmupExercisesString" | "warmupSlugs" | "cooldownExercisesString" | "cooldownSlugs">) => {
  const {
    sessionIndex, totalSessions, spec, duration,
    blockPools, weekPlanSummary, userContext, planName, planDescription,
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const mainPoolsSection = blockPools.length > 0
    ? blockPools.map((pool) => `### ${pool.block_type} — Fokus-Category: **${pool.category_slug}**
PFLICHT: Wähle NUR Übungen, deren \`category\` = \`${pool.category_slug}\` ist.
Nur wenn der Pool keine einzige Übung dieser Category enthält, darfst du ausweichen.
NUR diese Slugs sind erlaubt:
${pool.exercisesString}
Erlaubte Slugs: ${pool.slugs}
`).join("\n")
    : "_Keine Hauptblöcke für diesen Modus._"

  return `Du bist ein professioneller Trainer. Wähle Übungen für die Hauptblöcke von Session ${sessionIndex + 1} von ${totalSessions}.
Warmup und Cooldown werden separat generiert.

## Plan
${planName} — ${planDescription}

## Nutzerdaten
${userContext}

## Wochenplan-Überblick
${weekPlanSummary}

## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min

## Blockstruktur
${getMainBlockStructure(spec.mode_slug).split("\n").filter(l => !l.startsWith("- warmup") && !l.startsWith("- cooldown")).join("\n")}

## Verfügbare Übungen pro Block
${mainPoolsSection}

## Regeln

**primary** — Hauptreiz, höchste Intensität. focused_category_slug = category des Blocks.
**secondary** — Komplementärer Reiz. focused_category_slug = category des Blocks.
**accessory** — Core, Stabilität, Injury Prevention.

### Volumen (intensity_score)
- 1–3: 1–2 Sätze | 4–5: 2–3 Sätze | 6–7: 3–4 Sätze, ≥90s Pause | 8–9: 5–6 Sätze, ≥2min Pause | 10: 3–5 Sätze, ≥3min Pause
- reduced: max. 1 Übung mit intensity ≥ 7

### Messtyp
- reps → reps_min + reps_max, duration_seconds = 0
- duration → duration_seconds, reps = 0
- distance → Distanz in notes, reps = 0, duration = 0
- reps_or_duration → du entscheidest

### Gewicht (target_load_value)
- Bei \`target_load_type = "kg"\`: Gib IMMER einen sinnvollen Startwert in kg an (nie 0). Orientiere dich an einem Athleten mittlerer Fitness. Beispiel: RDL → 40, Thruster → 15, Med Ball → 4.
- Bei \`target_load_type = "bodyweight"\` oder \`"rpe"\`: target_load_value = 0

### Ausgabe
- order_index: primary=0, secondary=1, accessory=2
- Übungen innerhalb eines Blocks: order_index ab 0
- Fehlende numerische Werte → 0
- estimated_duration_minutes: ${duration.min}–${duration.max}
- mode_slug: "${spec.mode_slug}", day_of_week: ${spec.day_of_week}
- session_type: "${spec.mode_slug === "recovery" ? "recovery" : "training"}"
- Name: kurz, beschreibend, kein Wochentag
`
}

function getWarmupCooldownStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `- warmup — 4 Übungen (Dynamische Mobility, Activation, Movement Prep)\n- cooldown — 3 Übungen (Foam Roll, Static Stretch, Breathing)`
    case "reduced":
      return `- warmup — 3 Übungen (Mobility, Activation; KEINE intensiven Sprint-Drills)\n- cooldown — 3 Übungen (Mobility, Static Stretch)`
    case "activation":
      return `- warmup — 2–3 Übungen (Mobility, leichte Activation)\n- cooldown — 2–3 Übungen (Static Stretch, Mobility)`
    case "recovery":
      return `- warmup — 2–3 Übungen (sanfte Mobility)\n- cooldown — 3–4 Übungen (Foam Roll, Static Stretch, Breathing)`
    default:
      return ""
  }
}

type WarmupCooldownPromptInput = {
  spec: { day_of_week: number; mode_slug: string }
  sessionName: string
  mainBlocksSummary: string
  mainBlocksSlugs: string[]
  bodyRegions: string[]
  warmupExercisesString: string
  warmupSlugs: string
  warmupCategorySlugs: string[]
  cooldownExercisesString: string
  cooldownSlugs: string
  cooldownCategorySlugs: string[]
}

export const GENERATE_WARMUP_COOLDOWN_PROMPT = (input: WarmupCooldownPromptInput) => {
  const { spec, sessionName, mainBlocksSummary, mainBlocksSlugs, bodyRegions, warmupExercisesString, warmupSlugs, warmupCategorySlugs, cooldownExercisesString, cooldownSlugs, cooldownCategorySlugs } = input
  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`

  return `Du bist ein professioneller Trainer. Generiere warmup und cooldown für eine ${spec.mode_slug}-Session.

## Session
Tag: ${dayName}, Modus: ${spec.mode_slug}, Name: "${sessionName}"

## Hauptblöcke dieser Session
${mainBlocksSummary}
Belastete Körperregionen: ${bodyRegions.join(", ") || "nicht spezifiziert"}

## Blockstruktur
${getWarmupCooldownStructure(spec.mode_slug)}

## Regeln
**warmup** — Dynamische Mobility, Activation, Movement Prep. Körperregionen auf Hauptblöcke abstimmen.
- KEINE statischen Stretches > 30s. focused_category_slug = passende Category.
- KEINE Übungen aus den Hauptblöcken verwenden: ${mainBlocksSlugs.length > 0 ? mainBlocksSlugs.join(", ") : "—"}

**cooldown** — Recovery der belasteten Körperregionen.
- NIEMALS Strength-, Plyo- oder Activation-Übungen. focused_category_slug = "mobility".
- KEINE Übungen aus den Hauptblöcken verwenden: ${mainBlocksSlugs.length > 0 ? mainBlocksSlugs.join(", ") : "—"}

### Messtyp
- reps → reps_min + reps_max, duration_seconds = 0
- duration → duration_seconds, reps = 0
- reps_or_duration → du entscheidest

### Ausgabe
- warmup order_index = 0, cooldown order_index = 1
- Übungen: order_index ab 0, fehlende numerische Werte → 0

## Verfügbare Übungen für warmup
${warmupExercisesString}
Erlaubte warmup-Slugs: ${warmupSlugs}
Erlaubte focused_category_slug für warmup: ${warmupCategorySlugs.join(", ")}

## Verfügbare Übungen für cooldown
${cooldownExercisesString}
Erlaubte cooldown-Slugs: ${cooldownSlugs}
Erlaubte focused_category_slug für cooldown: ${cooldownCategorySlugs.join(", ")}

WICHTIG: warmup-Slugs NICHT im cooldown verwenden und umgekehrt.
WICHTIG: focused_category_slug NUR aus den erlaubten Listen wählen — keine anderen Werte erfinden.
`
}

export const GENERATE_SESSION_PROMPT = (input: SessionPromptInput) => {
  const {
    sessionIndex, totalSessions, spec, duration,
    blockPools, warmupExercisesString, warmupSlugs, cooldownExercisesString, cooldownSlugs,
    weekPlanSummary, userContext, planName, planDescription,
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const mainPoolsSection = blockPools.length > 0
    ? blockPools.map((pool) => `### ${pool.block_type} — Fokus-Category: **${pool.category_slug}**
Die Übungen sind nach Block-Typ gefiltert. Wähle bevorzugt Übungen der Fokus-Category.
NUR diese Slugs sind erlaubt:
${pool.exercisesString}
Erlaubte Slugs: ${pool.slugs}
`).join("\n")
    : "_Keine Hauptblöcke für diesen Modus._"

  return `Du bist ein professioneller Trainer. Erstelle die komplette Session ${sessionIndex + 1} von ${totalSessions} (inkl. Warm-up und Cooldown).

## Plan
${planName} — ${planDescription}

## Nutzerdaten
${userContext}

## Wochenplan-Überblick
${weekPlanSummary}

## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min

## Blockstruktur

${getMainBlockStructure(spec.mode_slug)}

## Verfügbare Übungen — Hauptblöcke

${mainPoolsSection}

## Verfügbare Übungen — Warmup (exercise_blocks → warmup)
${warmupExercisesString}
Erlaubte warmup-Slugs: ${warmupSlugs}

## Verfügbare Übungen — Cooldown (exercise_blocks → cooldown)
${cooldownExercisesString}
Erlaubte cooldown-Slugs: ${cooldownSlugs}

WICHTIG: warmup-Slugs NICHT im cooldown verwenden und umgekehrt.

## Regeln

**warmup** — Dynamische Mobility, Activation, Movement Prep. Körperregionen auf Hauptblöcke abstimmen.
- KEINE statischen Stretches > 30s. focused_category_slug = passende Category.

**primary** — Hauptreiz, höchste Intensität. focused_category_slug = category des Blocks.
**secondary** — Komplementärer Reiz. focused_category_slug = category des Blocks.
**accessory** — Core, Stabilität, Injury Prevention.

**cooldown** — Recovery der belasteten Körperregionen.
- NIEMALS Strength-, Plyo- oder Activation-Übungen. focused_category_slug = "mobility".

### Volumen (intensity_score)
- 1–3: 1–2 Sätze | 4–5: 2–3 Sätze | 6–7: 3–4 Sätze, ≥90s Pause | 8–9: 5–6 Sätze, ≥2min Pause | 10: 3–5 Sätze, ≥3min Pause
- reduced: max. 1 Übung mit intensity ≥ 7

### Messtyp
- reps → reps_min + reps_max, duration_seconds = 0
- duration → duration_seconds, reps = 0
- distance → Distanz in notes, reps = 0, duration = 0
- reps_or_duration → du entscheidest

### Ausgabe
- order_index: warmup=0, primary=1, secondary=2, accessory=3, cooldown=4
- Übungen innerhalb eines Blocks: order_index ab 0
- Fehlende numerische Werte → 0
- estimated_duration_minutes: ${duration.min}–${duration.max}
- mode_slug: "${spec.mode_slug}", day_of_week: ${spec.day_of_week}
- session_type: "${spec.mode_slug === "recovery" ? "recovery" : "training"}"
- Name: kurz, beschreibend, kein Wochentag
`
}
