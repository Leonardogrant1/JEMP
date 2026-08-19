import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/** Optional finishing touch: injuries & limitations for the plan generation. */
export function ScheduleDetailStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { scheduleNotes, setScheduleNotes } = usePlanWizardStore();

    return (
        <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_notes_label')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.schedule_notes_subtitle')}
            </JempText>

            <JempInput
                value={scheduleNotes}
                onChangeText={setScheduleNotes}
                placeholder={t('plan.schedule_notes_placeholder')}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={styles.notesInput}
            />

            <View style={styles.examples}>
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
            </View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
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
