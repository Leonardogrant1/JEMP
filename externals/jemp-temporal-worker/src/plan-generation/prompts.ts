
// ── Phase A: Week Planner — picks categories per block + body regions ─────────

type WeekPlanPromptInput = {
  sessions: Array<{ day_of_week: number; mode_slug: string; min: number; max: number }>
  userContext: string
  categorySlugs: string[]
  environmentSlugs: string[]
  dayPresetEnvironments: Array<{ day_of_week: number; environment_slug: string }>
  userFocusCategories: Array<{ category: string; priority: number }>
}

const DAY_NAMES: Record<number, string> = {
  1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
  5: "Freitag", 6: "Samstag", 7: "Sonntag",
}

export const GENERATE_WEEK_PLAN_PROMPT = (input: WeekPlanPromptInput) => {
  const { sessions, userContext, categorySlugs, environmentSlugs, dayPresetEnvironments, userFocusCategories } = input

  const sessionsText = sessions
    .map((s) => `- Tag ${s.day_of_week} (${DAY_NAMES[s.day_of_week]}): mode=${s.mode_slug}, Dauer ${s.min}–${s.max} min`)
    .join("\n")

  const focusSection = userFocusCategories.length > 0
    ? `\n## Focus-Categories (User-Priorisierung)\n` +
      [...userFocusCategories].sort((a, b) => a.priority - b.priority)
        .map((f) => `- \`${f.category}\` (Priorität ${f.priority} = ${f.priority === 1 ? "höchste" : f.priority === 2 ? "mittlere" : "niedrigste"} Priorität)`).join("\n") +
      `\nPriorität 1 = wichtigste Category. Regeln:\n- Vergib primary-Slots bevorzugt an Focus-Categories (Priorität 1 zuerst) — NUR wenn mode_slug primary erlaubt und die no-repeat-Regel nicht verletzt wird\n- Wenn primary schon vergeben ist: Focus-Category als secondary bevorzugen — aber nur wenn es inhaltlich sinnvoll ist (kein Strength als accessory, kein Mobility als primary)\n- Accessory-Slots sind IMMER für Core, Stability oder Mobility reserviert — keine Focus-Categories dort erzwingen\n- Sport-Pflicht-Categories mit hoher Relevanz (≥2) müssen weiterhin regelmäßig als primary erscheinen\n`
    : ""

  return `Du bist ein professioneller Trainer. Plane die Kategorien für den Wochentrainingsplan.
Entscheide für jede Session welche Categories in die Hauptblöcke kommen. Konkrete Übungen werden später gewählt.

## Nutzerdaten
${userContext}

## Sessions diese Woche
${sessionsText}
${focusSection}
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

- **KRITISCH: Jede Session MUSS eine andere \`primary\`-Category haben** — \`strength\` als primary an Tag 1 UND Tag 5 ist ein Fehler. Falsch: Tag1=strength, Tag3=lower_body_plyometrics, Tag5=strength. Richtig: Tag1=strength, Tag3=lower_body_plyometrics, Tag5=upper_body_plyometrics.
- Sport-Pflicht-Categories (höchste Relevanz) müssen mindestens einmal als primary erscheinen
- **Innerhalb einer Session müssen primary, secondary und accessory ALLE unterschiedliche Categories haben** — keine Category darf in derselben Session doppelt vorkommen
- \`accessory\` optional — nur wenn ein klarer Ergänzungsfokus sinnvoll ist (z.B. mobility, core)
- **body_regions müssen Sessions mit ähnlicher Kategoriestruktur voneinander unterscheiden**: Wenn zwei Sessions die gleiche primary-Category hätten (was verboten ist), oder ähnliche secondary-Categories, MÜSSEN die body_regions klar verschieden sein (z.B. Tag 1: upper_body-Fokus, Tag 5: lower_body-Fokus) — niemals \`full_body\` für alle Sessions gleichzeitig

### Wochenbilanz Bewegungsmuster (Pflicht bei Strength)

Die 4 Grundmuster müssen über alle Strength-Blöcke der Woche zusammen abgedeckt sein:

| Muster | Ziel-body_regions |
|--------|-------------------|
| Squat / Knee-dominant | quad |
| Hinge / Hip-dominant | hamstring, glute |
| Push (vertikal oder horizontal) | chest, shoulder, tricep |
| Pull (vertikal oder horizontal) | upper_back, bicep |

**Über alle Sessions mit \`strength\` als primary oder secondary MUSS jedes der 4 Muster mindestens einmal vorkommen.**

Bei 2 Strength-Tagen: teile die Muster auf — ein Tag bekommt Squat + Push-Fokus, der andere Hinge + Pull-Fokus (oder ähnlich). Die \`body_regions\` dokumentieren das und müssen sich zwischen den beiden Tagen klar unterscheiden.

Falsch: Tag1 body_regions=[hamstring, glute, upper_back], Tag5 body_regions=[hamstring, glute, upper_back] — identisch, Squat und Push fehlen komplett.
Richtig: Tag1 body_regions=[quad, chest, shoulder], Tag5 body_regions=[hamstring, glute, upper_back, bicep]

Bei sportartspezifischer Gewichtung (z.B. Boxen): Unterkörper und hintere Kette erhalten mehr Gewicht, aber Push (Druckkraft = Schlagkraft!) und Squat dürfen **nie komplett fehlen**.

\`full_body\` nur verwenden wenn die Session wirklich gleichmäßig alle 4 Muster bedient — nie als Platzhalter für "weiß ich nicht".

### Erlaubte Block-Types pro Category-Typ

**NIEMALS als primary erlaubt** (nur secondary/accessory):
- \`core\` — ist immer Ergänzung, nie Hauptreiz

**Für primary geeignet** (klarer Trainingsreiz):
- Plyometrics, Jumps, Sprints, Strength, Power
- \`mobility\` — wenn die Session explizit auf aktive Beweglichkeitsentwicklung ausgerichtet ist (z.B. Mobility-Fokus-Tag)

## body_regions

Gib für jede Session die Körperregionen an, die durch die Hauptblöcke hauptsächlich belastet werden.
Erlaubte Werte: quad, hamstring, glute, calf, hip, lower_back, core, chest, upper_back, shoulder, tricep, bicep, full_body
Sessions mit \`recovery\` oder keinen Blöcken → \`body_regions: []\`

## Environment pro Session

Wähle für jede Session genau ein Environment aus den verfügbaren: ${environmentSlugs.length > 0 ? environmentSlugs.map((s) => `\`${s}\``).join(", ") : "\`gym\`"}

