import Link from 'next/link'

export default function TestPaymentsSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg space-y-4 text-center">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-semibold text-white">Payment successful</h1>
        <p className="text-sm text-gray-400">
          Paddle redirected here after checkout. Provisioning happens via webhook, not this page.
        </p>
        <Link
          href="/test-payments"
          className="inline-block bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-gray-200"
        >
          Back to test payments
        </Link>
      </div>
    </div>
  )
}
