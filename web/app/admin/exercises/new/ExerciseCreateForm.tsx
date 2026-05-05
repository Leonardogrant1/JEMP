'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createExercise, type MovementPattern, type BodyRegion } from '../../../actions/exercises'
import { asI18n } from '@/lib/i18n'
import type { Json } from '../../../../../database.types'

type Props = {
  categories: { id: string; slug: string; name_i18n: Json | null }[]
  equipments: { id: string; slug: string; name_i18n: Json | null }[]
  environments: { id: string; slug: string; name_i18n: Json | null }[]
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(s)
}

export function ExerciseCreateForm({ categories, equipments, environments }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [descDe, setDescDe] = useState('')
  const [descEn, setDescEn] = useState('')

  const [movementPattern, setMovementPattern] = useState('')
  const [bodyRegion, setBodyRegion] = useState('')
  const [minLevel, setMinLevel] = useState('')
  const [maxLevel, setMaxLevel] = useState('')
  const [isUnilateral, setIsUnilateral] = useState(false)
  const [measurementType, setMeasurementType] = useState('reps_or_duration')

  const [equipmentIds, setEquipmentIds] = useState<string[]>([])
  const [environmentIds, setEnvironmentIds] = useState<string[]>([])

  const [youtubeUrl, setYoutubeUrl] = useState('')

  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const create = () => {
    if (!name.trim()) { setStatus('Name ist erforderlich'); return }
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Unterstriche erlaubt (z.B. back_squat)')
      return
    }
    setSlugError('')
    setStatus('')
    startTransition(async () => {
      try {
        await createExercise({
          name: name.trim(),
          slug,
          category_id: categoryId || null,
          description_i18n: (descDe || descEn) ? { de: descDe, en: descEn } : undefined,
          movement_pattern: (movementPattern as MovementPattern) || null,
          body_region: (bodyRegion as BodyRegion) || null,
          is_unilateral: isUnilateral,
          measurement_type: measurementType,
          min_level: minLevel ? Number(minLevel) : undefined,
          max_level: maxLevel ? Number(maxLevel) : undefined,
          equipmentIds,
          environmentIds,
          youtube_url: youtubeUrl || null,
        })
        toast.success(`„${name.trim()}" wurde erstellt`)
        router.push('/admin')
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Basics */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Basics</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Back Squat"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugError('') }}
              placeholder="z.B. back_squat"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 font-mono"
            />
            {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {asI18n(cat.name_i18n).de || cat.slug}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Beschreibung */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Beschreibung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Deutsch</label>
            <textarea
              value={descDe}
              onChange={e => setDescDe(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Englisch</label>
            <textarea
              value={descEn}
              onChange={e => setDescEn(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
        </div>
      </section>

      {/* Klassifizierung */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Klassifizierung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Movement Pattern</label>
            <select
              value={movementPattern}
              onChange={e => setMovementPattern(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {['push','pull','legs','core','isometric','plyometric','mobility','cardio','other'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Body Region</label>
            <select
              value={bodyRegion}
              onChange={e => setBodyRegion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {['ankle','calf','knee','quad','hamstring','glute','hip','groin','lower_back','core','obliques','thoracic','upper_back','chest','shoulder','bicep','tricep','forearm','full_body','neck'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isUnilateral}
                onChange={e => setIsUnilateral(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800"
              />
              <span className="text-gray-300">Unilateral <span className="text-gray-500 text-xs">(Sätze pro Seite)</span></span>
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Messtyp</label>
            <select
              value={measurementType}
              onChange={e => setMeasurementType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="reps_or_duration">Flexibel (KI entscheidet)</option>
              <option value="reps">Wiederholungen (reps)</option>
              <option value="duration">Zeit (duration)</option>
              <option value="distance">Distanz (distance)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Min Level (1–100)</label>
              <input
                type="number"
                min={1} max={100}
                value={minLevel}
                onChange={e => setMinLevel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Max Level (1–100)</label>
              <input
                type="number"
                min={1} max={100}
                value={maxLevel}
                onChange={e => setMaxLevel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Equipment</h3>
        <div className="grid grid-cols-2 gap-2">
          {equipments.map(eq => (
            <label key={eq.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={equipmentIds.includes(eq.id)}
                onChange={e => {
                  setEquipmentIds(prev =>
                    e.target.checked ? [...prev, eq.id] : prev.filter(id => id !== eq.id)
                  )
                }}
                className="rounded border-gray-600 bg-gray-800"
              />
              <span className="text-gray-300">{asI18n(eq.name_i18n).de || eq.slug}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Environments */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Environments</h3>
        <div className="flex gap-4">
          {environments.map(env => (
            <label key={env.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={environmentIds.includes(env.id)}
                onChange={e => {
                  setEnvironmentIds(prev =>
                    e.target.checked ? [...prev, env.id] : prev.filter(id => id !== env.id)
                  )
                }}
                className="rounded border-gray-600 bg-gray-800"
              />
              <span className="text-gray-300">{asI18n(env.name_i18n).de || env.slug}</span>
            </label>
          ))}
        </div>
      </section>

      {/* YouTube */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">YouTube URL</h3>
        <input
          type="text"
          value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={create}
          disabled={isPending}
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Erstellen...' : 'Erstellen'}
        </button>
        {status && <p className="text-xs text-red-400">{status}</p>}
      </div>
    </div>
  )
}