${dayPresetEnvironments.length > 0
  ? `Vom User bereits festgelegt:\n${dayPresetEnvironments.map((d) => `- Tag ${d.day_of_week} (${DAY_NAMES[d.day_of_week]}): \`${d.environment_slug}\``).join("\n")}\nFür alle anderen Tage: Wähle das am besten passende Environment basierend auf dem Trainingsinhalt.`
  : "Wähle pro Session das am besten passende Environment basierend auf dem Trainingsinhalt (z.B. \`gym\` für Kraft/Heben, \`outdoor\` für Sprints/Plyometrics)."}

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
  availablePatterns?: string[]
}

export type PreviousSessionSummary = {
  day_of_week: number
  mode_slug: string
  blocks: Array<{
    block_type: string
    category_slug: string
    exercises: Array<{ slug: string; sets: number; load_type: string; load_value: number }>
  }>
}

type SessionPromptInput = {
  sessionIndex: number
  totalSessions: number
  spec: { day_of_week: number; mode_slug: string }
  duration: { min: number; max: number }
  blockPools: BlockPool[]
  bodyRegions: string[]
  warmupExercisesString: string
  warmupSlugs: string
  cooldownExercisesString: string
  cooldownSlugs: string
  weekPlanSummary: string
  userContext: string
  planName: string
  planDescription: string
  previousSessions?: PreviousSessionSummary[]
}

function getMainBlockStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `\
- warmup — 4 Übungen (Dynamische Mobility, Activation, Movement Prep)
- primary — 2–3 Übungen (Hauptreiz, höchste Intensität)
- secondary — 2–3 Übungen (komplementäre Category)
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
  full: "Full Session (60–90 min) — vollständige Trainingseinheit",
  reduced: "Reduced Session (45–60 min) — reduziertes Volumen",
  activation: "Activation (20–30 min) — kurze Aktivierung, kein schweres Training",
  recovery: "Recovery (15–25 min) — Regeneration, Mobility",
}

