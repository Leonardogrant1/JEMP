# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete 11-step onboarding flow that collects user profile, sport, goals, self-assessment, equipment, and training preferences — persisted in batch to Supabase on completion.

**Architecture:** Zustand onboarding store holds all collected data (profile fields + relational data) and is batch-flushed in `finishOnboarding`. Each step is a standalone component registered in `OnboardingStep[]`. Two DB migrations add `priority` to `user_targeted_categories` and expand `level_score` from 1–5 to 1–100.

**Tech Stack:** React Native, Expo Router, Zustand, Supabase JS client, react-native-gesture-handler (drag), TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260420080001_add_priority_to_user_targeted_categories.sql` | Create | Add priority column |
| `supabase/migrations/20260420080002_update_level_score_constraint.sql` | Create | Expand score range to 1–100 |
| `types/database.ts` | Modify | Fix sports_category enum, add SessionDuration type |
| `stores/onboarding-store.ts` | Modify | Add targetedCategories, categoryLevels, equipmentIds, environmentIds |
| `components/onboarding/onboarding-progress-wrapper.tsx` | Modify | Batch insert relational data in finishOnboarding |
| `components/onboarding/steps/name-step.tsx` | Modify | Add last_name input, switch to onboarding store |
| `components/onboarding/steps/birthday-step.tsx` | Create | DD/MM/YYYY inputs with validation |
| `components/onboarding/steps/gender-step.tsx` | Modify | Fix enum values to match DB (lowercase), switch to onboarding store |
| `components/onboarding/steps/body-step.tsx` | Create | Height + weight inputs |
| `components/onboarding/steps/sport-step.tsx` | Create | Grouped grid, single-select sports_category |
| `components/onboarding/steps/category-focus-step.tsx` | Create | Multi-select + drag-to-rank categories |
| `components/onboarding/steps/category-level-step.tsx` | Create | Level preset buttons per selected category |
| `components/onboarding/steps/environment-step.tsx` | Create | Multi-select environments |
| `components/onboarding/steps/equipment-step.tsx` | Create | Preselected equipment, deselect option |
| `components/onboarding/steps/workout-prefs-step.tsx` | Create | Day toggles + session duration |
| `app/onboarding.tsx` | Modify | Register all 11 steps |

---

## Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/20260420080001_add_priority_to_user_targeted_categories.sql`
- Create: `supabase/migrations/20260420080002_update_level_score_constraint.sql`

- [ ] **Step 1: Create priority migration**

```sql
-- supabase/migrations/20260420080001_add_priority_to_user_targeted_categories.sql
ALTER TABLE user_targeted_categories
ADD COLUMN priority INTEGER NOT NULL DEFAULT 1;
```

- [ ] **Step 2: Create level_score constraint migration**

```sql
-- supabase/migrations/20260420080002_update_level_score_constraint.sql
ALTER TABLE user_category_levels
DROP CONSTRAINT user_category_levels_level_score_check;

ALTER TABLE user_category_levels
ADD CONSTRAINT user_category_levels_level_score_check
CHECK (level_score BETWEEN 1 AND 100);
```

- [ ] **Step 3: Apply migrations**

```bash
npx supabase db push
```

Expected: migrations applied without error.

---

## Task 2: Update `types/database.ts`

**Files:**
- Modify: `types/database.ts`

The `sports_category` type is out of sync with the DB enum. Fix it and add `SessionDuration`.

- [ ] **Step 1: Replace the file content**

```typescript
export type SportsCategory =
  | 'boxing' | 'mma' | 'wrestling' | 'judo' | 'bjj' | 'kickboxing' | 'karate' | 'taekwondo'
  | 'football' | 'basketball' | 'volleyball' | 'handball' | 'rugby' | 'hockey' | 'soccer'
  | 'sprinting' | 'jumping' | 'throwing'
  | 'powerlifting' | 'weightlifting' | 'crossfit' | 'bodybuilding'
  | 'running' | 'cycling' | 'swimming' | 'triathlon'
  | 'tennis' | 'badminton' | 'squash'
  | 'gymnastics' | 'climbing' | 'other';

export type Gender = 'male' | 'female' | 'other';

export type SessionDuration = '30min' | '45min' | '60min' | '90min';

export type UserProfile = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    birth_date: string | null
    gender: Gender | null
    sports_category: SportsCategory | null
    height_in_cm: number | null
    weight_in_kg: number | null
    preferred_workout_days: number[]
    preferred_session_duration: SessionDuration | null
    timezone: string | null
    has_onboarded: boolean
    has_seen_tutorial: boolean
    created_at: string
    updated_at: string
    last_active_at: string
}
```

- [ ] **Step 2: Verify no TS errors**

```bash
npx tsc --noEmit
```

