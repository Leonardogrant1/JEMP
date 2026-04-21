import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';

type SportItem = { slug: string; label: string };

const GROUPS: { title: string; sports: SportItem[] }[] = [
    {
        title: 'Kampfsport',
        sports: [
            { slug: 'boxing', label: 'Boxen' },
            { slug: 'mma', label: 'MMA' },
            { slug: 'wrestling', label: 'Wrestling' },
            { slug: 'judo', label: 'Judo' },
            { slug: 'bjj', label: 'BJJ' },
            { slug: 'kickboxing', label: 'Kickboxen' },
            { slug: 'karate', label: 'Karate' },
            { slug: 'taekwondo', label: 'Taekwondo' },
        ],
    },
    {
        title: 'Teamsport',
        sports: [
            { slug: 'football', label: 'American Football' },
            { slug: 'basketball', label: 'Basketball' },
            { slug: 'volleyball', label: 'Volleyball' },
            { slug: 'handball', label: 'Handball' },
            { slug: 'rugby', label: 'Rugby' },
            { slug: 'hockey', label: 'Hockey' },
            { slug: 'soccer', label: 'Fußball' },
        ],
    },
    {
        title: 'Leichtathletik',
        sports: [
            { slug: 'sprinting', label: 'Sprint' },
            { slug: 'jumping', label: 'Sprung' },
            { slug: 'throwing', label: 'Wurf' },
        ],
    },
    {
        title: 'Kraft',
        sports: [
            { slug: 'powerlifting', label: 'Powerlifting' },
            { slug: 'weightlifting', label: 'Gewichtheben' },
            { slug: 'crossfit', label: 'CrossFit' },
            { slug: 'bodybuilding', label: 'Bodybuilding' },
        ],
    },
    {
        title: 'Ausdauer',
        sports: [
            { slug: 'running', label: 'Laufen' },
            { slug: 'cycling', label: 'Radfahren' },
            { slug: 'swimming', label: 'Schwimmen' },
            { slug: 'triathlon', label: 'Triathlon' },
        ],
    },
    {
        title: 'Racket',
        sports: [
            { slug: 'tennis', label: 'Tennis' },
            { slug: 'badminton', label: 'Badminton' },
            { slug: 'squash', label: 'Squash' },
        ],
    },
    {
        title: 'Sonstiges',
        sports: [
            { slug: 'gymnastics', label: 'Turnen' },
            { slug: 'climbing', label: 'Klettern' },
            { slug: 'other', label: 'Anderes' },
        ],
    },
];

export function SportStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<string | null>(null);

    async function select(slug: string) {
        setSelected(slug);
        const { data } = await supabase.from('sports').select('id').eq('slug', slug).single();
        if (data) {
            setStore({ sport_id: data.id });
            setCanContinue(true);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Deine Sportart</Text>
            {GROUPS.map((group) => (
                <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <View style={styles.grid}>
                        {group.sports.map((sport) => (
                            <TouchableOpacity
                                key={sport.slug}
                                style={[styles.chip, selected === sport.slug && styles.chipSelected]}
                                onPress={() => select(sport.slug)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, selected === sport.slug && styles.chipTextSelected]}>
                                    {sport.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 24,
    },
    group: { marginBottom: 20 },
    groupTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    chipText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextSelected: { color: 'white' },
    bottomSpacer: { height: 24 },
});
