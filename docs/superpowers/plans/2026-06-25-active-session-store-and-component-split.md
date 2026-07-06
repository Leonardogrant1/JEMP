# Active Session UI Store + Component Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a non-persisted `useActiveSessionUIStore` (Zustand) that holds all ephemeral UI state and the session data, then extract focused sub-components from the monolithic `app/active-session/[id].tsx`.

**Architecture:** A second Zustand store (no `persist`) owns all `useState` values currently living in the screen plus the `SessionDetail` from React Query. The screen syncs query data into the store via `useEffect` and retains only refs (interval handles, audio players) and Reanimated shared values that cannot live in Zustand. Extracted components read slices from the store via selectors — no prop drilling for state. Handlers (`handleLogSet`, `handleSkipSet`, …) stay in the screen and are passed as props only to their immediate consumer.

**Tech Stack:** Zustand 5, React Native / Expo Router, React Query, Reanimated 3, TypeScript strict

## Global Constraints

- No `persist` middleware on the new store — state is ephemeral per screen visit
- Keep the existing `stores/active-session-store.ts` (crash-recovery + pending sets) untouched
- `SessionDetail` type is exported from `queries/use-session-detail-query.ts` — import from there, do not duplicate
- `FlatExercise` type currently defined inline in `[id].tsx` — move to the new store file so components can import it
- All new component files go in `components/active-session/`
- No new third-party dependencies

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `stores/active-session-ui-store.ts` | All UI state + session data, actions, derived selectors |
| **Modify** | `app/active-session/[id].tsx` | Remove `useState`s, sync session into store, keep refs + Reanimated + handlers |
| **Create** | `components/active-session/SessionHeader.tsx` | Header bar: back button, session name, progress bar |
| **Create** | `components/active-session/ExerciseCard.tsx` | Exercise title, video hero, equipment chips (receives slide animation style as prop) |
| **Create** | `components/active-session/RestTimerCard.tsx` | Rest timer countdown card |
| **Create** | `components/active-session/LogSetSection.tsx` | Set logging: bilateral / unilateral / duration inputs + timers (receives slide animation style as prop) |
| **Replace** | `components/active-session/BottomCTAs.tsx` → `BottomBar.tsx` | Log + skip buttons; receives `onLogSet` / `onSkipSet` as props |

---

## Task 1: Create `stores/active-session-ui-store.ts`

**Files:**
- Create: `stores/active-session-ui-store.ts`

**Interfaces:**
- Produces: `useActiveSessionUIStore`, `FlatExercise` type — consumed by all subsequent tasks

- [ ] **Step 1: Write the store**

