'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCategory, type SportCategory } from '../../../actions/sport-categories'
import { asI18n } from '@/lib/i18n'

type Props = { category: SportCategory }

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(s)
}

export function SportCategoryEditForm({ category: initial }: Props) {
  const [slug, setSlug] = useState(initial.slug)
  const [slugError, setSlugError] = useState('')
  const [nameEn, setNameEn] = useState(asI18n(initial.name_i18n).en)
  const [nameDe, setNameDe] = useState(asI18n(initial.name_i18n).de)
  const [descEn, setDescEn] = useState(asI18n(initial.description_i18n).en)
  const [descDe, setDescDe] = useState(asI18n(initial.description_i18n).de)
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const save = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Unterstriche erlaubt')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        await updateCategory(initial.id, {
          slug,
          name_i18n: { en: nameEn, de: nameDe },
          description_i18n: { en: descEn, de: descDe },
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