Expected: only pre-existing errors (if any), none from types/database.ts.

---

## Task 3: Extend `onboarding-store.ts`

**Files:**
- Modify: `stores/onboarding-store.ts`

- [ ] **Step 1: Replace the file content**

```typescript
import { create } from 'zustand';
import { Gender, SessionDuration, SportsCategory, UserProfile } from '@/types/database';

type ProfileData = Pick<
    UserProfile,
    | 'first_name'
    | 'last_name'
    | 'birth_date'
    | 'gender'
    | 'sports_category'
    | 'height_in_cm'
    | 'weight_in_kg'
    | 'preferred_workout_days'
    | 'preferred_session_duration'
    | 'timezone'
>;

export type TargetedCategory = {
    categoryId: string;
    slug: string;
    priority: number;
};

export type CategoryLevel = {
    categoryId: string;
    score: number;
};

type OnboardingStore = ProfileData & {
    targetedCategories: TargetedCategory[];
    categoryLevels: CategoryLevel[];
    equipmentIds: string[];
    environmentIds: string[]; // temporary, not written to DB
    set: (data: Partial<ProfileData & {
        targetedCategories: TargetedCategory[];
        categoryLevels: CategoryLevel[];
        equipmentIds: string[];
        environmentIds: string[];
    }>) => void;
    reset: () => void;
};

const initialState: Omit<OnboardingStore, 'set' | 'reset'> = {
    first_name: null,
    last_name: null,
    birth_date: null,
    gender: null,
    sports_category: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    timezone: null,
    targetedCategories: [],
    categoryLevels: [],
    equipmentIds: [],
    environmentIds: [],
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    ...initialState,
    set: (data) => set((state) => ({ ...state, ...data })),
    reset: () => set({ ...initialState }),
}));
```

---

## Task 4: Update `finishOnboarding` in `onboarding-progress-wrapper.tsx`

**Files:**
- Modify: `components/onboarding/onboarding-progress-wrapper.tsx`

- [ ] **Step 1: Replace the `finishOnboarding` function**

Find the existing `finishOnboarding` function and replace it:

```typescript
async function finishOnboarding() {
    try {
        trackerManager.track('onboarding_completed');
        if (session) {
            const {
                set,
                reset,
                targetedCategories,
                categoryLevels,
                equipmentIds,
                environmentIds,
                ...profileData
            } = onboardingData;

            await supabase
                .from('user_profiles')
                .update({ ...profileData, has_onboarded: true })
                .eq('id', session.user.id);

            if (targetedCategories.length > 0) {
                await supabase.from('user_targeted_categories').insert(
                    targetedCategories.map(({ categoryId, priority }) => ({
                        user_id: session.user.id,
                        category_id: categoryId,
                        priority,
                    }))
                );
            }

            if (categoryLevels.length > 0) {
                await supabase.from('user_category_levels').insert(
                    categoryLevels.map(({ categoryId, score }) => ({
                        user_id: session.user.id,
                        category_id: categoryId,
                        level_score: score,
                    }))
                );
            }

            if (equipmentIds.length > 0) {
                await supabase.from('user_equipments').insert(
                    equipmentIds.map((equipment_id) => ({
                        user_id: session.user.id,
                        equipment_id,
                    }))
                );
            }

            reset();
            await refreshProfile();
        }
        const navigate = () => router.replace('/(tabs)');
        await openWithPlacement('onboarding_completed', navigate, undefined, navigate);
    } catch (error) {
        console.error('Error finishing onboarding:', error);
    }
}
```

---

## Task 5: Update `name-step.tsx`

**Files:**
- Modify: `components/onboarding/steps/name-step.tsx`

Add `last_name` input, switch from `useUserDataStore` to `useOnboardingStore`.

- [ ] **Step 1: Replace the file content**

```typescript
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

export function NameStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const lastNameRef = useRef<TextInput>(null);

    function validate(first: string, last: string) {
        const valid = first.trim().length >= 2 && last.trim().length >= 2;
        setCanContinue(valid);
        if (valid) {
            setStore({ first_name: first.trim(), last_name: last.trim() });
        }
    }

    function handleFirstChange(value: string) {
        setFirstName(value);
        validate(value, lastName);
    }

    function handleLastChange(value: string) {
        setLastName(value);
        validate(firstName, value);
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Text style={styles.headline}>Wie heißt du?</Text>
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={handleFirstChange}
                        placeholder="Vorname"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        autoFocus
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                        selectionColor="white"
                        textAlign="center"
                    />
                    <View style={styles.underline} />
                </View>
                <View style={styles.inputGroup}>
                    <TextInput
                        ref={lastNameRef}
                        style={styles.input}
                        value={lastName}
                        onChangeText={handleLastChange}
                        placeholder="Nachname"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        selectionColor="white"
                        textAlign="center"
                    />
                    <View style={styles.underline} />
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 32,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    inputGroup: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 8,
        width: '100%',
        textAlign: 'center',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
});
```

