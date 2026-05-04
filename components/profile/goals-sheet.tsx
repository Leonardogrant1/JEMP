import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { getCategoryLabel, type CategoryI18n } from '@/constants/category-labels';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet, TouchableOpacity, View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];
const PHASES: Phase[] = ['select', 'rank', 'level'];

const LEVEL_PRESET_SCORES = [15, 35, 55, 75, 90] as const;
const LEVEL_PRESET_KEYS = [
    { labelKey: 'goals.preset_novice', descKey: 'goals.preset_novice_desc' },
    { labelKey: 'goals.preset_beginner', descKey: 'goals.preset_beginner_desc' },
    { labelKey: 'goals.preset_intermediate', descKey: 'goals.preset_intermediate_desc' },
    { labelKey: 'goals.preset_experienced', descKey: 'goals.preset_experienced_desc' },
    { labelKey: 'goals.preset_elite', descKey: 'goals.preset_elite_desc' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'select' | 'rank' | 'level';
type CategoryItem = { id: string; slug: string; label: string; name_i18n: CategoryI18n };

interface Props {
    visible: boolean;
    userId: string;
    onClose: () => void;
}

// ─── StepBars ─────────────────────────────────────────────────────────────────

function StepBars({ phase, phases }: { phase: Phase; phases: Phase[] }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const idx = phases.indexOf(phase);
    return (
        <View style={styles.stepBars}>
            {phases.map((_, i) => (
                <View
                    key={i}
                    style={[styles.stepBar, { backgroundColor: i <= idx ? GradientMid : theme.borderStrong }]}
                />
            ))}
        </View>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoalsSheet({ visible, userId, onClose }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [existingScores, setExistingScores] = useState<Record<string, number>>({});
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [ranked, setRanked] = useState<CategoryItem[]>([]);
    const [phase, setPhase] = useState<Phase>('select');
    const [newScores, setNewScores] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setPhase('select');
        setNewScores({});
        setLoading(true);

        Promise.all([
            supabase.from('categories').select('id, slug, name_i18n'),
            supabase.from('user_targeted_categories').select('category_id, priority').eq('user_id', userId).order('priority'),
            supabase.from('user_category_levels').select('category_id, level_score').eq('user_id', userId),
        ]).then(([catsRes, targetedRes, levelsRes]) => {
            const items: CategoryItem[] = (catsRes.data ?? []).map(c => ({
                id: c.id,
                slug: c.slug,
                name_i18n: c.name_i18n as CategoryI18n,
                label: getCategoryLabel(c.slug, t, c.name_i18n as CategoryI18n),
            }));
            setCategories(items);

            const scores: Record<string, number> = {};
            for (const row of levelsRes.data ?? []) scores[row.category_id] = row.level_score;
            setExistingScores(scores);

            if (targetedRes.data?.length) {
                const ids = new Set(targetedRes.data.map(r => r.category_id));
                setSelected(ids);
                const ordered = targetedRes.data
                    .sort((a, b) => a.priority - b.priority)
                    .map(r => items.find(c => c.id === r.category_id)!)
                    .filter(Boolean);
                setRanked(ordered);
            } else {
                setSelected(new Set());
                setRanked([]);
            }
            setLoading(false);
        });
    }, [visible, userId]);

    function categoriesNeedingLevel(list: CategoryItem[]) {
        return list.filter(c => existingScores[c.id] === undefined);
    }

    function toggleCategory(cat: CategoryItem) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
            return next;
        });
    }

    function renderRankItem({ item, drag }: RenderItemParams<CategoryItem>) {
        const index = ranked.indexOf(item);
        return (
            <ScaleDecorator activeScale={1.03}>
                <TouchableOpacity
                    onLongPress={drag}
                    activeOpacity={1}
                    style={[styles.rankRow, { backgroundColor: theme.surface }]}
                >
                    <JempText type="caption" color={theme.textMuted} style={styles.rankNumber}>
                        {index + 1}
                    </JempText>
                    <JempText type="body-l" color={theme.text} style={styles.rankLabel}>
                        {item.label}
                    </JempText>
                    <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }

    const selectedList = categories.filter(c => selected.has(c.id));
    const needsLevel = categoriesNeedingLevel(phase === 'rank' ? ranked : selectedList).length > 0;
    const isLastPhase =
        phase === 'level' ||
        (phase === 'rank' && !needsLevel) ||
        (phase === 'select' && selectedList.length <= 1 && !needsLevel);

    const primaryLabel = isLastPhase ? t('ui.save') : t('ui.continue');
    const primaryDisabled = phase === 'select' ? selected.size === 0 : false;

    // Only show phases that are relevant
    const activePhases: Phase[] = needsLevel ? PHASES : ['select', 'rank'];

    function handlePrimaryAction() {
        const orderedList = phase === 'rank' ? ranked : selectedList;
        if (phase === 'level') { doSave(ranked); return; }
        if (isLastPhase) { doSave(orderedList); return; }
        if (phase === 'select' && selectedList.length > 1) {
            setRanked(selectedList);
            setPhase('rank');
        } else {
            const toAssess = categoriesNeedingLevel(orderedList);
            const init: Record<string, number> = {};
            for (const cat of toAssess) init[cat.id] = newScores[cat.id] ?? 35;
            setNewScores(init);
            if (phase === 'select') setRanked(orderedList);
            setPhase('level');
        }
    }

    async function doSave(orderedList: CategoryItem[]) {
        setSaving(true);
        await supabase.from('user_targeted_categories').delete().eq('user_id', userId);
        if (orderedList.length > 0) {
            await supabase.from('user_targeted_categories').insert(
                orderedList.map((cat, i) => ({ user_id: userId, category_id: cat.id, priority: i + 1 }))
            );
        }
        const toInsert = Object.entries(newScores).filter(([id]) => existingScores[id] === undefined);
        if (toInsert.length > 0) {
            await supabase.from('user_category_levels').upsert(
                toInsert.map(([category_id, level_score]) => ({ user_id: userId, category_id, level_score })),
                { onConflict: 'user_id,category_id' }
            );
        }
        setSaving(false);
        onClose();
    }

    function handleBack() {
        if (phase === 'level') setPhase(ranked.length > 1 ? 'rank' : 'select');
        else if (phase === 'rank') setPhase('select');
        else onClose();
    }

    const levelCategories = ranked.filter(c => existingScores[c.id] === undefined);

    const phaseTitle = phase === 'rank' ? t('goals.rank_title') : phase === 'level' ? t('goals.level_title') : t('goals.select_title');
    const phaseSubtitle = phase === 'rank'
        ? t('goals.rank_subtitle')
        : phase === 'level'
            ? t('goals.level_subtitle')
            : t('goals.select_subtitle');

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={handleBack} hitSlop={12} style={styles.headerSide}>
                        <Ionicons
                            name={phase === 'select' ? 'close' : 'chevron-back'}
                            size={24}
                            color={theme.text}
                        />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <JempText type="body-l" color={theme.textMuted}>
                            {t('goals.select_title')}
                        </JempText>
                        <StepBars phase={phase} phases={activePhases} />
                    </View>
                    <View style={styles.headerSide} />
                </View>

                {/* ── Content ── */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={GradientMid} />
                    </View>
                ) : phase === 'rank' ? (
                    /* Rank phase: DraggableFlatList owns scrolling */
                    <DraggableFlatList
                            data={ranked}
                            keyExtractor={item => item.id}
                            onDragEnd={({ data }) => setRanked(data)}
                            renderItem={renderRankItem}
                            contentContainerStyle={styles.content}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <View style={styles.listHeader}>
                                    <JempText type="h1" color={theme.text} style={styles.title}>{phaseTitle}</JempText>
                                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                                        {phaseSubtitle}
                                    </JempText>
                                </View>
                            }
                        />
                ) : (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.title}>{phaseTitle}</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            {phaseSubtitle}
                        </JempText>

                        {/* ── Select ── */}
                        {phase === 'select' && (
                            <View style={styles.chipGrid}>
                                {categories.map(cat => (
                                    <SelectableChip
                                        key={cat.id}
                                        label={cat.label}
                                        selected={selected.has(cat.id)}
                                        onPress={() => toggleCategory(cat)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* ── Level ── */}
                        {phase === 'level' && levelCategories.map(cat => (
                            <View key={cat.id} style={styles.levelCard}>
                                <JempText type="h2" color={theme.text} style={styles.levelCardTitle}>
                                    {cat.label}
                                </JempText>
                                <View style={styles.presets}>
                                    {LEVEL_PRESET_KEYS.map((keys, i) => {
                                        const score = LEVEL_PRESET_SCORES[i];
                                        const isSelected = (newScores[cat.id] ?? 35) === score;
                                        return (
                                            <TouchableOpacity
                                                key={score}
                                                onPress={() => setNewScores(p => ({ ...p, [cat.id]: score }))}
                                                activeOpacity={0.7}
                                                style={[
                                                    styles.preset,
                                                    { backgroundColor: theme.surface },
                                                    isSelected
                                                        ? { borderWidth: 1, borderColor: GradientMid }
                                                        : { borderWidth: 1, borderColor: 'transparent' },
                                                ]}
                                            >
                                                <JempText type="body-l" color={isSelected ? '#fff' : theme.text}>
                                                    {t(keys.labelKey)}
                                                </JempText>
                                                <JempText type="caption" color={theme.textMuted}>
                                                    {t(keys.descKey)}
                                                </JempText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* ── Fixed bottom button ── */}
                <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                    <Pressable
                        onPress={handlePrimaryAction}
                        disabled={primaryDisabled || saving}
                        style={styles.bottomBtn}
                    >
                        <LinearGradient
                            colors={!primaryDisabled ? GRADIENT : [theme.surface, theme.surface]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bottomBtnGradient}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <JempText type="button" color={!primaryDisabled ? '#fff' : theme.textMuted}>
                                    {primaryLabel}
                                </JempText>
                            }
                        </LinearGradient>
                    </Pressable>
                </View>

            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },
    headerCaption: { fontSize: 11, letterSpacing: 1 },
    stepBars: { flexDirection: 'row', gap: 5 },
    stepBar: { width: 24, height: 3, borderRadius: 2 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    title: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Select
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    // Rank
    listHeader: { marginBottom: 0 },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 10,
    },
    rankNumber: { width: 20, textAlign: 'center' },
    rankLabel: { flex: 1 },

    // Level
    levelCard: { marginBottom: 28 },
    levelCardTitle: { marginBottom: 12 },
    presets: { gap: 8 },
    preset: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 2,
    },

    // Bottom button
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
