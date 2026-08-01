import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const ITEM_HEIGHT = 44;

type NumberWheelProps = {
    initialValue: number;
    min: number;
    max: number; // with extendable: initial window only — the wheel grows by +50 near the end
    extendable?: boolean;
    visibleItems?: number; // odd number of rows shown (default 5)
    onChange: (value: number) => void;
};

function WheelNumber({ index, label, scrollY, color }: { index: number; label: number; scrollY: SharedValue<number>; color: string }) {
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
export function NumberWheel({ initialValue, min, max, extendable = true, visibleItems = 5, onChange }: NumberWheelProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const wheelHeight = ITEM_HEIGHT * visibleItems;
    const bandOffset = (wheelHeight - ITEM_HEIGHT) / 2;

    const listRef = useRef<FlatList<number>>(null);
    const positioned = useRef(false);
    const lastHaptic = useRef(0);

    const [maxValue, setMaxValue] = useState(extendable ? Math.max(max, initialValue + 10) : max);
    const count = maxValue - min + 1;
    const initialIdx = Math.min(Math.max(initialValue, min), maxValue) - min;
    const scrollY = useSharedValue(initialIdx * ITEM_HEIGHT);
    const lastIdx = useSharedValue(initialIdx);

    const emit = (value: number) => {
        onChange(value);
        // Appending numbers doesn't shift existing offsets, so extending is seamless
        if (extendable) {
            setMaxValue(m => (m - value < 10 ? Math.ceil((value + 50) / 50) * 50 : m));
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
            runOnJS(emit)(min + idx);
        }
    });

    // Virtualized: only the visible window (+buffer) is mounted, so far-away
    // numbers cost neither views nor per-frame animation work.
    const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

    return (
        <View style={[styles.root, { height: wheelHeight }]}>
            <View style={[styles.centerBand, { top: bandOffset, backgroundColor: theme.surface }]} />
            <Animated.FlatList
                ref={listRef}
                data={indices}
                keyExtractor={i => String(i)}
                renderItem={({ item }) => (
                    <WheelNumber index={item} label={min + item} scrollY={scrollY} color={theme.text} />
                )}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                initialNumToRender={visibleItems + 4}
                windowSize={5}
                maxToRenderPerBatch={16}
                removeClippedSubviews
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
                    listRef.current?.scrollToOffset({ offset: initialIdx * ITEM_HEIGHT, animated: false });
                }}
            />
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
