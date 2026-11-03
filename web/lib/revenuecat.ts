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

const RC_BASE = 'https://api.revenuecat.com/v2'

type RCv2ActiveEntitlement = { entitlement_id: string; expires_at?: number | null }
type RCv2Entitlement = { id: string; lookup_key: string }
type RCv2Subscription = {
  status: string
  environment: string
  management_url: string | null
  product_id: string
  gives_access: boolean
  entitlements: { items: { lookup_key: string }[] }
}

async function rcFetch<T>(path: string, apiKey: string, revalidate: number): Promise<T | null> {
  const res = await fetch(`${RC_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`RevenueCat API error: ${res.status}`)
  return res.json() as Promise<T>
}

async function getProductStoreIdentifier(projectId: string, productId: string, apiKey: string): Promise<string> {
  try {
    const product = await rcFetch<{ store_identifier?: string }>(
      `/projects/${projectId}/products/${productId}`, apiKey, 3600,
    )
    return product?.store_identifier ?? productId
  } catch {
    return productId
  }
}

export async function getRevenueCatSubscriber(userId: string): Promise<RCSubscriber | null> {
  const apiKey = process.env.REVENUECAT_SECRET_KEY
  const projectId = process.env.REVENUECAT_PROJECT_ID
  if (!apiKey) throw new Error('REVENUECAT_SECRET_KEY is not configured')
  if (!projectId) throw new Error('REVENUECAT_PROJECT_ID is not configured')

  const customerPath = `/projects/${projectId}/customers/${encodeURIComponent(userId)}`
  const active = await rcFetch<{ items: RCv2ActiveEntitlement[] }>(
    `${customerPath}/active_entitlements?limit=100`, apiKey, 60,
  )
  if (!active) return null

  // v2 liefert nur Entitlement-IDs; lookup_keys ("full_access") kommen aus der
  // Projekt-Entitlement-Liste. Abo-Details (Trial, Produkt, Management-URL)
  // hängen an der Subscription, die das Entitlement freischaltet.
  const [entitlementList, subscriptionList] = await Promise.all([
    rcFetch<{ items: RCv2Entitlement[] }>(`/projects/${projectId}/entitlements?limit=100`, apiKey, 3600),
    rcFetch<{ items: RCv2Subscription[] }>(`${customerPath}/subscriptions?limit=100`, apiKey, 60),
  ])
  const keyById = new Map((entitlementList?.items ?? []).map(e => [e.id, e.lookup_key]))
  const subscriptions = (subscriptionList?.items ?? []).filter(s => s.gives_access)

  const entitlements: Record<string, RCEntitlement> = {}
  for (const item of active.items) {
    const lookupKey = keyById.get(item.entitlement_id)
    if (!lookupKey) continue
    const sub = subscriptions.find(s => s.entitlements.items.some(e => e.lookup_key === lookupKey))
    entitlements[lookupKey] = {
      expires_date: item.expires_at ? new Date(item.expires_at).toISOString() : null,
      period_type: sub?.status === 'trialing' ? 'trial' : 'normal',
      product_identifier: sub ? await getProductStoreIdentifier(projectId, sub.product_id, apiKey) : '—',
      management_url: sub?.management_url ?? null,
      is_sandbox: sub ? sub.environment !== 'production' : false,
    }
  }

  return {
    entitlements,
    management_url: subscriptions[0]?.management_url ?? null,
  }
}
