'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipment, type Environment } from '../../../actions/equipment'
import { asI18n } from '@/lib/i18n'

type Props = { environments: Environment[] }

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(s)
}

export function EquipmentCreateForm({ environments }: Props) {
  const [nameEn, setNameEn] = useState('')
  const [nameDe, setNameDe] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [environmentIds, setEnvironmentIds] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const create = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Unterstriche erlaubt (z.B. pull_up_bar)')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        const id = await createEquipment({
          slug,
          name_i18n: { en: nameEn, de: nameDe },
          environmentIds,
        })
        router.push(`/admin/equipment/${id}`)
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
              placeholder="z.B. pull-up-bar"
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
              <span className="text-gray-300">{asI18n(env.name_i18n).de || env.slug}</span>
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
