import { JempText } from '@/components/jemp-text';
import { SelectableRow } from '@/components/ui/selectable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export function EnvironmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allEnvs, selectedEnvIds, toggleEnv } = usePlanWizardStore();

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.environment_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.environment_subtitle')}
            </JempText>
            <View style={styles.envList}>
                {allEnvs.map(env => (
                    <SelectableRow
                        key={env.id}
                        label={env.name_i18n?.[locale] ?? env.slug}
                        description={env.description_i18n?.[locale]}
                        icon={env.icon}
                        selected={selectedEnvIds.has(env.id)}
                        onPress={() => toggleEnv(env.id)}
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
    envList: { gap: 12 },
});