---

## Task 6: Create `birthday-step.tsx`

**Files:**
- Create: `components/onboarding/steps/birthday-step.tsx`

Three numeric inputs (DD / MM / YYYY) with auto-advance. Validates: date must be in the past, user ≥ 13 years old. Stores ISO string (`YYYY-MM-DD`).

- [ ] **Step 1: Create the file**

```typescript
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

function isValidDate(day: number, month: number, year: number): boolean {
    if (year < 1900 || year > new Date().getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function isAtLeast13(day: number, month: number, year: number): boolean {
    const birth = new Date(year, month - 1, day);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 13);
    return birth <= cutoff;
}

export function BirthdayStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);

    function validate(d: string, m: string, y: string) {
        const dd = parseInt(d, 10);
        const mm = parseInt(m, 10);
        const yy = parseInt(y, 10);
        if (y.length < 4) { setCanContinue(false); return; }
        if (!isValidDate(dd, mm, yy) || !isAtLeast13(dd, mm, yy)) {
            setCanContinue(false);
            return;
        }
        const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        setStore({ birth_date: iso });
        setCanContinue(true);
    }

    function handleDay(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 2);
        setDay(cleaned);
        if (cleaned.length === 2) monthRef.current?.focus();
        validate(cleaned, month, year);
    }

    function handleMonth(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 2);
        setMonth(cleaned);
        if (cleaned.length === 2) yearRef.current?.focus();
        validate(day, cleaned, year);
    }

    function handleYear(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 4);
        setYear(cleaned);
        validate(day, month, cleaned);
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Text style={styles.headline}>Wann wurdest du{'\n'}geboren?</Text>
                <View style={styles.row}>
                    <View style={styles.fieldWrap}>
                        <TextInput
                            style={styles.input}
                            value={day}
                            onChangeText={handleDay}
                            placeholder="TT"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={2}
                            autoFocus
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Tag</Text>
                    </View>
                    <Text style={styles.separator}>/</Text>
                    <View style={styles.fieldWrap}>
                        <TextInput
                            ref={monthRef}
                            style={styles.input}
                            value={month}
                            onChangeText={handleMonth}
                            placeholder="MM"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={2}
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Monat</Text>
                    </View>
                    <Text style={styles.separator}>/</Text>
                    <View style={[styles.fieldWrap, styles.yearField]}>
                        <TextInput
                            ref={yearRef}
                            style={styles.input}
                            value={year}
                            onChangeText={handleYear}
                            placeholder="JJJJ"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={4}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Jahr</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 40,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    fieldWrap: {
        alignItems: 'center',
        width: 64,
    },
    yearField: {
        width: 88,
    },
    input: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 8,
        width: '100%',
        textAlign: 'center',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
    label: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 6,
    },
    separator: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 28,
        fontWeight: '300',
        marginBottom: 10,
    },
});
```

---

## Task 7: Update `gender-step.tsx`

**Files:**
- Modify: `components/onboarding/steps/gender-step.tsx`

Fix: values must match DB enum (`'male'`, `'female'`, `'other'`). Switch to `useOnboardingStore`.

- [ ] **Step 1: Replace the file content**

```typescript
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Gender } from '@/types/database';

const OPTIONS: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Männlich' },
    { value: 'female', label: 'Weiblich' },
    { value: 'other', label: 'Divers' },
];

export function GenderStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<Gender | null>(null);

    function select(value: Gender) {
        setSelected(value);
        setStore({ gender: value });
        setCanContinue(true);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dein Geschlecht</Text>
            <View style={styles.options}>
                {OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.option, selected === opt.value && styles.optionSelected]}
                        onPress={() => select(opt.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.optionText, selected === opt.value && styles.optionTextSelected]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 36,
    },
    options: { gap: 12 },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 17,
        fontWeight: '600',
    },
    optionTextSelected: { color: 'white' },
});
```

---

## Task 8: Create `body-step.tsx`

