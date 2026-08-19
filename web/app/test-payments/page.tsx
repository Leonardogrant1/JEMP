import { TestPaymentsClient } from './test-payments-client'

export default function TestPaymentsPage() {
  const token = process.env.PADDLE_TOKEN
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-red-400 text-sm">PADDLE_TOKEN is not set in the environment</p>
      </div>
    )
  }

  return (
    <TestPaymentsClient
      token={token}
      environment={token.startsWith('test_') ? 'sandbox' : 'production'}
      monthlyPriceId={process.env.JEMP_MONTHLY_PRICE ?? ''}
      yearlyPriceId={process.env.JEMP_YEARLY_PRICE ?? ''}
    />
  )
}
