'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserListRow } from '@/app/actions/users'

const PAGE_SIZE = 25

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function UserTable({
  users,
  total,
  currentPage,
  currentSearch,
}: {
  users: UserListRow[]
  total: number
  currentPage: number
  currentSearch: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(currentSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushParams = useCallback((search: string, page: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router])

  useEffect(() => {
    if (searchValue === currentSearch) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams(searchValue, 1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, currentSearch, pushParams])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder="Name oder E-Mail suchen…"
          className="w-72 bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        <p className="text-sm text-gray-400">{total} User</p>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Name</th>
            <th className="pb-3 pr-6 font-medium">E-Mail</th>
            <th className="pb-3 pr-6 font-medium">Sport</th>
            <th className="pb-3 pr-6 font-medium">Rolle</th>
            <th className="pb-3 pr-6 font-medium">Onboarded</th>
            <th className="pb-3 font-medium">Zuletzt aktiv</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                Keine User gefunden.
              </td>
            </tr>
          )}
          {users.map(user => (
            <tr
              key={user.id}
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors cursor-pointer"
            >
              <td className="py-3 pr-6">
                {user.first_name || user.last_name
                  ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                  : <span className="text-gray-500">—</span>
                }
              </td>
              <td className="py-3 pr-6 text-gray-400">{user.email}</td>
              <td className="py-3 pr-6 text-gray-400">{user.sport ?? '—'}</td>
              <td className="py-3 pr-6">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                  user.role === 'tester' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="py-3 pr-6">
                <span className={user.has_onboarded ? 'text-green-400' : 'text-gray-500'}>
                  {user.has_onboarded ? '✓' : '—'}
                </span>
              </td>
              <td className="py-3 text-gray-400">{formatDate(user.last_active_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => pushParams(currentSearch, currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-xs border border-gray-700 rounded text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Zurück
          </button>
          <span className="text-gray-400">Seite {currentPage} von {totalPages}</span>
          <button
            onClick={() => pushParams(currentSearch, currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-xs border border-gray-700 rounded text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Weiter →
          </button>
        </div>
      )}
    </div>
  )
}
