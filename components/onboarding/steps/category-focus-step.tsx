import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { getCategoryLabel, getCategoryDescription, type CategoryI18n } from '@/constants/category-labels';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore, TargetedCategory } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type CategoryItem = { id: string; slug: string; label: string; name_i18n: CategoryI18n; description_i18n: CategoryI18n };

export function CategoryFocusStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedTargeted = useOnboardingStore((s) => s.targetedCategories);
    const setStore = useOnboardingStore((s) => s.set);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    // Tipp-Reihenfolge = Priorität — Array statt Set, die Position ist der Rang
    const [selectedIds, setSelectedIds] = useState<string[]>(
        () => [...storedTargeted].sort((a, b) => a.priority - b.priority).map((c) => c.categoryId)
    );
    const [infoCategory, setInfoCategory] = useState<CategoryItem | null>(null);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (storedTargeted.length > 0) setCanContinue(true);
        supabase.from('categories').select('id, slug, name_i18n, description_i18n').then(({ data }) => {
            if (data) {
                setCategories(
                    data.map((c) => ({
                        id: c.id,
                        slug: c.slug,
                        name_i18n: c.name_i18n as CategoryI18n,
                        description_i18n: c.description_i18n as CategoryI18n,
                        label: getCategoryLabel(c.slug, t, c.name_i18n as CategoryI18n),
                    }))
                );
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggleCategory(cat: CategoryItem) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = selectedIds.includes(cat.id)
            ? selectedIds.filter((id) => id !== cat.id)
            : [...selectedIds, cat.id];
        setSelectedIds(next);
        setCanContinue(next.length > 0);
        const payload: TargetedCategory[] = next
            .map((id, i) => {
                const c = categories.find((x) => x.id === id);
                return c ? { categoryId: c.id, slug: c.slug, priority: i + 1 } : null;
            })
            .filter((c): c is TargetedCategory => c !== null);
        setStore({ targetedCategories: payload });
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.category_focus_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.category_focus_subtitle')}
                </JempText>
            </Animated.View>
            <View style={styles.list}>
                {categories.map((cat, i) => {
                    const rank = selectedIds.indexOf(cat.id);
                    const isSelected = rank >= 0;
                    const Icon = CATEGORY_SVG_ICONS[cat.slug];
                    return (
                        <Animated.View key={cat.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()}>
                            <Pressable
                                onPress={() => toggleCategory(cat)}
                                style={[
                                    styles.row,
                                    isSelected
                                        ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                        : { backgroundColor: theme.surface, borderColor: 'transparent' },
                                ]}
                            >
                                <View style={[styles.iconBox, { backgroundColor: isSelected ? `${GradientMid}18` : theme.background }]}>
                                    {Icon
                                        ? <Icon width={22} height={22} color={isSelected ? GradientMid : theme.textMuted} />
                                        : <Ionicons name="fitness-outline" size={22} color={isSelected ? GradientMid : theme.textMuted} />
                                    }
                                </View>
                                <View style={styles.labelRow}>
                                    <JempText type="body-l" color={theme.text}>{cat.label}</JempText>
                                    <Pressable onPress={() => setInfoCategory(cat)} hitSlop={10}>
                                        <Ionicons name="information-circle-outline" size={15} color={theme.textSubtle} />
                                    </Pressable>
                                </View>
                                {isSelected
                                    ? (
                                        <View style={styles.rankBadge}>
                                            <LinearGradient
                                                colors={GRADIENT}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <JempText type="caption" color="#fff" style={styles.rankNumber}>
                                                {rank + 1}
                                            </JempText>
                                        </View>
                                    )
                                    : <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
                                }
                            </Pressable>
                        </Animated.View>
                    );
                })}
            </View>

            <ConfirmDialog
                visible={infoCategory !== null}
                title={infoCategory?.label ?? ''}
                message={infoCategory ? getCategoryDescription(infoCategory.slug, t, infoCategory.description_i18n) : undefined}
                confirmLabel={t('ui.got_it')}
                showCancel={false}
                onConfirm={() => setInfoCategory(null)}
                onClose={() => setInfoCategory(null)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
