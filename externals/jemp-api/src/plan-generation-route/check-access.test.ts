import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPlanGenerationAccess, RevenueCatSubscriber } from './check-access';

const NOW = new Date('2026-07-27T12:00:00Z');

function subscriberWith(entitlements: RevenueCatSubscriber['entitlements']): RevenueCatSubscriber {
    return { entitlements };
}

test('allows admin role without touching RevenueCat', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'admin',
        fetchSubscriber: async () => { throw new Error('must not be called'); },
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'role_bypass');
});

test('allows affiliate role without touching RevenueCat', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'affiliate',
        fetchSubscriber: async () => { throw new Error('must not be called'); },
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'role_bypass');
});

test('allows user with unexpired full_access entitlement', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => subscriberWith({
            full_access: { expires_date: '2026-08-01T00:00:00Z' },
        }),
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'entitlement_active');
});

test('allows user with lifetime entitlement (expires_date null)', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => subscriberWith({
            full_access: { expires_date: null },
        }),
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'entitlement_active');
});

test('denies user with expired entitlement', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => subscriberWith({
            full_access: { expires_date: '2026-07-01T00:00:00Z' },
        }),
        now: NOW,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'no_entitlement');
});

test('denies user with no entitlements at all', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => subscriberWith({}),
        now: NOW,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'no_entitlement');
});

test('fails open when RevenueCat lookup throws', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => { throw new Error('RC down'); },
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'revenuecat_unavailable');
});

test('fails open when RevenueCat is not configured (fetcher returns null)', async () => {
    const decision = await checkPlanGenerationAccess({
        role: 'user',
        fetchSubscriber: async () => null,
        now: NOW,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'revenuecat_unavailable');
});

// ── fetchRevenueCatSubscriber (RevenueCat API v2) ───────────────────────────

import { fetchRevenueCatSubscriber } from './check-access';

const RC_ENV = { REVENUECAT_SECRET_API_KEY: 'sk_test', REVENUECAT_PROJECT_ID: 'proj_test' };

function withRcEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys({ ...RC_ENV, ...env })) {
        saved[key] = process.env[key];
        const value = key in env ? env[key] : RC_ENV[key as keyof typeof RC_ENV];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    return fn().finally(() => {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
}

function mockFetch(handler: (url: string) => { status: number; body: unknown }): () => void {
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const { status, body } = handler(String(input));
        return new Response(JSON.stringify(body), { status });
    }) as typeof fetch;
    return () => { globalThis.fetch = original; };
}

const entitlementList = {
    items: [{ id: 'entl_full', lookup_key: 'full_access' }],
};

test('fetchRevenueCatSubscriber returns null when env is missing', async () => {
    await withRcEnv({ REVENUECAT_SECRET_API_KEY: undefined, REVENUECAT_PROJECT_ID: undefined }, async () => {
        assert.equal(await fetchRevenueCatSubscriber('user-1'), null);
    });
});

test('fetchRevenueCatSubscriber maps unknown customer (404) to empty entitlements', async () => {
    const restore = mockFetch(() => ({ status: 404, body: {} }));
    try {
        await withRcEnv({}, async () => {
            assert.deepEqual(await fetchRevenueCatSubscriber('user-unknown'), { entitlements: {} });
        });
    } finally { restore(); }
});

test('fetchRevenueCatSubscriber maps active entitlements to lookup keys', async () => {
    const restore = mockFetch((url) => {
        if (url.includes('/active_entitlements')) {
            return { status: 200, body: { items: [{ entitlement_id: 'entl_full', expires_at: 1794262311765 }] } };
        }
        if (url.endsWith('/entitlements?limit=100')) {
            return { status: 200, body: entitlementList };
        }
        throw new Error(`unexpected fetch: ${url}`);
    });
    try {
        await withRcEnv({}, async () => {
            const subscriber = await fetchRevenueCatSubscriber('user-subbed');
            assert.deepEqual(subscriber, {
                entitlements: { full_access: { expires_date: new Date(1794262311765).toISOString() } },
            });
        });
    } finally { restore(); }
});

test('fetchRevenueCatSubscriber throws on RevenueCat error status', async () => {
    const restore = mockFetch(() => ({ status: 403, body: { code: 7723 } }));
    try {
        await withRcEnv({}, async () => {
            await assert.rejects(() => fetchRevenueCatSubscriber('user-1'), /403/);
        });
    } finally { restore(); }
});
