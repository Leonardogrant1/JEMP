
// ── Phase A: Week Planner — picks categories per block + body regions ─────────

type WeekPlanPromptInput = {
  sessions: Array<{ day_of_week: number; mode_slug: string; min: number; max: number }>
  userContext: string
  categorySlugs: string[]
  environmentSlugs: string[]
  dayPresetEnvironments: Array<{ day_of_week: number; environment_slug: string }>
  userFocusCategories: Array<{ category: string; priority: number }>
  /** Markdown-Tabelle: primary-/secondary-fähige Übungen pro Category × Environment */
  categoryAvailability: string
  minBlockPool: number
  /** Sport-Pflicht-Regionen ("Athletic Floor") — müssen über die Woche direkt trainiert werden */
  requiredRegions?: string[]
}

const DAY_NAMES: Record<number, string> = {
  1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
  5: "Freitag", 6: "Samstag", 7: "Sonntag",
}

export const GENERATE_WEEK_PLAN_PROMPT = (input: WeekPlanPromptInput) => {
  const { sessions, userContext, categorySlugs, environmentSlugs, dayPresetEnvironments, userFocusCategories, categoryAvailability, minBlockPool, requiredRegions = [] } = input

  // Mobility als Hauptreiz nur, wenn der User sie bewusst priorisiert hat —
  // sonst ist sie Lückenfüller, wenn die no-repeat-Regel die Categories aufbraucht
  const allowMobilityPrimary = userFocusCategories.some((f) => f.category === "mobility" && f.priority <= 2)

  const sessionsText = sessions
    .map((s) => `- Tag ${s.day_of_week} (${DAY_NAMES[s.day_of_week]}): mode=${s.mode_slug}, Dauer ${s.min}–${s.max} min`)
    .join("\n")

  const prio1Category = [...userFocusCategories].sort((a, b) => a.priority - b.priority)[0]?.category
  const armFocus = prio1Category === "strength"
  // Fokus-Quote: primary-Pflicht skaliert mit der Zahl der Hauptblock-Sessions —
  // ohne harte Quote bleibt die Prio-1-Category strukturell bei max. 1 primary
  // (no-repeat + Sport-Pflicht belegen sonst alle Slots)
  const mainSessionCount = sessions.filter((s) => s.mode_slug === "full" || s.mode_slug === "reduced").length
  const primaryQuota = mainSessionCount >= 3 ? 2 : Math.min(1, mainSessionCount)
  const mainQuota = Math.min(2, mainSessionCount)

  const focusSection = userFocusCategories.length > 0
    ? `\n## Focus-Categories (User-Priorisierung)\n` +
      [...userFocusCategories].sort((a, b) => a.priority - b.priority)
        .map((f) => `- \`${f.category}\` (Priorität ${f.priority} = ${f.priority === 1 ? "höchste" : f.priority === 2 ? "mittlere" : "niedrigste"} Priorität)`).join("\n") +
      `\nPriorität 1 = wichtigste Category. Regeln:\n- **FOKUS-QUOTE (PFLICHT): \`${prio1Category}\` (Priorität 1) MUSS in mindestens ${primaryQuota} Session(s) der primary-Block sein${mainQuota > primaryQuota ? ` und in insgesamt mindestens ${mainQuota} Sessions als primary oder secondary vorkommen` : ""} (nur full/reduced-Sessions zählen).** Die dafür nötige primary-Wiederholung von \`${prio1Category}\` ist ausdrücklich erlaubt — dann mit deutlich anderen body_regions (z.B. einmal Unterkörper-, einmal Oberkörper-Schwerpunkt). Die FOKUS-QUOTE geht vor Abwechslung und vor der Sport-Pflicht-Rotation; nur die HARTE Tragfähigkeits-REGEL geht vor — Sessions, in deren Environment die Category nicht tragfähig ist, zählen nicht.\n- Weitere primary-Slots bevorzugt an die übrigen Focus-Categories (nach Priorität) — NUR wenn mode_slug primary erlaubt und die no-repeat-Regel nicht verletzt wird\n- Wenn primary schon vergeben ist: Focus-Category als secondary bevorzugen — aber nur wenn es inhaltlich sinnvoll ist (kein Mobility als primary ohne Fokus)\n- Accessory-Slots sind für Core, Stability oder Mobility reserviert${armFocus ? " — einzige Ausnahme: der ARM-FOKUS-Block (unten)" : ""} — keine anderen Focus-Categories dort erzwingen\n- Sport-Pflicht-Categories mit hoher Relevanz (≥2) müssen weiterhin regelmäßig als primary erscheinen, soweit die FOKUS-QUOTE das zulässt${armFocus ? `\n- **ARM-FOKUS (PFLICHT bei Priorität 1 = strength): Plane in GENAU einer full-Session einen accessory-Block mit category \`strength\` und body_regions [bicep, tricep]** — direktes Armtraining (Curls, Extensions, Dips). Dieser Block darf zusätzlich zu einem strength-Hauptblock in derselben Session stehen (Ausnahme von der Regel "keine Category doppelt pro Session").` : ""}\n`
    : ""

  return `Du bist ein professioneller Trainer. Plane die Kategorien für den Wochentrainingsplan.
