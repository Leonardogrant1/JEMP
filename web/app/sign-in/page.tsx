'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('code')
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    console.log('verifyOtp result:', { data, error })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('session after verifyOtp:', sessionData)
      window.location.href = '/admin'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      {step === 'email' ? (
        <form
          onSubmit={sendCode}
          className="bg-gray-900 p-8 rounded-lg w-full max-w-sm space-y-4"
        >
          <h1 className="text-xl font-semibold text-white">JEMP Admin</h1>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm focus:outline-none focus:border-gray-500"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-2 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send code'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={verifyCode}
          className="bg-gray-900 p-8 rounded-lg w-full max-w-sm space-y-4"
        >
          <h1 className="text-xl font-semibold text-white">Enter code</h1>
          <p className="text-sm text-gray-400">
            Sent to <span className="text-white">{email}</span>
          </p>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="123456"
            required
            maxLength={8}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm text-center tracking-widest font-mono focus:outline-none focus:border-gray-500"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-2 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setError(''); setCode('') }}
            className="w-full text-xs text-gray-500 hover:text-gray-300"
          >
            ← Back
          </button>
        </form>
      )}
    </div>
  )
}
