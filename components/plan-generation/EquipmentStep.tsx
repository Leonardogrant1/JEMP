import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EquipmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allEquipment, selectedEquipmentIds, toggleEquipment } = usePlanWizardStore();

    // Nach sichtbarem Label sortieren — die Slug-Reihenfolge wirkt für den User zufällig
    const label = (eq: (typeof allEquipment)[number]) => eq.name_i18n?.[locale] ?? eq.slug;
    const sorted = [...allEquipment].sort((a, b) => label(a).localeCompare(label(b), locale));

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.equipment_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.equipment_subtitle')}
            </JempText>
            <View style={styles.chipGrid}>
                {sorted.map(eq => (
                    <SelectableChip
                        key={eq.id}
                        label={label(eq)}
                        selected={selectedEquipmentIds.has(eq.id)}
                        onPress={() => toggleEquipment(eq.id)}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
