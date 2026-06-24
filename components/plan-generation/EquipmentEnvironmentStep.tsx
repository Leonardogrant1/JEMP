import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EquipmentEnvironmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { ambiguousEquipment, equipmentEnvSelections, allEnvs, toggleEquipmentEnv } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                {t('onboarding.equipment_location_title')}
            </JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('onboarding.equipment_location_subtitle')}
            </JempText>
            {ambiguousEquipment.map(eq => {
                const eqSelections = equipmentEnvSelections.get(eq.id) ?? new Set<string>();
                return (
                    <View key={eq.id} style={styles.equipmentEnvRow}>
                        <JempText type="body-l" color={theme.text} style={styles.equipmentEnvLabel}>
                            {eq.name_i18n?.[locale] ?? eq.slug}
                        </JempText>
                        <View style={styles.chipGrid}>
                            {eq.compatibleEnvIds.map(envId => {
                                const env = allEnvs.find(e => e.id === envId);
                                if (!env) return null;
                                return (
                                    <SelectableChip
                                        key={envId}
                                        label={env.name_i18n?.[locale] ?? env.slug}
                                        selected={eqSelections.has(envId)}
                                        onPress={() => toggleEquipmentEnv(eq.id, envId)}
                                    />
                                );
                            })}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipmentEnvRow: { marginBottom: 24 },
    equipmentEnvLabel: { marginBottom: 10 },
});
