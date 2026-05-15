# Referral Code Onboarding Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional referral/affiliate code step to the onboarding flow (after NotificationSetupStep) that calls the northbyte.studio affiliate API and persists a validated code to Supabase.

**Architecture:** New `ReferralCodeStep` component with local state machine (idle → loading → success/error). On 201, writes referral_code to `user_profiles` via Supabase and to the onboarding store. Step is always continuable (optional).

**Tech Stack:** React Native, Expo Router, Zustand, Supabase, react-native-purchases (RevenueCat), expo-linear-gradient, react-native-reanimated, react-i18next

---

## File Map

| Action | File |
|--------|------|
| **Create** | `components/onboarding/steps/referral-code-step.tsx` |
| **Create** | `supabase/migrations/20260515100000_add_referral_code_to_user_profiles.sql` |
| **Modify** | `stores/onboarding-store.ts` |
| **Modify** | `i18n/locales/de.ts` |
| **Modify** | `i18n/locales/en.ts` |
| **Modify** | `app/onboarding.tsx` |

---

### Task 1: DB Migration — add `referral_code` to `user_profiles`

**Files:**
- Create: `supabase/migrations/20260515100000_add_referral_code_to_user_profiles.sql`

- [ ] **Step 1: Create the migration file**

```sql
ALTER TABLE user_profiles ADD COLUMN referral_code TEXT;
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
```

Expected: migration applied without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260515100000_add_referral_code_to_user_profiles.sql
git commit -m "feat: add referral_code column to user_profiles"
```

---

### Task 2: i18n — add translation keys

**Files:**
- Modify: `i18n/locales/de.ts`
- Modify: `i18n/locales/en.ts`

- [ ] **Step 1: Add German translations**

In `i18n/locales/de.ts`, find the `// notification-step` section (around line 409) and add a new `// referral-step` block directly after the notification block:

```ts
    // referral-step
    'onboarding.referral_title': 'Hast du einen Referral-Code?',
    'onboarding.referral_subtitle': 'Optional — du kannst diesen Schritt überspringen.',
    'onboarding.referral_placeholder': 'CODE EINGEBEN',
    'onboarding.referral_submit': 'Einlösen',
    'onboarding.referral_success': 'Code erfolgreich eingelöst!',
    'onboarding.referral_error_not_found': 'Code nicht gefunden. Bitte prüfe deine Eingabe.',
    'onboarding.referral_error_network': 'Verbindungsfehler. Bitte versuche es erneut.',
```

- [ ] **Step 2: Add English translations**

In `i18n/locales/en.ts`, add the same block after the notification-step section:

```ts
    // referral-step
    'onboarding.referral_title': 'Got a referral code?',
    'onboarding.referral_subtitle': 'Optional — you can skip this step.',
    'onboarding.referral_placeholder': 'ENTER CODE',
    'onboarding.referral_submit': 'Submit',
    'onboarding.referral_success': 'Code successfully applied!',
    'onboarding.referral_error_not_found': 'Code not found. Please check your input.',
    'onboarding.referral_error_network': 'Connection error. Please try again.',
```

- [ ] **Step 3: Commit**

```bash
git add i18n/locales/de.ts i18n/locales/en.ts
git commit -m "feat: add referral step i18n keys (de + en)"
```

---

### Task 3: Onboarding Store — add `referral_code` field

**Files:**
- Modify: `stores/onboarding-store.ts`

- [ ] **Step 1: Add `referral_code` to the store type and initial state**

In `stores/onboarding-store.ts`, the `OnboardingStore` type extends `ProfileData` plus some extra fields. Add `referral_code` alongside those extra fields.

Replace the `type OnboardingStore` definition:

```ts
type OnboardingStore = ProfileData & {
    sport_slug: string | null;
    targetedCategories: TargetedCategory[];
    categoryLevels: CategoryLevel[];
    equipmentIds: string[];
    environmentIds: string[];
    weekly_schedule: WeeklySchedule;
    referral_code: string | null;
    set: (data: Partial<ProfileData & {
        sport_slug: string | null;
        targetedCategories: TargetedCategory[];
        categoryLevels: CategoryLevel[];
        equipmentIds: string[];
        environmentIds: string[];
        weekly_schedule: WeeklySchedule;
        referral_code: string | null;
    }>) => void;
    reset: () => void;
};
```

Replace the `initialState` constant:

```ts
const initialState: Omit<OnboardingStore, 'set' | 'reset'> = {
    first_name: null,
    last_name: null,
    birth_date: null,
    gender: null,
    sport_id: null,
    sport_slug: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    schedule_notes: null,
    timezone: null,
    targetedCategories: [],
    categoryLevels: [],
    equipmentIds: [],
    environmentIds: [],
    weekly_schedule: { sessions: [], notes: null },
    referral_code: null,
};
```

- [ ] **Step 2: Commit**

```bash
git add stores/onboarding-store.ts
git commit -m "feat: add referral_code field to onboarding store"
```

