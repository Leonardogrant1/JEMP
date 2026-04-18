import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';

const OPTIONS = [
    { value: 'Male', label: 'Mann' },
    { value: 'Female', label: 'Frau' },
    { value: 'Other', label: 'Divers' },
    { value: 'Prefer not to say', label: 'Keine Angabe' },
] as const;

export function GenderStep() {
    const { setCanContinue } = useOnboardingControl();
    const [selected, setSelected] = useState<string | null>(null);

    function select(value: string) {
        setSelected(value);
        setCanContinue(true);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dein Geschlecht</Text>
            <Text style={styles.subtitle}>Wir passen das generierte Bild an dich an.</Text>
            <View style={styles.options}>
                {OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.option, selected === opt.value && styles.optionSelected]}
                        onPress={() => select(opt.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.optionText, selected === opt.value && styles.optionTextSelected]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
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
        marginBottom: 36,
    },
    options: {
        gap: 12,
    },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 17,
        fontWeight: '600',
    },
    optionTextSelected: {
        color: 'white',
    },
});
