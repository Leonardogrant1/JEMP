import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JempText } from './jemp-text';

const LABELS: Record<string, string> = {
    index: 'Home',
    plan: 'Plan',
    progress: 'Progress',
    profile: 'Profile',
};

type TabItemProps = {
    label: string;
    isFocused: boolean;
    onPress: () => void;
};

function TabItem({ label, isFocused, onPress }: TabItemProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const scale = useSharedValue(isFocused ? 1.08 : 1);

    useEffect(() => {
        // Hier kannst du die duration (in Millisekunden) für die Scale-Animation anpassen
        scale.value = withTiming(isFocused ? 1.08 : 1, { duration: 200 });
    }, [isFocused]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable onPress={onPress}>
            <Animated.View style={[styles.badge, animStyle, !isFocused && { backgroundColor: theme.surface }]}>
                {isFocused && (
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <JempText type="button" color={isFocused ? '#fff' : theme.textMuted}>
                    {label}
                </JempText>
            </Animated.View>
        </Pressable>
    );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const label = LABELS[route.name] ?? route.name;

                    function onPress() {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    }

                    return (
                        <TabItem
                            key={route.key}
                            label={label}
                            isFocused={isFocused}
                            onPress={onPress}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // paddingTop entfernt, wird jetzt über row.paddingVertical gelöst
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 8,
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 100,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
