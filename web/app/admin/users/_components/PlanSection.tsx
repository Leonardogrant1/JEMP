import Link from 'next/link'
import type { UserActivePlan, PlanStructure, PlanBlock, PlanExercise } from '@/app/actions/users'

// ─── Constants ────────────────────────────────────────────────

const BLOCK_STYLES: Record<string, { label: string; dot: string; border: string; text: string }> = {
  warm_up:   { label: 'Aufwärmen', dot: 'bg-amber-400', border: 'border-amber-900/40', text: 'text-amber-400' },
  main:      { label: 'Hauptteil', dot: 'bg-blue-400',  border: 'border-blue-900/40',  text: 'text-blue-400'  },
  cool_down: { label: 'Abkühlen', dot: 'bg-teal-400',  border: 'border-teal-900/40',  text: 'text-teal-400'  },
}
const BLOCK_STYLE_FALLBACK = { dot: 'bg-gray-500', border: 'border-gray-700/60', text: 'text-gray-400' }

const MODE_STYLES: Record<string, { label: string; badge: string }> = {
  full:       { label: 'Full',       badge: 'text-blue-400 bg-blue-950/40 border-blue-900/50'     },
  reduced:    { label: 'Reduced',    badge: 'text-amber-400 bg-amber-950/40 border-amber-900/50'  },
  activation: { label: 'Activation', badge: 'text-violet-400 bg-violet-950/40 border-violet-900/50' },
  recovery:   { label: 'Recovery',   badge: 'text-teal-400 bg-teal-950/40 border-teal-900/50'    },
}

