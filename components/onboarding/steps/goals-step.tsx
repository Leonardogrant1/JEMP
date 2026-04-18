import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';

const DUMMY_GOALS = [
    { id: '1', label: 'Karriere', emoji: '💼', description: 'Beförderung und finanzielle Freiheit' },
    { id: '2', label: 'Gesundheit', emoji: '💪', description: 'Fit, stark und voller Energie' },
    { id: '3', label: 'Beziehungen', emoji: '❤️', description: 'Tiefe und bedeutungsvolle Verbindungen' },
    { id: '4', label: 'Reisen', emoji: '✈️', description: 'Die Welt erleben und entdecken' },
    { id: '5', label: 'Persönlichkeit', emoji: '🌱', description: 'Wachstum und Selbstverwirklichung' },
];

export function GoalsStep() {
    const { setCanContinue } = useOnboardingControl();
    const [selected, setSelected] = useState<string[]>(['1', '2', '3']);

    function toggle(id: string) {
        const next = selected.includes(id)
            ? selected.filter((s) => s !== id)
            : [...selected, id];
        setSelected(next);
        setCanContinue(next.length > 0);
    }

    useEffect(() => {
        setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Deine Ziele</Text>
            <Text style={styles.subtitle}>
                Basierend auf deiner Vision haben wir diese Bereiche identifiziert. Passe sie an.
            </Text>
            {DUMMY_GOALS.map((goal) => (
                <TouchableOpacity
                    key={goal.id}
                    style={[styles.card, selected.includes(goal.id) && styles.cardSelected]}
                    onPress={() => toggle(goal.id)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.emoji}>{goal.emoji}</Text>
                    <View style={styles.cardText}>
                        <Text style={styles.cardLabel}>{goal.label}</Text>
                        <Text style={styles.cardDesc}>{goal.description}</Text>
                    </View>
                    <View style={[styles.check, selected.includes(goal.id) && styles.checkActive]}>
                        {selected.includes(goal.id) && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 10,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    cardSelected: {
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    emoji: {
        fontSize: 24,
        marginRight: 14,
    },
    cardText: {
        flex: 1,
    },
    cardLabel: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    cardDesc: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        marginTop: 2,
    },
    check: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkActive: {
        backgroundColor: 'white',
        borderColor: 'white',
    },
    checkMark: {
        color: '#0d0d0d',
        fontSize: 12,
        fontWeight: '700',
    },
});
