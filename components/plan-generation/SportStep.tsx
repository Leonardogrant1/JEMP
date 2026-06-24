import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function SportStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { selectedSportSlug, setSelectedSportSlug } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('ui.sport')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.sport_subtitle')}
            </JempText>
            {SPORT_GROUPS.map(group => (
                <View key={group.titleKey} style={styles.group}>
                    <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                        {t(group.titleKey as any).toUpperCase()}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {group.sports.map(sport => (
                            <SelectableChip
                                key={sport.slug}
                                label={getSportLabelI18n(sport.slug, t) ?? sport.slug}
                                selected={selectedSportSlug === sport.slug}
                                onPress={() => setSelectedSportSlug(sport.slug)}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    group: { marginBottom: 24 },
    groupTitle: { letterSpacing: 1, fontSize: 11, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