const SESSION_TYPE_BADGE: Record<string, string> = {
  training: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  recovery: 'text-teal-400 bg-teal-950/40 border-teal-900/50',
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed:   { label: '✅ Abgeschlossen', className: 'text-green-400' },
  in_progress: { label: '🔄 In Bearbeitung', className: 'text-yellow-400' },
  scheduled:   { label: '⏳ Geplant',        className: 'text-gray-400'  },
  skipped:     { label: '❌ Übersprungen',   className: 'text-red-400'   },
  cancelled:   { label: '❌ Abgebrochen',    className: 'text-red-400'   },
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatReps(ex: PlanExercise): string {
  if (ex.target_duration_seconds != null) return `${ex.target_duration_seconds}s`
  if (ex.target_distance_meters != null)  return `${ex.target_distance_meters}m`
  if (ex.target_reps_min == null && ex.target_reps_max == null) return '—'
  if (ex.target_reps_min === ex.target_reps_max || ex.target_reps_max == null) return `${ex.target_reps_min ?? ex.target_reps_max} Wdh`
  if (ex.target_reps_min == null) return `${ex.target_reps_max} Wdh`
  return `${ex.target_reps_min}–${ex.target_reps_max} Wdh`
}

function formatLoad(ex: PlanExercise): string {
  if (ex.target_load_value == null || ex.target_load_type == null) return ''
  switch (ex.target_load_type) {
    case 'percentage_1rm': return `${ex.target_load_value} % 1RM`
    case 'kg':             return `${ex.target_load_value} kg`
    case 'rpe':            return `RPE ${ex.target_load_value}`
    default:               return `${ex.target_load_value} ${ex.target_load_type}`
  }
}

// ─── Sub-components ──────────────────────────────────────────

function BlockSection({ block }: { block: PlanBlock }) {
  const predefined = BLOCK_STYLES[block.block_type_slug ?? '']
  const style = predefined ?? BLOCK_STYLE_FALLBACK
  const label = predefined?.label ?? (block.block_type_slug?.replace(/_/g, ' ') ?? 'Block')
  return (
    <div className={`rounded-lg border ${style.border} bg-gray-900/60`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/60">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>{label}</span>
        {block.focused_category_slug && (
          <span className="text-[10px] text-gray-600 ml-auto">
            {block.focused_category_slug.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className="px-3">
        {block.exercises.length === 0 ? (
          <p className="text-[11px] text-gray-600 py-2">Keine Übungen.</p>
        ) : (
          block.exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-start gap-2 py-1.5 border-b border-gray-800/60 last:border-0">
              <span className="text-[10px] font-mono text-gray-600 w-4 shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{ex.exercise_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                {ex.target_sets != null && (
                  <span className="text-gray-400">{ex.target_sets}×{formatReps(ex)}</span>
                )}
                {ex.target_rest_seconds != null && ex.target_rest_seconds > 0 && (
                  <span className="text-gray-600">{ex.target_rest_seconds}s Pause</span>
                )}
                <span className="text-gray-600">{formatLoad(ex)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

type ExecutedSession = { id: string; workout_plan_session_id: string | null; status: string }

function SessionCard({
  session,
  execSession,
  userId,
}: {
  session: PlanStructure['planSessions'][number]
  execSession: ExecutedSession | undefined
  userId: string
}) {
  const modeStyle = session.mode_slug ? MODE_STYLES[session.mode_slug] : null
  const typeBadge = SESSION_TYPE_BADGE[session.session_type ?? '']
  const statusCfg = execSession
    ? (STATUS_CONFIG[execSession.status] ?? { label: execSession.status, className: 'text-gray-400' })
    : null

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800/60 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              {DAY_LABELS[session.day_of_week] ?? '—'}
            </span>
            {modeStyle ? (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${modeStyle.badge}`}>
                {modeStyle.label}
              </span>
            ) : session.session_type ? (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${typeBadge ?? 'text-gray-400 bg-gray-900 border-gray-700'}`}>
                {session.session_type}
              </span>
            ) : null}
            {statusCfg && (
              <span className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</span>
            )}
          </div>
          <p className="text-sm font-medium text-white truncate">{session.name}</p>
        </div>
        <div className="shrink-0 text-right flex flex-col items-end gap-1">
          {session.estimated_duration_minutes != null && (
            <p className="text-xs font-mono text-gray-400">{session.estimated_duration_minutes} min</p>
          )}
          {session.pause_between_sets != null && session.pause_between_sets > 0 && (
            <p className="text-[10px] text-gray-600">{session.pause_between_sets}s Satzpause</p>
          )}
          {execSession?.status === 'completed' && (
            <Link
              href={`/admin/users/${userId}/sessions/${execSession.id}`}
              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Details →
            </Link>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {session.blocks.length === 0 ? (
          <p className="text-[11px] text-gray-600">Keine Blöcke vorhanden.</p>
        ) : (
          session.blocks.map(block => (
            <BlockSection key={block.id} block={block} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── PlanSection ─────────────────────────────────────────────

export function PlanSection({
  plan,
  planStructure,
  userId,
}: {
  plan: UserActivePlan | null
  planStructure: PlanStructure | null
  userId: string
}) {
  if (!plan) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>
        <p className="text-sm text-gray-500">Kein aktiver Plan vorhanden.</p>
      </div>
    )
  }

  const execByPlanSessionId = new Map<string, ExecutedSession>()
  for (const es of plan.executedSessions) {
    if (es.workout_plan_session_id) {
      execByPlanSessionId.set(es.workout_plan_session_id, es)
    }
  }

  const planSessions = planStructure?.planSessions ?? []
  const totalExercises = planSessions.flatMap(s => s.blocks.flatMap(b => b.exercises)).length
  const avgDuration = planSessions.length > 0
    ? Math.round(planSessions.reduce((sum, s) => sum + (s.estimated_duration_minutes ?? 0), 0) / planSessions.length)
    : null

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      {/* Plan header */}
      <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-gray-800">
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-1">Trainingsplan</p>
          <h2 className="text-base font-semibold text-white">{plan.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(plan.start_date)} – {formatDate(plan.end_date)} · {plan.duration_weeks} Wochen
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-lg font-mono font-semibold text-white">{planSessions.length}</p>
            <p className="text-[10px] text-gray-600">Sessions</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-semibold text-white">{totalExercises}</p>
            <p className="text-[10px] text-gray-600">Übungen</p>
          </div>
          {avgDuration != null && (
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-white">{avgDuration}</p>
              <p className="text-[10px] text-gray-600">Ø min</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-mono font-semibold text-white">{plan.completedCount}/{plan.totalCount}</p>
            <p className="text-[10px] text-gray-600">Abgeschl.</p>
          </div>
        </div>
      </div>

      {/* Session cards */}
      {planSessions.length === 0 ? (
        <p className="text-xs text-gray-500">Keine Planstruktur verfügbar.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {planSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              execSession={execByPlanSessionId.get(session.id)}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
