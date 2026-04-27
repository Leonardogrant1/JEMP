import { JempText } from '@/components/jemp-text';
import { Colors, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const BENEFIT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
    'barbell-outline',
    'trending-up-outline',
    'flash-outline',
    'trophy-outline',
];

export function WhatYouWillGetStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.wyg_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.wyg_subtitle')}
                </JempText>
            </Animated.View>
            <View style={styles.list}>
                {BENEFIT_ICONS.map((icon, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={[styles.row, { backgroundColor: theme.surface }]}>
                        <View style={[styles.iconBox, { backgroundColor: theme.cardElevated }]}>
                            <Ionicons name={icon} size={20} color={Electric[400]} />
                        </View>
                        <View style={styles.rowText}>
                            <JempText type="body-l" color={theme.text}>{t(`onboarding.wyg_benefit_${i}_title` as any)}</JempText>
                            <JempText type="body-sm" color={theme.textMuted}>{t(`onboarding.wyg_benefit_${i}_desc` as any)}</JempText>
                        </View>
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingTop: 32,

    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 32 },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
});
