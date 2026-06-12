export type RCEntitlement = {
  expires_date: string | null
  period_type: 'normal' | 'trial' | 'intro'
  product_identifier: string
  management_url: string | null
  is_sandbox: boolean
}

export type RCSubscriber = {
  entitlements: Record<string, RCEntitlement>
  management_url: string | null
}

export async function getRevenueCatSubscriber(userId: string): Promise<RCSubscriber | null> {
  const apiKey = process.env.REVENUECAT_SECRET_KEY
  if (!apiKey) throw new Error('REVENUECAT_SECRET_KEY is not configured')

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`RevenueCat API error: ${res.status}`)

  const body = await res.json()
  const sub = body?.subscriber

  return {
    entitlements: sub?.entitlements ?? {},
    management_url: sub?.management_url ?? null,
  }
}
