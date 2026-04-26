import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePendingAssessmentsCountQuery } from '@/queries/use-pending-assessments-count-query';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JempText } from './jemp-text';

const TAB_KEYS: Record<string, string> = {
    index: 'tab.today',
    plan: 'tab.plan',
    assessments: 'tab.assessments',
    progress: 'tab.progress',
    profile: 'tab.profile',
};

type TabItemProps = {
    label: string;
    isFocused: boolean;
    onPress: () => void;
    hasBadge?: boolean;
};

function TabItem({ label, isFocused, onPress, hasBadge }: TabItemProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Pressable onPress={onPress}>
            <View>
                <View style={[styles.badge, !isFocused && { backgroundColor: theme.surface }]}>
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
                </View>
                {hasBadge && <View style={styles.notificationDot} />}
            </View>
        </Pressable>
    );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { profile } = useCurrentUser();
    const { data: pendingCount } = usePendingAssessmentsCountQuery(profile?.id);
    const hasPendingAssessments = (pendingCount ?? 0) > 0;

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const key = TAB_KEYS[route.name];
                    const label = key ? t(key) : route.name;

                    function onPress() {
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

                    return (
                        <TabItem
                            key={route.key}
                            label={label}
                            isFocused={isFocused}
                            onPress={onPress}
                            hasBadge={route.name === 'assessments' && hasPendingAssessments}
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
    notificationDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
});
