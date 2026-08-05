import { JempText } from '@/components/jemp-text';
import { HeightTape, WeightTape } from '@/components/ui/measurement-tape';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnitSystem } from '@/hooks/use-unit-system';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export function BodyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const unitSystem = useUnitSystem();
    const { weightKg, setWeightKg, heightCm, setHeightCm } = usePlanWizardStore();

    return (
        <View style={styles.root}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.body_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.body_subtitle')}
            </JempText>
            <View style={styles.tapes}>
                <WeightTape
                    valueKg={weightKg}
                    onChange={setWeightKg}
                    unit={unitSystem === 'imperial' ? 'lbs' : 'kg'}
                />
                <HeightTape
                    valueCm={heightCm}
                    onChange={setHeightCm}
                    unit={unitSystem === 'imperial' ? 'in' : 'cm'}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20 },
    tapes: {
        flex: 1,
        justifyContent: 'center',
        gap: 56,
        // Optischer Ausgleich für die Bottom-Bar
        paddingBottom: 90,
    },
});
