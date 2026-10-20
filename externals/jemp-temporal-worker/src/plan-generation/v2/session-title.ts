// Deterministischer Session-Titel (QA 09.10., Fokus-Rework 10.10.): beschreibt
// den FOKUS der Session — Lead-Region + schweres Bewegungsmuster — statt
// austauschbarer Themen-Kombis („Kraft & Explosivität" traf auf jede Session zu).
// Nie die Sportart, nie die Tag-Nummer.

type TitleBlock = {
  block_type: string
  emphasis?: string
  variant?: string | null
  patterns?: Array<{ pattern: string; emphasis: string }>
}
type TitleDay = { carries_conditioning_finisher?: boolean }

const STRENGTH_BLOCKS = new Set(['push', 'pull', 'lower_body', 'lower_strength', 'upper_strength'])
const LOWER_BLOCKS = new Set(['lower_strength', 'lower_body'])

function patternLabel(pattern: string | null | undefined): string | null {
  if (!pattern) return null
  if (pattern === 'knee_dominant') return 'Kniebeuge'
  if (pattern === 'hinge') return 'Hüftzug'
  if (pattern.startsWith('pull')) return 'Zug'
  if (pattern.startsWith('push')) return 'Drücken'
  return null
}

/** Schweres Muster des Blocks: pattern-emphasis zuerst, Legacy-Variante als Fallback. */
function heavyPatternLabel(block: TitleBlock): string | null {
  const heavy = block.patterns?.find((p) => p.emphasis === 'heavy')
  return patternLabel(heavy?.pattern) ?? patternLabel(block.variant)
}

export function trainingSessionTitle(blocks: TitleBlock[], _day: TitleDay): string {
  // Säulen-Lead (Spec 2026-10-10 §3.1): führt Plyo die Session, führt es den Titel.
  const plyoLead = blocks.find((b) => b.block_type === 'plyo' && b.emphasis === 'heavy')
  if (plyoLead) {
    const region = plyoLead.variant === 'lower' ? 'Unterkörper'
      : plyoLead.variant === 'upper' ? 'Oberkörper' : 'Ganzkörper'
    return `Explosiv-Tag — ${region}`
  }

  const strength = blocks.filter((b) => STRENGTH_BLOCKS.has(b.block_type))
  const heavy = strength.filter((b) => b.emphasis === 'heavy')

  // Doppel-heavy-Tag (§3.3): Lead UND Begleitblock schwer.
  if (heavy.length >= 2) return 'Kraft-Tag — alles schwer'

  if (heavy.length === 1) {
    const lead = heavy[0]
    const region = LOWER_BLOCKS.has(lead.block_type) ? 'Beintag' : 'Oberkörper'
    const muster = heavyPatternLabel(lead)
    return muster ? `${region} — ${muster}` : (region === 'Beintag' ? 'Beintag' : 'Oberkörper-Tag')
  }

  // Kein heavy Lead (z. B. §1.6.1-gedämpfter Tag): Regions-Titel ohne Muster.
  if (strength.length > 0) {
    return LOWER_BLOCKS.has(strength[0].block_type) ? 'Beintag' : 'Oberkörper-Tag'
  }
  return 'Ganzkörper'
}
