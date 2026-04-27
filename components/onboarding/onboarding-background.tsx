import { Cyan, Electric } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type GradientConfig = {
    color: string;
    cx: string;
    cy: string;
    r: string;
    opacity: number;
    driftX: number;
    driftY: number;
    durationX: number;
    durationY: number;
};

const GRADIENTS: GradientConfig[] = [
    {
        color: Cyan[500],
        cx: '10%',
        cy: '10%',
        r: '55%',
        opacity: 0.6,
        driftX: 8,
        driftY: 10,
        durationX: 14000,
        durationY: 18000,
    },
    {
        color: Electric[400],
        cx: '90%',
        cy: '85%',
        r: '50%',
        opacity: 0.5,
        driftX: -8,
        driftY: -9,
        durationX: 16000,
        durationY: 12000,
    },
];

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

function GradientOrb({ config, index }: { config: GradientConfig; index: number }) {
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    useEffect(() => {
        const ease = Easing.inOut(Easing.sin);
        tx.value = withRepeat(withTiming(config.driftX, { duration: config.durationX, easing: ease }), -1, true);
        ty.value = withRepeat(withTiming(config.driftY, { duration: config.durationY, easing: ease }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tx.value }, { translateY: ty.value }],
    }));

    const id = `rg${index}`;

    return (
        <AnimatedSvg style={[StyleSheet.absoluteFill, animStyle]}>
            <Defs>
                <RadialGradient id={id} cx={config.cx} cy={config.cy} r={config.r}>
                    <Stop offset="0%" stopColor={config.color} stopOpacity={config.opacity} />
                    <Stop offset="100%" stopColor={config.color} stopOpacity={0} />
                </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="100%" fill={`url(#${id})`} />
        </AnimatedSvg>
    );
}

export function OnboardingBackground() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {GRADIENTS.map((config, i) => (
                <GradientOrb key={i} config={config} index={i} />
            ))}
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
    );
}
