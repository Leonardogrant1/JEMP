import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { EnvItem } from '@/types/plan-generation';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

function EnvToggle({ env, active, onPress, theme }: {
    env: EnvItem;
    active: boolean;
    onPress: () => void;
    theme: typeof Colors.dark;
}) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            hitSlop={6}
            style={[
                styles.envToggle,
                active
                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                    : { backgroundColor: theme.background, borderColor: 'transparent' },
            ]}
        >
            <Ionicons name={env.icon as any} size={17} color={active ? GradientMid : theme.textMuted} />
        </Pressable>
    );
}

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
            <View style={styles.list}>
                {ambiguousEquipment.map(eq => {
                    const eqSelections = equipmentEnvSelections.get(eq.id) ?? new Set<string>();
                    return (
                        <View key={eq.id} style={[styles.row, { backgroundColor: theme.surface }]}>
                            <JempText type="body-l" color={theme.text} style={styles.rowLabel}>
                                {eq.name_i18n?.[locale] ?? eq.slug}
                            </JempText>
                            <View style={styles.envToggles}>
                                {eq.compatibleEnvIds.map(envId => {
                                    const env = allEnvs.find(e => e.id === envId);
                                    if (!env) return null;
                                    return (
                                        <EnvToggle
                                            key={envId}
                                            env={env}
                                            active={eqSelections.has(envId)}
                                            onPress={() => toggleEquipmentEnv(eq.id, envId)}
                                            theme={theme}
                                        />
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rowLabel: { flex: 1 },
    envToggles: {
        flexDirection: 'row',
        gap: 8,
    },
    envToggle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
