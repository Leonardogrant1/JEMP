import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

type SkeletonProps = {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
};

// Pulsing placeholder block for loading states
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const pulse = useSharedValue(0.5);
    useEffect(() => {
        pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    }, [pulse]);
    const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

    return (
        <Animated.View
            style={[{ width, height, borderRadius, backgroundColor: theme.surface }, animatedStyle, style]}
        />
    );
}
