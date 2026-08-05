import { JempText } from '@/components/jemp-text';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { CategoryItem } from '@/types/plan-generation';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

function GoalRow({ cat, rank, onPress, theme }: {
    cat: CategoryItem;
    rank: number | null;
    onPress: () => void;
    theme: typeof Colors.dark;
}) {
    const Icon = CATEGORY_SVG_ICONS[cat.slug];
    const selected = rank !== null;
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            style={[
                styles.goalRow,
                selected
                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                    : { backgroundColor: theme.surface, borderColor: 'transparent' },
            ]}
        >
            <View style={[styles.goalIconBox, { backgroundColor: selected ? `${GradientMid}18` : theme.background }]}>
                {Icon
                    ? <Icon width={22} height={22} color={selected ? GradientMid : theme.textMuted} />
                    : <Ionicons name="fitness-outline" size={22} color={selected ? GradientMid : theme.textMuted} />
                }
            </View>
            <JempText type="body-l" color={theme.text} style={{ flex: 1 }}>
                {cat.label}
            </JempText>
            {selected
                ? (
                    <View style={styles.rankBadge}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <JempText type="caption" color="#fff" style={styles.rankNumber}>{rank}</JempText>
                    </View>
                )
                : <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
            }
        </Pressable>
    );
}

export function GoalsStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allCategories, selectedCategoryIds, toggleCategory } = usePlanWizardStore();

    // Tap order in the Set = priority order
    const rankById = new Map([...selectedCategoryIds].map((id, i) => [id, i + 1]));

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.select_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('goals.select_subtitle')}
            </JempText>
            <View style={styles.goalList}>
                {allCategories.map(cat => (
                    <GoalRow
                        key={cat.id}
                        cat={cat}
                        rank={rankById.get(cat.id) ?? null}
                        onPress={() => toggleCategory(cat.id)}
                        theme={theme}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    goalList: { gap: 10 },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    goalIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNumber: { fontWeight: '700' },
    emptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },
});
