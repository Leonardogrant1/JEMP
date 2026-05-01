import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from '@/constants/category-labels';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { CategoryLevel, useOnboardingStore } from '@/stores/onboarding-store';
import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type CategoryItem = { id: string; slug: string };

const DEFAULT_SCORE = 10;

function lerpColor(a: string, b: string, t: number): string {
    const parse = (hex: string) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const blue = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${blue})`;
}

function scoreToColor(score: number): string {
    const t = score / 100;
    if (t <= 0.5) return lerpColor('#ef4444', '#f59e0b', t * 2);
    return lerpColor('#f59e0b', '#22c55e', (t - 0.5) * 2);
}

function scoreToLabelKey(score: number): 'onboarding.category_level_elite' | 'onboarding.category_level_advanced' | 'onboarding.category_level_average' | 'onboarding.category_level_beginner' | 'onboarding.category_level_novice' {
    if (score >= 85) return 'onboarding.category_level_elite';
    if (score >= 65) return 'onboarding.category_level_advanced';
    if (score >= 45) return 'onboarding.category_level_average';
    if (score >= 25) return 'onboarding.category_level_beginner';
    return 'onboarding.category_level_novice';
}

export function CategoryLevelStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const storedLevels = useOnboardingStore((s) => s.categoryLevels);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const prefilled: Record<string, number> = {};
        storedLevels.forEach((l) => { prefilled[l.categoryId] = l.score; });
        return prefilled;
    });
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        supabase.from('categories').select('id, slug').then(({ data }) => {
            if (!data) return;
            const cats = data as CategoryItem[];
            setCategories(cats);
            setScores((prev) => {
                const merged: Record<string, number> = {};
                cats.forEach((c) => { merged[c.id] = prev[c.id] ?? DEFAULT_SCORE; });
                return merged;
            });
            setCanContinue(true);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (categories.length > 0) saveLevels(categories, scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, scores]);

    function saveLevels(cats: CategoryItem[], s: Record<string, number>) {
        const levels: CategoryLevel[] = cats.map((c) => ({
            categoryId: c.id,
            score: s[c.id] ?? DEFAULT_SCORE,
        }));
        setStore({ categoryLevels: levels });
    }

    function handleChange(categoryId: string, score: number) {
        const next = { ...scores, [categoryId]: score };
        setScores(next);
        saveLevels(categories, next);
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.category_level_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.category_level_subtitle')}
                </JempText>
            </Animated.View>
            {categories.map((cat, i) => {
                const score = scores[cat.id] ?? DEFAULT_SCORE;
                const color = scoreToColor(score);
                return (
                    <Animated.View key={cat.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <JempText type="h2">{CATEGORY_LABELS[cat.slug] ?? cat.slug}</JempText>
                            <JempText type="body-sm" color={color}>{t(scoreToLabelKey(score))}</JempText>
                        </View>
                        {CATEGORY_DESCRIPTIONS[cat.slug] && (
                            <JempText type="caption" color={theme.textMuted} style={styles.cardDescription}>
                                {CATEGORY_DESCRIPTIONS[cat.slug]}
                            </JempText>
                        )}
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            value={score}
                            onValueChange={(v) => handleChange(cat.id, v)}
                            minimumTrackTintColor={color}
                            maximumTrackTintColor={theme.borderStrong}
                            thumbTintColor={color}
                        />
                    </Animated.View>
                );
            })}
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
    title: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 32,
    },
    card: {
        marginBottom: 28,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cardDescription: {
        marginBottom: 4,
    },
    slider: {
        width: '100%',
        height: 40,
        marginHorizontal: -8,
    },
});
