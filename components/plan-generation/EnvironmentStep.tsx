import { JempText } from '@/components/jemp-text';
import { SelectableRow } from '@/components/ui/selectable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export function EnvironmentStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { allEnvs, selectedEnvIds, toggleEnv } = usePlanWizardStore();

    return (
        <View style={styles.root}>
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
                        size="lg"
                        selected={selectedEnvIds.has(env.id)}
                        onPress={() => toggleEnv(env.id)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20 },
    envList: {
        flex: 1,
        justifyContent: 'center',
        gap: 12,
        // Optischer Ausgleich für die Bottom-Bar
        paddingBottom: 90,
    },
});