```ts
// stores/active-session-ui-store.ts
import { create } from 'zustand';
import type { SessionDetail } from '@/queries/use-session-detail-query';

// ── Types ────────────────────────────────────────────────────────────────────

export type FlatExercise = {
    id: string;
    blockId: string;
    blockType: { slug: string } | null;
    exercise: {
        id: string;
        name: string;
        body_region: string | null;
        movement_pattern: string | null;
        youtube_url: string | null;
        thumbnail_storage_path: string | null;
        video_storage_path: string | null;
        is_unilateral: boolean;
        measurement_type: string;
        equipment: { slug: string; name_i18n: Record<string, string> | null }[];
    };
    target_sets: number | null;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_seconds: number | null;
    target_rest_seconds: number | null;
    target_load_type: string | null;
    target_load_value: number | null;
};

type PreviousSet = { reps: string; load: string; repsRight?: string };

// ── State ─────────────────────────────────────────────────────────────────────

type ActiveSessionUIState = {
    // Server data
    session: SessionDetail | null;
    allExercises: FlatExercise[];

    // Input fields
    reps: string;
    load: string;
    repsLeft: string;
    repsRight: string;
    loadLeft: string;
    loadRight: string;

    // Display
    previousSet: PreviousSet | null;
    suggestionHint: string | null;

    // Rest timer
    restSeconds: number;
    totalRestSeconds: number;
    isResting: boolean;

    // Exercise timer — bilateral
    exerciseDuration: number;
    exerciseTimerActive: boolean;

    // Exercise timer — unilateral
    exerciseDurationLeft: number;
    exerciseDurationRight: number;
    exerciseTimerActiveSide: 'left' | 'right' | null;

    // UI flow
    initialized: boolean;
    isCompleting: boolean;
    showCongrats: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

type ActiveSessionUIActions = {
    setSession: (session: SessionDetail, allExercises: FlatExercise[]) => void;

    setReps: (v: string) => void;
    setLoad: (v: string) => void;
    setRepsLeft: (v: string) => void;
    setRepsRight: (v: string) => void;
    setLoadLeft: (v: string) => void;
    setLoadRight: (v: string) => void;

    setPreviousSet: (v: PreviousSet | null) => void;
    setSuggestionHint: (v: string | null) => void;

    setRestSeconds: (v: number | ((prev: number) => number)) => void;
    setTotalRestSeconds: (v: number | ((prev: number) => number)) => void;
    setIsResting: (v: boolean) => void;

    setExerciseDuration: (v: number | ((prev: number) => number)) => void;
    setExerciseTimerActive: (v: boolean) => void;

    setExerciseDurationLeft: (v: number | ((prev: number) => number)) => void;
    setExerciseDurationRight: (v: number | ((prev: number) => number)) => void;
    setExerciseTimerActiveSide: (v: 'left' | 'right' | null) => void;

    setInitialized: (v: boolean) => void;
    setIsCompleting: (v: boolean) => void;
    setShowCongrats: (v: boolean) => void;

    resetInputs: () => void;
    reset: () => void;
};

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL: ActiveSessionUIState = {
    session: null,
    allExercises: [],
    reps: '',
    load: '',
    repsLeft: '',
    repsRight: '',
    loadLeft: '',
    loadRight: '',
    previousSet: null,
    suggestionHint: null,
    restSeconds: 0,
    totalRestSeconds: 0,
    isResting: false,
    exerciseDuration: 0,
    exerciseTimerActive: false,
    exerciseDurationLeft: 0,
    exerciseDurationRight: 0,
    exerciseTimerActiveSide: null,
    initialized: false,
    isCompleting: false,
    showCongrats: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActiveSessionUIStore = create<ActiveSessionUIState & ActiveSessionUIActions>()(
    (set) => ({
        ...INITIAL,

        setSession: (session, allExercises) => set({ session, allExercises }),

        setReps: (reps) => set({ reps }),
        setLoad: (load) => set({ load }),
        setRepsLeft: (repsLeft) => set({ repsLeft }),
        setRepsRight: (repsRight) => set({ repsRight }),
        setLoadLeft: (loadLeft) => set({ loadLeft }),
        setLoadRight: (loadRight) => set({ loadRight }),

        setPreviousSet: (previousSet) => set({ previousSet }),
        setSuggestionHint: (suggestionHint) => set({ suggestionHint }),

        setRestSeconds: (v) =>
            set(s => ({ restSeconds: typeof v === 'function' ? v(s.restSeconds) : v })),
        setTotalRestSeconds: (v) =>
            set(s => ({ totalRestSeconds: typeof v === 'function' ? v(s.totalRestSeconds) : v })),
        setIsResting: (isResting) => set({ isResting }),

        setExerciseDuration: (v) =>
            set(s => ({ exerciseDuration: typeof v === 'function' ? v(s.exerciseDuration) : v })),
        setExerciseTimerActive: (exerciseTimerActive) => set({ exerciseTimerActive }),

        setExerciseDurationLeft: (v) =>
            set(s => ({ exerciseDurationLeft: typeof v === 'function' ? v(s.exerciseDurationLeft) : v })),
        setExerciseDurationRight: (v) =>
            set(s => ({ exerciseDurationRight: typeof v === 'function' ? v(s.exerciseDurationRight) : v })),
        setExerciseTimerActiveSide: (exerciseTimerActiveSide) => set({ exerciseTimerActiveSide }),

        setInitialized: (initialized) => set({ initialized }),
        setIsCompleting: (isCompleting) => set({ isCompleting }),
        setShowCongrats: (showCongrats) => set({ showCongrats }),

        resetInputs: () => set({
            reps: '', load: '', repsLeft: '', repsRight: '', loadLeft: '', loadRight: '',
            exerciseDuration: 0, exerciseTimerActive: false,
            exerciseDurationLeft: 0, exerciseDurationRight: 0, exerciseTimerActiveSide: null,
        }),

        reset: () => set(INITIAL),
    })
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add stores/active-session-ui-store.ts
git commit -m "feat: add active-session UI store (no persist) with all ephemeral state"
```

