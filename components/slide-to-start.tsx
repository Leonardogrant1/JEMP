import { Colors, Cyan, Electric, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    clamp,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const TRACK_HEIGHT = 94;
const THUMB_SIZE = 82;
const TRACK_PADDING = 6;
const COMPLETION_THRESHOLD = 0.85;

type Props = {
    onComplete: () => void;
    label?: string;
};

export function SlideToStart({ onComplete, label = 'Get started' }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const translateX = useSharedValue(0);
    const maxX = useSharedValue(0);

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = clamp(e.translationX, 0, maxX.value);
        })
        .onEnd(() => {
            if (translateX.value >= maxX.value * COMPLETION_THRESHOLD) {
                translateX.value = withSpring(maxX.value, { damping: 20 });
                runOnJS(onComplete)();
            } else {
                translateX.value = withSpring(0, { damping: 20 });
            }
        });

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, maxX.value * 0.4], [1, 0]),
    }));

    const fillStyle = useAnimatedStyle(() => ({
        width: translateX.value + THUMB_SIZE + TRACK_PADDING,
    }));

    const styles = createStyles(theme);

    return (
        <View
            style={styles.track}
            onLayout={(e) => {
                maxX.value = e.nativeEvent.layout.width - THUMB_SIZE - TRACK_PADDING * 2;
            }}
        >
            <Animated.View style={[styles.fill, fillStyle]} />

            <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>

            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.thumb, thumbStyle]}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0.5, y: 1 }}
                        end={{ x: 0.5, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

function createStyles(theme: (typeof Colors)['dark']) {
    return StyleSheet.create({
        track: {
            height: TRACK_HEIGHT,
            backgroundColor: theme.surface,
            borderRadius: TRACK_HEIGHT / 2,
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.borderDivider,
        },
        fill: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: theme.primarySubtle,
            borderRadius: TRACK_HEIGHT / 2,
        },
        label: {
            color: theme.textMuted,
            fontSize: 16,
            fontFamily: Fonts.satoshiBold,
            letterSpacing: 0.2,
            textAlign: 'center',
        },
        thumb: {
            position: 'absolute',
            left: TRACK_PADDING,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Electric[500],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
        },
    });
}
