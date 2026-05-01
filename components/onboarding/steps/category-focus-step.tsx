import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableRow } from '@/components/ui/selectable-row';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from '@/constants/category-labels';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore, TargetedCategory } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type CategoryItem = { id: string; slug: string; label: string };

export function CategoryFocusStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedTargeted = useOnboardingStore((s) => s.targetedCategories);
    const setStore = useOnboardingStore((s) => s.set);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(storedTargeted.map((c) => c.categoryId))
    );
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (storedTargeted.length > 0) setCanContinue(true);
        supabase.from('categories').select('id, slug').then(({ data }) => {
            if (data) {
                setCategories(
                    data.map((c) => ({ id: c.id, slug: c.slug, label: CATEGORY_LABELS[c.slug] ?? c.slug }))
                );
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggleCategory(cat: CategoryItem) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
            const hasSelection = next.size > 0;
            setCanContinue(hasSelection);
            const ordered = categories.filter((c) => next.has(c.id));
            const payload: TargetedCategory[] = ordered.map((c, i) => ({
                categoryId: c.id,
                slug: c.slug,
                priority: i + 1,
            }));
            setStore({ targetedCategories: hasSelection ? payload : [] });
            return next;
        });
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
                {categories.map((cat, i) => (
                    <Animated.View key={cat.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()}>
                        <SelectableRow
                            label={cat.label}
                            description={CATEGORY_DESCRIPTIONS[cat.slug]}
                            selected={selected.has(cat.id)}
                            onPress={() => toggleCategory(cat)}
                        />
                    </Animated.View>
                ))}
            </View>
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
});
