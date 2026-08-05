import { Cyan, Electric } from '@/constants/theme';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { Easing, useAnimatedProps, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/**
 * Gradient-Ring für Timer (Pause + Übungs-Timer): `fraction` ist der sichtbare
 * Anteil des Rings (1 = voll). Die Ziel-Werte kommen pro Sekunden-Tick, die
 * lineare 1s-Animation im Worklet macht daraus eine kontinuierliche Bewegung —
 * lint-sicher ohne Shared-Value-Mutation.
 */
export function TimerRing({ size, fraction, strokeWidth = 10, children }: {
    size: number;
    fraction: number;
    strokeWidth?: number;
    children?: ReactNode;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: withTiming(
            circumference * (1 - fraction),
            { duration: 1000, easing: Easing.linear },
        ),
    }));

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={styles.svg}>
                <Defs>
                    <SvgLinearGradient id="timerRing" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={Cyan[500]} />
                        <Stop offset="1" stopColor={Electric[500]} />
                    </SvgLinearGradient>
                </Defs>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#timerRing)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    fill="none"
                />
            </Svg>
            <View style={styles.center}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    svg: {
        // Start oben statt rechts
        transform: [{ rotate: '-90deg' }],
    },
    center: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
