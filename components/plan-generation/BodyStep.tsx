import { JempText } from '@/components/jemp-text';
import { HeightSlider, WeightSlider } from '@/components/ui/measurement-slider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

export function BodyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        weightKg, setWeightKg, weightUnit, setWeightUnit,
        heightCm, setHeightCm, heightUnit, setHeightUnit,
    } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.body_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.body_subtitle')}
            </JempText>
            <WeightSlider
                valueKg={weightKg}
                onChange={setWeightKg}
                unit={weightUnit}
                onToggleUnit={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
            />
            <HeightSlider
                valueCm={heightCm}
                onChange={setHeightCm}
                unit={heightUnit}
                onToggleUnit={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
});
