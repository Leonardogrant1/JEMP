'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Category = { id: string; slug: string; name_i18n: Record<string, string> | null }

export function ExerciseCategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? ''

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) params.set('category', slug)
    else params.delete('category')
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select('')}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
          active === '' ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {categories.map(cat => {
        const label = cat.name_i18n?.de ?? cat.name_i18n?.en ?? cat.slug
        const isActive = active === cat.slug
        return (
          <button
            key={cat.id}
            onClick={() => select(cat.slug)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isActive ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
