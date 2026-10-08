import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { PillarStepperList, type PillarListItem } from '@/components/pillars/pillar-stepper-list';
import { getCategoryLabel, type CategoryI18n } from '@/constants/category-labels';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    initialLevels, normalizeToBudget, pillarBudget, visiblePillars,
    type PillarLevel, type PillarPreset,
} from '@/lib/pillar-budget';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type PillarItem = PillarPreset & PillarListItem;

export function PillarStepperStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const sportId = useOnboardingStore((s) => s.sport_id);
    const storedLevels = useOnboardingStore((s) => s.pillarLevels);
    const setStore = useOnboardingStore((s) => s.set);
    const [pillars, setPillars] = useState<PillarItem[]>([]);
    const [levels, setLevels] = useState<PillarLevel[]>(storedLevels);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        // Preset ist ein valider Default — Weiter geht immer (Spec §3.1).
        setCanContinue(true);
        if (!sportId) return;
        (async () => {
            const [{ data: presetRows }, { data: { session } }] = await Promise.all([
                supabase
                    .from('sport_category_relevance')
                    .select('relevance, categories!inner(id, slug, name_i18n, description_i18n, is_active)')
                    .eq('sport_id', sportId)
                    .eq('categories.is_active', true),
                supabase.auth.getSession(),
            ]);
            if (!presetRows) return;
            const presets: PillarItem[] = presetRows.map((r: any) => ({
                categoryId: r.categories.id,
                slug: r.categories.slug,
                level: r.relevance,
                label: getCategoryLabel(r.categories.slug, t, r.categories.name_i18n as CategoryI18n),
                description_i18n: r.categories.description_i18n as CategoryI18n | null,
            }));
            const visible = visiblePillars(presets) as PillarItem[];
            setPillars(visible);

            // Prefill: Store (Back-Navigation) > übersetzte DB-Zeilen > Preset.
            let stored: PillarLevel[] | null = storedLevels.length > 0 ? storedLevels : null;
            if (!stored && session?.user) {
                const { data: dbRows } = await supabase
                    .from('user_pillar_levels')
                    .select('level, categories(id, slug)')
                    .eq('user_id', session.user.id);
                if (dbRows && dbRows.length > 0) {
                    stored = dbRows.map((r: any) => ({
                        categoryId: r.categories.id, slug: r.categories.slug, level: r.level,
                    }));
                }
            }
            const initial = normalizeToBudget(initialLevels(visible, stored), pillarBudget(visible.length));
            setLevels(initial);
            setStore({ pillarLevels: initial });
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportId]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('pillars.title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('pillars.subtitle')}
                </JempText>
            </Animated.View>

            <PillarStepperList
                pillars={pillars}
                levels={levels}
                budget={pillarBudget(pillars.length)}
                onChange={(next) => { setLevels(next); setStore({ pillarLevels: next }); }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 20 },
});
