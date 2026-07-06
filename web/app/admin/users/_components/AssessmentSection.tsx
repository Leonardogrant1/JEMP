import type { UserAssessmentScore } from '@/app/actions/users'
import { RecalculateButton } from './RecalculateButton'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—'
  return `${value} ${unit}`
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-600">—</span>

  const barColor =
    score >= 75 ? 'bg-green-500' :
    score >= 50 ? 'bg-yellow-500' :
    score >= 25 ? 'bg-orange-500' :
    'bg-red-500'

  const textColor =
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-yellow-400' :
    score >= 25 ? 'text-orange-400' :
    'text-red-400'

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium tabular-nums w-7 text-right shrink-0 ${textColor}`}>{score}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export function AssessmentSection({ scores, userId }: { scores: UserAssessmentScore[]; userId: string }) {
  if (scores.length === 0) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Assessment-Ergebnisse</h2>
          <RecalculateButton userId={userId} />
        </div>
        <p className="text-xs text-gray-600">Keine abgeschlossenen Assessments.</p>
      </div>
    )
  }

  const byCategory = new Map<string, { categoryName: string; items: UserAssessmentScore[] }>()
  for (const s of scores) {
    if (!byCategory.has(s.category_slug)) {
      byCategory.set(s.category_slug, { categoryName: s.category_name, items: [] })
    }
    byCategory.get(s.category_slug)!.items.push(s)
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold">Assessment-Ergebnisse</h2>
        <RecalculateButton userId={userId} />
      </div>
      <div className="flex flex-col gap-6">
        {[...byCategory.entries()].map(([categorySlug, { categoryName, items }]) => (
          <div key={categorySlug}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
              {categoryName}
            </p>
            <div className="flex flex-col">
              {items.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr,80px,180px,70px] items-center gap-4 py-1.5 border-b border-gray-900"
                >
                  <span className="text-xs">{item.assessment_name}</span>
                  <span className="text-xs text-gray-500 tabular-nums text-right">{formatValue(item.value, item.metric_unit)}</span>
                  <ScoreBar score={item.score} />
                  <span className="text-[10px] text-gray-600 text-right">{formatDate(item.completed_at)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
