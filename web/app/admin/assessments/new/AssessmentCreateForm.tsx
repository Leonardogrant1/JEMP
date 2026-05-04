'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAssessment } from '../../../actions/assessments'
import type { SportCategory } from '../../../actions/sport-categories'
import type { Metric } from '../../../actions/metrics'
import type { Equipment } from '../../../actions/equipment'

type Props = {
  categories: SportCategory[]
  metrics: Metric[]
  equipments: Equipment[]
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)
}

export function AssessmentCreateForm({ categories, metrics, equipments }: Props) {
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameDe, setNameDe] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descDe, setDescDe] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [metricId, setMetricId] = useState('')
  const [minLevel, setMinLevel] = useState('1')
  const [maxLevel, setMaxLevel] = useState('100')
  const [equipmentIds, setEquipmentIds] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const create = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Bindestriche erlaubt')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        const id = await createAssessment({
          slug,
          name,
          name_i18n: { en: nameEn, de: nameDe },
          description_i18n: { en: descEn, de: descDe },
          category_id: categoryId,
          measured_metric_id: metricId,
          min_level: Number(minLevel),
          max_level: Number(maxLevel),
          equipmentIds,
        })
        router.push(`/admin/assessments/${id}`)
      } catch {
        setStatus('Fehler beim Erstellen')
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Basics</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugError('') }}
              placeholder="z.B. back-squat-1rm"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 font-mono"
            />
            {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (intern)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (Deutsch)</label>
            <input
              type="text"
              value={nameDe}
              onChange={e => setNameDe(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (Englisch)</label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

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

      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Klassifizierung</h3>
        <div className="space-y-3">
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
                  {cat.name_i18n?.de ?? cat.slug}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gemessene Metrik</label>
            <select
              value={metricId}
              onChange={e => setMetricId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {metrics.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name_i18n?.de ?? m.slug} ({m.unit})
                </option>
              ))}
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
              <span className="text-gray-300">{eq.name_i18n?.de ?? eq.slug}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={create}
          disabled={isPending}
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Erstellen
        </button>
        {status && <p className="text-xs text-red-400">{status}</p>}
      </div>
    </div>
  )
}