**Files:**
- Create: `components/onboarding/steps/body-step.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

export function BodyStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const weightRef = useRef<TextInput>(null);

    function validate(h: string, w: string) {
        const hVal = parseInt(h, 10);
        const wVal = parseFloat(w);
        const valid =
            !isNaN(hVal) && hVal >= 50 && hVal <= 300 &&
            !isNaN(wVal) && wVal >= 20 && wVal <= 500;
        setCanContinue(valid);
        if (valid) {
            setStore({ height_in_cm: hVal, weight_in_kg: wVal });
        }
    }

    function handleHeight(val: string) {
        const cleaned = val.replace(/\D/g, '');
        setHeight(cleaned);
        validate(cleaned, weight);
    }

    function handleWeight(val: string) {
        const cleaned = val.replace(/[^0-9.]/g, '');
        setWeight(cleaned);
        validate(height, cleaned);
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Text style={styles.headline}>Körpermaße</Text>
                <View style={styles.row}>
                    <View style={styles.fieldWrap}>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                value={height}
                                onChangeText={handleHeight}
                                placeholder="180"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="number-pad"
                                maxLength={3}
                                autoFocus
                                returnKeyType="next"
                                onSubmitEditing={() => weightRef.current?.focus()}
                                selectionColor="white"
                                textAlign="center"
                            />
                            <Text style={styles.unit}>cm</Text>
                        </View>
                        <View style={styles.underline} />
                        <Text style={styles.label}>Größe</Text>
                    </View>
                    <View style={styles.fieldWrap}>
                        <View style={styles.inputRow}>
                            <TextInput
                                ref={weightRef}
                                style={styles.input}
                                value={weight}
                                onChangeText={handleWeight}
                                placeholder="75"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="decimal-pad"
                                maxLength={5}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor="white"
                                textAlign="center"
                            />
                            <Text style={styles.unit}>kg</Text>
                        </View>
                        <View style={styles.underline} />
                        <Text style={styles.label}>Gewicht</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 48,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: 32,
    },
    fieldWrap: {
        alignItems: 'center',
        width: 100,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    input: {
        color: 'white',
        fontSize: 36,
        fontWeight: '700',
        paddingVertical: 8,
        textAlign: 'center',
        minWidth: 60,
    },
    unit: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 18,
        fontWeight: '500',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
    label: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 6,
    },
});
```

---

## Task 9: Create `sport-step.tsx`

**Files:**
- Create: `components/onboarding/steps/sport-step.tsx`

Grouped grid, single-select. Stores `sports_category` in onboarding store.

- [ ] **Step 1: Create the file**

```typescript
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { SportsCategory } from '@/types/database';

type SportItem = { value: SportsCategory; label: string };

const GROUPS: { title: string; sports: SportItem[] }[] = [
    {
        title: 'Kampfsport',
        sports: [
            { value: 'boxing', label: 'Boxen' },
            { value: 'mma', label: 'MMA' },
            { value: 'wrestling', label: 'Wrestling' },
            { value: 'judo', label: 'Judo' },
            { value: 'bjj', label: 'BJJ' },
            { value: 'kickboxing', label: 'Kickboxen' },
            { value: 'karate', label: 'Karate' },
            { value: 'taekwondo', label: 'Taekwondo' },
        ],
    },
    {
        title: 'Teamsport',
        sports: [
            { value: 'football', label: 'American Football' },
            { value: 'basketball', label: 'Basketball' },
            { value: 'volleyball', label: 'Volleyball' },
            { value: 'handball', label: 'Handball' },
            { value: 'rugby', label: 'Rugby' },
            { value: 'hockey', label: 'Hockey' },
            { value: 'soccer', label: 'Fußball' },
        ],
    },
    {
        title: 'Leichtathletik',
        sports: [
            { value: 'sprinting', label: 'Sprint' },
            { value: 'jumping', label: 'Sprung' },
            { value: 'throwing', label: 'Wurf' },
        ],
    },
    {
        title: 'Kraft',
        sports: [
            { value: 'powerlifting', label: 'Powerlifting' },
            { value: 'weightlifting', label: 'Gewichtheben' },
            { value: 'crossfit', label: 'CrossFit' },
            { value: 'bodybuilding', label: 'Bodybuilding' },
        ],
    },
    {
        title: 'Ausdauer',
        sports: [
            { value: 'running', label: 'Laufen' },
            { value: 'cycling', label: 'Radfahren' },
            { value: 'swimming', label: 'Schwimmen' },
            { value: 'triathlon', label: 'Triathlon' },
        ],
    },
    {
        title: 'Racket',
        sports: [
            { value: 'tennis', label: 'Tennis' },
            { value: 'badminton', label: 'Badminton' },
            { value: 'squash', label: 'Squash' },
        ],
    },
    {
        title: 'Sonstiges',
        sports: [
            { value: 'gymnastics', label: 'Turnen' },
            { value: 'climbing', label: 'Klettern' },
            { value: 'other', label: 'Anderes' },
        ],
    },
];

export function SportStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<SportsCategory | null>(null);

    function select(value: SportsCategory) {
        setSelected(value);
        setStore({ sports_category: value });
        setCanContinue(true);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Deine Sportart</Text>
            {GROUPS.map((group) => (
                <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <View style={styles.grid}>
                        {group.sports.map((sport) => (
                            <TouchableOpacity
                                key={sport.value}
                                style={[styles.chip, selected === sport.value && styles.chipSelected]}
                                onPress={() => select(sport.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, selected === sport.value && styles.chipTextSelected]}>
                                    {sport.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 24,
    },
    group: { marginBottom: 20 },
    groupTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    chipText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextSelected: { color: 'white' },
    bottomSpacer: { height: 24 },
});
```

