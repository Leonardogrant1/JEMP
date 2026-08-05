import { Colors, GradientMid } from '@/constants/theme';
import { type WorkoutSession } from '@/providers/plan-provider';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import Reanimated, {
    Extrapolation,
    FadeIn,
    FadeOut,
    interpolate,
    type SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

// Muss zum horizontalen Screen-Padding von plan.tsx passen — der Pager läuft
// full-bleed darunter durch, damit Card-Schatten nicht geclippt werden
const SCREEN_PAD = 20;
const CARD_GAP = 12;
// Vertikaler Puffer im Scroll-Content, damit der Karten-Glow nicht abgeschnitten
// wird (shadowOffset 8 + shadowRadius 16 der SessionCard)
const SHADOW_PAD = 24;

function PagerDot({ index, interval, scrollX, inactiveColor }: {
    index: number;
    interval: number;
    scrollX: SharedValue<number>;
    inactiveColor: string;
}) {
    // Kontinuierlich vom Scroll getrieben statt diskret bei momentum-end:
    // Breite wächst zur Pill, der GradientMid-Layer blendet per Opacity ein
    // (interpolateColor auf backgroundColor flackert bei Re-Renders)
    const range = [(index - 1) * interval, index * interval, (index + 1) * interval];
    const widthStyle = useAnimatedStyle(() => ({
        width: interpolate(scrollX.value, range, [6, 16, 6], Extrapolation.CLAMP),
    }));
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    }));

    return (
        <Reanimated.View style={[styles.dot, { backgroundColor: inactiveColor }, widthStyle]}>
            <Reanimated.View style={[styles.dotOverlay, overlayStyle]} />
        </Reanimated.View>
    );
}

function PagerCard({ index, interval, scrollX, width, children }: {
    index: number;
    interval: number;
    scrollX: SharedValue<number>;
    width: number;
    children: ReactNode;
}) {
    // Aktive Card in Normalgröße, die Nachbarn leicht verkleinert
    const scaleStyle = useAnimatedStyle(() => ({
        transform: [{
            scale: interpolate(
                scrollX.value,
                [(index - 1) * interval, index * interval, (index + 1) * interval],
                [0.92, 1, 0.92],
                Extrapolation.CLAMP,
            ),
        }],
    }));

    return (
        <Reanimated.View style={[{ width }, scaleStyle]}>
            {children}
        </Reanimated.View>
    );
}

/**
 * Horizontaler Pager für mehrere Sessions am selben Tag: geswiped werden nur
 * die Karten, die Action-Buttons bleiben fix darunter stehen und beziehen
 * sich immer auf die aktuell sichtbare Session. Bei einer einzigen Session
 * rendert er ohne Swipe und ohne Dots.
 */
export function SessionPager({ sessions, theme, renderCard, renderActions }: {
    sessions: WorkoutSession[];
    theme: (typeof Colors)['light'];
    renderCard: (session: WorkoutSession) => ReactNode;
    renderActions: (session: WorkoutSession) => ReactNode;
}) {
    const [pagerWidth, setPagerWidth] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    // Der Actions-Slot rastet auf der größten gemessenen Höhe ein, damit das
    // Layout nicht springt, wenn eine Session ohne Buttons aktiv wird
    const [actionsHeight, setActionsHeight] = useState(0);

    const scrollX = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler((e) => {
        scrollX.value = e.contentOffset.x;
    });

    const interval = pagerWidth + CARD_GAP;

    function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
        if (pagerWidth === 0) return;
        const index = Math.min(
            sessions.length - 1,
            Math.max(0, Math.round(e.nativeEvent.contentOffset.x / interval)),
        );
        if (index !== activeIndex) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveIndex(index);
        }
    }

    // Schutz + Diagnose: darf nie passieren, hat aber schon gecrasht —
    // falls der Log auftaucht, liefert er die Ursache mit
    if (sessions.length === 0 || sessions.some(s => s == null)) {
        console.warn('[SessionPager] ungültige sessions:', sessions.length, JSON.stringify(sessions.map(s => s?.id ?? null)));
        return null;
    }

    if (sessions.length === 1) {
        return (
            <>
                {renderCard(sessions[0])}
                {renderActions(sessions[0])}
            </>
        );
    }

    const activeSession = sessions[Math.min(activeIndex, sessions.length - 1)];

    return (
        <>
            <View style={styles.pagerBlock} onLayout={(e) => setPagerWidth(e.nativeEvent.layout.width)}>
                {pagerWidth > 0 && (
                    <Reanimated.ScrollView
                        horizontal
                        snapToInterval={interval}
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={handleMomentumEnd}
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {sessions.map((session, i) => (
                            <PagerCard
                                key={session.id}
                                index={i}
                                interval={interval}
                                scrollX={scrollX}
                                width={pagerWidth}
                            >
                                {renderCard(session)}
                            </PagerCard>
                        ))}
                    </Reanimated.ScrollView>
                )}
                <View style={styles.dots}>
                    {sessions.map((session, i) => (
                        <PagerDot
                            key={session.id}
                            index={i}
                            interval={interval}
                            scrollX={scrollX}
                            inactiveColor={theme.borderDivider}
                        />
                    ))}
                </View>
            </View>
            <View style={actionsHeight > 0 ? { height: actionsHeight } : undefined}>
                <Reanimated.View
                    key={activeSession.id}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        setActionsHeight((prev) => Math.max(prev, h));
                    }}
                >
                    {renderActions(activeSession)}
                </Reanimated.View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    pagerBlock: {
        flex: 1,
        gap: 4,
    },
    scroll: {
        flex: 1,
        // Full-bleed übers Screen-Padding hinaus + vertikaler Puffer,
        // damit die Karten-Schatten nicht an den Scroll-Grenzen clippen
        marginHorizontal: -SCREEN_PAD,
        marginVertical: -SHADOW_PAD,
    },
    scrollContent: {
        paddingHorizontal: SCREEN_PAD,
        paddingVertical: SHADOW_PAD,
        gap: CARD_GAP,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    dotOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 3,
        backgroundColor: GradientMid,
    },
});
