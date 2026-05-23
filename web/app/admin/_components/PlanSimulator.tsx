'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { SimulatorRefData } from '../plan-simulator/actions'
import {
  type Gender,
  type UserData,
  type SportSessionType,
  type WeeklySchedule,
  type CategoryLevel,
  usePlanSimulatorStore
} from '../plan-simulator/store'

type WeeklyScheduleSession = WeeklySchedule['sessions'][number]

const SESSION_TYPE_LABELS: Record<SportSessionType, string> = {
  team_training:       'Team',
  game:                'Spiel',
  individual_training: 'Solo',
  tournament:          'Turnier',
}

// ─── Constants ────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So',
}

const DURATION_OPTIONS: number[] = [30, 45, 60, 90]

type SimStatus = 'idle' | 'running' | 'success' | 'error'

// ─── Helpers ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-2">{children}</p>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function InlineInput({
  value, onChange, type = 'text', min, max, placeholder, width = 'w-24',
}: {
  value: string | number
  onChange: (v: string) => void
  type?: 'text' | 'number'
  min?: number
  max?: number
  placeholder?: string
  width?: string
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${width} bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-gray-600`}
    />
  )
}

// ─── Left panel: user data config ─────────────────────────────

function ConfigPanel({
  userData, updateUserData, refData,
}: {
  userData: UserData
  updateUserData: (patch: Partial<UserData>) => void
  refData: SimulatorRefData
}) {
  function toggleWorkoutDay(day: number) {
    const days = userData.preferred_workout_days.includes(day)
      ? userData.preferred_workout_days.filter(d => d !== day)
      : [...userData.preferred_workout_days, day].sort()
    updateUserData({ preferred_workout_days: days })
  }

  function toggleScheduleSession(day: number) {
    const sessions = userData.weekly_schedule.sessions
    const exists = sessions.find(s => s.day_of_week === day)
    updateUserData({
      weekly_schedule: {
        ...userData.weekly_schedule,
        sessions: exists
          ? sessions.filter(s => s.day_of_week !== day)
          : [...sessions, { day_of_week: day, type: 'team_training', intensity: 5 }],
      },
    })
  }

  function setScheduleSessionField<K extends keyof WeeklyScheduleSession>(
    day: number, field: K, value: WeeklyScheduleSession[K],
  ) {
    updateUserData({
      weekly_schedule: {
        ...userData.weekly_schedule,
        sessions: userData.weekly_schedule.sessions.map(s =>
          s.day_of_week === day ? { ...s, [field]: value } : s,
        ),
      },
    })
  }

  function toggleEnvironment(id: string) {
    const ids = userData.environment_ids.includes(id)
      ? userData.environment_ids.filter(e => e !== id)
      : [...userData.environment_ids, id]
    // Remove equipment that no longer belongs to any selected environment
    const validEquipment = userData.equipment_ids.filter(eqId => {
      const eq = refData.equipments.find(e => e.id === eqId)
      return eq?.environment_ids.some(envId => ids.includes(envId))
    })
    updateUserData({ environment_ids: ids, equipment_ids: validEquipment })
  }

  function toggleEquipment(id: string) {
    const ids = userData.equipment_ids.includes(id)
      ? userData.equipment_ids.filter(e => e !== id)
      : [...userData.equipment_ids, id]
    updateUserData({ equipment_ids: ids })
  }

  function toggleFocusCategory(slug: string) {
    const exists = userData.focus_categories.find(f => f.category_slug === slug)
    if (exists) {
      updateUserData({ focus_categories: userData.focus_categories.filter(f => f.category_slug !== slug) })
    } else {
      const maxPriority = userData.focus_categories.reduce((m, f) => Math.max(m, f.priority), 0)
      updateUserData({ focus_categories: [...userData.focus_categories, { category_slug: slug, priority: maxPriority + 1 }] })
    }
  }

  function setFocusPriority(slug: string, priority: number) {
    updateUserData({
      focus_categories: userData.focus_categories.map(f =>
        f.category_slug === slug ? { ...f, priority } : f,
      ),
    })
  }

  function toggleCategoryLevel(id: string) {
    const exists = userData.category_levels.find(c => c.category_id === id)
    if (exists) {
      updateUserData({ category_levels: userData.category_levels.filter(c => c.category_id !== id) })
    } else {
      updateUserData({ category_levels: [...userData.category_levels, { category_id: id, level_score: 50 }] })
    }
  }

  function setCategoryLevelScore(id: string, level_score: number) {
    updateUserData({
      category_levels: userData.category_levels.map(c =>
        c.category_id === id ? { ...c, level_score } : c,
      ),
    })
  }

  const availableEquipments = refData.equipments.filter(eq =>
    eq.environment_ids.length === 0 ||
    eq.environment_ids.some(envId => userData.environment_ids.includes(envId)),
  )

  return (
    <div className="flex flex-col gap-5 text-sm">

      {/* Profil */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Profil</SectionTitle>
        <Row label="Sport">
          <select
            value={userData.sport}
            onChange={e => updateUserData({ sport: e.target.value })}
            className="w-28 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gray-600"
          >
            {refData.sports.map(s => (
              <option key={s.id} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Geschlecht">
          <select
            value={userData.gender}
            onChange={e => updateUserData({ gender: e.target.value as Gender })}
            className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gray-600"
          >
            <option value="male">Männlich</option>
            <option value="female">Weiblich</option>
          </select>
        </Row>
        <Row label="Alter">
          <InlineInput type="number" value={userData.age} onChange={v => updateUserData({ age: Number(v) })} min={10} max={80} />
        </Row>
        <Row label="Größe">
          <div className="flex items-center gap-1">
            <InlineInput type="number" value={userData.height_cm} onChange={v => updateUserData({ height_cm: Number(v) })} min={140} max={220} />
            <span className="text-xs text-gray-600">cm</span>
          </div>
        </Row>
        <Row label="Gewicht">
          <div className="flex items-center gap-1">
            <InlineInput type="number" value={userData.weight_kg} onChange={v => updateUserData({ weight_kg: Number(v) })} min={40} max={200} />
            <span className="text-xs text-gray-600">kg</span>
          </div>
        </Row>
      </div>

      <div className="border-t border-gray-800" />

      {/* JEMP-Trainingstage */}
      <div className="flex flex-col gap-2">
        <SectionTitle>JEMP-Trainingstage</SectionTitle>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const active = userData.preferred_workout_days.includes(day)
            return (
              <button
                key={day}
                onClick={() => toggleWorkoutDay(day)}
                className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors border
                  ${active
                    ? 'bg-white text-gray-950 border-white'
                    : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
                  }`}
              >
                {DAY_LABELS[day]}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-2">Min. Dauer</p>
        <div className="flex gap-1 mt-0.5">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => updateUserData({ min_session_duration: d })}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border
                ${userData.min_session_duration === d
                  ? 'bg-white text-gray-950 border-white'
                  : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
                }`}
            >
              {d}min
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-500 mt-2">Max. Dauer</p>
        <div className="flex gap-1 mt-0.5">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => updateUserData({ max_session_duration: d })}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border
                ${userData.max_session_duration === d
                  ? 'bg-white text-gray-950 border-white'
                  : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
                }`}
            >
              {d}min
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Sporteinheiten */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Sporteinheiten (extern)</SectionTitle>
        <div className="flex flex-col gap-1.5 mt-1">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const session = userData.weekly_schedule.sessions.find(s => s.day_of_week === day)
            return (
              <div key={day} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleScheduleSession(day)}
                    className={`w-8 shrink-0 py-1 rounded text-[10px] font-medium transition-colors border
                      ${session
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-transparent text-gray-700 border-gray-800 hover:border-gray-600 hover:text-gray-500'
                      }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                  {session ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={session.type}
                        onChange={e => setScheduleSessionField(day, 'type', e.target.value as SportSessionType)}
                        className="bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:outline-none focus:border-gray-600"
                      >
                        {(Object.keys(SESSION_TYPE_LABELS) as SportSessionType[]).map(t => (
                          <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <input
                        type="range"
                        min={1} max={10}
                        value={session.intensity}
                        onChange={e => setScheduleSessionField(day, 'intensity', Number(e.target.value))}
                        className="flex-1 accent-white h-1"
                      />
                      <span className="text-[11px] font-mono text-gray-400 w-4 text-right shrink-0">
                        {session.intensity}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-800">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <textarea
          value={userData.weekly_schedule.notes ?? ''}
          onChange={e => updateUserData({ weekly_schedule: { ...userData.weekly_schedule, notes: e.target.value || null } })}
          rows={2}
          placeholder="Notizen (optional)…"
          className="mt-1 w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-gray-600 resize-none placeholder:text-gray-700"
        />
      </div>

      <div className="border-t border-gray-800" />

      {/* Environments */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Trainingsumgebungen</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {refData.environments.map(env => {
            const active = userData.environment_ids.includes(env.id)
            return (
              <button
                key={env.id}
                onClick={() => toggleEnvironment(env.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border
                  ${active
                    ? 'bg-white text-gray-950 border-white'
                    : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
                  }`}
              >
                {env.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Equipment */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Equipment</SectionTitle>
        {availableEquipments.length === 0 ? (
          <p className="text-[11px] text-gray-700">Erst Umgebung auswählen.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {availableEquipments.map(eq => {
              const active = userData.equipment_ids.includes(eq.id)
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border
                    ${active
                      ? 'bg-white text-gray-950 border-white'
                      : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
                    }`}
                >
                  {eq.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-800" />

      {/* Focus Categories */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Fokus-Kategorien</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {refData.categories.map(cat => {
            const focus = userData.focus_categories.find(f => f.category_slug === cat.slug)
            return (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleFocusCategory(cat.slug)}
                  className={`shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors border
                    ${focus
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-transparent text-gray-700 border-gray-800 hover:border-gray-600 hover:text-gray-500'
                    }`}
                >
                  {cat.name}
                </button>
                {focus && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={1} max={10}
                      value={focus.priority}
                      onChange={e => setFocusPriority(cat.slug, Number(e.target.value))}
                      className="flex-1 accent-white h-1"
                    />
                    <span className="text-[11px] font-mono text-gray-400 w-4 text-right shrink-0">
                      {focus.priority}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Category Levels */}
      <div className="flex flex-col gap-2">
        <SectionTitle>Category Levels</SectionTitle>
        <p className="text-[10px] text-gray-600 -mt-1">Leer = kein Level-Filter (wie bisher). Aktiviere Kategorien um den User-Level zu simulieren.</p>
        <div className="flex flex-col gap-1.5">
          {refData.categories.map(cat => {
            const level = userData.category_levels.find(c => c.category_id === cat.id)
            return (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleCategoryLevel(cat.id)}
                  className={`shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors border
                    ${level
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-transparent text-gray-700 border-gray-800 hover:border-gray-600 hover:text-gray-500'
                    }`}
                >
                  {cat.name}
                </button>
                {level && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={0} max={100}
                      value={level.level_score}
                      onChange={e => setCategoryLevelScore(cat.id, Number(e.target.value))}
                      className="flex-1 accent-white h-1"
                    />
                    <span className="text-[11px] font-mono text-gray-400 w-6 text-right shrink-0">
                      {level.level_score}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ─── Plan types ───────────────────────────────────────────────

type LoadType = 'bodyweight' | 'kg' | 'rpe' | 'pace'
type BlockType = 'warmup' | 'primary' | 'secondary' | 'accessory' | 'cooldown'

type PlanExercise = {
  exercise_slug: string
  order_index: number
  notes: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_duration_seconds: number
  target_distance_meters: number
  target_rest_seconds: number
  target_load_type: LoadType
  target_load_value: number
}

type PlanBlock = {
  block_type: BlockType
  order_index: number
  focused_category_slug: string
  exercises: PlanExercise[]
}

type SessionModeSlug = 'full' | 'reduced' | 'activation' | 'recovery'

type PlanSession = {
  name: string
  mode_slug: SessionModeSlug
  estimated_duration_minutes: number
  day_of_week: number
  order_index: number
  session_type: 'training' | 'recovery'
  description: string
  pause_between_sets: number
  blocks: PlanBlock[]
}

type GeneratedPlan = {
  name: string
  description: string
  sessions: PlanSession[]
}

// ─── Plan view helpers ────────────────────────────────────────

const BLOCK_STYLES: Record<BlockType, { label: string; dot: string; border: string; text: string }> = {
  warmup: { label: 'Aufwärmen', dot: 'bg-amber-400', border: 'border-amber-900/40', text: 'text-amber-400' },
  primary: { label: 'Hauptteil', dot: 'bg-blue-400', border: 'border-blue-900/40', text: 'text-blue-400' },
  secondary: { label: 'Sekundär', dot: 'bg-violet-400', border: 'border-violet-900/40', text: 'text-violet-400' },
  accessory: { label: 'Zusatz', dot: 'bg-gray-500', border: 'border-gray-700/60', text: 'text-gray-400' },
  cooldown: { label: 'Abkühlen', dot: 'bg-teal-400', border: 'border-teal-900/40', text: 'text-teal-400' },
}

function formatLoad(ex: PlanExercise): string {
  if (ex.target_load_type === 'bodyweight') return 'KG'
  if (ex.target_load_type === 'kg') return `${ex.target_load_value} kg`
  if (ex.target_load_type === 'rpe') return `RPE ${ex.target_load_value}`
  if (ex.target_load_type === 'pace') return `${ex.target_load_value} min/km`
  return ''
}

function formatReps(ex: PlanExercise): string {
  if (ex.target_duration_seconds > 0) return `${ex.target_duration_seconds}s`
  if (ex.target_distance_meters > 0) return `${ex.target_distance_meters}m`
  if (ex.target_reps_min === ex.target_reps_max) return `${ex.target_reps_min} Wdh`
  return `${ex.target_reps_min}–${ex.target_reps_max} Wdh`
}

function ExerciseRow({ ex }: { ex: PlanExercise }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-[10px] font-mono text-gray-600 w-4 shrink-0 mt-0.5">{ex.order_index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 truncate">{ex.exercise_slug.replace(/_/g, ' ')}</p>
        {ex.notes && <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{ex.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0 text-[10px] text-gray-500 font-mono">
        <span className="text-gray-400">{ex.target_sets}×{formatReps(ex)}</span>
        {ex.target_rest_seconds > 0 && <span>{ex.target_rest_seconds}s Pause</span>}
        <span className="text-gray-600">{formatLoad(ex)}</span>
      </div>
    </div>
  )
}

function BlockSection({ block }: { block: PlanBlock }) {
  const style = BLOCK_STYLES[block.block_type]
  return (
    <div className={`rounded-lg border ${style.border} bg-gray-900/60`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/60">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</span>
        {block.focused_category_slug && (
          <span className="text-[10px] text-gray-600 ml-auto">{block.focused_category_slug.replace(/_/g, ' ')}</span>
        )}
      </div>
      <div className="px-3">
        {[...block.exercises].sort((a, b) => a.order_index - b.order_index).map((ex, i) => (
          <ExerciseRow key={i} ex={ex} />
        ))}
      </div>
    </div>
  )
}

const MODE_STYLES: Record<SessionModeSlug, { label: string; badge: string }> = {
  full:       { label: 'Full',       badge: 'text-blue-400 bg-blue-950/40 border-blue-900/50' },
  reduced:    { label: 'Reduced',    badge: 'text-amber-400 bg-amber-950/40 border-amber-900/50' },
  activation: { label: 'Activation', badge: 'text-violet-400 bg-violet-950/40 border-violet-900/50' },
  recovery:   { label: 'Recovery',   badge: 'text-teal-400 bg-teal-950/40 border-teal-900/50' },
}

const MODE_DURATION: Record<SessionModeSlug, { min: number; max: number; overrides: boolean }> = {
  full:       { min: 60, max: 90, overrides: false },
  reduced:    { min: 45, max: 60, overrides: false },
  activation: { min: 20, max: 30, overrides: true },
  recovery:   { min: 15, max: 25, overrides: true },
}

function SessionCard({ session, userMinDuration, userMaxDuration }: {
  session: PlanSession
  userMinDuration: number
  userMaxDuration: number
}) {
  const modeStyle = MODE_STYLES[session.mode_slug]
  const modeRange = MODE_DURATION[session.mode_slug]

  // Show deviation hint when mode overrides user preference
  const durationDeviates = modeRange.overrides && (
    session.estimated_duration_minutes < userMinDuration || session.estimated_duration_minutes > userMaxDuration
  )

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 flex flex-col min-w-0">
      {/* Session header */}
      <div className="px-4 py-3 border-b border-gray-800/60 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{DAY_LABELS[session.day_of_week]}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${modeStyle.badge}`}>{modeStyle.label}</span>
          </div>
          <p className="text-sm font-medium text-white truncate">{session.name}</p>
          {session.description && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{session.description}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono text-gray-400">{session.estimated_duration_minutes} min</p>
          {session.pause_between_sets > 0 && (
            <p className="text-[10px] text-gray-600">{session.pause_between_sets}s Satzpause</p>
          )}
          {durationDeviates && (
            <p className="text-[10px] text-violet-400/70 mt-0.5">überschreibt {userMinDuration}–{userMaxDuration} min</p>
          )}
        </div>
      </div>
      {/* Blocks */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {[...session.blocks].sort((a, b) => a.order_index - b.order_index).map((block, i) => (
          <BlockSection key={i} block={block} />
        ))}
      </div>
    </div>
  )
}

const LOAD_PROFILE_STYLES = {
  low:    { label: 'Low Load',    className: 'text-teal-400 bg-teal-950/40 border-teal-900/50' },
  medium: { label: 'Medium Load', className: 'text-amber-400 bg-amber-950/40 border-amber-900/50' },
  high:   { label: 'High Load',   className: 'text-red-400 bg-red-950/40 border-red-900/50' },
}

function PlanView({ plan, loadScore, loadProfile, userMinDuration, userMaxDuration, actions }: {
  plan: GeneratedPlan
  loadScore: number
  loadProfile: 'low' | 'medium' | 'high'
  userMinDuration: number
  userMaxDuration: number
  actions?: React.ReactNode
}) {
  const totalSessions = plan.sessions.length
  const totalExercises = plan.sessions.flatMap(s => s.blocks.flatMap(b => b.exercises)).length
  const avgDuration = Math.round(plan.sessions.reduce((s, sess) => s + sess.estimated_duration_minutes, 0) / totalSessions)
  const loadStyle = LOAD_PROFILE_STYLES[loadProfile]

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Plan header */}
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-1">Generierter Plan</p>
            <h2 className="text-base font-semibold text-white">{plan.name}</h2>
            {plan.description && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{plan.description}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-white">{totalSessions}</p>
              <p className="text-[10px] text-gray-600">Sessions</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-white">{totalExercises}</p>
              <p className="text-[10px] text-gray-600">Übungen</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-white">{avgDuration}</p>
              <p className="text-[10px] text-gray-600">Ø min</p>
            </div>
            <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${loadStyle.className}`}>
              <span className="text-xs font-semibold">{loadStyle.label}</span>
              <span className="text-[10px] opacity-70">{loadScore} Pkt</span>
            </div>
            {actions && <div className="flex items-center gap-1 ml-1 border-l border-gray-800 pl-3">{actions}</div>}
          </div>
        </div>
      </div>

      {/* Sessions grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-2">
          {[...plan.sessions].sort((a, b) => a.order_index - b.order_index).map((session, i) => (
            <SessionCard key={i} session={session} userMinDuration={userMinDuration} userMaxDuration={userMaxDuration} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Right panel: generated plan ──────────────────────────────

function PlanFullscreenDialog({ plan, userMinDuration, userMaxDuration, onClose }: {
  plan: { plan: GeneratedPlan; load_score: number; load_profile: 'low' | 'medium' | 'high' }
  userMinDuration: number
  userMaxDuration: number
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Plan — Vollansicht</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Schließen (Esc)
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <PlanView
            plan={plan.plan}
            loadScore={plan.load_score}
            loadProfile={plan.load_profile}
            userMinDuration={userMinDuration}
            userMaxDuration={userMaxDuration}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function PlanPanel({ status, plan, error, userMinDuration, userMaxDuration }: {
  status: SimStatus
  plan: unknown
  error: string | null
  userMinDuration: number
  userMaxDuration: number
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const openFullscreen = useCallback(() => setFullscreen(true), [])
  const closeFullscreen = useCallback(() => setFullscreen(false), [])

  const copyJson = useCallback(() => {
    if (!plan) return
    navigator.clipboard.writeText(JSON.stringify(plan, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [plan])

  if (status === 'running') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <svg className="w-7 h-7 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm">Plan wird generiert…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-3 p-1">
        <p className="text-sm font-medium text-red-400">Fehler</p>
        <pre className="text-xs text-red-300/70 bg-red-950/20 rounded-lg p-4 overflow-auto whitespace-pre-wrap border border-red-900/30">
          {error}
        </pre>
      </div>
    )
  }

  if (status === 'success' && plan != null) {
    const p = plan as { plan: GeneratedPlan; load_score: number; load_profile: 'low' | 'medium' | 'high' }
    return (
      <div className="flex flex-col h-full min-h-0">
        <PlanView
          plan={p.plan}
          loadScore={p.load_score}
          loadProfile={p.load_profile}
          userMinDuration={userMinDuration}
          userMaxDuration={userMaxDuration}
          actions={
            <>
              <button
                onClick={copyJson}
                title="Als JSON kopieren"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-green-400">Kopiert</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    JSON
                  </>
                )}
              </button>
              <button
                onClick={openFullscreen}
                title="Vollansicht"
                className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>
            </>
          }
        />
        {fullscreen && (
          <PlanFullscreenDialog plan={p} userMinDuration={userMinDuration} userMaxDuration={userMaxDuration} onClose={closeFullscreen} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-700">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
      <p className="text-sm text-center">Userdaten links eingeben<br />und „Generieren" drücken.</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────

export function PlanSimulator({ refData }: { refData: SimulatorRefData }) {
  const { userData, plan, updateUserData, updatePlan, reset } = usePlanSimulatorStore()

  const [status, setStatus] = useState<SimStatus>(() => plan != null ? 'success' : 'idle')

  // Select all environments + equipment by default (deselect is easier than select)
  useEffect(() => {
    if (userData.environment_ids.length === 0 && refData.environments.length > 0) {
      updateUserData({
        environment_ids: refData.environments.map(e => e.id),
        equipment_ids: refData.equipments.map(e => e.id),
      })
    }
  }, [refData])
  const [error, setError] = useState<string | null>(null)

  async function runSimulation() {
    setStatus('running')
    setError(null)
    updatePlan(null)
    try {
      const res = await fetch('/api/admin/simulate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`)
        setStatus('error')
        return
      }
      updatePlan(data)
      setStatus('success')
    } catch (err: any) {
      setError(err?.message ?? 'Unbekannter Fehler')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Plan Simulator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trainingspläne simulieren, debuggen und testen</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              reset()
              updateUserData({
                environment_ids: refData.environments.map(e => e.id),
                equipment_ids: refData.equipments.map(e => e.id),
              })
              setStatus('idle')
              setError(null)
            }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={runSimulation}
            disabled={status === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-950 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'running' ? (
              <>
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generiert…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Generieren
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[2fr_4fr] gap-5 flex-1 min-h-0">

        {/* Left: config */}
        <div className="flex flex-col bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <ConfigPanel userData={userData} updateUserData={updateUserData} refData={refData} />
          </div>
          <details className="border-t border-gray-800 shrink-0">
            <summary className="px-4 py-2 text-[10px] text-gray-700 cursor-pointer hover:text-gray-500 select-none">
              Raw JSON
            </summary>
            <pre className="px-4 pb-3 text-[10px] text-gray-600 overflow-auto max-h-36 whitespace-pre-wrap">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </details>
        </div>

        {/* Right: plan output */}
        <div className="flex flex-col bg-gray-900/40 rounded-xl border border-gray-800 p-5 min-h-0">
          <PlanPanel status={status} plan={plan} error={error} userMinDuration={userData.min_session_duration} userMaxDuration={userData.max_session_duration} />
        </div>
      </div>
    </div>
  )
}