---

## Task 2: Migrate `[id].tsx` to use the new store

**Files:**
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` from `@/stores/active-session-ui-store`
- Consumes: `FlatExercise` type from `@/stores/active-session-ui-store`
- The screen remains a single component — no extraction yet

- [ ] **Step 1: Replace `useState` imports with store reads**

At the top of `ActiveSessionScreen`, replace every `useState` call with a selector. Group them after the existing `store` constant:

```tsx
// Remove the FlatExercise type definition from this file (it moved to the store)
// Remove: import { useState, ... } — keep useCallback, useEffect, useMemo, useRef
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import type { FlatExercise } from '@/stores/active-session-ui-store';

// inside ActiveSessionScreen:
const store = useActiveSessionStore();           // existing — crash-recovery
const ui = useActiveSessionUIStore();            // new — UI state

// Destructure what this file still needs directly
const {
    reps, load, repsLeft, repsRight, loadLeft, loadRight,
    previousSet, suggestionHint,
    restSeconds, totalRestSeconds, isResting,
    exerciseDuration, exerciseTimerActive,
    exerciseDurationLeft, exerciseDurationRight, exerciseTimerActiveSide,
    initialized, isCompleting, showCongrats,
    setSession, setReps, setLoad, setRepsLeft, setRepsRight, setLoadLeft, setLoadRight,
    setPreviousSet, setSuggestionHint,
    setRestSeconds, setTotalRestSeconds, setIsResting,
    setExerciseDuration, setExerciseTimerActive,
    setExerciseDurationLeft, setExerciseDurationRight, setExerciseTimerActiveSide,
    setInitialized, setIsCompleting, setShowCongrats,
    resetInputs,
} = ui;
```

- [ ] **Step 2: Sync session data into the store**

Replace the `allExercises` useMemo and add a sync effect. The `exerciseIdx` / `currentSet` local state variables are driven by the crash-recovery store — keep them as-is:

```tsx
// Keep this useMemo (allExercises still needed locally for length checks + crash-recovery init)
const allExercises = useMemo<FlatExercise[]>(() => {
    if (!session) return [];
    return session.blocks.flatMap(block =>
        block.exercises.map(ex => ({
            ...ex,
            blockId: block.id,
            blockType: block.block_type,
        })),
    );
}, [session]);

// NEW: sync into UI store whenever session/allExercises change
useEffect(() => {
    if (session) setSession(session, allExercises);
}, [session, allExercises]);
```

- [ ] **Step 3: Remove `[exerciseIdx, currentSet]` local state — keep them driven by crash-recovery store**

`exerciseIdx` and `currentSet` are already tracked in `useActiveSessionStore`. The screen reads them from there (which it already does via `store.exerciseIdx` / `store.currentSet`). The local `useState` for these two + `initialized` can be replaced:

```tsx
// Remove:
// const [exerciseIdx, setExerciseIdx] = useState(0);
// const [currentSet, setCurrentSet] = useState(1);
// const [initialized, setInitialized] = useState(false);

