import BallIcon from '@/assets/icons/basketball.svg';
import BugIcon from '@/assets/icons/bug.svg';
import CalendarIcon from '@/assets/icons/calendar.svg';
import DumbellIcon from '@/assets/icons/dumbell.svg';
import FemaleIcon from '@/assets/icons/female.svg';
import HeadsetIcon from '@/assets/icons/headset.svg';
import HeightIcon from '@/assets/icons/height.svg';
import LogoutIcon from '@/assets/icons/logout.svg';
import MaleIcon from '@/assets/icons/male.svg';
import RocketIcon from '@/assets/icons/rocket.svg';
import ShieldIcon from '@/assets/icons/shield.svg';
import TargetIcon from '@/assets/icons/target.svg';
import UserIcon from '@/assets/icons/user.svg';
import WeightIcon from '@/assets/icons/weight.svg';
import { JempText } from '@/components/jemp-text';
import { DeleteAccountModal } from '@/components/modals/delete-account-modal';
import { SupportTicketModal } from '@/components/modals/support-ticket-modal';
import { GeneratePlanSheet } from '@/components/generate-plan-sheet';
import { EquipmentSheet } from '@/components/profile/equipment-sheet';
import { GoalsSheet } from '@/components/profile/goals-sheet';
import { SportSheet } from '@/components/profile/sport-sheet';
import { getSportLabel } from '@/constants/sports';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryKeys } from '@/queries/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { calculateAge } from '@/types/user-data';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

// ── Stat card ────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={styles.statCardContent}>

                <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>
                    {label}
                </JempText>
                <JempText type="h2" color={theme.text} style={styles.statValue}>
                    {value}
                </JempText>
            </View>

            {icon}

        </View>
    );
}

// ── Settings row ─────────────────────────────────────────────

interface SettingsRowProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    loading?: boolean;
    destructive?: boolean;
}

