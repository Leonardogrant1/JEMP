import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { DURATIONS, WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimation } from '@/hooks/use-training-animation';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export function ScheduleStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { profile } = useCurrentUser();
    const {
        preferredDays, togglePreferredDay,
        preferredDuration, setPreferredDuration,
        selectedEnvIds, allEnvs,
        dayEnvMap,
        sportSessions, selectedSportSlug, combatSportSlugs,
    } = usePlanWizardStore();
    const trainingAnimation = useTrainingAnimation(profile?.sport);
    const isCombat = combatSportSlugs.has(selectedSportSlug ?? '');

    // Env-Auswahl pro Tag lohnt nur, wenn mehrere Trainingsorte gewählt sind
    const multiEnv = selectedEnvIds.size > 1;

    function handleDayPress(dow: number) {
        const active = preferredDays.has(dow);
        if (!active) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            togglePreferredDay(dow);
            if (multiEnv) router.push(`/training-day-editor?day=${dow}`);
            return;
        }
        if (multiEnv) {
            router.push(`/training-day-editor?day=${dow}`);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            togglePreferredDay(dow);
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.schedule_subtitle')}
            </JempText>

            <View style={styles.dayList}>
                {WEEK_DAYS.map(({ dow, key }) => {
                    const active = preferredDays.has(dow);
                    const env = active && multiEnv
                        ? allEnvs.find(e => e.id === dayEnvMap[dow])
                        : undefined;
                    const sportSession = sportSessions.find(s => s.day_of_week === dow);
                    return (
                        <TouchableOpacity
                            key={dow}
                            activeOpacity={0.7}
                            onPress={() => handleDayPress(dow)}
                            style={[
                                styles.dayRow,
                                active
                                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                    : { backgroundColor: 'transparent', borderColor: theme.borderDivider },
                            ]}
                        >
                            <JempText
                                type="body-l"
                                color={active ? GradientMid : theme.text}
                                style={styles.dayName}
                            >
                                {t(key as any).toUpperCase()}
                            </JempText>

                            <View style={styles.dayRight}>
                                {/* Sport-Termin aus dem vorherigen Step als gedimmter Kontext-Hint */}
                                {sportSession && (
                                    <View style={styles.sportHint}>
                                        {sportSession.type === 'team_training' && (
                                            <LottieView
                                                source={trainingAnimation as never}
                                                autoPlay
                                                loop
                                                style={styles.sportHintLottie}
                                            />
                                        )}
                                        {sportSession.type === 'game' && (isCombat
                                            ? <LottieView
                                                source={require('@/assets/animations/fight.json')}
                                                autoPlay
                                                loop
                                                style={styles.sportHintLottie}
                                            />
                                            : <GameIcon width={13} height={13} />)}
                                        {sportSession.type === 'tournament' && (
                                            <LottieView
                                                source={require('@/assets/animations/throphy.json')}
                                                autoPlay
                                                loop
                                                style={styles.sportHintLottie}
                                            />
                                        )}
                                    </View>
                                )}
                                {active
                                    ? (
                                        <>
                                            {env && (
                                                <Ionicons name={env.icon as any} size={15} color={theme.textMuted} />
                                            )}
                                            <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                                        </>
                                    )
                                    : <Ionicons name="add" size={18} color={theme.textSubtle} />
                                }
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.durationSection}>
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
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    dayList: { gap: 8 },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dayName: {
        fontWeight: '600',
        minWidth: 36,
    },
    dayRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sportHint: {
        opacity: 0.55,
        marginRight: 2,
    },
    sportHintLottie: {
        // Lottie-Icons haben eingebautes Padding — größer rendern und vertikal
        // kompensieren, damit die Row nicht höher wird
        width: 20,
        height: 20,
        marginVertical: -5,
    },
    durationSection: { marginTop: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
});
