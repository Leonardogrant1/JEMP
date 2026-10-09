// Deterministischer Session-Titel (QA 09.10.): beschreibt NUR den Trainings-
// inhalt — nie die Sportart, nie die Tag-Nummer. Ersetzt den frei vom LLM
// erzeugten Namen, der beides eingeschleust hatte.

type TitleBlock = { block_type: string }
type TitleDay = { carries_conditioning_finisher?: boolean }

const STRENGTH_BLOCKS = new Set(['push', 'pull', 'lower_body'])

export function trainingSessionTitle(blocks: TitleBlock[], day: TitleDay): string {
  const types = new Set(blocks.map((b) => b.block_type))
  const themes: string[] = []
  if ([...types].some((t) => STRENGTH_BLOCKS.has(t))) themes.push('Kraft')
  if (types.has('plyo')) themes.push('Explosivität')
  if (types.has('rotation') || types.has('core')) themes.push('Rumpf')
  if (types.has('conditioning') || day.carries_conditioning_finisher) themes.push('Kondition')

  if (themes.length === 0) return 'Ganzkörper'
  return themes.slice(0, 2).join(' & ')
}
