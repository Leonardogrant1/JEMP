import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeLoadProfile } from '@/lib/load-profile';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/query-keys';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';

const GRADIENT_START = Cyan[500];
const GRADIENT_END = Electric[500];

const FEATURE_KEYS = [
    'personalization.feature_0',
    'personalization.feature_1',
    'personalization.feature_2',
    'personalization.feature_3',
] as const;

const STAGES = [
    { threshold: 0, key: 'personalization.stage_saving' },
    { threshold: 30, key: 'personalization.stage_goals' },
    { threshold: 60, key: 'personalization.stage_equipment' },
    { threshold: 90, key: 'personalization.stage_done' },
] as const;

const ITEM_START_DELAY_MS = 300;
const ITEM_STAGGER_MS = 400;

export function PersonalizationStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const onboardingData = useOnboardingStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [featureAnimsDone, setFeatureAnimsDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const itemAnims = useRef(
        FEATURE_KEYS.map(() => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(10),
        }))
    ).current;

    // Progress tick — fast since this is just DB writes (~1-2s)
    useEffect(() => {
        if (error) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 85) return prev;
                return Math.min(85, prev + 3);
            });
        }, 100);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [error]);

    // Sprint to 100% when done
    useEffect(() => {
        if (!isComplete) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        const sprint = setInterval(() => {
            setProgress(prev => Math.min(100, prev + 5));
        }, 16);
        return () => clearInterval(sprint);
    }, [isComplete]);

    // Navigate when animation done
    useEffect(() => {
        if (progress >= 100 && featureAnimsDone) {
            nextStep();
        }
    }, [progress, featureAnimsDone]);

    // Staggered pop-in
    useEffect(() => {
        itemAnims.forEach(({ opacity, translateY }, i) => {
            const delay = ITEM_START_DELAY_MS + i * ITEM_STAGGER_MS;
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 350, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 350, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        });
        const lastEnd = ITEM_START_DELAY_MS + (FEATURE_KEYS.length - 1) * ITEM_STAGGER_MS + 350;
        const timer = setTimeout(() => setFeatureAnimsDone(true), lastEnd);
        return () => clearTimeout(timer);
    }, []);

    // Run on mount
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function save() {
        setError(null);
        setIsComplete(false);
        try {
            if (!session) throw new Error('Not authenticated');

            const {
                set, reset,
                sport_slug,
                targetedCategories,
                categoryLevels,
                equipmentIds,
                environmentIds,
                dayEnvironments,
                equipmentEnvironments,
                weekly_schedule,
                name_source,
                ...profileData
            } = onboardingData;

            const { load_score, load_profile } = computeLoadProfile(weekly_schedule?.sessions ?? []);

            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    ...profileData,
                    weekly_schedule: weekly_schedule as any,
                    load_score,
                    load_profile,
                    day_environments: dayEnvironments.length > 0 ? dayEnvironments : null,
                })
                .eq('id', session.user.id);
            if (profileError) throw profileError;

            await Promise.all([
                supabase.from('user_targeted_categories').delete().eq('user_id', session.user.id),
                supabase.from('user_category_levels').delete().eq('user_id', session.user.id),
                supabase.from('user_environments').delete().eq('user_id', session.user.id),
                supabase.from('user_equipments').delete().eq('user_id', session.user.id),
            ]);

            if (targetedCategories.length > 0) {
                const { error: e } = await supabase.from('user_targeted_categories').insert(
                    targetedCategories.map(({ categoryId, priority }) => ({ user_id: session.user.id, category_id: categoryId, priority }))
                );
                if (e) throw e;
            }

            if (categoryLevels.length > 0) {
                const { error: e } = await supabase.from('user_category_levels').insert(
                    categoryLevels.map(({ categoryId, score }) => ({ user_id: session.user.id, category_id: categoryId, level_score: score }))
                );
                if (e) throw e;
            }

            if (environmentIds.length > 0) {
                const { error: e } = await supabase.from('user_environments').insert(
                    environmentIds.map(environment_id => ({ user_id: session.user.id, environment_id }))
                );
                if (e) throw e;
            }

            if (equipmentIds.length > 0) {
                const { error: e } = await supabase.from('user_equipments').insert(
                    equipmentIds.map(equipment_id => ({ user_id: session.user.id, equipment_id }))
                );
                if (e) throw e;
            }

            const equipEnvRows = equipmentEnvironments.flatMap(({ equipment_id, environment_ids }) =>
                environment_ids.map(environment_id => ({ user_id: session.user.id, equipment_id, environment_id }))
            );
            if (equipEnvRows.length > 0) {
                const { error: e } = await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
                if (e) throw e;
            }

            queryClient.invalidateQueries({ queryKey: queryKeys.plan(session.user.id) });
            setIsComplete(true);
        } catch (err: any) {
            setError(err?.message ?? t('personalization.error'));
        }
    }

    function getStageLabel(p: number): string {
        let label = t(STAGES[0].key);
        for (const s of STAGES) {
            if (p >= s.threshold) label = t(s.key);
        }
        return label;
    }

    if (error) {
        return (
            <View style={styles.center}>
                <View style={[styles.errorIconBox, { backgroundColor: '#ef444418' }]}>
                    <Ionicons name="close-circle-outline" size={52} color="#ef4444" />
                </View>
                <JempText type="h2" color={theme.text} style={styles.textCenter}>
                    {t('plan.error_title')}
                </JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.textCenter}>
                    {error}
                </JempText>
                <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: theme.surface }]}
                    onPress={() => { hasStarted.current = false; save(); }}
                >
                    <JempText type="body" color={theme.text}>{t('ui.retry')}</JempText>
                </TouchableOpacity>
            </View>
        );
    }

    const barWidth = `${progress}%` as const;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <JempText type="h1" color={theme.text} style={styles.title}>
                    {t('personalization.title')}
                </JempText>

                <JempText type="caption" color={theme.textMuted} style={styles.stage}>
                    {getStageLabel(progress)}
                </JempText>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: barWidth, backgroundColor: progress >= 100 ? Cyan[500] : Electric[500] },
                        ]}
                    />
                </View>

                {/* Feature list */}
                <View style={styles.features}>
                    {FEATURE_KEYS.map((key, i) => (
                        <Animated.View
                            key={key}
                            style={[
                                styles.featureRow,
                                { opacity: itemAnims[i].opacity, transform: [{ translateY: itemAnims[i].translateY }] },
                            ]}
                        >
                            <View style={[styles.featureDot, { backgroundColor: GRADIENT_START }]} />
                            <JempText type="body" color={theme.text}>{t(key)}</JempText>
                        </Animated.View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
    title: { textAlign: 'center' },
    stage: { textAlign: 'center' },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    features: { gap: 14, marginTop: 8 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureDot: { width: 8, height: 8, borderRadius: 4 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
    errorIconBox: { borderRadius: 40, padding: 16 },
    textCenter: { textAlign: 'center' },
    retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
