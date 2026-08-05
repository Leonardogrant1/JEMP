import { JempText } from '@/components/jemp-text';
import { BodyStep } from '@/components/plan-generation/BodyStep';
import { EnvironmentStep } from '@/components/plan-generation/EnvironmentStep';
import { EquipmentEnvironmentStep } from '@/components/plan-generation/EquipmentEnvironmentStep';
import { EquipmentStep } from '@/components/plan-generation/EquipmentStep';
import { GoalsStep } from '@/components/plan-generation/GoalsStep';
import { ScheduleDetailStep } from '@/components/plan-generation/ScheduleDetailStep';
import { ScheduleStep } from '@/components/plan-generation/ScheduleStep';
import { WeeklyStep } from '@/components/plan-generation/WeeklyStep';
import { WizardProgress } from '@/components/plan-generation/WizardProgress';
import { Colors, GRADIENT } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, FadeInLeft, FadeInRight, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const stepEnterNext = FadeInRight.duration(260).easing(Easing.out(Easing.cubic));
const stepEnterBack = FadeInLeft.duration(260).easing(Easing.out(Easing.cubic));
const stepExit = FadeOut.duration(120);

export default function GeneratePlanScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const router = useRouter();
    const { profile } = useCurrentUser();

    const {
        phase, loading, isSaving, saveError,
        selectedEnvIds, selectedCategoryIds,
        preferredDays, preferredDuration,
        initialize, goBack, goNext, generate,
    } = usePlanWizardStore();

    // Slide direction for the step transition — null until the first navigation
    // so the initial mount doesn't animate on top of the route's push animation
    const [direction, setDirection] = useState<'next' | 'back' | null>(null);

    useEffect(() => {
        if (profile) initialize(profile);
    }, [profile]);

    const canProceedNext =
        phase === 'environment' ? selectedEnvIds.size > 0 :
        phase === 'goals' ? selectedCategoryIds.size > 0 :
        phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
        true;

    function handleBack() {
        setDirection('back');
        goBack(router);
    }

    function handleNext() {
        if (!canProceedNext || isSaving) return;
        setDirection('next');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (phase === 'schedule-detail') generate(router);
        else goNext();
    }

    return (
        <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} hitSlop={12}>
                    <Ionicons
                        name={phase === 'environment' ? 'close' : 'arrow-back'}
                        size={24}
                        color={theme.text}
                    />
                </Pressable>
                <JempText type="body-l" color={theme.textMuted}>{t('ui.new_plan')}</JempText>
                <View style={{ width: 24 }} />
            </View>
            <WizardProgress phase={phase} />

            {loading
                ? <ActivityIndicator style={{ flex: 1 }} />
                : <Reanimated.View
                    key={phase}
                    style={styles.stepWrap}
                    entering={direction
                        ? (direction === 'next' ? stepEnterNext : stepEnterBack)
                        : undefined}
                    exiting={stepExit}
                >
                    {phase === 'environment' && <EnvironmentStep />}
                    {phase === 'equipment' && <EquipmentStep />}
                    {phase === 'equipment-env' && <EquipmentEnvironmentStep />}
                    {phase === 'goals' && <GoalsStep />}
                    {phase === 'body' && <BodyStep />}
                    {phase === 'schedule' && <ScheduleStep />}
                    {phase === 'schedule-detail' && <ScheduleDetailStep />}
                    {phase === 'weekly' && <WeeklyStep />}
                </Reanimated.View>
            }

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                <LinearGradient
                    colors={['transparent', theme.background]}
                    style={styles.bottomFade}
                    pointerEvents="none"
                />
                {saveError && (
                    <JempText type="body-sm" color="#ef4444" style={{ textAlign: 'center', marginBottom: 8 }}>
                        {saveError}
                    </JempText>
                )}
                <Pressable
                    onPress={handleNext}
                    disabled={!canProceedNext || isSaving}
                    style={[styles.bottomBtn, { opacity: canProceedNext ? 1 : 0.4 }]}
                >
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bottomBtnGradient}
                    >
                        {isSaving
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color="#fff">
                                {phase === 'schedule-detail' ? t('plan.create') : t('ui.continue')}
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
        paddingVertical: 12,
    },
    stepWrap: { flex: 1 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomFade: {
        position: 'absolute',
        top: -28,
        left: 0,
        right: 0,
        height: 28,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
