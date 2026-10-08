import { JempText } from '@/components/jemp-text';
import { PillarStepperList } from '@/components/pillars/pillar-stepper-list';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pillarBudget } from '@/lib/pillar-budget';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export function PillarStep() {
    const { t } = useTranslation();
    const { pillarItems, pillarLevels, setPillarLevels } = usePlanWizardStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" style={styles.title}>{t('pillars.title')}</JempText>
            <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>{t('pillars.subtitle')}</JempText>
            <PillarStepperList
                pillars={pillarItems}
                levels={pillarLevels}
                budget={pillarBudget(pillarItems.length)}
                onChange={setPillarLevels}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    // 120 wie die Schwester-Steps: der Weiter-Button floatet über dem Inhalt
    content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 20 },
});
