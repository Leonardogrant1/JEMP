'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recalculateUserAssessments } from '@/app/actions/users'

export function RecalculateButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    setState('loading')
    setMessage('')
    try {
      const { updated } = await recalculateUserAssessments(userId)
      setState('done')
      setMessage(`${updated} Score${updated !== 1 ? 's' : ''} aktualisiert`)
      router.refresh()
    } catch (e: any) {
      setState('error')
      setMessage(e?.message ?? 'Fehler beim Neuberechnen')
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="text-xs px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? 'Berechne…' : 'Scores neu berechnen'}
      </button>
    </div>
  )
}