// Read from crash-recovery store directly:
const exerciseIdx = store.exerciseIdx;
const currentSet = store.currentSet;
// initialized comes from ui store (already destructured above)
```

Update `saveProgress` to no longer call local setters (they are gone):

```tsx
const saveProgress = useCallback((exIdx: number, setNum: number) => {
    store.setProgress(exIdx, setNum);
}, [store]);
```

Update the restore-progress effect — replace `setExerciseIdx`, `setCurrentSet`, `setInitialized` with store actions:

```tsx
useEffect(() => {
    if (session && allExercises.length > 0 && !initialized) {
        if (store.sessionId === id) {
            store.setProgress(
                Math.min(store.exerciseIdx, allExercises.length - 1),
                store.currentSet,
            );
        } else {
            const savedIdx = Math.min(session.current_exercise_index, allExercises.length - 1);
            store.initSession(id!, savedIdx, session.current_set_number);
        }
        setInitialized(true);
    }
}, [session, allExercises.length, initialized]);
```

- [ ] **Step 4: Replace all remaining `setState` calls throughout handlers and effects**

Search for `setReps(`, `setLoad(`, `setRepsLeft(`, `setRepsRight(`, `setLoadLeft(`, `setLoadRight(`, `setPreviousSet(`, `setSuggestionHint(`, `setRestSeconds(`, `setTotalRestSeconds(`, `setIsResting(`, `setExerciseDuration(`, `setExerciseTimerActive(`, `setExerciseDurationLeft(`, `setExerciseDurationRight(`, `setExerciseTimerActiveSide(`, `setIsCompleting(`, `setShowCongrats(` — these are already destructured from `ui`, so calls remain the same. No text changes needed here, just confirm the destructuring covers all usage.

Also replace `resetInputs` call in the `on exercise change` effect:

```tsx
// In the "On exercise change: clear session state + timers" useEffect,
// replace the individual setters:
useEffect(() => {
    if (!current || !initialized) return;
    setPreviousSet(null);
    resetInputs();   // ← replaces 6 individual calls
    // timers are cleared via refs as before
    ...
}, [exerciseIdx, current?.id]);
```

- [ ] **Step 5: Clean up `store.clear()` in `completeSession`**

After `store.clear()` (crash-recovery store), also reset the UI store:

```tsx
store.clear();
ui.reset();
```

- [ ] **Step 6: Verify TypeScript + smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Open a session in the simulator. Navigate through 2 exercises with multiple sets — ensure logging, rest timer, and complete flow work correctly.

- [ ] **Step 7: Commit**

```bash
git add app/active-session/[id].tsx
git commit -m "refactor: migrate active-session screen state to useActiveSessionUIStore"
```

---

## Task 3: Extract `SessionHeader`

**Files:**
- Create: `components/active-session/SessionHeader.tsx`
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` (reads `session`, `allExercises`)
- Consumes: `useActiveSessionStore` (reads `exerciseIdx`)
- Props: `onBack: () => void`

- [ ] **Step 1: Create the component**

```tsx
// components/active-session/SessionHeader.tsx
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = { onBack: () => void };

export function SessionHeader({ onBack }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const session = useActiveSessionUIStore(s => s.session);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);

    return (
        <View style={[styles.header, { borderBottomColor: theme.borderStrong }]}>
            <Pressable onPress={onBack} style={styles.headerSide}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.headerCenter}>
                <JempText type="body-l" color={theme.textMuted} numberOfLines={1}>
                    {session?.name}
                </JempText>
                <View style={[styles.progressTrack, { backgroundColor: theme.borderStrong }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: allExercises.length > 0
                                    ? `${((exerciseIdx + 1) / allExercises.length) * 100}%` as any
                                    : '0%',
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                </View>
            </View>
            <View style={styles.headerSide} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    progressTrack: { width: '80%', height: 3, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
});
```

- [ ] **Step 2: Replace the header JSX in `[id].tsx`**

```tsx
// Remove the entire <View style={styles.header}> ... </View> block
// Add at the top of the component (after the hook calls):
import { SessionHeader } from '@/components/active-session/SessionHeader';

// In the return JSX, replace the header block with:
<SessionHeader onBack={leaveSession} />
```

Also delete the now-unused header styles from `StyleSheet.create` in `[id].tsx`:
`header`, `headerSide`, `headerCenter`, `progressTrack`, `progressFill`.

- [ ] **Step 3: TypeScript check + smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Verify header renders correctly: back button, session name, progress bar advances with each exercise.

- [ ] **Step 4: Commit**

```bash
git add components/active-session/SessionHeader.tsx app/active-session/[id].tsx
git commit -m "refactor: extract SessionHeader component"
```

---

## Task 4: Extract `ExerciseCard`

**Files:**
- Create: `components/active-session/ExerciseCard.tsx`
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` (reads `allExercises`), `useActiveSessionStore` (reads `exerciseIdx`)
- Props: `animatedStyle: StyleProp<AnimatedProps<ViewStyle>>`  (the Reanimated style from `exAnimStyle`)
- Depends on: `ExerciseVideoHero` component, `useTranslation`, `useColorScheme`

- [ ] **Step 1: Create the component**

```tsx
// components/active-session/ExerciseCard.tsx
import { ExerciseVideoHero } from '@/components/exercise-video-hero';
import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type Props = {
    animatedStyle: StyleProp<AnimatedProps<ViewStyle>>;
};

export function ExerciseCard({ animatedStyle }: Props) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const current = allExercises[exerciseIdx] ?? null;

    if (!current) return null;

    return (
        <Animated.View style={animatedStyle}>
            <View style={styles.titleRow}>
                <View style={styles.titleLeft}>
                    <JempText type="caption" color={GradientMid} style={styles.blockLabel}>
                        {current.blockType
                            ? t(`block_type.${current.blockType.slug}`).toUpperCase()
                            : t('ui.active_session').toUpperCase()}
                    </JempText>
                    <JempText type="hero">{current.exercise.name}</JempText>
                </View>
            </View>

            <ExerciseVideoHero
                key={current.exercise.id}
                videoStoragePath={current.exercise.video_storage_path}
                youtubeUrl={current.exercise.youtube_url}
                thumbnailStoragePath={current.exercise.thumbnail_storage_path}
                exerciseId={current.exercise.id}
            />

            {current.exercise.equipment?.length > 0 && (
                <View style={styles.equipmentSection}>
                    <JempText type="caption" color={theme.textMuted} style={styles.equipmentLabel}>
                        Benötigtes Equipment
                    </JempText>
                    <View style={styles.equipmentRow}>
                        {current.exercise.equipment.map((eq, i) => {
                            const label = (eq.name_i18n as any)?.[locale] ?? eq.slug;
                            return (
                                <View key={i} style={[styles.equipmentChip, { backgroundColor: theme.surface }]}>
                                    <JempText type="caption" color="#fff" style={styles.equipmentChipText}>
                                        {label}
                                    </JempText>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleLeft: { flex: 1, gap: 6 },
    blockLabel: { letterSpacing: 1.5 },
    equipmentSection: { gap: 12 },
    equipmentLabel: { letterSpacing: 0.5 },
    equipmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipmentChip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1, borderColor: GradientMid },
    equipmentChipText: { fontSize: 14, fontWeight: '500' },
});
```

- [ ] **Step 2: Replace in `[id].tsx`**

```tsx
import { ExerciseCard } from '@/components/active-session/ExerciseCard';

// Replace the <Animated.View style={exAnimStyle}> ... </Animated.View> block with:
<ExerciseCard animatedStyle={exAnimStyle} />
```

Delete the now-unused styles: `titleRow`, `titleLeft`, `blockLabel`, `equipmentSection`, `equipmentLabel`, `equipmentRow`, `equipmentChip`, `equipmentChipText`.

- [ ] **Step 3: TypeScript check + smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Verify the exercise title, video, and equipment chips render. Swipe to next exercise — confirm slide animation still fires.

- [ ] **Step 4: Commit**

```bash
git add components/active-session/ExerciseCard.tsx app/active-session/[id].tsx
git commit -m "refactor: extract ExerciseCard component"
```

---

## Task 5: Extract `RestTimerCard`

**Files:**
- Create: `components/active-session/RestTimerCard.tsx`
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` (reads `restSeconds`, `totalRestSeconds`, `isResting`)
- Props: `onStop: () => void` (calls the screen's `stopTimer`), `onAddTime: (seconds: number) => void`

- [ ] **Step 1: Create the component**

```tsx
// components/active-session/RestTimerCard.tsx
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

function formatTimer(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type Props = {
    onStop: () => void;
    onAddTime: (seconds: number) => void;
};

export function RestTimerCard({ onStop, onAddTime }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const restSeconds = useActiveSessionUIStore(s => s.restSeconds);
    const totalRestSeconds = useActiveSessionUIStore(s => s.totalRestSeconds);
    const isResting = useActiveSessionUIStore(s => s.isResting);

    if (!isResting) return null;

    return (
        <View style={[styles.timerCard, { backgroundColor: theme.surface }]}>
            <JempText type="caption" color={theme.textMuted} style={styles.timerLabel}>
                PAUSE
            </JempText>
            <JempText type="hero" gradient style={styles.timerDisplay}>
                {formatTimer(restSeconds)}
            </JempText>
            <View style={[styles.timerTrack, { backgroundColor: theme.borderStrong }]}>
                <View
                    style={[
                        styles.timerFill,
                        {
                            width: `${totalRestSeconds > 0
                                ? (1 - restSeconds / totalRestSeconds) * 100
                                : 100}%` as any,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            </View>
            <View style={styles.timerActions}>
                <Pressable
                    style={[styles.timerBtn, { backgroundColor: theme.surface }]}
                    onPress={() => onAddTime(30)}
                >
                    <JempText type="body-sm" color={theme.text}>+ 30s</JempText>
                </Pressable>
                <Pressable style={[styles.timerSkip, { backgroundColor: theme.surface }]} onPress={onStop}>
                    <JempText type="body-sm" color={theme.textMuted}>Überspringen</JempText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    timerCard: {
        alignItems: 'center', gap: 14, paddingVertical: 24, paddingHorizontal: 24,
        borderRadius: 20, borderWidth: 1, borderColor: '#7DD3FA55',
    },
    timerLabel: { letterSpacing: 2 },
    timerDisplay: { fontSize: 64, lineHeight: 72 },
    timerTrack: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
    timerFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
    timerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    timerBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
    timerSkip: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
});
```

- [ ] **Step 2: Replace in `[id].tsx`**

```tsx
import { RestTimerCard } from '@/components/active-session/RestTimerCard';

// Replace the {isResting && (<View style={...}> ... </View>)} block with:
<RestTimerCard
    onStop={stopTimer}
    onAddTime={(secs) => {
        setRestSeconds(prev => prev + secs);
        setTotalRestSeconds(prev => prev + secs);
    }}
/>
```

Delete unused styles: `timerCard`, `timerLabel`, `timerDisplay`, `timerTrack`, `timerFill`, `timerActions`, `timerBtn`, `timerSkip`.

- [ ] **Step 3: TypeScript check + smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Log a set and verify the rest timer appears, counts down, "+30s" works, and "Überspringen" dismisses it.

- [ ] **Step 4: Commit**

```bash
git add components/active-session/RestTimerCard.tsx app/active-session/[id].tsx
git commit -m "refactor: extract RestTimerCard component"
```

---

## Task 6: Extract `LogSetSection`

**Files:**
- Create: `components/active-session/LogSetSection.tsx`
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` for all input/timer display state
- Consumes: `useActiveSessionStore` for `exerciseIdx`, `currentSet`
- Props:
  - `animatedStyle: StyleProp<AnimatedProps<ViewStyle>>`
  - `onStartExerciseTimer: () => void`
  - `onStopExerciseTimer: () => void`
  - `onStartExerciseTimerSide: (side: 'left' | 'right') => void`
  - `onStopExerciseTimerSide: () => void`

- [ ] **Step 1: Create the component**

Extract the entire `<Animated.View style={[styles.logSection, setAnimStyle]}>` block from `[id].tsx` into the new file. The component reads all input/timer state from `useActiveSessionUIStore` and exercise metadata from `useActiveSessionStore` + `useActiveSessionUIStore(s => s.allExercises)`.

```tsx
// components/active-session/LogSetSection.tsx
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GRADIENT } from '@/constants/theme';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
    StyleSheet, TextInput, View,
    type StyleProp, type ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';

function formatTimer(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type Props = {
    animatedStyle: StyleProp<AnimatedProps<ViewStyle>>;
    onStartExerciseTimer: () => void;
    onStopExerciseTimer: () => void;
    onStartExerciseTimerSide: (side: 'left' | 'right') => void;
    onStopExerciseTimerSide: () => void;
};

export function LogSetSection({
    animatedStyle,
    onStartExerciseTimer,
    onStopExerciseTimer,
    onStartExerciseTimerSide,
    onStopExerciseTimerSide,
}: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const currentSet = useActiveSessionStore(s => s.currentSet);

    const reps = useActiveSessionUIStore(s => s.reps);
    const load = useActiveSessionUIStore(s => s.load);
    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const loadLeft = useActiveSessionUIStore(s => s.loadLeft);
    const loadRight = useActiveSessionUIStore(s => s.loadRight);
    const previousSet = useActiveSessionUIStore(s => s.previousSet);
    const suggestionHint = useActiveSessionUIStore(s => s.suggestionHint);
    const exerciseDuration = useActiveSessionUIStore(s => s.exerciseDuration);
    const exerciseTimerActive = useActiveSessionUIStore(s => s.exerciseTimerActive);
    const exerciseDurationLeft = useActiveSessionUIStore(s => s.exerciseDurationLeft);
    const exerciseDurationRight = useActiveSessionUIStore(s => s.exerciseDurationRight);
    const exerciseTimerActiveSide = useActiveSessionUIStore(s => s.exerciseTimerActiveSide);
    const setReps = useActiveSessionUIStore(s => s.setReps);
    const setLoad = useActiveSessionUIStore(s => s.setLoad);
    const setRepsLeft = useActiveSessionUIStore(s => s.setRepsLeft);
    const setRepsRight = useActiveSessionUIStore(s => s.setRepsRight);
    const setLoadLeft = useActiveSessionUIStore(s => s.setLoadLeft);
    const setLoadRight = useActiveSessionUIStore(s => s.setLoadRight);
    const setExerciseDuration = useActiveSessionUIStore(s => s.setExerciseDuration);
    const setExerciseDurationLeft = useActiveSessionUIStore(s => s.setExerciseDurationLeft);
    const setExerciseDurationRight = useActiveSessionUIStore(s => s.setExerciseDurationRight);

    const current = allExercises[exerciseIdx] ?? null;
    if (!current) return null;

    const totalSets = current.target_sets ?? 1;
    const unit = loadUnit(current.target_load_type);
    const showLoad = unit !== '';
    const isUnilateral = current.exercise.is_unilateral;
    const isDuration = current.exercise.measurement_type === 'duration';
    const repsTarget = formatTargetReps(current.target_reps_min, current.target_reps_max);

    // ── Paste the full JSX from the <Animated.View style={[styles.logSection, setAnimStyle]}> block here ──
    // (all duration/unilateral/bilateral branches, previousSet hint, suggestionHint)
    return (
        <Animated.View style={[styles.logSection, animatedStyle]}>
            {/* Full JSX from [id].tsx lines ~722-966 */}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    logSection: { gap: 12 },
    // ... copy all styles used by this section from [id].tsx
});
```

> **Note for implementer:** The JSX inside `LogSetSection` is a direct copy of the `<Animated.View style={[styles.logSection, setAnimStyle]}>` block from `[id].tsx` (lines ~722–966). Copy it verbatim, replacing `setAnimStyle` with `animatedStyle` and any `theme.*` references via the locally constructed `theme`. The `formatTimer` helper is duplicated here (same 4 lines) — acceptable since it is a pure utility with no shared state.

- [ ] **Step 2: Replace in `[id].tsx`**

```tsx
import { LogSetSection } from '@/components/active-session/LogSetSection';

// Replace the <Animated.View style={[styles.logSection, setAnimStyle]}> block with:
<LogSetSection
    animatedStyle={setAnimStyle}
    onStartExerciseTimer={startExerciseTimer}
    onStopExerciseTimer={stopExerciseTimer}
    onStartExerciseTimerSide={startExerciseTimerSide}
    onStopExerciseTimerSide={stopExerciseTimerSide}
/>
```

Delete the moved styles from `[id].tsx`: `logSection`, `exerciseTimerBlock`, `exerciseTimerDisplay`, `exerciseTimerDisplaySide`, `exerciseTimerActions`, `exerciseTimerBtn`, `exerciseTimerReset`, `unilateralRows`, `unilateralRow`, `sideLabel`, `inputRow`, `inputGroup`, `inputDivider`, `pillInput`, `pillTextInput`, `previousLabel`.

- [ ] **Step 3: TypeScript check + smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Go through a full session: test bilateral reps input, unilateral reps input, duration timer (bilateral + unilateral). Verify previous-set hint and progression hint appear correctly.

- [ ] **Step 4: Commit**

```bash
git add components/active-session/LogSetSection.tsx app/active-session/[id].tsx
git commit -m "refactor: extract LogSetSection component"
```

---

## Task 7: Replace `BottomCTAs.tsx` with `BottomBar`

**Files:**
- Replace: `components/active-session/BottomCTAs.tsx` → `components/active-session/BottomBar.tsx`
- Modify: `app/active-session/[id].tsx`

**Interfaces:**
- Consumes: `useActiveSessionUIStore` for `isCompleting` + input values (to derive `canLog`)
- Consumes: `useActiveSessionStore` for `exerciseIdx`, `currentSet`
- Props: `onLogSet: () => void`, `onSkipSet: () => void`

- [ ] **Step 1: Delete the broken file and create `BottomBar.tsx`**

```bash
rm components/active-session/BottomCTAs.tsx
```

```tsx
// components/active-session/BottomBar.tsx
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

type Props = {
    onLogSet: () => void;
    onSkipSet: () => void;
};

export function BottomBar({ onLogSet, onSkipSet }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const currentSet = useActiveSessionStore(s => s.currentSet);
    const isCompleting = useActiveSessionUIStore(s => s.isCompleting);

    const reps = useActiveSessionUIStore(s => s.reps);
    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const exerciseDuration = useActiveSessionUIStore(s => s.exerciseDuration);
    const exerciseDurationLeft = useActiveSessionUIStore(s => s.exerciseDurationLeft);
    const exerciseDurationRight = useActiveSessionUIStore(s => s.exerciseDurationRight);

    const current = allExercises[exerciseIdx] ?? null;
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const isUnilateral = current?.exercise.is_unilateral ?? false;
    const isDuration = current?.exercise.measurement_type === 'duration';

    const hasInput = isDuration && isUnilateral
        ? exerciseDurationLeft > 0 || exerciseDurationRight > 0
        : isDuration
            ? exerciseDuration > 0
            : isUnilateral
                ? repsLeft.trim() !== '' || repsRight.trim() !== ''
                : reps.trim() !== '';

    const label = isLastSet && isLastExercise
        ? t('ui.log_and_finish')
        : isLastSet
            ? t('ui.log_and_next')
            : t('ui.log_set_and_next');

    return (
        <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
            <Pressable
                style={styles.logBtn}
                onPress={onLogSet}
                disabled={!hasInput || isCompleting}
            >
                <LinearGradient
                    colors={hasInput ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.logBtnGradient}
                >
                    {isCompleting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <JempText type="button" color="#fff">{label}</JempText>
                    }
                </LinearGradient>
            </Pressable>
            <Pressable onPress={onSkipSet} style={styles.skipLink}>
                <JempText type="body-sm" color={theme.textMuted}>{t('ui.skip_set')}</JempText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomBar: {
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
        gap: 8, alignItems: 'center',
    },
    logBtn: { borderRadius: 100, overflow: 'hidden', width: '100%' },
    logBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    skipLink: { paddingVertical: 4 },
});
```

- [ ] **Step 2: Replace in `[id].tsx`**

```tsx
import { BottomBar } from '@/components/active-session/BottomBar';

// Replace the <View style={[styles.bottomBar, ...]}> ... </View> block with:
<BottomBar onLogSet={handleLogSet} onSkipSet={handleSkipSet} />
```

Delete unused styles: `bottomBar`, `logBtn`, `logBtnGradient`, `skipLink`.

- [ ] **Step 3: TypeScript check + full smoke test**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Full session run: log sets, skip a set, finish session via last set and via finish-early. Verify congrats modal appears and navigates to summary.

- [ ] **Step 4: Commit**

```bash
git add components/active-session/BottomBar.tsx app/active-session/[id].tsx
git rm components/active-session/BottomCTAs.tsx
git commit -m "refactor: replace BottomCTAs with proper BottomBar component"
```

---

## Self-Review

**Spec coverage:**
- ✅ New non-persisted Zustand store with all UI state
- ✅ `SessionDetail` available everywhere via store (no prop drilling)
- ✅ `FlatExercise` moved to store file (shared type)
- ✅ Crash-recovery store untouched
- ✅ Refs and Reanimated values stay in screen
- ✅ All 5 visual sections extracted as components
- ✅ `BottomCTAs.tsx` replaced with working `BottomBar.tsx`
- ✅ Each task ends with a TypeScript check and a commit

**Placeholder scan:** No TBDs. Task 6 notes that the JSX is a verbatim copy from `[id].tsx` — the implementer has the source to copy from.

**Type consistency:** `FlatExercise` defined once in Task 1, imported in Tasks 3–7. `SessionDetail` imported from `@/queries/use-session-detail-query` throughout.
