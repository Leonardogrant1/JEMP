import { CATEGORY_LABELS } from '@/constants/category-labels';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'select' | 'rank' | 'level';
type CategoryItem = { id: string; slug: string; label: string };

const LEVEL_PRESETS = [
    { label: 'Anfänger', score: 15, description: 'Keine oder wenig Erfahrung' },
    { label: 'Einsteiger', score: 35, description: 'Grundlagen vorhanden' },
    { label: 'Fortgeschritten', score: 55, description: 'Regelmäßiges Training' },
    { label: 'Erfahren', score: 75, description: 'Jahrelange Erfahrung' },
    { label: 'Elite', score: 90, description: 'Wettkampfniveau' },
];

interface Props {
    visible: boolean;
    userId: string;
    onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoalsSheet({ visible, userId, onClose }: Props) {
    const insets = useSafeAreaInsets();

    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [existingScores, setExistingScores] = useState<Record<string, number>>({});
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [ranked, setRanked] = useState<CategoryItem[]>([]);
    const [phase, setPhase] = useState<Phase>('select');

    // New scores entered by user for categories that had none
    const [newScores, setNewScores] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setPhase('select');
        setNewScores({});
        setLoading(true);

        Promise.all([
            supabase.from('categories').select('id, slug'),
            supabase
                .from('user_targeted_categories')
                .select('category_id, priority')
                .eq('user_id', userId)
                .order('priority'),
            supabase
                .from('user_category_levels')
                .select('category_id, level_score')
                .eq('user_id', userId),
        ]).then(([catsRes, targetedRes, levelsRes]) => {
            const items: CategoryItem[] = (catsRes.data ?? []).map(c => ({
                id: c.id,
                slug: c.slug,
                label: CATEGORY_LABELS[c.slug] ?? c.slug,
            }));
            setCategories(items);

            const scores: Record<string, number> = {};
            for (const row of levelsRes.data ?? []) {
                scores[row.category_id] = row.level_score;
            }
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

    // Categories that need self-assessment (selected + no existing score)
    function categoriesNeedingLevel(orderedList: CategoryItem[]) {
        return orderedList.filter(c => existingScores[c.id] === undefined);
    }

    function toggleCategory(cat: CategoryItem) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
            return next;
        });
    }

    function enterRankPhase() {
        const ordered = categories.filter(c => selected.has(c.id));
        setRanked(ordered);
        setPhase('rank');
    }

