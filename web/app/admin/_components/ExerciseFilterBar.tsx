'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type NamedItem = { id: string; slug: string; name_i18n?: Record<string, string> | null }

type Props = {
  categories: NamedItem[]
  equipments: NamedItem[]
  blockTypes: { id: string; slug: string }[]
  bodyRegions: readonly string[]
}

function itemLabel(item: NamedItem) {
  return item.name_i18n?.de ?? item.name_i18n?.en ?? item.slug
}

export function ExerciseFilterBar({ categories, equipments, blockTypes, bodyRegions }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category') ?? ''

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/admin?${params.toString()}`)
  }

  const selectClass =
    'px-3 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setParam('category', '')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeCategory === '' ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setParam('category', cat.slug)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeCategory === cat.slug ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {itemLabel(cat)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={searchParams.get('equipment') ?? ''}
          onChange={e => setParam('equipment', e.target.value)}
          className={selectClass}
        >
          <option value="">Equipment: alle</option>
          {equipments.map(eq => (
            <option key={eq.id} value={eq.slug}>{itemLabel(eq)}</option>
          ))}
        </select>
        <select
          value={searchParams.get('block') ?? ''}
          onChange={e => setParam('block', e.target.value)}
          className={selectClass}
        >
          <option value="">Block Type: alle</option>
          {blockTypes.map(bt => (
            <option key={bt.id} value={bt.slug}>{bt.slug}</option>
          ))}
        </select>
        <select
          value={searchParams.get('region') ?? ''}
          onChange={e => setParam('region', e.target.value)}
          className={selectClass}
        >
          <option value="">Body Region: alle</option>
          {bodyRegions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
