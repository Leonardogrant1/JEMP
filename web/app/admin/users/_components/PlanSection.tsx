'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UserActivePlan, PlanStructure } from '@/app/actions/users'

// ─── Constants ────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up:   'Warm-Up',
  main:      'Hauptteil',
  cool_down: 'Cool-Down',
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So',
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function blockTypeLabel(slug: string | null): string {
  if (!slug) return 'Block'
  return BLOCK_TYPE_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatReps(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—'
  if (min === max || max == null) return String(min ?? max)
  if (min == null) return String(max)
  return `${min}–${max}`
}

function formatLoad(value: number | null, type: string | null): string | null {
  if (value == null || type == null) return null
  switch (type) {
    case 'percentage_1rm': return `${value} % 1RM`
    case 'kg':             return `${value} kg`
    case 'rpe':            return `RPE ${value}`
    default:               return `${value} ${type}`
  }
}

// ─── Sub-components ──────────────────────────────────────────

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

// ─── PlanSection ─────────────────────────────────────────────

type ExecutedSession = { id: string; workout_plan_session_id: string | null; status: string }

export function PlanSection({
  plan,
  planStructure,
  userId,
}: {
  plan: UserActivePlan | null
  planStructure: PlanStructure | null
  userId: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!plan) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>
        <p className="text-sm text-gray-500">Kein aktiver Plan vorhanden.</p>
      </div>
    )
  }

  // Build lookup: plan_session_id → executed session stub
  const execByPlanSessionId = new Map<string, ExecutedSession>()
  for (const es of plan.executedSessions) {
    if (es.workout_plan_session_id) {
      execByPlanSessionId.set(es.workout_plan_session_id, es)
    }
  }

  const planSessions = planStructure?.planSessions ?? []

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>

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

      {/* Accordion */}
      {planSessions.length === 0 ? (
        <p className="text-xs text-gray-500">Keine Planstruktur verfügbar.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-900">
          {planSessions.map(session => {
            const execSession = execByPlanSessionId.get(session.id)
            const isOpen = openId === session.id

            return (
              <div key={session.id}>
                {/* Accordion row (closed) */}
                <button
                  onClick={() => setOpenId(isOpen ? null : session.id)}
                  className="w-full flex items-center gap-4 py-3 text-left hover:bg-gray-900/40 transition-colors px-2 rounded"
                >
                  <span className="text-[11px] text-gray-500 w-6 shrink-0">
                    {DAY_LABELS[session.day_of_week] ?? '—'}
                  </span>
                  <span className="text-xs flex-1 font-medium">{session.name}</span>
                  <span className="text-xs text-gray-500 hidden sm:block">
                    {session.session_type ?? '—'}
                  </span>
                  {session.estimated_duration_minutes != null && (
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {session.estimated_duration_minutes} min
                    </span>
                  )}
                  {execSession ? (
                    <StatusBadge status={execSession.status} />
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                  <span className="text-gray-500 text-[10px] ml-1 shrink-0">
                    {isOpen ? '▼' : '▶'}
                  </span>
                </button>

                {/* Accordion row (expanded) */}
                {isOpen && (
                  <div className="pl-10 pr-2 pb-5 flex flex-col gap-5">
                    {session.blocks.length === 0 ? (
                      <p className="text-xs text-gray-500">Keine Blöcke vorhanden.</p>
                    ) : (
                      session.blocks.map(block => (
                        <div key={block.id}>
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-2">
                            {blockTypeLabel(block.block_type_slug)}
                          </p>
                          {block.exercises.length === 0 ? (
                            <p className="text-xs text-gray-500">Keine Übungen.</p>
                          ) : (
                            <table className="w-full">
                              <tbody>
                                {block.exercises.map(ex => {
                                  const repsStr = formatReps(ex.target_reps_min, ex.target_reps_max)
                                  const loadStr = formatLoad(ex.target_load_value, ex.target_load_type)
                                  return (
                                    <tr key={ex.id} className="border-b border-gray-900 last:border-0">
                                      <td className="py-1.5 pr-4 text-xs">{ex.exercise_name}</td>
                                      <td className="py-1.5 pr-4 text-xs text-gray-400">
                                        {ex.target_sets != null
                                          ? `${ex.target_sets} × ${repsStr}`
                                          : '—'}
                                      </td>
                                      <td className="py-1.5 pr-4 text-xs text-gray-400">
                                        {loadStr ?? ''}
                                      </td>
                                      <td className="py-1.5 text-xs text-gray-400">
                                        {ex.target_duration_seconds != null
                                          ? `${ex.target_duration_seconds}s`
                                          : ''}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))
                    )}

                    {execSession?.status === 'completed' && (
                      <div>
                        <Link
                          href={`/admin/users/${userId}/sessions/${execSession.id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Details →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