Entscheide für jede Session welche Categories in die Hauptblöcke kommen. Konkrete Übungen werden später gewählt.

## Nutzerdaten
${userContext}
Falls \`user_notes\` in den Nutzerdaten stehen: Das sind verbindliche Wünsche des Users — berücksichtige sie bei der Planung.

## Sessions diese Woche
${sessionsText}

**PFLICHT: Plane GENAU eine Session für jeden dieser Tage — day_of_week: ${sessions.map((s) => s.day_of_week).join(", ")}.** Die Termine aus \`weekly_schedule\` (Team-Training, Spiele) sind Belastungs-Kontext für deine Planung, aber KEINE Plan-Tage — dort trainiert der User bereits anderweitig.
${focusSection}
## Erlaubte Blöcke pro mode_slug

| mode_slug  | primary | secondary | accessory       |
|------------|---------|-----------|-----------------|
| full       | ✅      | ✅        | ✅ optional     |
| reduced    | ✅      | ✅        | ✅ optional     |
| activation | ❌      | ❌        | ✅              |
| recovery   | ❌      | ❌        | ❌              |

Sessions mit mode_slug \`recovery\` → \`blocks: []\`.

## Übungsverfügbarkeit (primary-fähig / secondary-fähig pro Environment)

Für diesen User verfügbare Übungen — bereits nach Equipment, Level und Environment gefiltert:

${categoryAvailability}

- **HARTE REGEL (schlägt alle anderen Category-Regeln): Eine Category darf nur \`primary\`/\`secondary\` sein, wenn sie im Environment der Session mindestens ${minBlockPool} entsprechend fähige Übungen hat.** Zellen mit ⚠️ sind als Hauptblock tabu.
- Den Trainingsreiz einer nicht tragfähigen Category über eine tragfähige mit passenden \`body_regions\` abbilden — z.B. Oberkörper-Explosivität über \`strength\` mit Push-Fokus statt \`upper_body_plyometrics\`.
- Gilt auch für die Sport-Pflicht- und Focus-Regeln: eine nicht tragfähige Category wird NICHT eingeplant, egal wie hoch ihre Relevanz oder Priorität ist.

## Category-Regeln

Erlaubte Category-Slugs: ${categorySlugs.map((s) => `\`${s}\``).join(", ")}