---

## Task 10: Create `category-focus-step.tsx`

**Files:**
- Create: `components/onboarding/steps/category-focus-step.tsx`

Phase 1: multi-select. Phase 2: rank with Up/Down buttons. Stores `targetedCategories` with slug and priority.

- [ ] **Step 1: Create the file**

```typescript
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore, TargetedCategory } from '@/stores/onboarding-store';

type CategoryItem = { id: string; slug: string; label: string };

// Category IDs are fetched from DB at runtime; we use a static list for ordering.
// Actual UUIDs are resolved by querying Supabase in useEffect.
const CATEGORY_LABELS: Record<string, string> = {
    strength: 'Kraft',
    jumps: 'Sprünge',
    lower_body_plyometrics: 'Unterkörper Plyometrie',
    upper_body_plyometrics: 'Oberkörper Plyometrie',
    mobility: 'Mobilität',
};

import { useEffect } from 'react';
import { supabase } from '@/services/supabase/client';

export function CategoryFocusStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);

    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [ranked, setRanked] = useState<CategoryItem[]>([]);
    const [phase, setPhase] = useState<'select' | 'rank'>('select');

    useEffect(() => {
        supabase.from('categories').select('id, slug').then(({ data }) => {
            if (data) {
                setCategories(
                    data.map((c) => ({ id: c.id, slug: c.slug, label: CATEGORY_LABELS[c.slug] ?? c.slug }))
                );
            }
        });
    }, []);

    function toggleCategory(cat: CategoryItem) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(cat.id)) {
                next.delete(cat.id);
            } else {
                next.add(cat.id);
            }
            setCanContinue(next.size > 0);
            return next;
        });
    }

    function enterRankPhase() {
        const orderedSelected = categories.filter((c) => selected.has(c.id));
        setRanked(orderedSelected);
        setPhase('rank');
    }

    function moveUp(index: number) {
        if (index === 0) return;
        setRanked((prev) => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            saveRanked(next);
            return next;
        });
    }

    function moveDown(index: number) {
        setRanked((prev) => {
            if (index === prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            saveRanked(next);
            return next;
        });
    }

    function saveRanked(items: CategoryItem[]) {
        const payload: TargetedCategory[] = items.map((c, i) => ({
            categoryId: c.id,
            slug: c.slug,
            priority: i + 1,
        }));
        setStore({ targetedCategories: payload });
    }

    if (phase === 'select') {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Deine Ziele</Text>
                <Text style={styles.subtitle}>Wähle die Bereiche die du verbessern möchtest.</Text>
                <View style={styles.list}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.option, selected.has(cat.id) && styles.optionSelected]}
                            onPress={() => toggleCategory(cat)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.optionText, selected.has(cat.id) && styles.optionTextSelected]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {selected.size > 0 && (
                    <TouchableOpacity style={styles.rankButton} onPress={enterRankPhase} activeOpacity={0.8}>
                        <Text style={styles.rankButtonText}>Priorität festlegen →</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Priorität</Text>
            <Text style={styles.subtitle}>Ordne deine Ziele — das Wichtigste zuerst.</Text>
            <View style={styles.list}>
                {ranked.map((cat, index) => (
                    <View key={cat.id} style={styles.rankRow}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>
                        <Text style={styles.rankLabel}>{cat.label}</Text>
                        <View style={styles.arrowGroup}>
                            <TouchableOpacity
                                onPress={() => moveUp(index)}
                                disabled={index === 0}
                                style={[styles.arrow, index === 0 && styles.arrowDisabled]}
                            >
                                <Text style={styles.arrowText}>↑</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => moveDown(index)}
                                disabled={index === ranked.length - 1}
                                style={[styles.arrow, index === ranked.length - 1 && styles.arrowDisabled]}
                            >
                                <Text style={styles.arrowText}>↓</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },
    list: { gap: 10 },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
    optionTextSelected: { color: 'white' },
    rankButton: {
        marginTop: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    rankButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    rankNumber: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', width: 20 },
    rankLabel: { color: 'white', fontSize: 16, fontWeight: '600', flex: 1 },
    arrowGroup: { flexDirection: 'row', gap: 8 },
    arrow: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 8,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowDisabled: { opacity: 0.2 },
    arrowText: { color: 'white', fontSize: 16 },
});
```

