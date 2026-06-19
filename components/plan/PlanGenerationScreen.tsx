import { Colors, Cyan, Electric } from "@/constants/theme";
import { computeProgress, getStageLabel, PLAN_FEATURES } from "@/helpers/plan-generation-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePlanGenerationStore } from "@/stores/plan-generation-store";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { JempText } from "../jemp-text";

export function PlanGenerationScreen() {
    const { t } = useTranslation();
    const { job, isGenerating, isError } = usePlanGenerationStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const progress = useSharedValue(0);
    const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

    useEffect(() => {
        if (!job) return;
        const target = computeProgress(job.status, job.phase_detail);
        progress.value = withTiming(target, { duration: 800 });
    }, [job?.status, job?.phase_detail]);

    const isCompleted = job?.status === 'completed';
    const stageLabel = isError
        ? t('planGeneration.error_title')
        : getStageLabel(t, job?.status ?? '', job?.phase_detail ?? null);

    return (
        <View style={styles.pgRoot}>
            <View style={styles.pgContent}>
                <JempText type="h1" color={theme.text} style={styles.pgTitle}>
                    {t('planGeneration.title')}
                </JempText>

                <JempText
                    type="caption"
                    color={isError ? '#ef4444' : isCompleted ? Cyan[500] : theme.textMuted}
                    style={styles.pgStage}
                >
                    {stageLabel}
                </JempText>

                <View style={[styles.pgTrack, { backgroundColor: theme.surface }]}>
                    <Animated.View style={[styles.pgFill, barStyle]}>
                        <LinearGradient
                            colors={isError ? ['#ef4444', '#ef4444'] : [Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>

                {!isError && (
                    <View style={styles.pgFeatures}>
                        {PLAN_FEATURES.map((key, i) => (
                            <Animated.View
                                key={key}
                                entering={FadeInDown.delay(i * 180 + 200).duration(400)}
                                style={styles.pgFeatureRow}
                            >
                                <View style={[styles.pgFeatureDot, { backgroundColor: Cyan[500] }]} />
                                <JempText type="body-l" color={theme.text}>{t(key as any)}</JempText>
                            </Animated.View>
                        ))}
                    </View>
                )}

                {isGenerating && (
                    <JempText type="caption" color={theme.textMuted} style={styles.pgHint}>
                        {t('planGeneration.notify_hint')}
                    </JempText>
                )}

                {isError && (
                    <JempText type="caption" color="#ef4444" style={styles.pgHint}>
                        {job?.error ?? t('planGeneration.error_generic')}
                    </JempText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Plan generation fullscreen
    pgRoot: { flex: 1 },
    pgContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
    pgTitle: { textAlign: 'center' },
    pgStage: { textAlign: 'center' },
    pgTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    pgFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
    pgFeatures: { gap: 14, marginTop: 8 },
    pgFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pgFeatureDot: { width: 8, height: 8, borderRadius: 4 },
    pgHint: { textAlign: 'center', marginTop: 4 },
})
