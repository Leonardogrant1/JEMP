import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { WeekLoadSummary } from '@/components/plan-generation/WeekLoadSummary';
import { getSportKind } from '@/constants/sports';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimationBySlug } from '@/hooks/use-training-animation';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function WeeklyScheduleStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedSchedule = useOnboardingStore((s) => s.weekly_schedule);
    const sportSlug = useOnboardingStore((s) => s.sport_slug);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const trainingAnimation = useTrainingAnimationBySlug(sportSlug);
    const sportKind = getSportKind(sportSlug);

    // Der sport-day-editor-Sheet schreibt direkt in den Onboarding-Store
    const sessions = storedSchedule?.sessions ?? [];

    const DAYS: { value: number; label: string }[] = [
        { value: 1, label: t('onboarding.workout_prefs_day_mon') },
        { value: 2, label: t('onboarding.workout_prefs_day_tue') },
        { value: 3, label: t('onboarding.workout_prefs_day_wed') },
        { value: 4, label: t('onboarding.workout_prefs_day_thu') },
        { value: 5, label: t('onboarding.workout_prefs_day_fri') },
        { value: 6, label: t('onboarding.workout_prefs_day_sat') },
        { value: 7, label: t('onboarding.workout_prefs_day_sun') },
    ];

    useEffect(() => {
        setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.weekly_schedule_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.weekly_schedule_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.dayList}>
                {DAYS.map(({ value: dow, label }) => {
                    const session = sessions.find((s) => s.day_of_week === dow);
                    const configured = !!session;
                    return (
                        <TouchableOpacity
                            key={dow}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/sport-day-editor?day=${dow}&source=onboarding`)}
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
                                {label.toUpperCase()}
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
            </Animated.View>

            <WeekLoadSummary sessions={sessions} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
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
