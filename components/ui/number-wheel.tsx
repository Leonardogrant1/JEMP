import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const ITEM_HEIGHT = 44;

type NumberWheelProps = {
    initialValue: number;
    min: number;
    max: number; // with extendable: initial window only — the wheel grows by +50 near the end
    step?: number; // value distance between rows (default 1), e.g. 2.5 for loads
    extendable?: boolean;
    visibleItems?: number; // odd number of rows shown (default 5)
    formatLabel?: (value: number) => string; // custom row label (e.g. localized month names)
    onChange: (value: number) => void;
};

// Ganze Zahlen ohne Nachkommastelle, sonst bis zu zwei Dezimalstellen (0.25er-Schritte)
function formatStepValue(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function WheelNumber({ index, label, scrollY, color }: { index: number; label: string; scrollY: SharedValue<number>; color: string }) {
    const animatedStyle = useAnimatedStyle(() => {
        const d = (scrollY.value - index * ITEM_HEIGHT) / ITEM_HEIGHT;
        const t = Math.min(Math.abs(d), 2.5);
        const tilt = Math.max(Math.min(d, 2), -2) * 22;
        return {
            opacity: 1 - t * 0.32,
            transform: [
                { perspective: 400 },
                { rotateX: `${tilt}deg` },
                { scale: 1 - Math.min(t, 1) * 0.2 },
            ],
        };
    });
    return (
        <Animated.View style={[styles.item, animatedStyle]}>
            <Text style={[styles.number, { color }]}>{label}</Text>
        </Animated.View>
    );
}

// Vertical picker wheel with snap, haptic ticks, and lazy extension near the end
export function NumberWheel({ initialValue, min, max, step = 1, extendable = true, visibleItems = 5, formatLabel, onChange }: NumberWheelProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const wheelHeight = ITEM_HEIGHT * visibleItems;
    const bandOffset = (wheelHeight - ITEM_HEIGHT) / 2;

    const listRef = useRef<ScrollView>(null);
    const positioned = useRef(false);
    const lastHaptic = useRef(0);

    const [maxValue, setMaxValue] = useState(extendable ? Math.max(max, initialValue + 10 * step) : max);
    const count = Math.floor((maxValue - min) / step) + 1;
    const initialIdx = Math.min(Math.max(Math.round((initialValue - min) / step), 0), count - 1);
    const scrollY = useSharedValue(initialIdx * ITEM_HEIGHT);
    const lastIdx = useSharedValue(initialIdx);

    const emit = (value: number) => {
        onChange(value);
        // Appending numbers doesn't shift existing offsets, so extending is seamless
        if (extendable) {
            setMaxValue(m => (m - value < 10 * step ? Math.ceil((value + 50 * step) / (50 * step)) * (50 * step) : m));
        }
        const now = Date.now();
        if (now - lastHaptic.current > 30) {
            lastHaptic.current = now;
            Haptics.selectionAsync();
        }
    };

    const scrollHandler = useAnimatedScrollHandler(e => {
        scrollY.value = e.contentOffset.y;
        const idx = Math.min(Math.max(Math.round(e.contentOffset.y / ITEM_HEIGHT), 0), count - 1);
        if (idx !== lastIdx.value) {
            lastIdx.value = idx;
            runOnJS(emit)(min + idx * step);
        }
    });

    // Plain ScrollView statt FlatList: Wheels leben oft in vertikalen
    // ScrollViews (Active Session, Assessments) — eine VirtualizedList würde
    // dort die Nested-Warnung werfen. Die Zeilenzahl ist begrenzt und die
    // Rows sind billig, Virtualisierung bringt hier nichts.
    const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

    return (
        <View style={[styles.root, { height: wheelHeight }]}>
            <View style={[styles.centerBand, { top: bandOffset, backgroundColor: theme.surface }]} />
            <Animated.ScrollView
                ref={listRef}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingVertical: bandOffset }}
                onContentSizeChange={() => {
                    if (positioned.current) return;
                    positioned.current = true;
                    listRef.current?.scrollTo({ y: initialIdx * ITEM_HEIGHT, animated: false });
                }}
            >
                {indices.map(i => (
                    <WheelNumber key={i} index={i} label={(formatLabel ?? formatStepValue)(min + i * step)} scrollY={scrollY} color={theme.text} />
                ))}
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: '100%',
    },
    centerBand: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        borderRadius: 12,
    },
    item: {
        height: ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    number: {
        fontFamily: Fonts.satoshiBold,
        fontSize: 26,
        letterSpacing: -0.5,
    },
});