---

### Task 4: Create `ReferralCodeStep` component

**Files:**
- Create: `components/onboarding/steps/referral-code-step.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Purchases from 'react-native-purchases';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error_not_found' | 'error_network';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

export function ReferralCodeStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { session } = useAuth();
    const setStore = useOnboardingStore((s) => s.set);

    const [code, setCode] = useState('');
    const [status, setStatus] = useState<SubmitStatus>('idle');

    const canSubmit = code.trim().length > 0 && status === 'idle';

    function handleCodeChange(value: string) {
        setCode(value.toUpperCase());
    }

    async function handleSubmit() {
        if (!canSubmit) return;
        setStatus('loading');
        try {
            const revenueCatUserId = await Purchases.getAppUserID();
            const response = await fetch('https://www.northbyte.studio/api/affiliate/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appSlug: 'jemp',
                    affiliateCode: code.trim(),
                    appUserId: session?.user?.id ?? '',
                    revenueCatUserId,
                }),
            });

            if (response.status === 201) {
                setStore({ referral_code: code.trim() });
                if (session?.user?.id) {
                    await supabase
                        .from('user_profiles')
                        .update({ referral_code: code.trim() })
                        .eq('id', session.user.id);
                }
                setStatus('success');
            } else if (response.status === 404) {
                setStatus('error_not_found');
            } else {
                setStatus('error_network');
            }
        } catch {
            setStatus('error_network');
        }
    }

    const showFeedback = status === 'success' || status === 'error_not_found' || status === 'error_network';
    const feedbackColor = status === 'success' ? theme.success : '#EF5350';
    const feedbackKey =
        status === 'success'
            ? 'onboarding.referral_success'
            : status === 'error_not_found'
                ? 'onboarding.referral_error_not_found'
                : 'onboarding.referral_error_network';

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>
                    {t('onboarding.referral_title')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.referral_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.inputRow}>
                <JempInput
                    value={code}
                    onChangeText={handleCodeChange}
                    placeholder={t('onboarding.referral_placeholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    style={styles.input}
                />
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={styles.submitWrapper}
                >
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.submitGradient, !canSubmit && styles.submitDisabled]}
                    >
                        {status === 'loading' ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <JempText type="body-sm" color="white">
                                {t('onboarding.referral_submit')}
                            </JempText>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {showFeedback && (
                <Animated.View entering={FadeInDown.duration(300).springify()}>
                    <JempText type="body-sm" color={feedbackColor} style={styles.feedback}>
                        {t(feedbackKey as any)}
                    </JempText>
                </Animated.View>
            )}
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    headline: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 40,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
    },
    submitWrapper: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitGradient: {
        paddingVertical: 18,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    submitDisabled: {
        opacity: 0.35,
    },
    feedback: {
        marginTop: 12,
        textAlign: 'center',
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/onboarding/steps/referral-code-step.tsx
git commit -m "feat: add ReferralCodeStep component"
```

---

### Task 5: Register step in the onboarding flow

**Files:**
- Modify: `app/onboarding.tsx`

- [ ] **Step 1: Import the new component**

In `app/onboarding.tsx`, add the import alongside the other step imports (alphabetical order fits between `RatingStep` and `SportStep`):

```ts
import { ReferralCodeStep } from '@/components/onboarding/steps/referral-code-step';
```

- [ ] **Step 2: Insert step after `NotificationSetupStep`**

In the `steps` array, the current order ends with:
```ts
{ component: NotificationSetupStep, ... },
{ component: WhatYouWillGetStep, ... },
{ component: TrialOfferStep, ... },
```

Insert the new step between `NotificationSetupStep` and `WhatYouWillGetStep`:

```ts
{
    component: NotificationSetupStep,
    theme: 'dark',
    initialCanContinue: true,
    preContinue: async () => {
        await Notifications.requestPermissionsAsync();
    },
},
{ component: ReferralCodeStep, theme: 'dark', initialCanContinue: true },
{ component: WhatYouWillGetStep, theme: 'dark', initialCanContinue: true },
{ component: TrialOfferStep, theme: 'dark', continueButtonText: t('onboarding.btn_try_free') },
```

- [ ] **Step 3: Commit**

```bash
git add app/onboarding.tsx
git commit -m "feat: register ReferralCodeStep in onboarding flow"
```

---

## Manual Verification Checklist

After all tasks are complete, run the app and walk through the onboarding to the notification step, then advance:

- [ ] Referral step appears after notification permissions
- [ ] Title and subtitle render correctly in German and English
- [ ] Input forces uppercase automatically as you type
- [ ] Submit button is disabled when input is empty
- [ ] Submit button shows spinner during API call
- [ ] 201 response → green success text appears, Submit button stays disabled
- [ ] 404 response → red "not found" text appears
- [ ] Network error → red "connection error" text appears
- [ ] Continue button is always enabled (step is skippable)
- [ ] After success, check Supabase `user_profiles` table: `referral_code` column is populated
