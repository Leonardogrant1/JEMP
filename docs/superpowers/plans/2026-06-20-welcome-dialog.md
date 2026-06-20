# Welcome Dialog & Plan Empty State — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time welcome dialog after the tutorial when no plan exists, and replace the minimal plan-tab empty state with a proper "Plan generieren" CTA that triggers generation immediately.

**Architecture:** The dialog lives in `app/(tabs)/_layout.tsx` as a second `<Modal>` (the confetti pattern already exists there). It triggers on mount when three conditions are true: tutorial seen, no plan in DB, AsyncStorage flag not yet set. `plan.tsx`'s empty state gains a gradient button that calls the plan-generation API and hands off to the existing `PlanGenerationScreen` via the Realtime store.

**Tech Stack:** React Native `Modal`, `AsyncStorage`, Supabase JS client, Expo Router, Zustand (`useTutorialStore`, `usePlanGenerationStore`), `react-i18next`

## Global Constraints

- No new dependencies — use only what is already in the project
- All copy must exist in both `i18n/locales/en.ts` and `i18n/locales/de.ts`
- `de.ts` imports `TranslationKeys` from `en.ts` — every new key in `en.ts` must also appear in `de.ts` or TypeScript will error
- Dialog must never show again after it has been dismissed once
- The "Plan generieren" button in `plan.tsx` must NOT navigate to `generate-plan.tsx` — it calls the API directly
- `EXPO_PUBLIC_BACKEND_URL` is already set in the environment; access it via `process.env.EXPO_PUBLIC_BACKEND_URL`

---

### Task 1: Add i18n strings

**Files:**
- Modify: `i18n/locales/en.ts`
- Modify: `i18n/locales/de.ts`

**Interfaces:**
- Produces: translation keys `'ui.welcome_dialog_title'`, `'ui.welcome_dialog_body'`, `'ui.welcome_dialog_cta'`, `'ui.plan_empty_title'`, `'ui.plan_empty_subtitle'`, `'ui.plan_generate'`

- [ ] **Step 1: Add keys to `en.ts`**

Find the block around `'ui.no_active_plan'` (line ~150) and add the six new keys directly after it:

```ts
'ui.no_active_plan': 'No active training plan.\nCreate one in your profile.',
'ui.welcome_dialog_title': 'Welcome to JEMP, {{name}}!',
'ui.welcome_dialog_body': 'Your settings have been saved. You\'re ready to generate your first plan.',
'ui.welcome_dialog_cta': 'Generate plan',
'ui.plan_empty_title': 'No plan yet',
'ui.plan_empty_subtitle': 'Start now and JEMP will generate your personalised training plan.',
'ui.plan_generate': 'Generate plan',
```

- [ ] **Step 2: Add keys to `de.ts`**

Find the same block in `de.ts` (around `'ui.no_active_plan'`) and add after it:

```ts
'ui.no_active_plan': 'Kein aktiver Trainingsplan.\nErstelle einen im Profil.',
'ui.welcome_dialog_title': 'Willkommen bei JEMP, {{name}}!',
'ui.welcome_dialog_body': 'Deine Einstellungen wurden gespeichert. Du bist bereit, deinen ersten Plan zu generieren.',
'ui.welcome_dialog_cta': 'Plan generieren',
'ui.plan_empty_title': 'Noch kein Plan vorhanden',
'ui.plan_empty_subtitle': 'Starte jetzt und JEMP generiert deinen personalisierten Trainingsplan.',
'ui.plan_generate': 'Plan generieren',
```

- [ ] **Step 3: Verify TypeScript is happy**

```bash
cd /Users/leonardogranetto/Projects/jemp && npx tsc --noEmit 2>&1 | grep -E "en\.ts|de\.ts|locales" | head -20
```

Expected: no errors about missing keys.

- [ ] **Step 4: Commit**

```bash
git add i18n/locales/en.ts i18n/locales/de.ts
git commit -m "feat: add i18n strings for welcome dialog and plan empty state"
```

---

### Task 2: Welcome dialog in `_layout.tsx`

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `'ui.welcome_dialog_title'`, `'ui.welcome_dialog_body'`, `'ui.welcome_dialog_cta'` from Task 1
- Consumes: `profile.first_name` from `useCurrentUser()` (already imported)
- Consumes: `hasSeenTutorial` from `useTutorialStore` (already imported)
- Consumes: `supabase` (already imported)
- Produces: A modal that shows once after the tutorial when no plan exists

- [ ] **Step 1: Add `AsyncStorage` import**

At the top of `app/(tabs)/_layout.tsx`, add:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
```

(It is already a project dependency — used in `stores/tutorial-store.ts`.)

- [ ] **Step 2: Add state and effect inside `TabLayout`**

Add the following after the existing `const [showDevCongrats, setShowDevCongrats] = useState(false);` line:

```ts
const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
const hasSeenTutorial = useTutorialStore(s => s.hasSeenTutorial);
const { profile } = useCurrentUser();
```

Note: `useCurrentUser` is already imported via `refreshProfile` — just destructure `profile` from it. Change the existing line:

```ts
// BEFORE
const { refreshProfile } = useCurrentUser();

