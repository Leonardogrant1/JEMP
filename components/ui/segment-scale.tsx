import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, LinearTransition } from 'react-native-reanimated';

const fillTransition = LinearTransition.duration(140).easing(Easing.out(Easing.cubic));
// Ab dieser Distanz gilt die Geste als Drag (statt Tap/Scroll)
const DIRECTION_SLOP = 8;

/**
 * Tap- und drag-bare Segment-Leiste für begrenzte Skalen (1..max) —
 * Füllung bis zum Wert, Light-Haptic pro Wertwechsel. In ScrollViews
 * gesten-sicher: horizontale Drags blocken das Scrollen, vertikale
 * Bewegungen gehen ans Scrollen und ändern NIE den Wert; Taps feuern
 * beim Loslassen. Erstnutzung: Intensität im sport-day-editor, Level
 * im Onboarding.
 */
export function SegmentScale({ value, max = 10, color, trackColor, onSelect, onEngagedChange }: {
    value: number;
    max?: number;
    color: string;
    trackColor: string;
    onSelect: (v: number) => void;
    /** Meldet aktiven Horizontal-Drag — Parent-ScrollViews setzen damit scrollEnabled={false} */
    onEngagedChange?: (engaged: boolean) => void;
}) {
    const [rowWidth, setRowWidth] = useState(0);
    // Drag feuert pro Frame — nur echte Wertwechsel nach oben geben (Haptic-Spam)
    const lastSent = useRef(value);
    // true sobald die Geste als horizontaler Drag erkannt wurde
    const engaged = useRef(false);
    const startPoint = useRef({ x: 0, y: 0 });

    function emitFromX(x: number) {
        if (rowWidth <= 0) return;
        const v = Math.min(max, Math.max(1, Math.ceil(x / (rowWidth / max))));
        if (v !== lastSent.current) {
            lastSent.current = v;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(v);
        }
    }

    function handleGrant(e: GestureResponderEvent) {
        engaged.current = false;
        startPoint.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    }

    function handleMove(e: GestureResponderEvent) {
        if (!engaged.current) {
            const dx = Math.abs(e.nativeEvent.pageX - startPoint.current.x);
            const dy = Math.abs(e.nativeEvent.pageY - startPoint.current.y);
            const horizontal = dx > DIRECTION_SLOP && dx > dy;
            if (!horizontal) return;
            engaged.current = true;
            onEngagedChange?.(true);
        }
        emitFromX(e.nativeEvent.locationX);
    }

    function handleRelease(e: GestureResponderEvent) {
        if (!engaged.current) {
            const dx = Math.abs(e.nativeEvent.pageX - startPoint.current.x);
            const dy = Math.abs(e.nativeEvent.pageY - startPoint.current.y);
            if (dx < DIRECTION_SLOP && dy < DIRECTION_SLOP) emitFromX(e.nativeEvent.locationX);
        } else {
            onEngagedChange?.(false);
        }
        engaged.current = false;
    }

    function handleTerminate() {
        if (engaged.current) onEngagedChange?.(false);
        engaged.current = false;
    }

    // Solange kein horizontaler Drag läuft, darf der ScrollView die Geste
    // übernehmen (vertikales Scrollen) — danach nicht mehr
    function handleTerminationRequest() {
        return !engaged.current;
    }

    return (
        <View
            style={styles.row}
            onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleGrant}
            onResponderMove={handleMove}
            onResponderRelease={handleRelease}
            onResponderTerminate={handleTerminate}
            onResponderTerminationRequest={handleTerminationRequest}
        >
            {/* pointerEvents none: der Row-Responder bekommt alle Events, und
                locationX ist damit immer relativ zur Row */}
            {Array.from({ length: max }, (_, i) => i + 1).map(v => (
                <View
                    key={v}
                    pointerEvents="none"
                    style={[styles.segment, { backgroundColor: trackColor }]}
                >
                    <Reanimated.View
                        layout={fillTransition}
                        style={[
                            styles.fill,
                            { width: v <= value ? '100%' : 0, backgroundColor: color },
                        ]}
                    />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 4,
        // Drag-Fläche größer als die Segmente selbst
        paddingVertical: 8,
    },
    segment: {
        flex: 1,
        height: 28,
        borderRadius: 6,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 6,
    },
});
