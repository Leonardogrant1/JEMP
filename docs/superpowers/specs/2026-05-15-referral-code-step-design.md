# Referral Code Onboarding Step

**Date:** 2026-05-15  
**Status:** Approved

## Overview

Add an optional referral/affiliate code step to the onboarding flow. The step appears after `NotificationSetupStep` and before `WhatYouWillGetStep`. It lets users enter a referral code from an affiliate partner, tracks it via the northbyte.studio API, and stores it in the user's profile for later use (e.g. discounted paywall).

---

## Position in Flow

```
... → NotificationSetupStep → ReferralCodeStep (NEW) → WhatYouWillGetStep → TrialOfferStep
```

Registered in `app/onboarding.tsx` as:
```ts
{ component: ReferralCodeStep, theme: 'dark', initialCanContinue: true }
```

`initialCanContinue: true` — the step is fully optional, Continue is always enabled.

---

## Component: `ReferralCodeStep`

**File:** `components/onboarding/steps/referral-code-step.tsx`

### Layout (dark theme, matches existing steps)

- `FadeInDown` animations with staggered delays (100 / 240 / 360ms)
- **Headline (h1):** i18n key `onboarding.referral_title`
- **Subtitle (body-l, textMuted):** i18n key `onboarding.referral_subtitle`
- **Input row:** `JempInput` + inline Submit pill button (Gradient Cyan→Electric)
  - Input: `autoCapitalize="characters"` + `onChangeText` transforms to uppercase via `.toUpperCase()`
  - Placeholder: i18n key `onboarding.referral_placeholder`
  - Submit button disabled when input is empty or state is `loading` / `success` / `error`
- **Feedback row** (below input, animated FadeIn):
  - `success` state: green checkmark + i18n key `onboarding.referral_success`
  - `error` state: red text + i18n key `onboarding.referral_error_not_found`
  - `error_network` state: red text + i18n key `onboarding.referral_error_network`

### State machine

```
idle → loading → success (201)
                → error_not_found (404)
                → error_network (any other error)
```

Once in `success` or `error*`, the Submit button is disabled (no re-submission).

---

## API Integration

**Endpoint:** `POST https://www.northbyte.studio/api/affiliate/track`

**Payload:**
```json
{
  "appSlug": "jemp",
  "affiliateCode": "<UPPERCASE_CODE>",
  "appUserId": "<supabase_user_id>",
  "revenueCatUserId": "<await Purchases.getAppUserID()>"
}
```

**Response handling:**
- `201` → success state, save code to DB
- `404` → error_not_found state, do not save
- any other error / network failure → error_network state, do not save

---

## Database

### Migration

New file: `supabase/migrations/20260515100000_add_referral_code_to_user_profiles.sql`

```sql
ALTER TABLE user_profiles ADD COLUMN referral_code TEXT;
```

### Save logic

On 201 response, immediately call:
```ts
await supabase
  .from('user_profiles')
  .update({ referral_code: code })
  .eq('id', session.user.id);
```

The code is also stored in `useOnboardingStore` (field `referral_code`) so it's available later in the session.

---

## Onboarding Store

Add to `OnboardingStore` type and `initialState` in `stores/onboarding-store.ts`:
```ts
referral_code: string | null;
```

---

## Translations

### `i18n/locales/de.ts`
```ts
'onboarding.referral_title': 'Hast du einen Referral-Code?',
'onboarding.referral_subtitle': 'Optional — du kannst diesen Schritt überspringen.',
'onboarding.referral_placeholder': 'CODE EINGEBEN',
'onboarding.referral_submit': 'Einlösen',
'onboarding.referral_success': 'Code erfolgreich eingelöst!',
'onboarding.referral_error_not_found': 'Code nicht gefunden. Bitte prüfe deine Eingabe.',
'onboarding.referral_error_network': 'Verbindungsfehler. Bitte versuche es erneut.',
```

### `i18n/locales/en.ts`
```ts
'onboarding.referral_title': 'Got a referral code?',
'onboarding.referral_subtitle': 'Optional — you can skip this step.',
'onboarding.referral_placeholder': 'ENTER CODE',
'onboarding.referral_submit': 'Submit',
'onboarding.referral_success': 'Code successfully applied!',
'onboarding.referral_error_not_found': 'Code not found. Please check your input.',
'onboarding.referral_error_network': 'Connection error. Please try again.',
```

---

## Out of Scope

- Discounted paywall logic (future work)
- Re-entering a code after success
- Code validation on the client side (length, format) — server is the source of truth