export const GENERATE_MAIN_BLOCKS_PROMPT = (input: Omit<SessionPromptInput, "warmupExercisesString" | "warmupSlugs" | "cooldownExercisesString" | "cooldownSlugs">) => {
  const {
    sessionIndex, totalSessions, spec, duration,
    blockPools, bodyRegions, weekPlanSummary, userContext, planName, planDescription,
    previousSessions = [],
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const mainPoolsSection = blockPools.length > 0
    ? blockPools.map((pool) => {
        const patternSection = pool.availablePatterns && pool.availablePatterns.length > 0
          ? `Bewegungsmuster-PFLICHT: Diese Muster sind im Pool verfügbar und müssen alle abgedeckt werden: **${pool.availablePatterns.join(", ")}**
- squat → back_squat, front_squat, bulgarian_split_squat, lunge-Varianten, pistol_squat
- hinge → romanian_deadlift, hip_thrust, nordic_curl, deadlift-Varianten, good_morning
- push → bench_press, overhead_press, dumbbell_shoulder_press, dips, push_up-Varianten
- pull → pull_up, chin_up, weighted_pull_up, row-Varianten
Wähle mindestens eine Übung pro verfügbarem Muster. Kombiniere NICHT zwei Übungen desselben Musters im selben Block.
`
          : ""
        return `### ${pool.block_type} — Fokus-Category: **${pool.category_slug}**
PFLICHT: Wähle NUR Übungen, deren \`category\` = \`${pool.category_slug}\` ist.
Nur wenn der Pool keine einzige Übung dieser Category enthält, darfst du ausweichen.
${patternSection}NUR diese Slugs sind erlaubt:
${pool.exercisesString}
Erlaubte Slugs: ${pool.slugs}
`
      }).join("\n")
    : "_Keine Hauptblöcke für diesen Modus._"

  const requiredBlockTypes = blockPools.map(p => `\`${p.block_type}\` (${p.category_slug})`).join(", ")

  const allUsedSlugs = previousSessions.flatMap((ps) => ps.blocks.flatMap((b) => b.exercises.map((e) => e.slug)))

  const previousSessionsSection = previousSessions.length > 0
    ? `## Bereits generierte Sessions dieser Woche\n\n` +
      previousSessions.map((ps) => {
        const psDay = DAY_NAMES[ps.day_of_week] ?? `Tag ${ps.day_of_week}`
        const blocksText = ps.blocks.map((b) => {
          const exText = b.exercises.map((e) => {
            const loadStr = e.load_type === "kg" && e.load_value > 0
              ? ` ${e.load_value}kg`
              : e.load_type === "rpe" && e.load_value > 0
              ? ` RPE${e.load_value}`
              : ""
            return `${e.slug}${loadStr} (${e.sets}×)`
          }).join(", ")
          return `- ${b.block_type} (${b.category_slug}): ${exText}`
        }).join("\n")
        return `### ${psDay} [${ps.mode_slug}]\n${blocksText}`
      }).join("\n\n") +
      `\n\n**Bereits verwendete Slugs — NICHT in dieser Session wiederverwenden:** ${allUsedSlugs.join(", ")}\n` +
      `**Lasten:** Falls eine Übung unvermeidlich wiederholt werden muss, setze das Gewicht ≥ der vorherigen Session (kein Deload ohne Begründung).\n`
    : ""

  return `Du bist ein professioneller Trainer. Wähle Übungen für die Hauptblöcke von Session ${sessionIndex + 1} von ${totalSessions}.
Warmup und Cooldown werden separat generiert.

**PFLICHT: Du MUSST genau ${blockPools.length} Block(s) ausgeben: ${requiredBlockTypes}. Kein Block darf fehlen, auch wenn ein Pool klein ist.**

## Plan
${planName} — ${planDescription}

## Nutzerdaten
${userContext}

## Wochenplan-Überblick
${weekPlanSummary}
Wähle Übungen so, dass sich diese Session klar von den anderen Sessions unterscheidet — andere Körperregionen, andere Bewegungsmuster, keine Wiederholung der gleichen Übungen über die Woche.

${previousSessionsSection}

## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min

## Blockstruktur
${getMainBlockStructure(spec.mode_slug).split("\n").filter(l => !l.startsWith("- warmup") && !l.startsWith("- cooldown")).join("\n")}

## Ziel-Körperregionen dieser Session
${bodyRegions.length > 0 ? bodyRegions.join(", ") : "nicht spezifiziert"}
Wähle Übungen aus den Pools bevorzugt so, dass diese Regionen gezielt trainiert werden.
Wenn \`strength\` im primary-Block ist: Stelle sicher, dass die gewählten Übungen die oben genannten Körperregionen abdecken — nicht einseitig nur Unterkörper oder nur Oberkörper, sofern die Ziel-Körperregionen beides enthalten.

## Verfügbare Übungen pro Block
${mainPoolsSection}

## Regeln

**primary** — Hauptreiz, höchste Intensität. focused_category_slug = category des Blocks.
**secondary** — Komplementärer Reiz. focused_category_slug = category des Blocks.
**accessory** — Mobility, Core, Stabilität, Injury Prevention. Wähle Übungen die die Körperregionen dieser spezifischen Session adressieren — nicht dieselben generischen Mobility-Drills wie in anderen Sessions der Woche. Der Übungspool ist bereits auf die Ziel-Körperregionen gefiltert.

### Bewegungsmuster für \`strength\`-Blöcke

Leite aus den Ziel-Körperregionen dieser Session das Bewegungsmuster ab und wähle Übungen entsprechend:

- **quad** → Squat/Knee-dominant: Back Squat, Front Squat, Bulgarian Split Squat, Pistol Squat, Lunge-Varianten
- **hamstring / glute** → Hinge/Hip-dominant: RDL, Hip Thrust, Nordic Curl, Good Morning, Deadlift-Varianten
- **chest / shoulder / tricep** → Push: Bench Press, Overhead Press, Dumbbell Shoulder Press, Dips, Push-up-Varianten
- **upper_back / bicep** → Pull: Pull-up, Chin-up, Row-Varianten

**Kombiniere NIEMALS zwei Übungen desselben Musters in einem Strength-Block** — kein RDL + Hip Thrust im selben Block (beide Hinge), kein Pull-up + Chin-up (beide vertikaler Pull). Ein Block soll 2–3 unterschiedliche Muster kombinieren oder explizit auf eines fokussieren und das dann intensiv abdecken.

### Volumen (intensity_score)
- 1–3: 1–2 Sätze | 4–5: 2–3 Sätze | 6–7: 3–4 Sätze, ≥90s Pause | 8–9: 5–6 Sätze, ≥2min Pause | 10: 3–5 Sätze, ≥3min Pause
- reduced: max. 1 Übung mit intensity ≥ 7

### Messtyp
- reps → reps_min + reps_max, duration_seconds = 0
- duration → duration_seconds, reps = 0
- distance → Distanz in notes, reps = 0, duration = 0
- reps_or_duration → du entscheidest

### Gewicht (target_load_value)
- Bei \`target_load_type = "kg"\`: Gib einen realistischen Startwert für einen trainierten Athleten an. Orientierung: Back Squat → 60–80 kg, RDL → 50–70 kg, Hip Thrust → 60–80 kg, Overhead Press → 40–50 kg, Bench Press → 60–80 kg. Nie unter 20 kg für Mehrgelenksübungen mit Langhantel.
- Lasten sollen über die Woche stabil bleiben oder steigen — nie für dieselbe Übung an Tag 5 weniger als an Tag 1 ansetzen ohne Deload-Begründung.
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
**PFLICHT: Jeder Block MUSS mindestens die in der Blockstruktur angegebene Anzahl Übungen enthalten. Leere "exercises: []" Arrays sind verboten.**

**warmup** — Dynamische Mobility, Activation, Movement Prep. Der Warmup muss den Primary-Block dieser Session vorbereiten:
- Bei Squat/Knee-Fokus (quad) → Hüft-Mob, Ankle-Mob, leichte Squat-Varianten
- Bei Hinge-Fokus (hamstring/glute) → Hüftgelenk-Mob, Hip CARs, Leg Swings
- Bei Push-Fokus (chest/shoulder) → Schulter-Mob, Arm Circles, leichte Push-Drills, Shadow Boxing
- Bei Pull-Fokus (upper_back) → Scapula-Activation, Band Pull-Aparts, leichte Row-Drills
- Bei Sprint/Lower-Body-Plyos → dynamische Beinarbeit, Skipping-Drills, Leg Swings
- Bei Upper-Body-Plyos → Schulter-Primer, Shadow Boxing, leichte Wurfbewegungen
KEINE statischen Stretches > 30s. focused_category_slug = passende Category.
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
