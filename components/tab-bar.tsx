import { Colors, Fonts, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePendingAssessmentsCountQuery } from '@/queries/use-pending-assessments-count-query';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JempText } from './jemp-text';

// Provisorische Icons — werden später ersetzt
/**
 * Bottom-Padding, das Scroll-Content in den Tab-Screens braucht, damit das
 * letzte Element über der absolut positionierten Tab-Bar endet.
 */
export function useTabBarInset() {
    const insets = useSafeAreaInsets();
    return insets.bottom + 92;
}

const TAB_CONFIG: Record<string, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = {
    index: { labelKey: 'tab.today', icon: 'home-outline', iconActive: 'home' },
    plan: { labelKey: 'tab.plan', icon: 'calendar-outline', iconActive: 'calendar' },
    assessments: { labelKey: 'tab.assessments', icon: 'clipboard-outline', iconActive: 'clipboard' },
    progress: { labelKey: 'tab.progress', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
};

type TabItemProps = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    isFocused: boolean;
    onPress: () => void;
    hasBadge?: boolean;
};

function TabItem({ label, icon, isFocused, onPress, hasBadge }: TabItemProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const color = isFocused ? GradientMid : theme.textMuted;

    return (
        <Pressable onPress={onPress} style={styles.tabItem}>
            <View>
                <Ionicons name={icon} size={22} color={color} />
                {hasBadge && <View style={styles.notificationDot} />}
            </View>
            <JempText type="caption" style={styles.tabLabel} color={color}>
                {label}
            </JempText>
        </Pressable>
    );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();
    const { data: pendingCount } = usePendingAssessmentsCountQuery(profile?.id);
    const hasPendingAssessments = (pendingCount ?? 0) > 0;
    const isGeneratingPlan = usePlanGenerationStore(s => s.isGenerating);

    function navigateTo(route: (typeof state.routes)[number], isFocused: boolean) {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name);
        }
    }

    const profileRoute = state.routes.find(r => r.name === 'profile');
    const isProfileFocused = profileRoute ? state.index === state.routes.indexOf(profileRoute) : false;

    const pillRoutes = state.routes.filter(r => TAB_CONFIG[r.name]);
    const focusedKey = state.routes[state.index]?.key;
    const activePillIndex = pillRoutes.findIndex(r => r.key === focusedKey);

    // Sliding indicator hinter dem aktiven Tab
    const [itemWidth, setItemWidth] = useState(0);
    const indicatorX = useSharedValue(0);
    const indicatorOpacity = useSharedValue(0);

    useEffect(() => {
        if (itemWidth <= 0) return;
        if (activePillIndex >= 0) {
            if (indicatorOpacity.value === 0) {
                // Erstes Erscheinen: direkt positionieren statt von links einsliden
                indicatorX.value = activePillIndex * itemWidth;
            } else {
                indicatorX.value = withSpring(activePillIndex * itemWidth, { damping: 30, stiffness: 400, overshootClamping: true });
            }
            indicatorOpacity.value = withTiming(1, { duration: 150 });
        } else {
            indicatorOpacity.value = withTiming(0, { duration: 150 });
        }
    }, [activePillIndex, itemWidth, indicatorX, indicatorOpacity]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
        opacity: indicatorOpacity.value,
    }));

    const isDark = (colorScheme ?? 'dark') === 'dark';
    const glassOverlay = isDark ? 'rgba(18, 20, 26, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    const surfaceStyle = {
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    };
    const blurProps = {
        intensity: 40,
        tint: (isDark ? 'dark' : 'light') as 'dark' | 'light',
    };

    return (
        <View style={styles.wrap} pointerEvents="box-none">
            {/* Content faded hinter der Bar sanft in den Hintergrund aus */}
            <LinearGradient
                colors={[`${theme.background}00`, theme.background]}
                locations={[0, 0.6]}
                style={styles.fade}
                pointerEvents="none"
            />
            <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
            <View style={[styles.pill, surfaceStyle]}>
                <BlurView {...blurProps} style={[styles.glassFill, { backgroundColor: glassOverlay }]} />
                <View
                    style={styles.tabsRow}
                    onLayout={e => setItemWidth(e.nativeEvent.layout.width / pillRoutes.length)}
                >
                    {itemWidth > 0 && (
                        <Animated.View style={[styles.indicator, { width: itemWidth }, indicatorStyle]} />
                    )}
                    {pillRoutes.map(route => {
                        const config = TAB_CONFIG[route.name];
                        const isFocused = route.key === focusedKey;

                        return (
                            <TabItem
                                key={route.key}
                                label={t(config.labelKey)}
                                icon={isFocused ? config.iconActive : config.icon}
                                isFocused={isFocused}
                                onPress={() => navigateTo(route, isFocused)}
                                hasBadge={
                                    (route.name === 'assessments' && hasPendingAssessments) ||
                                    (route.name === 'plan' && isGeneratingPlan)
                                }
                            />
                        );
                    })}
                </View>
            </View>

            {profileRoute && (
                <Pressable
                    onPress={() => navigateTo(profileRoute, isProfileFocused)}
                    style={[
                        styles.profileButton,
                        surfaceStyle,
                        isProfileFocused && { borderColor: GradientMid },
                    ]}
                >
                    <BlurView {...blurProps} style={[styles.glassFill, { backgroundColor: glassOverlay }]} />
                    <Ionicons
                        name={isProfileFocused ? 'person' : 'person-outline'}
                        size={24}
                        color={isProfileFocused ? GradientMid : theme.textMuted}
                    />
                </Pressable>
            )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    fade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: -36,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 10,
    },
    glassFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 100,
        overflow: 'hidden',
    },
    pill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    tabsRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicator: {
        position: 'absolute',
        top: -6,
        bottom: -6,
        left: 0,
        borderRadius: 100,
        backgroundColor: 'rgba(61, 158, 203, 0.18)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    notificationDot: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    tabLabel: {
        fontSize: 10,
        lineHeight: 14,
        fontFamily: Fonts.satoshiMedium,
    },
    profileButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
});
