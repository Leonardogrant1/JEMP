import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { getCategoryLabel, getCategoryDescription, type CategoryI18n } from '@/constants/category-labels';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SegmentScale } from '@/components/ui/segment-scale';
import { supabase } from '@/services/supabase/client';
import { CategoryLevel, useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type CategoryItem = { id: string; slug: string; name_i18n: CategoryI18n; description_i18n: CategoryI18n };

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
    const [infoCategory, setInfoCategory] = useState<CategoryItem | null>(null);
    // Während eines Skalen-Drags darf der Screen nicht mitscrollen
    const [scrollLocked, setScrollLocked] = useState(false);

    useEffect(() => {
        supabase.from('categories').select('id, slug, name_i18n, description_i18n').then(({ data }) => {
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
            scrollEnabled={!scrollLocked}
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
                const Icon = CATEGORY_SVG_ICONS[cat.slug];
                return (
                    <Animated.View key={cat.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={styles.card}>
                        <View style={styles.cardHeader}>
                            {Icon && (
                                <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                                    <Icon width={19} height={19} color={theme.textMuted} />
                                </View>
                            )}
                            <View style={styles.cardTitle}>
                                <View style={styles.nameRow}>
                                    <JempText type="h2">{getCategoryLabel(cat.slug, t, cat.name_i18n)}</JempText>
                                    <Pressable onPress={() => setInfoCategory(cat)} hitSlop={10}>
                                        <Ionicons name="information-circle-outline" size={16} color={theme.textSubtle} />
                                    </Pressable>
                                </View>
                                <JempText type="caption" color={color} style={styles.levelLabel}>
                                    {t(scoreToLabelKey(score)).toUpperCase()}
                                </JempText>
                            </View>
                        </View>
                        <SegmentScale
                            value={Math.min(10, Math.max(1, Math.round(score / 10)))}
                            color={color}
                            trackColor={theme.borderStrong}
                            onSelect={(v) => handleChange(cat.id, v * 10)}
                            onEngagedChange={setScrollLocked}
                        />
                    </Animated.View>
                );
            })}

            <ConfirmDialog
                visible={infoCategory !== null}
                title={infoCategory ? getCategoryLabel(infoCategory.slug, t, infoCategory.name_i18n) : ''}
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
    title: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 32,
    },
    card: {
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    cardTitle: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    levelLabel: {
        letterSpacing: 0.8,
        fontSize: 10,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
