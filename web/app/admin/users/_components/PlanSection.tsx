import type { UserActivePlan } from '@/app/actions/users'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed:   { label: '✅ Abgeschlossen', className: 'text-green-400' },
    in_progress: { label: '🔄 In Bearbeitung', className: 'text-yellow-400' },
    scheduled:   { label: '⏳ Geplant',        className: 'text-gray-400' },
    skipped:     { label: '❌ Übersprungen',   className: 'text-red-400' },
    cancelled:   { label: '❌ Abgebrochen',    className: 'text-red-400' },
  }
  const c = config[status] ?? { label: status, className: 'text-gray-400' }
  return <span className={`text-xs ${c.className}`}>{c.label}</span>
}

export function PlanSection({ plan }: { plan: UserActivePlan | null }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>

      {!plan ? (
        <p className="text-sm text-gray-500">Kein aktiver Plan vorhanden.</p>
      ) : (
        <>
          {/* Plan header */}
          <div className="flex flex-wrap items-start gap-6 mb-5 pb-5 border-b border-gray-800">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Name</p>
              <p className="text-sm font-medium">{plan.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <p className="text-xs text-green-400">{plan.status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Zeitraum</p>
              <p className="text-xs">{formatDate(plan.start_date)} – {formatDate(plan.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Dauer</p>
              <p className="text-xs">{plan.duration_weeks} Wochen</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Fortschritt</p>
              <p className="text-xs">{plan.completedCount} / {plan.totalCount} Sessions</p>
            </div>
          </div>

          {/* Session list */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-3 pr-6 font-medium text-xs">Name</th>
                <th className="pb-3 pr-6 font-medium text-xs">Typ</th>
                <th className="pb-3 pr-6 font-medium text-xs">Geplant am</th>
                <th className="pb-3 font-medium text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.sessions.map(session => (
                <tr key={session.id} className="border-b border-gray-900">
                  <td className="py-2.5 pr-6 text-xs">{session.name}</td>
                  <td className="py-2.5 pr-6 text-xs text-gray-400">{session.session_type ?? '—'}</td>
                  <td className="py-2.5 pr-6 text-xs text-gray-400">{formatDate(session.scheduled_at)}</td>
                  <td className="py-2.5 text-xs"><StatusBadge status={session.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
