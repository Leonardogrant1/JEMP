import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingStore, CategoryLevel } from '@/stores/onboarding-store';
import { CATEGORY_LABELS } from '@/constants/category-labels';

type LevelPreset = { label: string; score: number; description: string };

const LEVEL_PRESETS: LevelPreset[] = [
    { label: 'Anfänger', score: 15, description: 'Keine oder wenig Erfahrung' },
    { label: 'Einsteiger', score: 35, description: 'Grundlagen vorhanden' },
    { label: 'Fortgeschritten', score: 55, description: 'Regelmäßiges Training' },
    { label: 'Erfahren', score: 75, description: 'Jahrelange Erfahrung' },
    { label: 'Elite', score: 90, description: 'Wettkampfniveau' },
];

export function CategoryLevelStep() {
    const targetedCategories = useOnboardingStore((s) => s.targetedCategories);
    const setStore = useOnboardingStore((s) => s.set);

    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        targetedCategories.forEach((c) => { initial[c.categoryId] = 35; });
        return initial;
    });

    useEffect(() => {
        const levels: CategoryLevel[] = targetedCategories.map((c) => ({
            categoryId: c.categoryId,
            score: scores[c.categoryId] ?? 35,
        }));
        setStore({ categoryLevels: levels });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function selectScore(categoryId: string, score: number) {
        setScores((prev) => {
            const next = { ...prev, [categoryId]: score };
            const levels: CategoryLevel[] = targetedCategories.map((c) => ({
                categoryId: c.categoryId,
                score: next[c.categoryId] ?? 35,
            }));
            setStore({ categoryLevels: levels });
            return next;
        });
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Dein Level</Text>
            <Text style={styles.subtitle}>Schätze dich realistisch ein — das bestimmt den Trainingsplan.</Text>
            {targetedCategories.map((cat) => (
                <View key={cat.categoryId} style={styles.card}>
                    <Text style={styles.cardTitle}>{CATEGORY_LABELS[cat.slug] ?? cat.slug}</Text>
                    <View style={styles.presets}>
                        {LEVEL_PRESETS.map((preset) => {
                            const isSelected = scores[cat.categoryId] === preset.score;
                            return (
                                <TouchableOpacity
                                    key={preset.score}
                                    style={[styles.preset, isSelected && styles.presetSelected]}
                                    onPress={() => selectScore(cat.categoryId, preset.score)}
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
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },
    card: { marginBottom: 28 },
    cardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    presets: { gap: 8 },
    preset: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    presetSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    presetLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
    presetLabelSelected: { color: 'white' },
    presetDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    presetDescSelected: { color: 'rgba(255,255,255,0.6)' },
});