- **KRITISCH: Jede Session MUSS eine andere \`primary\`-Category haben** — \`strength\` als primary an Tag 1 UND Tag 5 ist ein Fehler. Falsch: Tag1=strength, Tag3=lower_body_plyometrics, Tag5=strength. Richtig: Tag1=strength, Tag3=lower_body_plyometrics, Tag5=upper_body_plyometrics.
  - Ausnahme 1: Wenn keine weitere als primary geeignete UND tragfähige Category übrig ist, darf eine primary-Category wiederholt werden — dann MÜSSEN sich die \`body_regions\` der beiden Blöcke deutlich unterscheiden (z.B. Tag 1 strength unten, Tag 5 strength oben). Diese Ausnahme geht vor: kein ungeeigneter Lückenfüller als primary.
  - Ausnahme 2: die FOKUS-QUOTE (siehe Focus-Categories) — die Priorität-1-Category darf und muss dafür als primary wiederholt werden, ebenfalls mit deutlich unterschiedlichen \`body_regions\`.
- Sport-Pflicht-Categories (höchste Relevanz) müssen mindestens einmal als primary erscheinen — außer die FOKUS-QUOTE lässt keinen Slot frei
- **Innerhalb einer Session müssen primary, secondary und accessory ALLE unterschiedliche Categories haben** — keine Category darf in derselben Session doppelt vorkommen${armFocus ? " (Ausnahme: der ARM-FOKUS-accessory-Block darf category `strength` haben, auch wenn strength schon Hauptblock der Session ist)" : ""}
- \`accessory\` optional — ABER: **mindestens EINE full-Session der Woche MUSS einen accessory-Block mit \`core\` in den body_regions haben (Rumpf-PFLICHT)**; category dafür: \`mobility\` — Core-Übungen werden dem Pool automatisch beigemischt. Weitere accessory-Blöcke nur bei klarem Ergänzungsfokus.

### Wochenbilanz Bewegungsmuster (Pflicht bei Strength)

Die \`body_regions\` eines \`strength\`-Blocks legen fest, welche Kraftmuster dieser Block trainieren MUSS — sie sind eine Arbeitsanweisung, keine Beschreibung:

| Muster | Ziel-body_regions |
|--------|-------------------|
| Squat / Knee-dominant | quad |
| Hinge / Hip-dominant | hamstring, glute |
| Push (vertikal oder horizontal) | chest, shoulder, tricep |
| Pull (vertikal oder horizontal) | upper_back, bicep |

**Über alle \`strength\`-Blöcke der Woche (primary oder secondary) MUSS jedes der 4 Muster mindestens einmal vorkommen.** Ein full-Block trägt max. 3 Muster, ein reduced-Block 1 Muster.

Bei 2 Strength-Blöcken: teile die Muster auf — ein Block bekommt z.B. Squat + Push (body_regions=[quad, chest, shoulder]), der andere Hinge + Pull (body_regions=[hamstring, glute, upper_back]).

Falsch: beide Strength-Blöcke body_regions=[hamstring, glute, upper_back] — identisch, Squat und Push fehlen komplett.

Bei sportartspezifischer Gewichtung (z.B. Boxen): Unterkörper und hintere Kette erhalten mehr Gewicht, aber Push (Druckkraft = Schlagkraft!) und Squat dürfen **nie komplett fehlen**.

### Erlaubte Block-Types pro Category-Typ

**NIEMALS als primary erlaubt** (nur secondary/accessory):
- \`core\` — ist immer Ergänzung, nie Hauptreiz${allowMobilityPrimary ? "" : "\n- \`mobility\` — dieser User hat Mobility nicht als Fokus priorisiert; lieber eine tragfähige primary-Category mit anderen body_regions wiederholen als Mobility zum Hauptreiz machen"}

**Für primary geeignet** (klarer Trainingsreiz):
- Plyometrics, Jumps, Sprints, Strength, Power${allowMobilityPrimary ? "\n- \`mobility\` — der User hat Mobility hoch priorisiert; als primary erlaubt, wenn die Session explizit auf aktive Beweglichkeitsentwicklung ausgerichtet ist" : ""}

${requiredRegions.length > 0 ? `### Sport-Pflicht-Regionen (Athletic Floor)

Diese Regionen MÜSSEN über die Woche direkt trainiert werden — jede muss in mindestens einem primary/secondary/accessory-Block in den \`body_regions\` stehen: ${requiredRegions.map((r) => `\`${r}\``).join(", ")}
- \`accessory\` ist der natürliche Ort für Ergänzungs-Regionen wie \`groin\` (Adduktoren — bei Richtungswechsel-Sportarten Verletzungsprophylaxe Nr. 1, z.B. Copenhagen Plank) oder \`core\`
- Das ist KEIN Bodybuilding-Anspruch: Regionen außerhalb dieser Liste laufen bewusst über Verbundübungen mit

` : ""}## body_regions (pro Block)

