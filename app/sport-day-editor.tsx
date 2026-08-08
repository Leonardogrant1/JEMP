import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { LOAD_COLORS } from '@/components/plan-generation/WeekLoadSummary';
import { SegmentScale } from '@/components/ui/segment-scale';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { getSportKind } from '@/constants/sports';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { getSessionTypes } from '@/helpers/plan-generation-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimationBySlug } from '@/hooks/use-training-animation';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { WeeklyScheduleSession } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    LinearTransition,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sheetTransition = LinearTransition.duration(250).easing(Easing.out(Easing.cubic));

function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same', preferredDaysArray: number[]): number[] {
    if (mode === 'same') return preferredDaysArray.includes(sportDay) ? [sportDay] : [];
    const prev = sportDay === 1 ? 7 : sportDay - 1;
    const next = sportDay === 7 ? 1 : sportDay + 1;
    return preferredDaysArray.filter(d => d === prev || d === next);
}

function formatDays(days: number[], t: (key: any) => string): string {
    return days.map(d => t(WEEK_DAYS.find(x => x.dow === d)?.key as any ?? '')).join(', ');
}

// Ampel-Logik passend zu den Hints: bis 4 locker, 5–7 moderat, ab 8 hart
function intensityColor(value: number): string {
    if (value <= 4) return LOAD_COLORS.low;
    if (value <= 7) return LOAD_COLORS.medium;
    return LOAD_COLORS.high;
}


