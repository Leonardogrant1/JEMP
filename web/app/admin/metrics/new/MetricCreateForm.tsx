'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMetric, METRIC_UNITS, type MetricUnit } from '../../../actions/metrics'

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)
}

export function MetricCreateForm() {
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameDe, setNameDe] = useState('')
  const [unit, setUnit] = useState<MetricUnit>('kg')
  const [higherIsBetter, setHigherIsBetter] = useState(true)
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
        const id = await createMetric({
          slug,
          name_i18n: { en: nameEn, de: nameDe },
          unit,
          higher_is_better: higherIsBetter,
        })
        router.push(`/admin/metrics/${id}`)
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
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Eigenschaften</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Einheit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as MetricUnit)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              {METRIC_UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={higherIsBetter}
              onChange={e => setHigherIsBetter(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 w-4 h-4"
            />
            <span className="text-sm text-gray-300">Höher ist besser</span>
          </label>
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
