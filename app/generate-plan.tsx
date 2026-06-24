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
        selectedSportSlug, selectedEnvIds,
        selectedCategoryIds,
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
