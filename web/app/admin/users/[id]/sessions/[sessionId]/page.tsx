import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchSessionDetail } from '@/app/actions/users'
import type { SessionDetailBlock, PerformedSet } from '@/app/actions/users'

// ─── Constants ────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up:   'Warm-Up',
  main:      'Hauptteil',
  cool_down: 'Cool-Down',
}

// ─── Helpers ─────────────────────────────────────────────────

function blockTypeLabel(slug: string | null): string {
  if (!slug) return 'Block'
  return BLOCK_TYPE_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '—'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  return `${mins} min`
}

function formatLoadValue(value: number | null, loadType: string | null): string {
  if (value == null) return '—'
  if (loadType === 'percentage_1rm') return `${value} %`
  if (loadType === 'kg') return `${value} kg`
  if (loadType === 'rpe') return `RPE ${value}`
  return String(value)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed:   '✅ Abgeschlossen',
    in_progress: '🔄 In Bearbeitung',
    scheduled:   '⏳ Geplant',
    skipped:     '❌ Übersprungen',
    cancelled:   '❌ Abgebrochen',
  }
  return labels[status] ?? status
}

// ─── Dynamic column detection ─────────────────────────────────

type ColumnKey = 'reps' | 'load' | 'rpe' | 'duration' | 'distance' | 'side'

function detectColumns(sets: PerformedSet[]): Set<ColumnKey> {
  const active = new Set<ColumnKey>()
  for (const s of sets) {
    if (s.performed_reps != null)             active.add('reps')
    if (s.performed_load_value != null)        active.add('load')
    if (s.performed_rpe != null)              active.add('rpe')
    if (s.performed_duration_seconds != null) active.add('duration')
    if (s.performed_distance_meters != null)  active.add('distance')
    if (s.side != null)                        active.add('side')
  }
  return active
}

// ─── Block table ──────────────────────────────────────────────

function BlockTable({ block }: { block: SessionDetailBlock }) {
  const allSets = block.exercises.flatMap(ex => ex.performed_sets)
  const cols = detectColumns(allSets)
  const hasPerformedData = allSets.length > 0

  const thClass = 'pb-2 pr-4 font-medium text-xs text-left text-gray-400'
  const tdClass = 'py-1.5 pr-4 text-xs'

  return (
    <div className="mb-6">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
        {blockTypeLabel(block.block_type_slug)}
      </p>

      {!hasPerformedData ? (
        <p className="text-xs text-gray-500 italic">Keine performed Sets vorhanden.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className={thClass}>Übung</th>
              <th className={thClass}>Set</th>
              {cols.has('side')     && <th className={thClass}>Seite</th>}
              {cols.has('reps')     && <th className={thClass}>Wdh</th>}
              {cols.has('load')     && <th className={thClass}>Last</th>}
              {cols.has('rpe')      && <th className={thClass}>RPE</th>}
              {cols.has('duration') && <th className={thClass}>Dauer</th>}
              {cols.has('distance') && <th className={thClass}>Distanz</th>}
            </tr>
          </thead>
          <tbody>
            {block.exercises.map(ex =>
              ex.performed_sets.length === 0 ? null : ex.performed_sets.map((set, i) => (
                <tr key={`${ex.id}-${set.set_number}-${set.side ?? 'n'}`} className="border-b border-gray-900 last:border-0">
                  <td className={tdClass}>
                    {i === 0 ? ex.exercise_name : ''}
                  </td>
                  <td className={`${tdClass} text-gray-400`}>{set.set_number}</td>
                  {cols.has('side')     && (
                    <td className={`${tdClass} text-gray-400`}>{set.side ?? '—'}</td>
                  )}
                  {cols.has('reps')     && (
                    <td className={`${tdClass} text-gray-300`}>{set.performed_reps ?? '—'}</td>
                  )}
                  {cols.has('load')     && (
                    <td className={`${tdClass} text-gray-300`}>
                      {formatLoadValue(set.performed_load_value, ex.target_load_type)}
                    </td>
                  )}
                  {cols.has('rpe')      && (
                    <td className={`${tdClass} text-gray-300`}>{set.performed_rpe ?? '—'}</td>
                  )}
                  {cols.has('duration') && (
                    <td className={`${tdClass} text-gray-300`}>
                      {set.performed_duration_seconds != null ? `${set.performed_duration_seconds}s` : '—'}
                    </td>
                  )}
                  {cols.has('distance') && (
                    <td className={`${tdClass} text-gray-300`}>
                      {set.performed_distance_meters != null ? `${set.performed_distance_meters} m` : '—'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params

  const session = await fetchSessionDetail(sessionId)
  if (!session) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/users/${id}`}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Zurück
        </Link>
        <h1 className="text-xl font-semibold mt-2">{session.name}</h1>
        <div className="flex flex-wrap gap-4 mt-2">
          <span className="text-xs text-gray-400">{statusLabel(session.status)}</span>
          <span className="text-xs text-gray-500">
            Datum: {formatDate(session.scheduled_at)}
          </span>
          <span className="text-xs text-gray-500">
            Dauer: {formatDuration(session.started_at, session.completed_at)}
          </span>
        </div>
      </div>

      {/* Blocks */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        {session.blocks.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Daten für diese Session.</p>
        ) : (
          session.blocks.map(block => (
            <BlockTable key={block.id} block={block} />
          ))
        )}
      </div>
    </div>
  )
}
