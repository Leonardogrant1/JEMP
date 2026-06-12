import { getRevenueCatSubscriber } from '@/lib/revenuecat';

const ENTITLEMENT_ID = 'full_access'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-900">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-right">{value ?? <span className="text-gray-600">—</span>}</span>
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function SubscriptionSection({ userId }: { userId: string }) {
  let subscriber
  try {
    subscriber = await getRevenueCatSubscriber(userId)
  } catch {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-3">Abo</h2>
        <p className="text-xs text-red-400">Abo-Daten konnten nicht geladen werden.</p>
      </div>
    )
  }

  if (!subscriber) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-3">Abo</h2>
        <p className="text-xs text-gray-500">Kein RevenueCat-Eintrag für diesen User.</p>
      </div>
    )
  }

  const entitlement = subscriber.entitlements[ENTITLEMENT_ID]
  const isActive = !!entitlement

  const periodLabel: Record<string, string> = {
    normal: 'Standard',
    trial: 'Trial',
    intro: 'Intro-Preis',
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Abo</h2>
      <Field label="Abo aktiv" value={
        isActive
          ? <span className="text-green-400">Ja</span>
          : <span className="text-gray-500">Nein</span>
      } />
      {isActive && (
        <>
          <Field label="Entitlement" value={ENTITLEMENT_ID} />
          <Field label="Typ" value={periodLabel[entitlement.period_type] ?? entitlement.period_type} />
          <Field label="Produkt" value={entitlement.product_identifier} />
          <Field label="Läuft ab" value={formatDate(entitlement.expires_date)} />
          {entitlement.management_url && (
            <Field label="Management-URL" value={
              <a
                href={entitlement.management_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Link öffnen
              </a>
            } />
          )}
        </>
      )}
    </div>
  )
}

export function SubscriptionSkeleton() {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <div className="h-4 w-12 bg-gray-800 rounded animate-pulse mb-5" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}
