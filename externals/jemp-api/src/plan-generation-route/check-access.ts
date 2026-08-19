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

export async function fetchRevenueCatSubscriber(userId: string): Promise<RevenueCatSubscriber | null> {
    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!apiKey) {
        console.warn('plan-generation/start: REVENUECAT_SECRET_API_KEY not set, skipping entitlement check');
        return null;
    }

    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
        throw new Error(`RevenueCat responded with ${res.status}`);
    }
    const body = await res.json() as { subscriber?: RevenueCatSubscriber };
    if (!body.subscriber) {
        throw new Error('RevenueCat response missing subscriber');
    }
    return body.subscriber;
}
