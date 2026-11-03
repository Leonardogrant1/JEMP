export type RevenueCatSubscriber = {
    entitlements: Record<string, { expires_date: string | null }>;
};

export type AccessDecision = {
    allowed: boolean;
    reason: 'role_bypass' | 'entitlement_active' | 'no_entitlement' | 'revenuecat_unavailable';
};

const BYPASS_ROLES = ['admin', 'affiliate'];
const ENTITLEMENT_ID = 'full_access';

export async function checkPlanGenerationAccess(opts: {
    role: string | null;
    fetchSubscriber: () => Promise<RevenueCatSubscriber | null>;
    now?: Date;
}): Promise<AccessDecision> {
    const { role, fetchSubscriber, now = new Date() } = opts;

    if (role && BYPASS_ROLES.includes(role)) {
        return { allowed: true, reason: 'role_bypass' };
    }

    let subscriber: RevenueCatSubscriber | null;
    try {
        subscriber = await fetchSubscriber();
    } catch {
        // Fail open: never lock out a paying user because RevenueCat is down.
        return { allowed: true, reason: 'revenuecat_unavailable' };
    }
    if (!subscriber) {
        return { allowed: true, reason: 'revenuecat_unavailable' };
    }

    const entitlement = subscriber.entitlements?.[ENTITLEMENT_ID];
    const active = !!entitlement
        && (entitlement.expires_date === null || new Date(entitlement.expires_date) > now);

    return active
        ? { allowed: true, reason: 'entitlement_active' }
        : { allowed: false, reason: 'no_entitlement' };
}

const RC_BASE = 'https://api.revenuecat.com/v2';

// v2 active_entitlements only carries entitlement ids; lookup keys ("full_access")
// come from the project's entitlement list. Cached per process, reset on failure.
let entitlementKeyById: Promise<Map<string, string>> | null = null;

function loadEntitlementKeys(apiKey: string, projectId: string): Promise<Map<string, string>> {
    if (!entitlementKeyById) {
        entitlementKeyById = (async () => {
            const res = await fetch(`${RC_BASE}/projects/${projectId}/entitlements?limit=100`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (!res.ok) {
                throw new Error(`RevenueCat entitlements responded with ${res.status}`);
            }
            const body = await res.json() as { items?: { id: string; lookup_key: string }[] };
            return new Map((body.items ?? []).map((e) => [e.id, e.lookup_key]));
        })();
        entitlementKeyById.catch(() => { entitlementKeyById = null; });
    }
    return entitlementKeyById;
}

export async function fetchRevenueCatSubscriber(userId: string): Promise<RevenueCatSubscriber | null> {
    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    const projectId = process.env.REVENUECAT_PROJECT_ID;
    if (!apiKey || !projectId) {
        console.warn('plan-generation/start: REVENUECAT_SECRET_API_KEY/REVENUECAT_PROJECT_ID not set, skipping entitlement check');
        return null;
    }

    const res = await fetch(
        `${RC_BASE}/projects/${projectId}/customers/${encodeURIComponent(userId)}/active_entitlements?limit=100`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    // Customer unknown to RevenueCat = never synced = no entitlement (matches the
    // v1 behavior where an unknown subscriber came back with empty entitlements).
    if (res.status === 404) {
        return { entitlements: {} };
    }
    if (!res.ok) {
        throw new Error(`RevenueCat responded with ${res.status}`);
    }
    const body = await res.json() as { items?: { entitlement_id: string; expires_at?: number | null }[] };

    const keyById = await loadEntitlementKeys(apiKey, projectId);
    const entitlements: RevenueCatSubscriber['entitlements'] = {};
    for (const item of body.items ?? []) {
        const key = keyById.get(item.entitlement_id);
        if (!key) continue;
        entitlements[key] = {
            expires_date: item.expires_at ? new Date(item.expires_at).toISOString() : null,
        };
    }
    return { entitlements };
}