/** Bottom sheet: configure one sport day (type + intensity) in the plan wizard. */
export default function SportDayEditorScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { day, source } = useLocalSearchParams<{ day: string; source?: string }>();
    const dayNum = Number(day);
    // Der Sheet bedient zwei Welten: Plan-Wizard (Default) und Onboarding
    const isOnboarding = source === 'onboarding';

    const wizard = usePlanWizardStore();
    const obSchedule = useOnboardingStore((s) => s.weekly_schedule);
    const obPreferredDays = useOnboardingStore((s) => s.preferred_workout_days);
    const obSportSlug = useOnboardingStore((s) => s.sport_slug);
    const obSet = useOnboardingStore((s) => s.set);

    const sessions: WeeklyScheduleSession[] = isOnboarding
        ? obSchedule?.sessions ?? []
        : wizard.sportSessions;
    const sportSlug = isOnboarding ? obSportSlug : wizard.selectedSportSlug;
    const preferredDaysArray = isOnboarding
        ? obPreferredDays ?? []
        : [...wizard.preferredDays];

    const session = sessions.find(s => s.day_of_week === dayNum);
    const dayKey = WEEK_DAYS.find(d => d.dow === dayNum)?.key;
    // Per Slug statt profile.sport — funktioniert auch im Onboarding, wo der
    // Sport noch nicht im Profil gespeichert ist
    const trainingAnimation = useTrainingAnimationBySlug(sportSlug);
    const sportKind = getSportKind(sportSlug);

    function persistOnboarding(next: WeeklyScheduleSession[]) {
        obSet({ weekly_schedule: { sessions: next, notes: null } });
    }

    function toggleDay() {
        if (!isOnboarding) { wizard.toggleSportDay(dayNum); return; }
        persistOnboarding(session
            ? sessions.filter(s => s.day_of_week !== dayNum)
            : [...sessions, { day_of_week: dayNum, type: 'team_training', intensity: 6 }]);
    }

    function setType(type: WeeklyScheduleSession['type']) {
        if (!isOnboarding) { wizard.setSportType(dayNum, type); return; }
        persistOnboarding(sessions.map(s => s.day_of_week === dayNum ? { ...s, type } : s));
    }

    function setIntensity(intensity: number) {
        if (!isOnboarding) { wizard.setSportIntensity(dayNum, intensity); return; }
        persistOnboarding(sessions.map(s => s.day_of_week === dayNum ? { ...s, intensity } : s));
    }

    const translateY = useSharedValue(400);
    const overlayOpacity = useSharedValue(0);

    // Eintritts-Animation über onLayout statt useEffect (react-hooks/immutability)
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayOpacity.value = withTiming(1, { duration: 250 });
        translateY.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function handleClose() {
        overlayOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(400, { duration: 200 }, (finished) => {
            if (finished) runOnJS(goBack)();
        });
    }

    function handleSelectType(type: WeeklyScheduleSession['type']) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!session) {
            if (isOnboarding) {
                persistOnboarding([...sessions, { day_of_week: dayNum, type, intensity: 6 }]);
                return;
            }
            toggleDay();
        }
        setType(type);
    }

    // Haptic übernimmt die SegmentScale selbst
    function handleSelectIntensity(v: number) {
        setIntensity(v);
    }

    function handleRemove() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (session) toggleDay();
        handleClose();
    }

    const isTraining = session?.type === 'team_training';

    // Kontext-Hinweis: Auswirkung des Termins auf die geplanten JEMP-Tage
    let hintText: string | null = null;
    if (session && (session.type === 'game' || session.type === 'tournament')) {
        const affected = getAffectedJempDays(dayNum, 'adjacent', preferredDaysArray);
        if (affected.length > 0) {
            hintText = t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected, t) });
        }
    } else if (session && isTraining && session.intensity === 7) {
        const sameDay = getAffectedJempDays(dayNum, 'same', preferredDaysArray);
        if (sameDay.length > 0) {
            hintText = t('onboarding.weekly_schedule_hint_intensity_7', { days: formatDays(sameDay, t) });
        }
    } else if (session && isTraining && session.intensity >= 8) {
        const sameDay = getAffectedJempDays(dayNum, 'same', preferredDaysArray);
        const adjacent = getAffectedJempDays(dayNum, 'adjacent', preferredDaysArray);
        if (sameDay.length > 0 || adjacent.length > 0) {
            const key = sameDay.length > 0 && adjacent.length > 0
                ? 'onboarding.weekly_schedule_hint_intensity_8plus_both'
                : sameDay.length > 0
                    ? 'onboarding.weekly_schedule_hint_intensity_8plus_same'
                    : 'onboarding.weekly_schedule_hint_intensity_8plus_adjacent';
            hintText = t(key as any, { sameDays: formatDays(sameDay, t), adjacentDays: formatDays(adjacent, t) });
        }
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

    return (
        <View style={styles.root}>
            {/* Backdrop als eigene Ebene — der Sheet darf KEIN Pressable-Kind
                sein, sonst schluckt der Responder die Scroll-Geste des Wheels */}
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={styles.backdropPressable} onPress={handleClose} />
            </Reanimated.View>

            <View style={styles.sheetWrap} pointerEvents="box-none">
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        layout={sheetTransition}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />
                            {dayKey && (
                                <JempText type="caption" color={theme.textSubtle} style={styles.dayLabel}>
                                    {t(dayKey as any).toUpperCase()}
                                </JempText>
                            )}

                            <View>
                                {getSessionTypes(sportSlug).map((st, index) => {
                                    const active = session?.type === st.key;
                                    return (
                                        <View key={st.key}>
                                            {index > 0 && (
                                                <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                            )}
                                            <Pressable
                                                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                                                onPress={() => handleSelectType(st.key)}
                                            >
                                                <View style={styles.rowIcon}>
                                                    {st.key === 'team_training' && (
                                                        <LottieView
                                                            source={trainingAnimation as never}
                                                            autoPlay
                                                            loop
                                                            style={styles.rowLottie}
                                                        />
                                                    )}
                                                    {st.key === 'game' && sportKind === 'combat' && (
                                                        <LottieView
                                                            source={require('@/assets/animations/fight.json')}
                                                            autoPlay
                                                            loop
                                                            style={styles.rowLottie}
                                                        />
                                                    )}
                                                    {st.key === 'game' && sportKind === 'match' && (
                                                        <GameIcon width={16} height={16} />
                                                    )}
                                                    {/* Turnier bzw. Wettkampf (Individualsport) — beides Trophäe */}
                                                    {(st.key === 'tournament' || (st.key === 'game' && sportKind === 'individual')) && (
                                                        <LottieView
                                                            source={require('@/assets/animations/throphy.json')}
                                                            autoPlay
                                                            loop
                                                            style={styles.rowLottie}
                                                        />
                                                    )}
                                                </View>
                                                <JempText type="body-l" color={theme.text} style={styles.rowLabel}>
                                                    {t(st.labelKey as any)}
                                                </JempText>
                                                {active && <Ionicons name="checkmark" size={20} color={GradientMid} />}
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>

                            {isTraining && (
                                <Reanimated.View entering={FadeInDown.duration(200)} style={styles.intensityBlock}>
                                    <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                    <View style={styles.intensityRow}>
                                        <JempText type="caption" color={theme.textMuted} style={styles.intensityLabel}>
                                            {t('onboarding.weekly_schedule_intensity_label')}
                                        </JempText>
                                        <JempText type="body-l" color={intensityColor(session.intensity)} style={styles.intensityValue}>
                                            {session.intensity}
                                        </JempText>
                                    </View>
                                    <View style={styles.scaleWrap}>
                                        <SegmentScale
                                            value={session.intensity}
                                            color={intensityColor(session.intensity)}
                                            trackColor={theme.borderStrong}
                                            onSelect={handleSelectIntensity}
                                        />
                                    </View>
                                    {/* Fester Slot statt bedingtem Mount — der Hint darf beim
                                        Drehen des Rädchens keinen Layout-Shift auslösen */}
                                    <View style={styles.hintSlot}>
                                        {hintText && (
                                            <Reanimated.View
                                                key={hintText}
                                                entering={FadeIn.duration(200)}
                                                exiting={FadeOut.duration(150)}
                                                style={styles.hintBox}
                                            >
                                                <JempText type="body-sm" color={GradientMid} numberOfLines={3}>
                                                    {hintText}
                                                </JempText>
                                            </Reanimated.View>
                                        )}
                                    </View>
                                </Reanimated.View>
                            )}

                            {!isTraining && hintText && (
                                <Reanimated.View entering={FadeInDown.duration(200)} style={styles.hintBox}>
                                    <JempText type="body-sm" color={GradientMid}>{hintText}</JempText>
                                </Reanimated.View>
                            )}

                            <Pressable onPress={handleClose} style={styles.doneBtn}>
                                <LinearGradient
                                    colors={GRADIENT}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.doneBtnGradient}
                                >
                                    <JempText type="button" color="#fff">{t('ui.done')}</JempText>
                                </LinearGradient>
                            </Pressable>

                            {session && (
                                <Pressable onPress={handleRemove} style={styles.removeBtn} hitSlop={8}>
                                    <JempText type="body-sm" color={theme.textMuted}>{t('plan.sport_day_clear')}</JempText>
                                </Pressable>
                            )}
                        </View>
                    </Reanimated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropPressable: {
        flex: 1,
    },
    sheetWrap: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 8,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    dayLabel: {
        letterSpacing: 1.5,
        fontSize: 11,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 12,
    },
    rowIcon: {
        width: 24,
        alignItems: 'center',
    },
    rowLottie: {
        // Lottie-Icons haben eingebautes Padding — größer rendern und vertikal
        // kompensieren
        width: 26,
        height: 26,
        marginVertical: -5,
    },
    rowLabel: {
        flex: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        // Einzug auf Texthöhe: row-padding 4 + Icon 24 + gap 14
        marginLeft: 42,
    },
    intensityBlock: {
        gap: 8,
    },
    intensityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    intensityLabel: {
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    intensityValue: {
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    scaleWrap: {
        marginHorizontal: 4,
    },
    hintSlot: {
        height: 76,
        justifyContent: 'center',
    },
    hintBox: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(61, 158, 203, 0.15)',
    },
    doneBtn: {
        borderRadius: 100,
        overflow: 'hidden',
        marginTop: 8,
    },
    doneBtnGradient: {
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeBtn: {
        alignSelf: 'center',
        paddingVertical: 10,
    },
});
