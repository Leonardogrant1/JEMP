import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { calculateAge } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

// ── Stat card ────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
}

function StatCard({ label, value }: StatCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <JempText type="h2" color={theme.text}>{value}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>
                {label.toUpperCase()}
            </JempText>
        </View>
    );
}

// ── Settings row ─────────────────────────────────────────────

interface SettingsRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    loading?: boolean;
    destructive?: boolean;
}

function SettingsRow({ icon, label, onPress, loading, destructive }: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const color = destructive ? '#ef4444' : theme.text;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.settingsRow,
                { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onPress}
            disabled={loading}
        >
            <View style={[styles.settingsIconBox, { backgroundColor: theme.background }]}>
                {loading
                    ? <ActivityIndicator size="small" color={theme.primary} />
                    : <Ionicons name={icon} size={18} color={color} />
                }
            </View>
            <JempText type="body-l" color={color} style={styles.settingsLabel}>{label}</JempText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
        </Pressable>
    );
}

// ── Screen ───────────────────────────────────────────────────

type GenerateState = 'idle' | 'loading';

export default function ProfileScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const [generateState, setGenerateState] = useState<GenerateState>('idle');

    async function handleGeneratePlan() {
        setGenerateState('loading');
        try {
            const { data, error } = await supabase.functions.invoke('generate-trainings-plan');
            if (error) throw error;
            Alert.alert(
                'Plan erstellt ✅',
                `${data.sessions_scheduled} Sessions geplant\n${data.start_date} → ${data.end_date}`,
            );
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Plan konnte nicht erstellt werden.');
        } finally {
            setGenerateState('idle');
        }
    }

    const age = profile?.birth_date ? calculateAge(profile.birth_date) : null;
    const weight = profile?.weight_in_kg ? `${profile.weight_in_kg} kg` : '—';
    const height = profile?.height_in_cm ? `${profile.height_in_cm} cm` : '—';
    const gender = profile?.gender === 'male' ? t('ui.male') : profile?.gender === 'female' ? t('ui.female') : '—';

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.headerSection}>
                    <JempText type="h1" style={styles.title}>{t('tab.profile')}</JempText>
                    {profile?.first_name && (
                        <JempText type="body-sm" color={theme.textMuted}>
                            {profile.first_name} {profile.last_name ?? ''}
                        </JempText>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                    <StatCard label={t('ui.age')} value={age !== null ? String(age) : '—'} />
                    <StatCard label={t('ui.weight')} value={weight} />
                    <StatCard label={t('ui.height')} value={height} />
                    <StatCard label={t('ui.gender')} value={gender} />
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                        {t('ui.settings').toUpperCase()}
                    </JempText>
                    <View style={styles.settingsGroup}>
                        <SettingsRow
                            icon="barbell-outline"
                            label={t('ui.new_plan')}
                            onPress={handleGeneratePlan}
                            loading={generateState === 'loading'}
                        />
                        <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                        <SettingsRow
                            icon="construct-outline"
                            label={t('ui.available_equipment')}
                            onPress={() => {}}
                        />
                        <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                        <SettingsRow
                            icon="flag-outline"
                            label={t('ui.focused_goals')}
                            onPress={() => {}}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 24 },

    headerSection: { gap: 4 },
    title: { letterSpacing: -0.5 },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        width: '47.5%',
        borderRadius: 16,
        padding: 16,
        gap: 4,
    },
    statLabel: { letterSpacing: 1, fontSize: 10 },

    section: { gap: 10 },
    sectionLabel: { letterSpacing: 1.2, fontSize: 11, paddingLeft: 4 },

    settingsGroup: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    settingsIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: { flex: 1 },
    divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
