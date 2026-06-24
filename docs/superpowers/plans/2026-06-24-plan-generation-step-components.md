# Plan Generation Step Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract each wizard phase from `app/generate-plan.tsx` into a dedicated named-export component under `components/plan-generation/`.

**Architecture:** Each step component calls `usePlanWizardStore()` directly — zero props. The screen becomes a thin coordinator: header + phase switch + bottom bar. Styles live locally in each component. `COMBAT_SPORTS` moves to `WeeklyStep` where it belongs.

**Tech Stack:** React Native, Zustand (`usePlanWizardStore`), expo-router, react-i18next, react-native-draggable-flatlist, @react-native-community/slider, react-native-keyboard-controller.

## Global Constraints

- All new components are named exports (not default)
- Each component calls `usePlanWizardStore()` directly — no props
- `content` style is always `{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }`
- `COMBAT_SPORTS` lives only in `WeeklyStep.tsx` (removed from generate-plan.tsx)
- `EquipmentEnvironmentStep.tsx` already exists as an empty file — overwrite it
- No changes to `stores/plan-wizard-store.ts` or `stores/plan-generation-store.ts`

---

### Task 1: SportStep, EnvironmentStep, EquipmentStep

**Files:**
- Create: `components/plan-generation/SportStep.tsx`
- Create: `components/plan-generation/EnvironmentStep.tsx`
- Create: `components/plan-generation/EquipmentStep.tsx`

**Interfaces:**
- Produces: `SportStep`, `EnvironmentStep`, `EquipmentStep` — named exports used in Task 5

- [ ] **Step 1: Create `components/plan-generation/SportStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function SportStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { selectedSportSlug, setSelectedSportSlug } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('ui.sport')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.sport_subtitle')}
            </JempText>
            {SPORT_GROUPS.map(group => (
                <View key={group.titleKey} style={styles.group}>
                    <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                        {t(group.titleKey as any).toUpperCase()}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {group.sports.map(sport => (
                            <SelectableChip
                                key={sport.slug}
                                label={getSportLabelI18n(sport.slug, t) ?? sport.slug}
                                selected={selectedSportSlug === sport.slug}
                                onPress={() => setSelectedSportSlug(sport.slug)}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    group: { marginBottom: 24 },
    groupTitle: { letterSpacing: 1, fontSize: 11, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
```

- [ ] **Step 2: Create `components/plan-generation/EnvironmentStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableRow } from '@/components/ui/selectable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EnvironmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allEnvs, selectedEnvIds, toggleEnv } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.environment_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.environment_subtitle')}
            </JempText>
            <View style={styles.envList}>
                {allEnvs.map(env => (
                    <SelectableRow
                        key={env.id}
                        label={env.name_i18n?.[locale] ?? env.slug}
                        description={env.description_i18n?.[locale]}
                        icon={env.icon}
                        selected={selectedEnvIds.has(env.id)}
                        onPress={() => toggleEnv(env.id)}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    envList: { gap: 12 },
});
```