- [ ] **Step 2: Handle initial `saveRanked` call when entering rank phase**

In `enterRankPhase`, call `saveRanked` after setting `ranked` so the store is immediately populated even if the user doesn't reorder:

```typescript
function enterRankPhase() {
    const orderedSelected = categories.filter((c) => selected.has(c.id));
    setRanked(orderedSelected);
    saveRanked(orderedSelected); // populate store immediately
    setPhase('rank');
}
```

---

## Task 11: Create `category-level-step.tsx`

**Files:**
- Create: `components/onboarding/steps/category-level-step.tsx`

Reads `targetedCategories` from store. Shows 5 preset level buttons per category. Stores `categoryLevels`.

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingStore, CategoryLevel } from '@/stores/onboarding-store';

type LevelPreset = { label: string; score: number; description: string };

const LEVEL_PRESETS: LevelPreset[] = [
    { label: 'Anfänger', score: 15, description: 'Keine oder wenig Erfahrung' },
    { label: 'Einsteiger', score: 35, description: 'Grundlagen vorhanden' },
    { label: 'Fortgeschritten', score: 55, description: 'Regelmäßiges Training' },
    { label: 'Erfahren', score: 75, description: 'Jahrelange Erfahrung' },
    { label: 'Elite', score: 90, description: 'Wettkampfniveau' },
];

const CATEGORY_LABELS: Record<string, string> = {
    strength: 'Kraft',
    jumps: 'Sprünge',
    lower_body_plyometrics: 'Unterkörper Plyometrie',
    upper_body_plyometrics: 'Oberkörper Plyometrie',
    mobility: 'Mobilität',
};

