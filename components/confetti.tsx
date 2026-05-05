import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { useMemo, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FF9F43', '#A29BFE', '#FD79A8', '#55EFC4',
];

const PARTICLE_COUNT = 50;

type Particle = {
    id: number;
    color: string;
    startX: number;
    endX: number;
    size: number;
    rotation: number;
    delay: number;
    duration: number;
};

function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function ConfettiParticle({ p }: { p: Particle }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withDelay(
            p.delay,
            withTiming(1, { duration: p.duration, easing: Easing.in(Easing.quad) }),
        );
    }, []);

    const style = useAnimatedStyle(() => {
        const v = progress.value;
        return {
            transform: [
                { translateX: p.startX + (p.endX - p.startX) * v },
                { translateY: (H + 120) * v - 60 },
                { rotate: `${p.rotation * v}deg` },
                { scaleX: Math.cos(v * Math.PI * 4) },   // flutter effect
            ],
            opacity: v > 0.75 ? 1 - (v - 0.75) / 0.25 : 1,
        };
    });

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: p.size,
                    height: p.size * 0.5,
                    backgroundColor: p.color,
                    borderRadius: 2,
                },
                style,
            ]}
        />
    );
}

export function Confetti() {
    const particles = useMemo<Particle[]>(() =>
        Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: i,
            color: COLORS[i % COLORS.length],
            startX: rand(0, W),
            endX: rand(-80, W + 80),
            size: rand(8, 18),
            rotation: rand(180, 720) * (Math.random() > 0.5 ? 1 : -1),
            delay: rand(0, 600),
            duration: rand(2200, 3600),
        })),
    []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map(p => <ConfettiParticle key={p.id} p={p} />)}
        </View>
    );
}
