import { DurationSet } from '@/components/active-session/DurationSet';
import { LoadSet } from '@/components/active-session/LoadSet';
import { SideDurationSet } from '@/components/active-session/SideDurationSet';
import { SideLoadSet } from '@/components/active-session/SideLoadSet';
import { useLogSet } from '@/components/active-session/use-log-set';
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom Sheet für die Satz-Eingabe: Wheels + Bestätigen. Bewusst KEIN
 * RN-Modal — dessen eigene native View-Hierarchie bricht die Scroll-Gesten
 * der Wheels. Stattdessen ein absolutes In-Screen-Overlay wie das
 * RestOverlay, animiert über Mount/Unmount (entering/exiting).
 */
export function LogSetSheet() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();

    const showLogSheet = useActiveSessionUIStore(s => s.showLogSheet);
    const setShowLogSheet = useActiveSessionUIStore(s => s.setShowLogSheet);
    const suggestionHint = useActiveSessionUIStore(s => s.suggestionHint);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);

    const { exerciseIdx, currentSet } = useActiveSessionTransition();
    const { handleLogSet, hasInput, activeSide, isUnilateral, isDuration } = useLogSet();

    const current = allExercises[exerciseIdx] ?? null;
    const totalSets = current?.target_sets ?? 1;

    if (!showLogSheet || !current) return null;

    function handleConfirm() {
        setShowLogSheet(false);
        handleLogSet();
    }

    const renderInputs = () => {
        if (isDuration && isUnilateral) return <SideDurationSet side={activeSide} />;
        if (isDuration) return <DurationSet />;
        if (isUnilateral) return <SideLoadSet side={activeSide} />;
        return <LoadSet />;
    };

    const setInfo = isUnilateral
        ? `${t('ui.set_of', { current: currentSet, total: totalSets })} · ${t(activeSide === 'left' ? 'ui.side_left' : 'ui.side_right')}`
        : t('ui.set_of', { current: currentSet, total: totalSets });

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <Reanimated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(180)}
                style={StyleSheet.absoluteFill}
            >
                <Pressable style={styles.backdrop} onPress={() => setShowLogSheet(false)} />
            </Reanimated.View>

            <Reanimated.View
                entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
                exiting={SlideOutDown.duration(220).easing(Easing.in(Easing.cubic))}
                style={[styles.sheet, { backgroundColor: theme.surface }]}
            >
                <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                    <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                    <View style={styles.header}>
                        <JempText type="h2">{current.exercise.name}</JempText>
                        <JempText type="caption" color={theme.textMuted}>
                            {setInfo}
                        </JempText>
                    </View>

                    {renderInputs()}

                    {suggestionHint && (
                        <JempText type="caption" color={theme.textMuted} style={styles.hint}>
                            {t('ui.progression_hint' as any, { value: suggestionHint })}
                        </JempText>
                    )}

                    <Pressable
                        style={[styles.confirmBtn, !hasInput && styles.confirmBtnDisabled]}
                        onPress={handleConfirm}
                        disabled={!hasInput}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.confirmBtnGradient}
                        >
                            <JempText type="button" color="#fff">
                                {t('ui.log_set')}
                            </JempText>
                        </LinearGradient>
                    </Pressable>
                </View>
            </Reanimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        zIndex: 5,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        gap: 2,
    },
    hint: {
        textAlign: 'center',
    },
    confirmBtn: {
        borderRadius: 100,
        overflow: 'hidden',
        marginTop: 4,
    },
    confirmBtnDisabled: {
        opacity: 0.4,
    },
    confirmBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