export function CategoryLevelStep() {
    const targetedCategories = useOnboardingStore((s) => s.targetedCategories);
    const setStore = useOnboardingStore((s) => s.set);

    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        targetedCategories.forEach((c) => { initial[c.categoryId] = 35; });
        return initial;
    });

    useEffect(() => {
        // Initialize store with default scores
        const levels: CategoryLevel[] = targetedCategories.map((c) => ({
            categoryId: c.categoryId,
            score: scores[c.categoryId] ?? 35,
        }));
        setStore({ categoryLevels: levels });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function selectScore(categoryId: string, score: number) {
        setScores((prev) => {
            const next = { ...prev, [categoryId]: score };
            const levels: CategoryLevel[] = targetedCategories.map((c) => ({
                categoryId: c.categoryId,
                score: next[c.categoryId] ?? 35,
            }));
            setStore({ categoryLevels: levels });
            return next;
        });
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Dein Level</Text>
            <Text style={styles.subtitle}>Schätze dich realistisch ein — das bestimmt den Trainingsplan.</Text>
            {targetedCategories.map((cat) => (
                <View key={cat.categoryId} style={styles.card}>
                    <Text style={styles.cardTitle}>{CATEGORY_LABELS[cat.slug] ?? cat.slug}</Text>
                    <View style={styles.presets}>
                        {LEVEL_PRESETS.map((preset) => {
                            const isSelected = scores[cat.categoryId] === preset.score;
                            return (
                                <TouchableOpacity
                                    key={preset.score}
                                    style={[styles.preset, isSelected && styles.presetSelected]}
                                    onPress={() => selectScore(cat.categoryId, preset.score)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                                        {preset.label}
                                    </Text>
                                    <Text style={[styles.presetDesc, isSelected && styles.presetDescSelected]}>
                                        {preset.description}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },
    card: { marginBottom: 28 },
    cardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    presets: { gap: 8 },
    preset: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    presetSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    presetLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
    presetLabelSelected: { color: 'white' },
    presetDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    presetDescSelected: { color: 'rgba(255,255,255,0.6)' },
});
```

---

## Task 12: Create `environment-step.tsx`

**Files:**
- Create: `components/onboarding/steps/environment-step.tsx`

- [ ] **Step 1: Fetch environment IDs from Supabase on mount and display multi-select**

```typescript
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';

type EnvItem = { id: string; slug: string; label: string; description: string };

const ENV_META: Record<string, { label: string; description: string }> = {
    gym: { label: 'Fitnessstudio', description: 'Vollständige Ausstattung' },
    outdoor: { label: 'Outdoor', description: 'Parks, Sportplätze' },
    home: { label: 'Zuhause', description: 'Heimtraining' },
};

export function EnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        supabase.from('environments').select('id, slug').then(({ data }) => {
            if (data) {
                setEnvironments(
                    data.map((e) => ({
                        id: e.id,
                        slug: e.slug,
                        label: ENV_META[e.slug]?.label ?? e.slug,
                        description: ENV_META[e.slug]?.description ?? '',
                    }))
                );
            }
        });
    }, []);

    function toggle(env: EnvItem) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(env.id)) {
                next.delete(env.id);
            } else {
                next.add(env.id);
            }
            const ids = Array.from(next);
            setStore({ environmentIds: ids });
            setCanContinue(ids.length > 0);
            return next;
        });
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Wo trainierst du?</Text>
            <Text style={styles.subtitle}>Du kannst mehrere Umgebungen auswählen.</Text>
            <View style={styles.list}>
                {environments.map((env) => (
                    <TouchableOpacity
                        key={env.id}
                        style={[styles.option, selected.has(env.id) && styles.optionSelected]}
                        onPress={() => toggle(env)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.optionTitle, selected.has(env.id) && styles.optionTitleSelected]}>
                            {env.label}
                        </Text>
                        <Text style={styles.optionDesc}>{env.description}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },
    list: { gap: 12 },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '700' },
    optionTitleSelected: { color: 'white' },
    optionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});
```

---

## Task 13: Create `equipment-step.tsx`

**Files:**
- Create: `components/onboarding/steps/equipment-step.tsx`

Reads `environmentIds` from store. Fetches all equipment for those environments (deduplicated). All preselected. User can deselect.

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingStore } from '@/stores/onboarding-store';

type EquipmentItem = { id: string; slug: string; label: string };

const EQUIPMENT_LABELS: Record<string, string> = {
    barbell: 'Langhantel',
    dumbbell: 'Kurzhantel',
    kettlebell: 'Kettlebell',
    weight_belt: 'Gewichtsgürtel',
    squat_rack: 'Squat Rack',
    bench: 'Flachbank',
    incline_bench: 'Schrägbank',
    pull_up_bar: 'Klimmzugstange',
    dip_bar: 'Dip Station',
    cable_machine: 'Kabelzug',
    plyo_box: 'Plyo Box',
    medicine_ball: 'Medizinball',
    agility_cones: 'Hütchen',
    resistance_band: 'Widerstandsband',
    foam_roller: 'Schaumstoffrolle',
    sled: 'Schlitten',
    agility_ladder: 'Koordinationsleiter',
};

import { supabase } from '@/services/supabase/client';

export function EquipmentStep() {
    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const setStore = useOnboardingStore((s) => s.set);

    const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
    const [deselected, setDeselected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('environment_equipments')
                .select('equipment:equipments(id, slug)')
                .in('environment_id', environmentIds);

            if (data) {
                const map = new Map<string, EquipmentItem>();
                data.forEach((row: any) => {
                    const eq = row.equipment;
                    if (eq && !map.has(eq.id)) {
                        map.set(eq.id, {
                            id: eq.id,
                            slug: eq.slug,
                            label: EQUIPMENT_LABELS[eq.slug] ?? eq.slug,
                        });
                    }
                });
                const items = Array.from(map.values());
                setEquipments(items);
                setStore({ equipmentIds: items.map((e) => e.id) });
            }
            setLoading(false);
        }
        if (environmentIds.length > 0) load();
        else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggle(id: string) {
        setDeselected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            const active = equipments.filter((e) => !next.has(e.id)).map((e) => e.id);
            setStore({ equipmentIds: active });
            return next;
        });
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color="white" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Dein Equipment</Text>
            <Text style={styles.subtitle}>Alles vorausgewählt — deaktiviere was du nicht hast.</Text>
            <View style={styles.grid}>
                {equipments.map((eq) => {
                    const active = !deselected.has(eq.id);
                    return (
                        <TouchableOpacity
                            key={eq.id}
                            style={[styles.chip, !active && styles.chipInactive]}
                            onPress={() => toggle(eq.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.chipText, !active && styles.chipTextInactive]}>
                                {eq.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    chipInactive: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'transparent',
    },
    chipText: { color: 'white', fontSize: 14, fontWeight: '500' },
    chipTextInactive: { color: 'rgba(255,255,255,0.3)' },
});
```

---

## Task 14: Create `workout-prefs-step.tsx`

**Files:**
- Create: `components/onboarding/steps/workout-prefs-step.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { SessionDuration } from '@/types/database';

const DAYS: { value: number; label: string }[] = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Di' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 7, label: 'So' },
];

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

export function WorkoutPrefsStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [selectedDuration, setSelectedDuration] = useState<SessionDuration | null>(null);

    function validate(days: Set<number>, duration: SessionDuration | null) {
        setCanContinue(days.size > 0 && duration !== null);
    }

    function toggleDay(value: number) {
        setSelectedDays((prev) => {
            const next = new Set(prev);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            const days = Array.from(next);
            setStore({ preferred_workout_days: days });
            validate(next, selectedDuration);
            return next;
        });
    }

    function selectDuration(value: SessionDuration) {
        setSelectedDuration(value);
        setStore({ preferred_session_duration: value });
        validate(selectedDays, value);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Training planen</Text>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Trainingstage</Text>
                <View style={styles.dayRow}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day.value}
                            style={[styles.dayChip, selectedDays.has(day.value) && styles.dayChipSelected]}
                            onPress={() => toggleDay(day.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayText, selectedDays.has(day.value) && styles.dayTextSelected]}>
                                {day.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Einheitsdauer</Text>
                <View style={styles.durationGrid}>
                    {DURATIONS.map((d) => (
                        <TouchableOpacity
                            key={d.value}
                            style={[styles.durationChip, selectedDuration === d.value && styles.durationChipSelected]}
                            onPress={() => selectDuration(d.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.durationText, selectedDuration === d.value && styles.durationTextSelected]}>
                                {d.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 36 },
    section: { marginBottom: 36 },
    sectionLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    dayRow: { flexDirection: 'row', gap: 8 },
    dayChip: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    dayChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    dayText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    dayTextSelected: { color: 'white' },
    durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    durationChip: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    durationChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    durationText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
    durationTextSelected: { color: 'white' },
});
```

---

## Task 15: Wire up `app/onboarding.tsx`

**Files:**
- Modify: `app/onboarding.tsx`

- [ ] **Step 1: Replace the file content**

```typescript
import { OnboardingProgressWrapper } from '@/components/onboarding/onboarding-progress-wrapper';
import { OnboardingStep } from '@/components/onboarding/types';
import { NameStep } from '@/components/onboarding/steps/name-step';
import { BirthdayStep } from '@/components/onboarding/steps/birthday-step';
import { GenderStep } from '@/components/onboarding/steps/gender-step';
import { BodyStep } from '@/components/onboarding/steps/body-step';
import { SportStep } from '@/components/onboarding/steps/sport-step';
import { CategoryFocusStep } from '@/components/onboarding/steps/category-focus-step';
import { CategoryLevelStep } from '@/components/onboarding/steps/category-level-step';
import { EnvironmentStep } from '@/components/onboarding/steps/environment-step';
import { EquipmentStep } from '@/components/onboarding/steps/equipment-step';
import { WorkoutPrefsStep } from '@/components/onboarding/steps/workout-prefs-step';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';

const steps: OnboardingStep[] = [
    { component: NameStep, theme: 'dark', initialCanContinue: false },
    { component: BirthdayStep, theme: 'dark', initialCanContinue: false },
    { component: GenderStep, theme: 'dark', initialCanContinue: false },
    { component: BodyStep, theme: 'dark', initialCanContinue: false },
    { component: SportStep, theme: 'dark', initialCanContinue: false },
    { component: CategoryFocusStep, theme: 'dark', initialCanContinue: false },
    { component: CategoryLevelStep, theme: 'dark', initialCanContinue: true },
    { component: EnvironmentStep, theme: 'dark', initialCanContinue: false },
    { component: EquipmentStep, theme: 'dark', initialCanContinue: true },
    { component: WorkoutPrefsStep, theme: 'dark', initialCanContinue: false },
    { component: CompleteStep, theme: 'dark', continueButtonText: 'Los geht\'s' },
];

export default function OnboardingScreen() {
    return <OnboardingProgressWrapper steps={steps} />;
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
npx expo start --no-dev
```

Expected: bundler starts without TS/import errors. Navigate to onboarding screen and step through manually.

---

## Self-Review

**Spec coverage:**
- ✅ Step 1 Name (first + last)
- ✅ Step 2 Birthday
- ✅ Step 3 Gender (enum fixed)
- ✅ Step 4 Height + weight
- ✅ Step 5 Sport category (from DB enum)
- ✅ Step 6 Category focus + ranking by priority
- ✅ Step 7 Category self-assessment 1–100 with reference labels
- ✅ Step 8 Environment multi-select
- ✅ Step 9 Equipment preselected, deselect option
- ✅ Step 10 Workout days + session duration
- ✅ Step 11 Complete
- ✅ DB migrations (priority column, level_score 1–100)
- ✅ Batch insert in finishOnboarding
- ✅ `user_focused_category` → resolved as `priority` column in `user_targeted_categories`

**Type consistency check:**
- `TargetedCategory` defined in Task 3, imported in Tasks 10 + 4 ✅
- `CategoryLevel` defined in Task 3, imported in Tasks 11 + 4 ✅
- `SportsCategory` defined in Task 2, used in Task 9 ✅
- `Gender` defined in Task 2, used in Task 7 ✅
- `SessionDuration` defined in Task 2, used in Task 14 ✅
- `environmentIds` set in Task 12, read in Task 13 ✅
- `targetedCategories` (with `slug`) set in Task 10, read in Task 11 ✅
