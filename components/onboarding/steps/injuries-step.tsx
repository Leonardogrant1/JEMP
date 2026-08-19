import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';

/** Optionaler Abschluss der Trainings-Konfiguration: Verletzungen & Einschränkungen. */
export function InjuriesStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedNotes = useOnboardingStore((s) => s.schedule_notes);
    const setStore = useOnboardingStore((s) => s.set);
    const [notes, setNotes] = useState(storedNotes ?? '');
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleChange(text: string) {
        setNotes(text);
        setStore({ schedule_notes: text.trim() || null });
    }

    return (
        <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('plan.schedule_notes_label')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('plan.schedule_notes_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <JempInput
                    value={notes}
                    onChangeText={handleChange}
                    placeholder={t('plan.schedule_notes_placeholder')}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={styles.notesInput}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(480).duration(500).springify()} style={styles.examples}>
                <JempText type="caption" color={theme.textSubtle} style={styles.examplesLabel}>
                    {t('plan.schedule_notes_examples_label').toUpperCase()}
                </JempText>
                {[t('plan.schedule_notes_example_1'), t('plan.schedule_notes_example_2')].map(example => (
                    <View key={example} style={styles.exampleRow}>
                        <View style={[styles.exampleBar, { backgroundColor: theme.borderStrong }]} />
                        <JempText type="body-sm" color={theme.textMuted} style={styles.exampleText}>
                            {example}
                        </JempText>
                    </View>
                ))}
            </Animated.View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    notesInput: { minHeight: 140 },
    examples: {
        marginTop: 24,
        gap: 10,
    },
    examplesLabel: {
        letterSpacing: 1,
        fontSize: 11,
        marginBottom: 2,
    },
    exampleRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    exampleBar: {
        width: 3,
        alignSelf: 'stretch',
        borderRadius: 2,
    },
    exampleText: {
        flex: 1,
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
