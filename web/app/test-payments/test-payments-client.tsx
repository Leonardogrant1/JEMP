'use client'

import { initializePaddle, type Environments, type Paddle } from '@paddle/paddle-js'
import { useEffect, useRef, useState } from 'react'

type Frequency = 'month' | 'year'

const YEARLY_TRIAL = '7 days free'

type LogEntry = {
  name: string
  detail: string
  time: string
}

export function TestPaymentsClient({
  token,
  environment,
  monthlyPriceId,
  yearlyPriceId,
}: {
  token: string
  environment: Environments
  monthlyPriceId: string
  yearlyPriceId: string
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [frequency, setFrequency] = useState<Frequency>('year')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)
  const initializedRef = useRef(false)

  const priceId = frequency === 'month' ? monthlyPriceId : yearlyPriceId
  const trial = frequency === 'year' ? YEARLY_TRIAL : null

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    initializePaddle({
      token,
      environment,
      eventCallback: event => {
        if (!event.name) return
        if (event.name === 'checkout.completed') setCompleted(true)
        setLog(prev => [
          {
            name: event.name!,
            detail: event.data?.totals
              ? `${event.data.totals.total} ${event.data.currency_code}`
              : '',
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ])
      },
    })
      .then(p => {
        if (!p) return
        setPaddle(p)
        // One call returns both prices, localized via the visitor's IP.
        return p
          .PricePreview({
            items: [
              { priceId: monthlyPriceId, quantity: 1 },
              { priceId: yearlyPriceId, quantity: 1 },
            ],
          })
          .then(response => {
            setPrices(
              Object.fromEntries(
                response.data.details.lineItems.map(item => [
                  item.price.id,
                  item.formattedTotals.total,
                ]),
              ),
            )
          })
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [token, environment, monthlyPriceId, yearlyPriceId])

  function openCheckout(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCompleted(false)
    paddle?.Checkout.open({
      ...(email && { customer: { email } }),
      items: [{ priceId, quantity: 1 }],
      settings: {
        variant: 'one-page',
        successUrl: `${window.location.origin}/test-payments/success`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">JEMP Premium</h1>
          <span className={`text-xs px-2 py-1 rounded font-mono ${environment === 'sandbox' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
            {environment}
          </span>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex bg-gray-900 rounded-full p-1">
            {(
              [
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ] as const
            ).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFrequency(option.value)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                  frequency === option.value
                    ? 'bg-white text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
                {option.value === 'year' && (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                      frequency === option.value
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-900 text-emerald-300'
                    }`}
                  >
                    Free trial
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={openCheckout} className="bg-gray-900 p-8 rounded-lg space-y-5">
          <div className="text-center space-y-1">
            {trial ? (
              <>
                <p className="text-4xl font-semibold text-emerald-400">{trial}</p>
                <p className="text-sm text-gray-300">
                  then {prices[priceId] ?? '…'}
                  <span className="text-gray-400"> / {frequency}</span>
                </p>
              </>
            ) : (
              <p className="text-4xl font-semibold text-white">
                {prices[priceId] ?? '…'}
                <span className="text-base font-normal text-gray-400">
                  {' '}/ {frequency}
                </span>
              </p>
            )}
            <p className="text-xs text-gray-500">Prices include local currency and tax</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400" htmlFor="email">Customer email (optional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {completed && <p className="text-green-400 text-xs">Checkout completed ✓</p>}
          <button
            type="submit"
            disabled={!paddle}
            className="w-full bg-white text-black py-2 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!paddle ? 'Loading Paddle…' : trial ? 'Start free trial' : 'Subscribe'}
          </button>
        </form>

        {log.length > 0 && (
          <div className="bg-gray-900 p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
            <h2 className="text-xs text-gray-400 uppercase tracking-wide">Events</h2>
            {log.map((entry, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-xs font-mono">
                <span className="text-white">{entry.name}</span>
                <span className="text-gray-400">{entry.detail}</span>
                <span className="text-gray-600 shrink-0">{entry.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
