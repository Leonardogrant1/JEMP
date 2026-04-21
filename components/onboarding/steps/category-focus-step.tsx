import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore, TargetedCategory } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { CATEGORY_LABELS } from '@/constants/category-labels';

type CategoryItem = { id: string; slug: string; label: string };

export function CategoryFocusStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);

    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [ranked, setRanked] = useState<CategoryItem[]>([]);
    const [phase, setPhase] = useState<'select' | 'rank'>('select');

    useEffect(() => {
        supabase.from('categories').select('id, slug').then(({ data }) => {
            if (data) {
                setCategories(
                    data.map((c) => ({ id: c.id, slug: c.slug, label: CATEGORY_LABELS[c.slug] ?? c.slug }))
                );
            }
        });
    }, []);

    function saveToStore(items: CategoryItem[]) {
        const payload: TargetedCategory[] = items.map((c, i) => ({
            categoryId: c.id,
            slug: c.slug,
            priority: i + 1,
        }));
        setStore({ targetedCategories: payload });
    }

    function toggleCategory(cat: CategoryItem) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(cat.id)) {
                next.delete(cat.id);
            } else {
                next.add(cat.id);
            }
            const hasSelection = next.size > 0;
            setCanContinue(hasSelection);
            // Always keep store in sync with current selection (default order)
            if (hasSelection) {
                const ordered = categories.filter((c) => next.has(c.id));
                saveToStore(ordered);
            } else {
                setStore({ targetedCategories: [] });
            }
            return next;
        });
    }

    function enterRankPhase() {
        const orderedSelected = categories.filter((c) => selected.has(c.id));
        setRanked(orderedSelected);
        saveToStore(orderedSelected);
        setPhase('rank');
    }

    function moveUp(index: number) {
        if (index === 0) return;
        setRanked((prev) => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            saveToStore(next);
            return next;
        });
    }

    function moveDown(index: number) {
        setRanked((prev) => {
            if (index === prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            saveToStore(next);
            return next;
        });
    }

    if (phase === 'select') {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Deine Ziele</Text>
                <Text style={styles.subtitle}>Wähle die Bereiche die du verbessern möchtest.</Text>
                <View style={styles.list}>
                    {categories.map((cat) => (
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
                {selected.size > 0 && (
                    <TouchableOpacity style={styles.rankButton} onPress={enterRankPhase} activeOpacity={0.8}>
                        <Text style={styles.rankButtonText}>Priorität festlegen →</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Priorität</Text>
            <Text style={styles.subtitle}>Ordne deine Ziele — das Wichtigste zuerst.</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
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
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
    optionTextSelected: { color: 'white' },
    rankButton: {
        marginTop: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    rankButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
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
});
