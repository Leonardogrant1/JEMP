import { JempText } from '@/components/jemp-text';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    Easing,
    LinearTransition,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sheetTransition = LinearTransition.duration(250).easing(Easing.out(Easing.cubic));

/** Bottom sheet: environment for one JEMP training day in the plan wizard. */
export default function TrainingDayEditorScreen() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { day } = useLocalSearchParams<{ day: string }>();
    const dayNum = Number(day);

    const {
        preferredDays, togglePreferredDay,
        selectedEnvIds, allEnvs,
        dayEnvMap, toggleDayEnv,
    } = usePlanWizardStore();
    const dayKey = WEEK_DAYS.find(d => d.dow === dayNum)?.key;
    const selectedEnvs = allEnvs.filter(e => selectedEnvIds.has(e.id));
    const canClear = preferredDays.size > 2;

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

    function handleSelectEnv(envId: string) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleDayEnv(dayNum, envId);
    }

    function handleClear() {
        if (!canClear) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (preferredDays.has(dayNum)) togglePreferredDay(dayNum);
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

    return (
        <View style={styles.root}>
            {/* Backdrop als eigene Ebene — Sheet nie in einen Pressable wrappen
                (Sibling-Pattern, s. sport-day-editor) */}
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
                        <JempText type="body-sm" color={theme.textMuted}>
                            {t('onboarding.workout_prefs_env_hint')}
                        </JempText>

                        <View>
                            {selectedEnvs.map((env, index) => {
                                const active = dayEnvMap[dayNum] === env.id;
                                return (
                                    <View key={env.id}>
                                        {index > 0 && (
                                            <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                        )}
                                        <Pressable
                                            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                                            onPress={() => handleSelectEnv(env.id)}
                                        >
                                            <View style={styles.rowIcon}>
                                                <Ionicons
                                                    name={env.icon as any}
                                                    size={18}
                                                    color={active ? GradientMid : theme.textMuted}
                                                />
                                            </View>
                                            <JempText type="body-l" color={theme.text} style={styles.rowLabel}>
                                                {env.name_i18n?.[locale] ?? env.slug}
                                            </JempText>
                                            {active && <Ionicons name="checkmark" size={20} color={GradientMid} />}
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>

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

                        {preferredDays.has(dayNum) && (
                            <Pressable
                                onPress={handleClear}
                                style={[styles.clearBtn, !canClear && { opacity: 0.4 }]}
                                hitSlop={8}
                                disabled={!canClear}
                            >
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
    rowLabel: {
        flex: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        // Einzug auf Texthöhe: row-padding 4 + Icon 24 + gap 14
        marginLeft: 42,
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
    clearBtn: {
        alignSelf: 'center',
        paddingVertical: 10,
    },
});
