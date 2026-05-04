'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEquipment, type Equipment, type Environment } from '../../../actions/equipment'

type Props = {
  equipment: Equipment & { environmentIds: string[] }
  environments: Environment[]
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)
}

export function EquipmentEditForm({ equipment: initial, environments }: Props) {
  const [nameEn, setNameEn] = useState(initial.name_i18n?.en ?? '')
  const [nameDe, setNameDe] = useState(initial.name_i18n?.de ?? '')
  const [slug, setSlug] = useState(initial.slug)
  const [slugError, setSlugError] = useState('')
  const [environmentIds, setEnvironmentIds] = useState<string[]>(initial.environmentIds)
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const save = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Bindestriche erlaubt (z.B. pull-up-bar)')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        await updateEquipment(initial.id, {
          slug,
          name_i18n: { en: nameEn, de: nameDe },
          environmentIds,
        })
        setStatus('Saved ✓')
        router.refresh()
      } catch {
        setStatus('Fehler beim Speichern')
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
              <span className="text-gray-300">{env.name_i18n?.de ?? env.slug}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Speichern
        </button>
        {status && <p className="text-xs text-gray-400">{status}</p>}
      </div>
    </div>
  )
}
