import { SetTable } from '@/components/active-session/SetTable';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

export function LogSetSection() {
    const { exerciseIdx, setSlideX, setOpacity } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: setSlideX.value }],
        opacity: setOpacity.value,
    }));

    const current = allExercises[exerciseIdx] ?? null;
    if (!current) return null;

    return (
        <Animated.View style={[styles.logSection, animatedStyle]}>
            {/* Satz-Übersicht — die Eingabe (Wheels wie Timer) lebt im LogSetSheet */}
            <SetTable />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    logSection: { gap: 16 },
});