function SettingsRow({ icon, label, onPress, loading, destructive }: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Pressable
            style={({ pressed }) => [
                styles.settingsRow,
                { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onPress}
            disabled={loading}
        >
            <View style={[styles.settingsIconBox, { backgroundColor: theme.background }, destructive && styles.settingsIconBoxDestructive]}>
                {loading
                    ? <ActivityIndicator size="small" color={destructive ? '#ef4444' : '#fff'} />
                    : icon
                }
            </View>
            <JempText type="body-l" color={destructive ? '#ef4444' : theme.text} style={styles.settingsLabel}>{label}</JempText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
        </Pressable>
    );
}

function SectionLabel({ label }: { label: string }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    return (
        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
            {label.toUpperCase()}
        </JempText>
    );
}

// ── Screen ───────────────────────────────────────────────────

const FEATURE_REQUEST_URL = 'https://northbyte.studio/features/jemp';
const REPORT_BUG_URL = 'https://northbyte.studio/features/jemp/bugs';
const PRIVACY_POLICY_URL = 'https://www.northbyte.studio/privacy-policy/jemp';

export default function ProfileScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const { signOut } = useAuth();
    const queryClient = useQueryClient();

    const [generatePlanOpen, setGeneratePlanOpen] = useState(false);
    const [signOutLoading, setSignOutLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [goalsOpen, setGoalsOpen] = useState(false);
    const [sportOpen, setSportOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    async function handleSignOut() {
        setSignOutLoading(true);
        try {
            await signOut();
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Abmelden fehlgeschlagen.');
            setSignOutLoading(false);
        }
    }

    async function handleDeleteConfirm() {
        setDeleteLoading(true);
        try {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) throw error;
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Konto konnte nicht gelöscht werden.');
            setDeleteLoading(false);
        }
    }

    const sportLabel = getSportLabel(profile?.sport?.slug);
    const age = profile?.birth_date ? calculateAge(profile.birth_date) : null;
    const weight = profile?.weight_in_kg ? `${profile.weight_in_kg} kg` : '—';
    const height = profile?.height_in_cm ? `${profile.height_in_cm} cm` : '—';
    const gender = profile?.gender === 'male' ? t('ui.male') : profile?.gender === 'female' ? t('ui.female') : '—';
    const initials = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .map(n => n![0].toUpperCase())
        .join('');

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Avatar + name ── */}
                <View style={styles.hero}>
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.avatarRing}
                    >
                        <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
                            <JempText type="h1" color={theme.text} style={styles.avatarText}>
                                {initials || '?'}
                            </JempText>
                        </View>
                    </LinearGradient>
                    <JempText type="h1" style={styles.heroName}>
                        {profile?.first_name} {profile?.last_name ?? ''}
                    </JempText>
                    {sportLabel && (
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.tagBorder}
                        >
                            <View style={[styles.tagInner, { backgroundColor: theme.background }]}>
                                <JempText type="caption" color={Cyan[400]} style={styles.tagText}>
                                    {sportLabel.toUpperCase()}
                                </JempText>
                            </View>
                        </LinearGradient>
                    )}
                </View>

                {/* ── Stats grid ── */}
                <View style={styles.statsGrid}>
                    <StatCard icon={<UserIcon width={16} height={16} color={theme.textMuted} />} label={t('ui.age')} value={age !== null ? String(age) : '—'} />
                    <StatCard icon={<WeightIcon width={16} height={16} color={theme.textMuted} />} label={t('ui.weight')} value={weight} />
                    <StatCard icon={<HeightIcon width={19} height={19} color={theme.textMuted} />} label={t('ui.height')} value={height} />
                    <StatCard icon={profile?.gender === 'male' ? <MaleIcon width={20} height={20} color={theme.textMuted} /> : <FemaleIcon width={20} height={20} color={theme.textMuted} />} label={t('ui.gender')} value={gender} />
                </View>

                {/* ── Training ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_training')} />
                    <View style={styles.settingsGroup}>
                        <SettingsRow
                            icon={<BallIcon width={20} height={20} color="#fff" />}
                            label={t('ui.sport')}
                            onPress={() => setSportOpen(true)}
                        />
                        <SettingsRow
                            icon={<CalendarIcon width={20} height={20} color="#fff" />}
                            label={t('ui.new_plan')}
                            onPress={() => setGeneratePlanOpen(true)}
                        />
                        <SettingsRow
                            icon={<DumbellIcon width={20} height={20} color="#fff" />}
                            label={t('ui.available_equipment')}
                            onPress={() => setEquipmentOpen(true)}
                        />
                        <SettingsRow
                            icon={<TargetIcon width={20} height={20} color="#fff" />}
                            label={t('ui.focused_goals')}
                            onPress={() => setGoalsOpen(true)}
                        />
                    </View>
                </View>

                {/* ── Support ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_support')} />
                    <View style={styles.settingsGroup}>
                        <SettingsRow
                            icon={<RocketIcon width={20} height={20} color="#fff" />}
                            label={t('ui.feature_request')}
                            onPress={() => WebBrowser.openBrowserAsync(FEATURE_REQUEST_URL)}
                        />
                        <SettingsRow
                            icon={<BugIcon width={20} height={20} color="#fff" />}
                            label={t('ui.report_bug')}
                            onPress={() => WebBrowser.openBrowserAsync(REPORT_BUG_URL)}
                        />
                        <SettingsRow
                            icon={<HeadsetIcon width={20} height={20} color="#fff" />}
                            label={t('ui.support_ticket')}
                            onPress={() => setSupportOpen(true)}
                        />
                        <SettingsRow
                            icon={<ShieldIcon width={20} height={20} color="#fff" />}
                            label={t('ui.privacy_policy')}
                            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
                        />
                    </View>
                </View>

                {/* ── Account ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_account')} />
                    <View style={styles.settingsGroup}>
                        <SettingsRow
                            icon={<LogoutIcon width={20} height={20} />}
                            label={t('ui.sign_out')}
                            onPress={handleSignOut}
                            loading={signOutLoading}
                        />
                        <SettingsRow
                            icon={<Ionicons name="trash-outline" size={20} color="#ef4444" />}
                            label={t('ui.delete_account')}
                            onPress={() => setDeleteOpen(true)}
                            loading={deleteLoading}
                            destructive
                        />
                    </View>
                </View>

            </ScrollView>

            {profile?.id && (
                <>
                    <GeneratePlanSheet
                        visible={generatePlanOpen}
                        profile={profile}
                        onClose={() => setGeneratePlanOpen(false)}
                        onComplete={() => {
                            setGeneratePlanOpen(false);
                            refreshProfile();
                            queryClient.invalidateQueries({ queryKey: queryKeys.plan(profile.id) });
                        }}
                    />
                    <SportSheet
                        visible={sportOpen}
                        userId={profile.id}
                        currentSportId={profile.sport_id}
                        onClose={() => setSportOpen(false)}
                        onSaved={refreshProfile}
                    />
                    <EquipmentSheet
                        visible={equipmentOpen}
                        userId={profile.id}
                        onClose={() => setEquipmentOpen(false)}
                    />
                    <GoalsSheet
                        visible={goalsOpen}
                        userId={profile.id}
                        onClose={() => setGoalsOpen(false)}
                    />
                </>
            )}
            <SupportTicketModal
                visible={supportOpen}
                onClose={() => setSupportOpen(false)}
            />
            <DeleteAccountModal
                visible={deleteOpen}
                loading={deleteLoading}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 28 },

    // Hero
    hero: { alignItems: 'center', gap: 12, paddingTop: 60, paddingBottom: 20 },
    avatarRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        padding: 3,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 30, lineHeight: 36 },
    heroName: { letterSpacing: -0.5, textAlign: 'center' },
    tagBorder: {
        borderRadius: 20,
        padding: 1.5,
    },
    tagInner: {
        borderRadius: 18.5,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    tagText: { letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
        width: '48.25%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: 16,
        padding: 16,
        gap: 4,
    },
    statCardContent: {
        gap: 10,
    },
    statLabel: { letterSpacing: 0.3, fontSize: 11, marginTop: 2 },
    statValue: { fontSize: 26, letterSpacing: -0.5 },

    // Settings sections
    settingsSection: { gap: 8 },
    sectionLabel: { letterSpacing: 1, fontSize: 11, paddingHorizontal: 4 },

    // Settings — each row is its own card
    settingsGroup: { gap: 10 },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 14,
    },
    settingsIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsIconBoxDestructive: {
        backgroundColor: '#ef444418',
    },
    settingsLabel: { flex: 1 },
});