Gib für JEDEN Block die Körperregionen an, die dieser Block trainieren soll. Der Übungspool des Blocks wird auf diese Regionen gefiltert — was hier nicht steht, kann später nicht gewählt werden.
Erlaubte Werte: quad, hamstring, glute, calf, hip, lower_back, core, chest, upper_back, shoulder, tricep, bicep, full_body
- \`strength\`-Blöcke: Regionen = geforderte Kraftmuster (siehe Wochenbilanz oben), 2–3 Muster pro full-Block
- Plyo/Jumps/Sprint-Blöcke: die dominant belasteten Regionen (z.B. quad, calf)
- \`mobility\`/\`core\`-Blöcke (accessory): Regionen, die zu den Hauptblöcken der Session passen
- Blöcke mit gleichmäßiger Ganzkörperlast → \`["full_body"]\` — nie als Platzhalter für "weiß ich nicht"
- Sessions mit ähnlicher Blockstruktur müssen sich über die body_regions klar unterscheiden (z.B. Tag 1 upper-body-lastig, Tag 5 lower-body-lastig)

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
  bodyRegions: string[]
  requiredPatterns?: string[]
  mixedCore?: boolean
  slugIntensities?: Record<string, number>
  patternMaxIntensities?: Record<string, number>
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
  previousPushRegions?: string[]
  strengthFocus?: boolean
  /** Sport-Pflicht-Regionen, die diese Woche noch offen sind */
  requiredRegionsRemaining?: string[]
  isLastSession?: boolean
}

function getMainBlockStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `\
- warmup — 4 Übungen (Dynamische Mobility, Activation, Movement Prep)
- primary — 2–3 Übungen (Hauptreiz — die intensivsten Übungen, die der Pool hergibt)
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
    previousPushRegions = [],
    strengthFocus = false,
    requiredRegionsRemaining = [],
    isLastSession = false,
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const mainPoolsSection = blockPools.length > 0
    ? blockPools.map((pool) => {
        // Floor pro PFLICHT-Muster: die gewählte Übung eines Musters muss nahe
        // am Pool-Maximum dieses Musters liegen (verhindert weiche Slots neben
        // einer einzelnen schweren Übung)
        const patternGap = pool.block_type === "primary" ? 1 : 2
        const patternFloors = spec.mode_slug === "full" && pool.requiredPatterns?.length
          ? pool.requiredPatterns
              .filter((p) => (pool.patternMaxIntensities?.[p] ?? 0) > patternGap)
              .map((p) => `${p}: wähle intensity ≥ ${pool.patternMaxIntensities![p] - patternGap} (Pool-Max ${pool.patternMaxIntensities![p]})`)
          : []
        const patternFloorSection = patternFloors.length > 0
          ? `INTENSITÄTS-FLOOR pro Muster: ${patternFloors.join(" · ")}
Eine leichte Variante neben einer verfügbaren schweren ist ein VERSTOSS (z.B. push_up (4), wenn bench_press (8) im Pool ist).
`
          : ""
        // Push-Varianz über die Woche: nicht jede Session dieselbe Push-Region
        const pushVarianceSection = pool.requiredPatterns?.includes("push") && previousPushRegions.length > 0
          ? `PUSH-VARIANZ: Diese Woche wurden bereits Push-Übungen dieser Regionen trainiert: ${previousPushRegions.join(", ")}. Wähle für das push-Muster BEVORZUGT eine noch nicht abgedeckte Region (chest/shoulder/tricep), sofern der Pool dort eine Übung im INTENSITÄTS-FLOOR bietet.
`
          : ""
        // Chest-Push-Pflicht bei Strength-Fokus: die Brust darf beim Push nicht
        // wochenlang hinter Overhead-Varianten zurückstehen
        const chestPrioritySection = strengthFocus && pool.requiredPatterns?.includes("push") && !previousPushRegions.includes("chest")
          ? `PUSH-PRIORITÄT BRUST (PFLICHT): Der User hat \`strength\` als Priorität 1 und diese Woche wurde noch keine chest-Push-Übung gewählt — wähle für das push-Muster eine \`chest\`-Übung im INTENSITÄTS-FLOOR (z.B. bench_press, dips, weighted_push_up). Overhead-/Schulter-Varianten erst, wenn die Brust abgedeckt ist.
`
          : ""
        const patternSection = pool.requiredPatterns && pool.requiredPatterns.length > 0
          ? `Bewegungsmuster-PFLICHT: Dieser Block MUSS jedes dieser Muster mit mindestens einer Übung abdecken: **${pool.requiredPatterns.join(", ")}**
- squat → back_squat, front_squat, bulgarian_split_squat, lunge-Varianten, pistol_squat
- hinge → romanian_deadlift, hip_thrust, nordic_curl, deadlift-Varianten, good_morning, power_clean, hang_power_clean, dumbbell_clean, dumbbell_snatch, isometric_mid_thigh_pull (Cleans/Snatches: dominant glute)
- push → bench_press, overhead_press, push_press, dumbbell_shoulder_press, dips, push_up-Varianten
- pull → pull_up, chin_up, weighted_pull_up, row-Varianten
Andere Muster haben in diesem Block KEINEN Platz. Ein Muster darf doppelt vorkommen, aber NUR wenn alle PFLICHT-Muster abgedeckt sind UND sich die beiden Übungen klar ergänzen: unterschiedliche Lateralität (bilateral + unilateral, z.B. back_squat + bulgarian_split_squat) ODER deutlich andere Intensität (Differenz ≥ 2: schwerer Hauptlift + leichtere Volumen-Variante). Redundante Paare sind VERBOTEN (kein pull_up + chin_up, kein romanian_deadlift + hip_thrust).
WICHTIG: Für die Muster-PFLICHT zählt die \`body_region\` der Übung — bei \`full_body\`-Übungen die dominante Region, falls im Pool als \`(dominant: …)\` angegeben (z.B. Cleans mit dominant glute → hinge). \`full_body\`-Übungen OHNE dominante Region zählen NICHT als Muster-Abdeckung.
${patternFloorSection}${pushVarianceSection}${chestPrioritySection}`
          : ""
        const regionsLine = pool.bodyRegions.length > 0
          ? `Ziel-Regionen dieses Blocks: ${pool.bodyRegions.join(", ")}\n`
          : ""
        // Pool-relative Intensitäts-PFLICHT: Hauptreize müssen das obere Ende
        // dessen nutzen, was der Pool tatsächlich hergibt (nur volle Sessions)
        const intensityValues = Object.values(pool.slugIntensities ?? {})
        const poolMax = intensityValues.length > 0 ? Math.max(...intensityValues) : 0
        const intensityGap = pool.block_type === "primary" ? 1 : 2
        const intensitySection = spec.mode_slug === "full" && pool.block_type !== "accessory" && poolMax > intensityGap
          ? `INTENSITÄTS-PFLICHT: Dieser Pool reicht bis intensity ${poolMax}. Wähle mindestens eine Übung mit intensity ≥ ${poolMax - intensityGap}. Greife generell zu den intensivsten Übungen, die Muster-PFLICHT und Zeitbudget zulassen — Intensität geht vor Abwechslung, der User will gefordert werden.
`
          : ""
        const categoryRule = pool.mixedCore
          ? `Der Pool enthält \`${pool.category_slug}\`-Übungen UND beigemischte Übungen anderer Categories für die Ziel-Regionen (z.B. Core, Adduktoren) — beide sind erlaubt, mische sinnvoll.`
          : `PFLICHT: Wähle NUR Übungen, deren \`category\` = \`${pool.category_slug}\` ist.
Nur wenn der Pool keine einzige Übung dieser Category enthält, darfst du ausweichen.`
        return `### ${pool.block_type} — Fokus-Category: **${pool.category_slug}**
${categoryRule}
${regionsLine}${intensitySection}${patternSection}NUR diese Slugs sind erlaubt:
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
${spec.mode_slug === "full" ? "**PFLICHT: In full-Sessions müssen primary und secondary jeweils MINDESTENS 2 Übungen enthalten, sofern der Pool 2+ geeignete Übungen bietet — ein Hauptblock mit nur 1 Übung ist ein Verstoß.**" : ""}

## Plan
${planName} — ${planDescription}

## Nutzerdaten
${userContext}

## Wochenplan-Überblick
${weekPlanSummary}
Wähle Übungen so, dass sich diese Session klar von den anderen Sessions unterscheidet — andere Körperregionen, andere Bewegungsmuster, keine Wiederholung der gleichen Übungen über die Woche.
${requiredRegionsRemaining.length > 0 ? `
## Sport-Pflicht-Regionen — diese Woche noch offen
${requiredRegionsRemaining.map((r) => `\`${r}\``).join(", ")} ${isLastSession
    ? "— dies ist die LETZTE Session der Woche: jede dieser Regionen MUSS hier mit mindestens einer Übung trainiert werden, sofern ein Block-Pool eine passende Übung enthält (accessory zählt, z.B. Copenhagen Plank für groin)."
    : "— steht eine dieser Regionen in den Ziel-Regionen eines Blocks dieser Session, MUSS dort mindestens eine Übung dieser Region gewählt werden (ein Muster über eine andere Region abzudecken reicht dann NICHT); was offen bleibt, MUSS die letzte Session der Woche schließen."}
` : ""}

${previousSessionsSection}

## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min

## Blockstruktur
${getMainBlockStructure(spec.mode_slug).split("\n").filter(l => !l.startsWith("- warmup") && !l.startsWith("- cooldown")).join("\n")}

## Ziel-Körperregionen dieser Session
${bodyRegions.length > 0 ? bodyRegions.join(", ") : "nicht spezifiziert"}
Die verbindlichen Ziel-Regionen stehen pro Block bei den Übungspools — sie haben Vorrang vor dieser Gesamtliste.

## Verfügbare Übungen pro Block
${mainPoolsSection}

## Regeln

**primary** — Hauptreiz, höchste Intensität — nutze das obere Ende der Pool-Intensitäten (INTENSITÄTS-PFLICHT beim Block, falls angegeben). focused_category_slug = category des Blocks.
**secondary** — Komplementärer Reiz, ebenfalls fordernd. focused_category_slug = category des Blocks.
**accessory** — Mobility, Core, Stabilität, Injury Prevention — oder gezieltes Arm-/Isolationstraining, wenn der Block-Pool \`strength\`-Übungen mit bicep/tricep-Regionen enthält. Wähle Übungen, die die Ziel-Regionen dieses Blocks adressieren — nicht dieselben generischen Mobility-Drills wie in anderen Sessions der Woche.

**user_notes** (falls in den Nutzerdaten vorhanden) sind verbindliche Übungswünsche des Users — dort ausgeschlossene oder unerwünschte Übungen NICHT wählen, auch wenn sie im Pool stehen.

### Bewegungsmuster für \`strength\`-Blöcke

Die PFLICHT-Muster stehen beim jeweiligen Block. Muster-Zuordnung der Übungen:

- **quad** → Squat/Knee-dominant: Back Squat, Front Squat, Bulgarian Split Squat, Pistol Squat, Lunge-Varianten
- **hamstring / glute** → Hinge/Hip-dominant: RDL, Hip Thrust, Nordic Curl, Good Morning, Deadlift-Varianten, Power Clean, Hang Power Clean, Dumbbell Clean/Snatch, Isometric Mid-Thigh Pull
- **chest / shoulder / tricep** → Push: Bench Press, Overhead Press, Push Press, Dumbbell Shoulder Press, Dips, Push-up-Varianten
- **upper_back / bicep** → Pull: Pull-up, Chin-up, Row-Varianten

**Muster-Dopplung in Strength-Blöcken nur als komplementäres Paar:** Erst alle PFLICHT-Muster abdecken. Danach darf ein Muster ein zweites Mal vorkommen, wenn sich die Übungen klar ergänzen — schwerer bilateraler Hauptlift + unilaterale Variante (Back Squat + Bulgarian Split Squat) oder deutlich leichtere Volumen-Variante (Intensitäts-Differenz ≥ 2). **Redundante Zwillinge sind VERBOTEN** — kein RDL + Hip Thrust (zwei schwere bilaterale Hinges), kein Pull-up + Chin-up.

### Volumen (intensity_score)
- 1–3: 1–2 Sätze | 4–5: 2–3 Sätze | 6–7: 3–4 Sätze, ≥90s Pause | 8–9: 4–6 Sätze, ≥2min Pause | 10: 3–5 Sätze, ≥3min Pause
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
- Name: kurz, beschreibend, kein Wochentag, keine Nummerierung (NICHT "Session 1", "Training 2" o.ä.)
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
- Name: kurz, beschreibend, kein Wochentag, keine Nummerierung (NICHT "Session 1", "Training 2" o.ä.)
`
}