    function moveUp(index: number) {
        if (index === 0) return;
        setRanked(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
    }

    function moveDown(index: number) {
        setRanked(prev => {
            if (index === prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
        });
    }

    const selectedList = categories.filter(c => selected.has(c.id));
    const needsLevel = categoriesNeedingLevel(phase === 'rank' ? ranked : selectedList).length > 0;

    // "Speichern" only on the last phase, "Weiter" for intermediate navigation
    const isLastPhase =
        phase === 'level' ||
        (phase === 'rank' && !needsLevel) ||
        (phase === 'select' && selectedList.length <= 1 && !needsLevel);

    const primaryLabel = isLastPhase ? 'Speichern' : 'Weiter';

    function handlePrimaryAction() {
        const orderedList = phase === 'rank' ? ranked : selectedList;

        if (phase === 'level') {
            doSave(ranked);
            return;
        }

        if (isLastPhase) {
            doSave(orderedList);
            return;
        }

        // Navigate to next phase
        if (phase === 'select' && selectedList.length > 1) {
            setRanked(selectedList);
            setPhase('rank');
        } else {
            // Go to level assessment
            const toAssess = categoriesNeedingLevel(orderedList);
            const init: Record<string, number> = {};
            for (const cat of toAssess) {
                init[cat.id] = newScores[cat.id] ?? 35;
            }
            setNewScores(init);
            if (phase === 'select') setRanked(orderedList);
            setPhase('level');
        }
    }

    async function doSave(orderedList: CategoryItem[]) {
        setSaving(true);

        // 1. Save targeted categories
        await supabase.from('user_targeted_categories').delete().eq('user_id', userId);
        if (orderedList.length > 0) {
            await supabase.from('user_targeted_categories').insert(
                orderedList.map((cat, i) => ({
                    user_id: userId,
                    category_id: cat.id,
                    priority: i + 1,
                }))
            );
        }

        // 2. Insert level scores for categories that had none
        const toInsert = Object.entries(newScores).filter(([id]) => existingScores[id] === undefined);
        if (toInsert.length > 0) {
            await supabase.from('user_category_levels').upsert(
                toInsert.map(([category_id, level_score]) => ({
                    user_id: userId,
                    category_id,
                    level_score,
                })),
                { onConflict: 'user_id,category_id' }
            );
        }

        setSaving(false);
        onClose();
    }

    function handleBack() {
        if (phase === 'level') {
            setPhase(ranked.length > 1 ? 'rank' : 'select');
        } else if (phase === 'rank') {
            setPhase('select');
        } else {
            onClose();
        }
    }

    const headerTitle = phase === 'rank' ? 'Priorität' : phase === 'level' ? 'Dein Level' : 'Ziele';
    const primaryDisabled = phase === 'select' ? selected.size === 0 : false;

    const orderedForLevel = phase === 'level'
        ? ranked.filter(c => newScores[c.id] !== undefined || existingScores[c.id] === undefined)
        : [];
    const levelCategories = orderedForLevel.filter(c => existingScores[c.id] === undefined);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={handleBack} hitSlop={12}>
                        <Ionicons
                            name={phase === 'select' ? 'close' : 'arrow-back'}
                            size={24}
                            color="white"
                        />
                    </Pressable>
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                    <Pressable onPress={handlePrimaryAction} disabled={saving || primaryDisabled} hitSlop={12}>
                        {saving
                            ? <ActivityIndicator color="white" size="small" />
                            : <Text style={[styles.actionBtn, primaryDisabled && styles.actionBtnDisabled]}>
                                {primaryLabel}
                              </Text>
                        }
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color="white" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* ── Select phase ── */}
                        {phase === 'select' && (
                            <>
                                <Text style={styles.subtitle}>
                                    Wähle die Bereiche die du verbessern möchtest.
                                </Text>
                                <View style={styles.list}>
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.option, selected.has(cat.id) && styles.optionSelected]}
                                            onPress={() => toggleCategory(cat)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.optionText, selected.has(cat.id) && styles.optionTextSelected]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {selected.size > 1 && (
                                    <TouchableOpacity style={styles.secondaryBtn} onPress={enterRankPhase} activeOpacity={0.8}>
                                        <Text style={styles.secondaryBtnText}>Priorität festlegen →</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* ── Rank phase ── */}
                        {phase === 'rank' && (
                            <>
                                <Text style={styles.subtitle}>
                                    Ordne deine Ziele — das Wichtigste zuerst.
                                </Text>
                                <View style={styles.list}>
                                    {ranked.map((cat, index) => (
                                        <View key={cat.id} style={styles.rankRow}>
                                            <Text style={styles.rankNumber}>{index + 1}</Text>
                                            <Text style={styles.rankLabel}>{cat.label}</Text>
                                            <View style={styles.arrowGroup}>
                                                <TouchableOpacity
                                                    onPress={() => moveUp(index)}
                                                    disabled={index === 0}
                                                    style={[styles.arrow, index === 0 && styles.arrowDisabled]}
                                                >
                                                    <Text style={styles.arrowText}>↑</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => moveDown(index)}
                                                    disabled={index === ranked.length - 1}
                                                    style={[styles.arrow, index === ranked.length - 1 && styles.arrowDisabled]}
                                                >
                                                    <Text style={styles.arrowText}>↓</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* ── Level phase ── */}
                        {phase === 'level' && (
                            <>
                                <Text style={styles.subtitle}>
                                    Schätze dich realistisch ein — das bestimmt den Trainingsplan.
                                </Text>
                                {levelCategories.map(cat => (
                                    <View key={cat.id} style={styles.levelCard}>
                                        <Text style={styles.levelCardTitle}>{cat.label}</Text>
                                        <View style={styles.presets}>
                                            {LEVEL_PRESETS.map(preset => {
                                                const isSelected = (newScores[cat.id] ?? 35) === preset.score;
                                                return (
                                                    <TouchableOpacity
                                                        key={preset.score}
                                                        style={[styles.preset, isSelected && styles.presetSelected]}
                                                        onPress={() => setNewScores(p => ({ ...p, [cat.id]: preset.score }))}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                                                            {preset.label}
                                                        </Text>
                                                        <Text style={[styles.presetDesc, isSelected && styles.presetDescSelected]}>
                                                            {preset.description}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0a0a0a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
    actionBtn: { color: 'white', fontSize: 16, fontWeight: '600' },
    actionBtnDisabled: { opacity: 0.3 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },

    list: { gap: 10 },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'white' },
    optionText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600' },
    optionTextSelected: { color: 'white' },

    secondaryBtn: { marginTop: 24, paddingVertical: 14, alignItems: 'center' },
    secondaryBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },

    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    rankNumber: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', width: 20 },
    rankLabel: { color: 'white', fontSize: 16, fontWeight: '600', flex: 1 },
    arrowGroup: { flexDirection: 'row', gap: 8 },
    arrow: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 8,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowDisabled: { opacity: 0.2 },
    arrowText: { color: 'white', fontSize: 16 },

    levelCard: { marginBottom: 28 },
    levelCardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    presets: { gap: 8 },
    preset: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    presetSelected: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'white' },
    presetLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
    presetLabelSelected: { color: 'white' },
    presetDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    presetDescSelected: { color: 'rgba(255,255,255,0.6)' },
});
