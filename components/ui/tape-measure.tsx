import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const TICK_SPACING = 12;
const LABEL_WIDTH = 48;

type TapeMeasureProps = {
    initialValue: number;
    min: number;
    max: number;
    step: number;
    unitLabel: string;
    majorEvery: number; // steps between tall ticks
    labelEvery: number; // steps between numbered ticks
    readoutPosition?: 'below' | 'above';
    onChange: (value: number) => void;
};

// Remount (via key) when min/max/step/unit change — the tape positions
// itself once from initialValue and then owns the value via scrolling.
export function TapeMeasure({ initialValue, min, max, step, unitLabel, majorEvery, labelEvery, readoutPosition = 'below', onChange }: TapeMeasureProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const scrollRef = useRef<ScrollView>(null);
    const [width, setWidth] = useState(0);
    const positioned = useRef(false);
    const lastHaptic = useRef(0);

    const stepCount = Math.round((max - min) / step);
    const decimals = step < 1 ? 1 : 0;
    const clampedInitial = Math.min(Math.max(initialValue, min), max);
    const [current, setCurrent] = useState(clampedInitial);

    // Unsichtbar bis das Band auf dem Startwert steht — sonst sieht man den
    // Tick-Mount + Positions-Sprung ("Aufpoppen")
    const revealOpacity = useSharedValue(0);

    const handlePositioned = () => {
        if (positioned.current) return;
        positioned.current = true;
        const idx = Math.round((clampedInitial - min) / step);
        scrollRef.current?.scrollTo({ x: idx * TICK_SPACING, animated: false });
        revealOpacity.value = withTiming(1, { duration: 250 });
    };

    const revealStyle = useAnimatedStyle(() => ({ opacity: revealOpacity.value }));

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.x / TICK_SPACING), 0), stepCount);
        const value = Number((min + idx * step).toFixed(decimals));
        if (value === current) return;
        setCurrent(value);
        onChange(value);
        const now = Date.now();
        if (now - lastHaptic.current > 30) {
            lastHaptic.current = now;
            Haptics.selectionAsync();
        }
    };

    return (
        <View style={[styles.root, readoutPosition === 'above' && styles.rootReversed]}>
            <View
                style={styles.rulerWrap}
                onLayout={e => setWidth(e.nativeEvent.layout.width)}
            >
                {width > 0 && (
                    <Reanimated.View style={[styles.reveal, revealStyle]}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={TICK_SPACING}
                        decelerationRate="fast"
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingHorizontal: width / 2 - TICK_SPACING / 2 }}
                        onContentSizeChange={handlePositioned}
                    >
                        {Array.from({ length: stepCount + 1 }, (_, i) => {
                            const isMajor = i % majorEvery === 0;
                            const isLabeled = i % labelEvery === 0;
                            const tickValue = Number((min + i * step).toFixed(decimals));
                            return (
                                <View key={i} style={styles.tickSlot}>
                                    <View
                                        style={[
                                            styles.tick,
                                            {
                                                height: isMajor ? 28 : 14,
                                                backgroundColor: isMajor ? theme.textMuted : theme.borderStrong,
                                            },
                                        ]}
                                    />
                                    {isLabeled && (
                                        <JempText type="caption" color={theme.textSubtle} style={styles.tickLabel}>
                                            {tickValue}
                                        </JempText>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                    </Reanimated.View>
                )}

                <Reanimated.View pointerEvents="none" style={[styles.indicatorWrap, revealStyle]}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.indicator}
                    />
                </Reanimated.View>
            </View>

            <JempText type="hero" gradient style={styles.readout}>
                {`${current.toFixed(decimals)} ${unitLabel}`}
            </JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { alignItems: 'center', gap: 20, width: '100%' },
    rootReversed: { flexDirection: 'column-reverse' },
    readout: { alignSelf: 'center' },
    rulerWrap: { width: '100%', height: 64 },
    reveal: { flex: 1 },
    tickSlot: {
        width: TICK_SPACING,
        height: 64,
        alignItems: 'center',
    },
    tick: {
        width: 2,
        borderRadius: 1,
        marginTop: 8,
    },
    tickLabel: {
        position: 'absolute',
        bottom: 0,
        width: LABEL_WIDTH,
        left: -(LABEL_WIDTH - TICK_SPACING) / 2,
        textAlign: 'center',
    },
    indicatorWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
    },
    indicator: {
        width: 3,
        height: 40,
        borderRadius: 2,
        marginTop: 2,
    },
});
