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