// AFTER
const { refreshProfile, profile } = useCurrentUser();
```

- [ ] **Step 3: Add the trigger effect**

Add this effect inside `TabLayout`, after the existing `useEffect` that subscribes to the plan generation store:

```ts
useEffect(() => {
  if (!hasSeenTutorial || !profile?.id) return;

  (async () => {
    const shown = await AsyncStorage.getItem('welcome_dialog_shown');
    if (shown) return;

    // Check whether a plan already exists
    const { data } = await supabase
      .from('plans')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle();

    if (!data) {
      await AsyncStorage.setItem('welcome_dialog_shown', 'true');
      setShowWelcomeDialog(true);
    }
  })();
}, [hasSeenTutorial, profile?.id]);
```

- [ ] **Step 4: Add the Modal JSX**

Add the following `<Modal>` block directly after the closing `</Modal>` of the existing confetti modal (around line 248), still inside the outer `<View>`:

```tsx
<Modal transparent animationType="fade" visible={showWelcomeDialog} statusBarTranslucent>
  <View style={styles.congratsOverlay}>
    <View style={[styles.congratsCard, { backgroundColor: theme.surface }]}>
      <Text style={styles.congratsEmoji}>🎉</Text>
      <Text style={[styles.congratsTitle, { color: theme.text }]}>
        {t('ui.welcome_dialog_title', { name: profile?.first_name ?? '' })}
      </Text>
      <Text style={[styles.congratsSubtitle, { color: theme.textMuted }]}>
        {t('ui.welcome_dialog_body')}
      </Text>
      <Pressable
        onPress={() => {
          setShowWelcomeDialog(false);
          router.push('/(tabs)/plan');
        }}
        style={styles.congratsBtn}
      >
        <LinearGradient
          colors={[Cyan[500], Electric[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.congratsBtnGradient}
        >
          <Text style={styles.congratsBtnText}>{t('ui.welcome_dialog_cta')}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  </View>
</Modal>
```

All styles (`congratsOverlay`, `congratsCard`, `congratsEmoji`, `congratsTitle`, `congratsSubtitle`, `congratsBtn`, `congratsBtnGradient`, `congratsBtnText`) already exist in the `StyleSheet` from the confetti modal — no new styles needed.

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd /Users/leonardogranetto/Projects/jemp && npx tsc --noEmit 2>&1 | grep "_layout" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat: show one-time welcome dialog after tutorial when no plan exists"
```

---

### Task 3: Plan empty state with "Generate plan" button

**Files:**
- Modify: `app/(tabs)/plan.tsx`

**Interfaces:**
- Consumes: `'ui.plan_empty_title'`, `'ui.plan_empty_subtitle'`, `'ui.plan_generate'` from Task 1
- Consumes: `profile?.id` from `useCurrentUser()` (already imported)
- Consumes: `usePlanGenerationStore` (already imported) — `isGenerating` flips to `true` after API call, which triggers `PlanGenerationScreen` automatically
- Produces: A proper empty state with a gradient "Plan generieren" CTA

- [ ] **Step 1: Add the `startGeneration` async function inside `PlanScreen`**

Add this function after the existing `renderSelectedDayContent` function (around line 138):

```ts
async function startGeneration() {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (!authSession) return;

  usePlanGenerationStore.getState().subscribe(authSession.user.id);

  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const res = await fetch(`${backendUrl}/api/plan-generation/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}` },
  });

  if (!res.ok) {
    usePlanGenerationStore.getState().clear();
  }
}
```

Also add the missing `supabase` import at the top of `plan.tsx`:

```ts
import { supabase } from '@/services/supabase/client';
```

- [ ] **Step 2: Replace the empty state JSX**

Find the existing empty state block (lines 218–224):

```tsx
) : !plan ? (
  <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
    <Ionicons name="barbell-outline" size={32} color={theme.textMuted} />
    <JempText type="body-l" color={theme.textMuted} style={styles.centeredText}>
      {t('ui.no_active_plan')}
    </JempText>
  </View>
```

Replace with:

```tsx
) : !plan ? (
  <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
    <Ionicons name="rocket-outline" size={48} color={theme.textMuted} />
    <JempText type="h2" style={styles.centeredText}>
      {t('ui.plan_empty_title')}
    </JempText>
    <JempText type="body-l" color={theme.textMuted} style={styles.centeredText}>
      {t('ui.plan_empty_subtitle')}
    </JempText>
    <TouchableOpacity style={styles.generateBtn} onPress={startGeneration}>
      <LinearGradient
        colors={[Cyan[500], Electric[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.generateBtnGradient}
      >
        <JempText type="button" color="#fff">{t('ui.plan_generate')}</JempText>
      </LinearGradient>
    </TouchableOpacity>
  </View>
```

- [ ] **Step 3: Add the two new styles to the `StyleSheet`**

Add inside the existing `StyleSheet.create({...})` at the bottom of `plan.tsx`:

```ts
generateBtn: { marginTop: 8, width: '100%', borderRadius: 100, overflow: 'hidden' },
generateBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp && npx tsc --noEmit 2>&1 | grep "plan\.tsx" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/plan.tsx
git commit -m "feat: replace plan empty state with generate plan CTA"
```
