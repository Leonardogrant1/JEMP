'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const STORAGE_KEY = 'admin-sidebar-collapsed'

type Tab = {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  matchPrefix: string
}

const TABS: Tab[] = [
  {
    id: 'exercises',
    label: 'Exercises',
    href: '/admin',
    matchPrefix: '/admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5M3.75 6h16.5M3.75 18h16.5" />
      </svg>
    ),
  },
  {
    id: 'calculator',
    label: 'Calculator',
    href: '/admin/calculator',
    matchPrefix: '/admin/calculator',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zm0 2.25h.008v.008H12.75v-.008zM6.75 19.5h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
      </svg>
    ),
  },
]

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function isActive(tab: Tab) {
    if (tab.id === 'exercises') {
      return pathname === '/admin' || (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/calculator'))
    }
    return pathname.startsWith(tab.matchPrefix)
  }

  return (
    <aside
      className="shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col transition-all duration-200"
      style={{ width: collapsed ? 64 : 220 }}
    >
      <button
        onClick={toggle}
        className="flex items-center justify-center h-12 border-b border-gray-800 text-gray-400 hover:text-white transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {collapsed
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          }
        </svg>
      </button>

      <nav className="flex flex-col gap-1 p-2">
        {TABS.map(tab => {
          const active = isActive(tab)
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left w-full
                ${active
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              title={collapsed ? tab.label : undefined}
            >
              <span className="shrink-0">{tab.icon}</span>
              {!collapsed && <span className="truncate">{tab.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
