import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Fonts } from '@/constants/theme';
import { useUserDataStore } from '@/stores/UserDataStore';
import { MotivationStyle } from '@/types/user-data';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OPTIONS: { value: MotivationStyle; emoji: string; label: string; tagline: string; example: string }[] = [
    {
        value: 'affirmation',
        emoji: '🌿',
        label: 'Affirmation',
        tagline: 'Positive Bestätigung',
        example: '"Ich lebe in meinem Traumhaus am Meer und bin vollkommen frei."',
    },
    {
        value: 'fuel',
        emoji: '🔥',
        label: 'Fuel',
        tagline: 'Dringlichkeit & Drive',
        example: '"Jetzt alles geben – oder für immer davon träumen."',
    },
];

export function MotivationStyleStep() {
    const { nextStep } = useOnboardingControl();
    const updateSettings = useUserDataStore((s) => s.updateSettings);

    function select(value: MotivationStyle) {
        updateSettings({ motivationStyle: value });
        nextStep();
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dein Motivationsstil</Text>
            <Text style={styles.subtitle}>
                Wie willst du täglich an deine Visionen erinnert werden?
            </Text>
            <View style={styles.options}>
                {OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={styles.card}
                        onPress={() => select(opt.value)}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.emoji}>{opt.emoji}</Text>
                        <Text style={styles.label}>{opt.label}</Text>
                        <Text style={styles.tagline}>{opt.tagline}</Text>
                        <View style={styles.exampleBox}>
                            <Text style={styles.example}>{opt.example}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    title: {
        color: 'white',
        fontFamily: Fonts.serifBold,
        fontSize: 28,
        marginBottom: 10,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 32,
    },
    options: {
        gap: 14,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 18,
        padding: 22,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emoji: {
        fontSize: 28,
        marginBottom: 10,
    },
    label: {
        color: 'white',
        fontFamily: Fonts.satoshiBold,
        fontSize: 20,
        marginBottom: 3,
    },
    tagline: {
        color: 'rgba(255,255,255,0.45)',
        fontFamily: Fonts.satoshiRegular,
        fontSize: 13,
        marginBottom: 16,
    },
    exampleBox: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    example: {
        color: 'rgba(255,255,255,0.7)',
        fontFamily: Fonts.serifItalic,
        fontSize: 15,
        lineHeight: 22,
    },
});
