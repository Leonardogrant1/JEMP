import { ConstraintChoiceList } from '@/components/injuries/ConstraintChoiceList';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConfirmedChoice, ExtractionResult } from '@/lib/injury-constraints';
import { fetchContraindicationTags, markExtractionFailed, requestExtraction } from '@/lib/injury-constraints';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { devError } from '@/utils/dev-log';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Tag = { id: string; slug: string };

// Modul-weiter State statt Store-Feld: `preContinue` lebt als reine Funktion
// im Step-Array von app/onboarding.tsx (Pattern aller anderen Onboarding-
// Steps) und hat keinen Zugriff auf lokalen Component-State. Der Schritt
// selbst ist hier das einzige Stück Code, das sowohl den Confirm-UI-State
// hält als auch von preContinue gelesen wird — ein zusätzliches transientes
// Store-Feld wäre Scope-Kriechen für diesen Task.
type InjuryConfirmState = {
    choices: ConfirmedChoice[];
    note: string | null;
    extractionFailed: boolean;
};

let confirmState: InjuryConfirmState = { choices: [], note: null, extractionFailed: false };

export function getInjuryConfirmState(): InjuryConfirmState {
    return confirmState;
}

function resetInjuryConfirmState(note: string | null) {
    confirmState = { choices: [], note, extractionFailed: false };
}

/** Confirm-Screen nach InjuriesStep: Extraktion anstoßen, Vorschläge bestätigen lassen. */
export function InjuriesConfirmStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [loading, setLoading] = useState(true);
    const [extractionFailed, setExtractionFailed] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        const notes = useOnboardingStore.getState().schedule_notes;
        resetInjuryConfirmState(notes ?? null);

        if (!notes || !notes.trim()) {
            // Defensiv — app/onboarding.tsx überspringt den Step bereits bei
            // leeren Notes (shouldSkip)
            setLoading(false);
            setCanContinue(true);
            return;
        }

        trackerManager.track('injury_extraction_started', {});
        Promise.all([requestExtraction(notes), fetchContraindicationTags()])
            .then(([extraction, allTags]) => {
                setResult(extraction);
                setTags(allTags);
                trackerManager.track('injury_extraction_completed', {
                    constraint_count: extraction.constraints.length,
                    unmapped_count: extraction.unmapped.length,
                });
                setCanContinue(true);
            })
            .catch((err) => {
                devError('InjuriesConfirmStep: extraction failed', err);
                confirmState.extractionFailed = true;
                setExtractionFailed(true);
                trackerManager.track('injury_extraction_failed', {
                    error: err instanceof Error ? err.message : String(err),
                });
                markExtractionFailed().catch((markErr) => {
                    devError('InjuriesConfirmStep: markExtractionFailed failed', markErr);
                });
                // Onboarding darf nie blockieren — Continue bleibt trotz
                // gescheiterter Extraktion nutzbar
                setCanContinue(true);
            })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('injuries.confirm_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('injuries.confirm_subtitle')}
                </JempText>
            </Animated.View>

            {loading && (
                <View style={styles.loadingBox}>
                    <ActivityIndicator color={theme.textMuted} />
                    <JempText type="body-sm" color={theme.textMuted} style={styles.loadingText}>
                        {t('injuries.extraction_loading')}
                    </JempText>
                </View>
            )}

            {!loading && extractionFailed && (
                <JempText type="body-sm" color={theme.textMuted}>
                    {t('injuries.extraction_failed_hint')}
                </JempText>
            )}

            {!loading && !extractionFailed && result && (
                <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                    <ConstraintChoiceList
                        proposals={result.constraints}
                        unmapped={result.unmapped}
                        scheduling={result.scheduling}
                        allTags={tags}
                        onChange={(choices) => { confirmState.choices = choices; }}
                    />
                </Animated.View>
            )}
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
    loadingBox: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 24,
    },
    loadingText: { lineHeight: 18 },
});
