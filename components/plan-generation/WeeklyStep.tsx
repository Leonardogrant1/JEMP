import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { WeekLoadSummary } from '@/components/plan-generation/WeekLoadSummary';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { getSportKind } from '@/constants/sports';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimation } from '@/hooks/use-training-animation';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export function WeeklyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { profile } = useCurrentUser();
    const { sportSessions, selectedSportSlug } = usePlanWizardStore();
    const trainingAnimation = useTrainingAnimation(profile?.sport);
    const sportKind = getSportKind(selectedSportSlug);

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                {t('onboarding.weekly_schedule_title')}
            </JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('onboarding.weekly_schedule_subtitle')}
            </JempText>

            <View style={styles.dayList}>
                {WEEK_DAYS.map(({ dow, key }) => {
                    const session = sportSessions.find(s => s.day_of_week === dow);
                    const configured = !!session;
                    return (
                        <TouchableOpacity
                            key={dow}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/sport-day-editor?day=${dow}`)}
                            style={[
                                styles.dayRow,
                                configured
                                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                    : { backgroundColor: 'transparent', borderColor: theme.borderDivider },
                            ]}
                        >
                            <JempText
                                type="body-l"
                                color={configured ? GradientMid : theme.text}
                                style={styles.dayName}
                            >
                                {t(key as any).toUpperCase()}
                            </JempText>

                            {configured
                                ? (
                                    <View style={styles.dayRight}>
                                        {session.type === 'team_training' && (
                                            <>
                                                <View style={styles.intensityChip}>
                                                    <Ionicons name="flash-outline" size={11} color={theme.textMuted} />
                                                    <JempText type="caption" color={theme.textMuted}>
                                                        {session.intensity}
                                                    </JempText>
                                                </View>
                                                <LottieView
                                                    source={trainingAnimation as never}
                                                    autoPlay
                                                    loop
                                                    style={styles.dayLottie}
                                                />
                                            </>
                                        )}
                                        {session.type === 'game' && sportKind === 'combat' && (
                                            <LottieView
                                                source={require('@/assets/animations/fight.json')}
                                                autoPlay
                                                loop
                                                style={styles.dayLottie}
                                            />
                                        )}
                                        {session.type === 'game' && sportKind === 'match' && (
                                            <GameIcon width={14} height={14} />
                                        )}
                                        {/* Turnier bzw. Wettkampf (Individualsport) — beides Trophäe */}
                                        {(session.type === 'tournament' || (session.type === 'game' && sportKind === 'individual')) && (
                                            <LottieView
                                                source={require('@/assets/animations/throphy.json')}
                                                autoPlay
                                                loop
                                                style={styles.dayLottie}
                                            />
                                        )}
                                    </View>
                                )
                                : <Ionicons name="add" size={18} color={theme.textSubtle} />
                            }
                        </TouchableOpacity>
                    );
                })}
            </View>

            <WeekLoadSummary sessions={sportSessions} />
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
    intensityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    dayLottie: {
        // Lottie-Icons haben eingebautes Padding — größer rendern und vertikal
        // kompensieren, damit die Row nicht höher wird
        width: 22,
        height: 22,
        marginVertical: -5,
    },
});
