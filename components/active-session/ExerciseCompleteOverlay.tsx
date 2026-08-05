import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

/**
 * Kurzer Abschluss-Moment, wenn alle Sätze einer Übung eingetragen sind:
 * Check-Lottie zentriert über allem (auch über dem Rest-Overlay), räumt sich
 * nach der Animation selbst weg.
 */
export function ExerciseCompleteOverlay() {
    const show = useActiveSessionUIStore(s => s.showExerciseComplete);
    const setShow = useActiveSessionUIStore(s => s.setShowExerciseComplete);

    // Fallback, falls onAnimationFinish (z.B. bei Reload) nicht feuert
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (show) {
            timerRef.current = setTimeout(() => setShow(false), 2000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [show, setShow]);

    if (!show) return null;

    return (
        <Reanimated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(250)}
            style={styles.overlay}
            pointerEvents="none"
        >
            <Reanimated.View entering={ZoomIn.duration(250).springify()}>
                <LottieView
                    source={require('@/assets/animations/check.json')}
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                    onAnimationFinish={() => setShow(false)}
                />
            </Reanimated.View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        // Dezenter Scrim, damit der Check auf unruhigem Content lesbar bleibt
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    lottie: {
        width: 110,
        height: 110,
    },
});