- [ ] **Step 3: Create `components/plan-generation/EquipmentStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EquipmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allEquipment, selectedEquipmentIds, toggleEquipment } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.equipment_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.equipment_subtitle')}
            </JempText>
            <View style={styles.chipGrid}>
                {allEquipment.map(eq => (
                    <SelectableChip
                        key={eq.id}
                        label={eq.name_i18n?.[locale] ?? eq.slug}
                        selected={selectedEquipmentIds.has(eq.id)}
                        onPress={() => toggleEquipment(eq.id)}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors in the three new files.

- [ ] **Step 5: Commit**

```bash
git add components/plan-generation/SportStep.tsx components/plan-generation/EnvironmentStep.tsx components/plan-generation/EquipmentStep.tsx
git commit -m "feat: add SportStep, EnvironmentStep, EquipmentStep components"
```

---

### Task 2: EquipmentEnvironmentStep, GoalsStep

**Files:**
- Modify: `components/plan-generation/EquipmentEnvironmentStep.tsx` (currently empty — overwrite)
- Create: `components/plan-generation/GoalsStep.tsx`

**Interfaces:**
- Consumes: `usePlanWizardStore` from Task 1's store (already complete)
- Produces: `EquipmentEnvironmentStep`, `GoalsStep` — named exports used in Task 5

- [ ] **Step 1: Write `components/plan-generation/EquipmentEnvironmentStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EquipmentEnvironmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { ambiguousEquipment, equipmentEnvSelections, allEnvs, toggleEquipmentEnv } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                {t('onboarding.equipment_location_title')}
            </JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('onboarding.equipment_location_subtitle')}
            </JempText>
            {ambiguousEquipment.map(eq => {
                const eqSelections = equipmentEnvSelections.get(eq.id) ?? new Set<string>();
                return (
                    <View key={eq.id} style={styles.equipmentEnvRow}>
                        <JempText type="body-l" color={theme.text} style={styles.equipmentEnvLabel}>
                            {eq.name_i18n?.[locale] ?? eq.slug}
                        </JempText>
                        <View style={styles.chipGrid}>
                            {eq.compatibleEnvIds.map(envId => {
                                const env = allEnvs.find(e => e.id === envId);
                                if (!env) return null;
                                return (
                                    <SelectableChip
                                        key={envId}
                                        label={env.name_i18n?.[locale] ?? env.slug}
                                        selected={eqSelections.has(envId)}
                                        onPress={() => toggleEquipmentEnv(eq.id, envId)}
                                    />
                                );
                            })}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipmentEnvRow: { marginBottom: 24 },
    equipmentEnvLabel: { marginBottom: 10 },
});
```

- [ ] **Step 2: Create `components/plan-generation/GoalsStep.tsx`**

`GoalsStep` reads `goalsSubPhase` from the store and renders either the select or rank view.

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { CategoryItem } from '@/types/plan-generation';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

export function GoalsStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        goalsSubPhase,
        allCategories, selectedCategoryIds, rankedCategories,
        toggleCategory, setRankedCategories,
    } = usePlanWizardStore();

    if (goalsSubPhase === 'select') {
        return (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.select_title')}</JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                    {t('goals.select_subtitle')}
                </JempText>
                <View style={styles.chipGrid}>
                    {allCategories.map(cat => (
                        <SelectableChip
                            key={cat.id}
                            label={cat.label}
                            selected={selectedCategoryIds.has(cat.id)}
                            onPress={() => toggleCategory(cat.id)}
                        />
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <DraggableFlatList
            data={rankedCategories}
            keyExtractor={item => item.id}
            onDragEnd={({ data }) => setRankedCategories(data)}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, drag }: RenderItemParams<CategoryItem>) => {
                const index = rankedCategories.indexOf(item);
                return (
                    <ScaleDecorator activeScale={1.03}>
                        <TouchableOpacity
                            onLongPress={drag}
                            activeOpacity={1}
                            style={[styles.rankRow, { backgroundColor: theme.surface }]}
                        >
                            <JempText type="caption" color={theme.textMuted} style={styles.rankNumber}>
                                {index + 1}
                            </JempText>
                            <JempText type="body-l" color={theme.text} style={{ flex: 1 }}>
                                {item.label}
                            </JempText>
                            <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                        </TouchableOpacity>
                    </ScaleDecorator>
                );
            }}
            ListHeaderComponent={
                <View>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.rank_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('goals.rank_subtitle')}
                    </JempText>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 10,
    },
    rankNumber: { width: 20, textAlign: 'center' },
});
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors in the two files.

- [ ] **Step 4: Commit**

```bash
git add components/plan-generation/EquipmentEnvironmentStep.tsx components/plan-generation/GoalsStep.tsx
git commit -m "feat: add EquipmentEnvironmentStep and GoalsStep components"
```

---

### Task 3: BodyStep, ScheduleStep

**Files:**
- Create: `components/plan-generation/BodyStep.tsx`
- Create: `components/plan-generation/ScheduleStep.tsx`

**Interfaces:**
- Produces: `BodyStep`, `ScheduleStep` — named exports used in Task 5

- [ ] **Step 1: Create `components/plan-generation/BodyStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { HeightSlider, WeightSlider } from '@/components/ui/measurement-slider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

export function BodyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        weightKg, setWeightKg, weightUnit, setWeightUnit,
        heightCm, setHeightCm, heightUnit, setHeightUnit,
    } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.body_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.body_subtitle')}
            </JempText>
            <WeightSlider
                valueKg={weightKg}
                onChange={setWeightKg}
                unit={weightUnit}
                onToggleUnit={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
            />
            <HeightSlider
                valueCm={heightCm}
                onChange={setHeightCm}
                unit={heightUnit}
                onToggleUnit={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
});
```

- [ ] **Step 2: Create `components/plan-generation/ScheduleStep.tsx`**

```typescript
import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { DURATIONS, WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export function ScheduleStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        preferredDays, togglePreferredDay,
        preferredDuration, setPreferredDuration,
        selectedEnvIds, allEnvs,
        dayEnvMap, toggleDayEnv,
        scheduleNotes, setScheduleNotes,
    } = usePlanWizardStore();

    return (
        <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.schedule_subtitle')}
            </JempText>

            <View style={styles.section}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('onboarding.workout_prefs_days_label')}
                </JempText>
                <View style={styles.dayChipRow}>
                    {WEEK_DAYS.map(({ dow, key }) => (
                        <SelectableChip
                            key={dow}
                            label={t(key as any)}
                            selected={preferredDays.has(dow)}
                            onPress={() => togglePreferredDay(dow)}
                            style={styles.dayChip}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('plan.schedule_duration_label')}
                </JempText>
                <View style={styles.durationRow}>
                    {DURATIONS.map(d => (
                        <SelectableChip
                            key={d.value}
                            label={d.label}
                            selected={preferredDuration === d.value}
                            onPress={() => setPreferredDuration(d.value)}
                            style={styles.durationChip}
                        />
                    ))}
                </View>
            </View>

            {selectedEnvIds.size > 1 && preferredDays.size > 0 && (
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                        {t('onboarding.workout_prefs_env_label')}
                    </JempText>
                    <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                        {t('onboarding.workout_prefs_env_hint')}
                    </JempText>
                    {[...preferredDays].sort((a, b) => a - b).map(dow => {
                        const dayKey = WEEK_DAYS.find(d => d.dow === dow)?.key;
                        const selectedEnvs = allEnvs.filter(e => selectedEnvIds.has(e.id));
                        return (
                            <View key={dow} style={styles.dayEnvRow}>
                                <JempText type="body-l" style={styles.dayEnvLabel}>
                                    {dayKey ? t(dayKey as any) : ''}
                                </JempText>
                                <View style={styles.dayEnvChips}>
                                    {selectedEnvs.map(env => (
                                        <SelectableChip
                                            key={env.id}
                                            label={env.name_i18n?.[locale] ?? env.slug}
                                            selected={dayEnvMap[dow] === env.id}
                                            onPress={() => toggleDayEnv(dow, env.id)}
                                            style={styles.dayEnvChip}
                                        />
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            <View style={styles.section}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('plan.schedule_notes_label')}
                </JempText>
                <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                    {t('plan.schedule_notes_hint')}
                </JempText>
                <JempInput
                    value={scheduleNotes}
                    onChangeText={setScheduleNotes}
                    placeholder={t('plan.schedule_notes_placeholder')}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={styles.notesInput}
                />
            </View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
    dayEnvRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dayEnvLabel: { width: 28 },
    dayEnvChips: { flexDirection: 'row', gap: 8, flex: 1 },
    dayEnvChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
});
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/plan-generation/BodyStep.tsx components/plan-generation/ScheduleStep.tsx
git commit -m "feat: add BodyStep and ScheduleStep components"
```

---

### Task 4: WeeklyStep

**Files:**
- Create: `components/plan-generation/WeeklyStep.tsx`

**Interfaces:**
- Produces: `WeeklyStep` — named export used in Task 5

- [ ] **Step 1: Create `components/plan-generation/WeeklyStep.tsx`**

`COMBAT_SPORTS` moves here from `generate-plan.tsx`. `getAffectedJempDays` and `formatDays` are module-level helpers (not inside the render loop).

```typescript
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors, GradientMid } from '@/constants/theme';
import { getSessionTypes } from '@/helpers/plan-generation-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);

export function WeeklyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        sportSessions, selectedSportSlug, preferredDays,
        toggleSportDay, setSportType, setSportIntensity,
    } = usePlanWizardStore();

    const selectedSportDays = new Set(sportSessions.map(s => s.day_of_week));
    const sortedSportSessions = [...sportSessions].sort((a, b) => a.day_of_week - b.day_of_week);
    const preferredDaysArray = [...preferredDays];

    function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same'): number[] {
        if (mode === 'same') return preferredDaysArray.includes(sportDay) ? [sportDay] : [];
        const prev = sportDay === 1 ? 7 : sportDay - 1;
        const next = sportDay === 7 ? 1 : sportDay + 1;
        return preferredDaysArray.filter(d => d === prev || d === next);
    }

    function formatDays(days: number[]): string {
        return days.map(d => t(WEEK_DAYS.find(x => x.dow === d)?.key as any ?? '')).join(', ');
    }

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                {t('onboarding.weekly_schedule_title')}
            </JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('onboarding.weekly_schedule_subtitle')}
            </JempText>

            <View style={styles.section}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('onboarding.weekly_schedule_days_label')}
                </JempText>
                <View style={styles.dayChipRow}>
                    {WEEK_DAYS.map(({ dow, key }) => (
                        <SelectableChip
                            key={dow}
                            label={t(key as any)}
                            selected={selectedSportDays.has(dow)}
                            onPress={() => toggleSportDay(dow)}
                            style={styles.dayChip}
                        />
                    ))}
                </View>
            </View>

            {sortedSportSessions.map(session => {
                const dayLabel = WEEK_DAYS.find(d => d.dow === session.day_of_week);
                return (
                    <View key={session.day_of_week} style={[styles.sportCard, { backgroundColor: theme.surface }]}>
                        <View style={styles.sportCardHeader}>
                            <JempText type="body-sm" style={{ fontWeight: '600' }}>
                                {t(dayLabel?.key as any)}
                            </JempText>
                            <TouchableOpacity onPress={() => toggleSportDay(session.day_of_week)} hitSlop={12}>
                                <JempText type="body-sm" color={theme.textMuted}>✕</JempText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chipGrid}>
                            {getSessionTypes(selectedSportSlug, COMBAT_SPORTS).map(st => (
                                <SelectableChip
                                    key={st.key}
                                    label={t(st.labelKey as any)}
                                    selected={session.type === st.key}
                                    onPress={() => setSportType(session.day_of_week, st.key)}
                                    size="sm"
                                />
                            ))}
                        </View>

                        {(session.type === 'game' || session.type === 'tournament') && (() => {
                            const prev = session.day_of_week === 1 ? 7 : session.day_of_week - 1;
                            const next = session.day_of_week === 7 ? 1 : session.day_of_week + 1;
                            const affected = preferredDaysArray.filter(d => d === prev || d === next);
                            if (affected.length === 0) return null;
                            return (
                                <View style={styles.hintBox}>
                                    <JempText type="body-sm" color={GradientMid}>
                                        {t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected) })}
                                    </JempText>
                                </View>
                            );
                        })()}

                        {session.type !== 'game' && session.type !== 'tournament' && (
                            <View style={styles.intensityRow}>
                                <View style={styles.intensityHeader}>
                                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                        {t('onboarding.weekly_schedule_intensity_label')}
                                    </JempText>
                                    <JempText type="h2">{session.intensity}</JempText>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={1}
                                    maximumValue={10}
                                    step={1}
                                    value={session.intensity}
                                    onValueChange={v => setSportIntensity(session.day_of_week, v)}
                                    minimumTrackTintColor={GradientMid}
                                    maximumTrackTintColor={theme.borderStrong}
                                    thumbTintColor={theme.text}
                                />
                                {session.intensity === 7 && (() => {
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                    if (sameDay.length === 0) return null;
                                    return (
                                        <View style={styles.hintBox}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t('onboarding.weekly_schedule_hint_intensity_7', { days: formatDays(sameDay) })}
                                            </JempText>
                                        </View>
                                    );
                                })()}
                                {session.intensity >= 8 && (() => {
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                    const adjacent = getAffectedJempDays(session.day_of_week, 'adjacent');
                                    if (sameDay.length === 0 && adjacent.length === 0) return null;
                                    const key = sameDay.length > 0 && adjacent.length > 0
                                        ? 'onboarding.weekly_schedule_hint_intensity_8plus_both'
                                        : sameDay.length > 0
                                            ? 'onboarding.weekly_schedule_hint_intensity_8plus_same'
                                            : 'onboarding.weekly_schedule_hint_intensity_8plus_adjacent';
                                    return (
                                        <View style={styles.hintBox}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t(key, { sameDays: formatDays(sameDay), adjacentDays: formatDays(adjacent) })}
                                            </JempText>
                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sportCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
    sportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    intensityRow: { marginTop: 12 },
    intensityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    slider: { width: '100%', height: 40, marginHorizontal: -8 },
    hintBox: {
        marginTop: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(61, 158, 203, 0.15)',
    },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors in `WeeklyStep.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/plan-generation/WeeklyStep.tsx
git commit -m "feat: add WeeklyStep component"
```

---

### Task 5: Wire generate-plan.tsx

**Files:**
- Modify: `app/generate-plan.tsx` — replace all phase blocks with step components, clean up imports and styles

**Interfaces:**
- Consumes: all 8 step components from Tasks 1–4

- [ ] **Step 1: Replace `app/generate-plan.tsx` entirely with the wired version**

```typescript
import { JempText } from '@/components/jemp-text';
import { BodyStep } from '@/components/plan-generation/BodyStep';
import { EnvironmentStep } from '@/components/plan-generation/EnvironmentStep';
import { EquipmentEnvironmentStep } from '@/components/plan-generation/EquipmentEnvironmentStep';
import { EquipmentStep } from '@/components/plan-generation/EquipmentStep';
import { GoalsStep } from '@/components/plan-generation/GoalsStep';
import { ScheduleStep } from '@/components/plan-generation/ScheduleStep';
import { SportStep } from '@/components/plan-generation/SportStep';
import { StepBars } from '@/components/plan-generation/StepBars';
import { WeeklyStep } from '@/components/plan-generation/WeeklyStep';
import { Colors, GRADIENT } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GeneratePlanScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const router = useRouter();
    const { profile } = useCurrentUser();

    const {
        phase, isSaving, saveError,
        selectedSportSlug, selectedEnvIds, selectedCategoryIds,
        preferredDays, preferredDuration,
        initialize, goBack, goNext, generate,
    } = usePlanWizardStore();

    useEffect(() => {
        if (profile) initialize(profile);
    }, [profile]);

    const canProceedNext =
        phase === 'sport' ? !!selectedSportSlug :
        phase === 'environment' ? selectedEnvIds.size > 0 :
        phase === 'goals' ? selectedCategoryIds.size > 0 :
        phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
        true;

    return (
        <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={() => goBack(router)} hitSlop={12}>
                    <Ionicons
                        name={phase === 'sport' ? 'close' : 'arrow-back'}
                        size={24}
                        color={theme.text}
                    />
                </Pressable>
                <View style={styles.headerCenter}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.new_plan')}</JempText>
                    <StepBars phase={phase} />
                </View>
                <View style={{ width: 24 }} />
            </View>

            {phase === 'sport' && <SportStep />}
            {phase === 'environment' && <EnvironmentStep />}
            {phase === 'equipment' && <EquipmentStep />}
            {phase === 'equipment-env' && <EquipmentEnvironmentStep />}
            {phase === 'goals' && <GoalsStep />}
            {phase === 'body' && <BodyStep />}
            {phase === 'schedule' && <ScheduleStep />}
            {phase === 'weekly' && <WeeklyStep />}

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                {saveError && (
                    <JempText type="body-sm" color="#ef4444" style={{ textAlign: 'center', marginBottom: 8 }}>
                        {saveError}
                    </JempText>
                )}
                <Pressable
                    onPress={phase === 'weekly' ? () => generate(router) : goNext}
                    disabled={!canProceedNext || isSaving}
                    style={styles.bottomBtn}
                >
                    <LinearGradient
                        colors={canProceedNext ? GRADIENT : [theme.surface, theme.surface]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bottomBtnGradient}
                    >
                        {isSaving
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color={canProceedNext ? '#fff' : theme.textMuted}>
                                {phase === 'weekly' ? t('plan.create') : t('ui.continue')}
                            </JempText>
                        }
                    </LinearGradient>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors in `app/generate-plan.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/generate-plan.tsx
git commit -m "refactor: replace generate-plan.tsx phase blocks with step components"
```
