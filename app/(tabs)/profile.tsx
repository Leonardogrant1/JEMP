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
import { LanguageModal } from '@/components/modals/language-modal';
import { SupportTicketModal } from '@/components/modals/support-ticket-modal';
import { EquipmentSheet } from '@/components/profile/equipment-sheet';
import { GeneratePlanSheet } from '@/components/profile/generate-plan-sheet';
import { GoalsSheet } from '@/components/profile/goals-sheet';
import { SportSheet } from '@/components/profile/sport-sheet';
import { StatCard } from '@/components/profile/stat-card';
import { getSportLabelI18n } from '@/constants/sports';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { queryKeys } from '@/queries/query-keys';
import { supabase } from '@/services/supabase/client';
import { calculateAge } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



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
const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

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
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const { signOut } = useAuth();
    const { openWithPlacement } = useSuperwallFunctions();
    const queryClient = useQueryClient();

    const router = useRouter();
    const [generatePlanOpen, setGeneratePlanOpen] = useState(false);
    const [planSuccessOpen, setPlanSuccessOpen] = useState(false);
    const [signOutLoading, setSignOutLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [goalsOpen, setGoalsOpen] = useState(false);
    const [sportOpen, setSportOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const LANG_FLAGS: Record<string, string> = { de: '🇩🇪', en: '🇬🇧' };
    const currentLangFlag = LANG_FLAGS[i18n.language] ?? '🌐';

    async function handleSignOut() {
        setSignOutLoading(true);
        try {
            await signOut();
        } catch (err: any) {
            Alert.alert(t('ui.error'), err?.message ?? t('ui.sign_out_error'));
            setSignOutLoading(false);
        }
    }

    async function handleDeleteConfirm() {
        setDeleteLoading(true);
        try {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) throw error;
        } catch (err: any) {
            Alert.alert(t('ui.error'), err?.message ?? t('ui.delete_account_error'));
            setDeleteLoading(false);
        }
    }

    const sportLabel = useMemo(() => getSportLabelI18n(profile?.sport?.slug, t), [profile, t]);
    const age = useMemo(() => profile?.birth_date ? calculateAge(profile.birth_date) : null, [profile]);
    const weight = useMemo(() => profile?.weight_in_kg ? `${profile.weight_in_kg} kg` : '—', [profile]);
    const height = useMemo(() => profile?.height_in_cm ? `${profile.height_in_cm} cm` : '—', [profile]);
    const gender = useMemo(() => profile?.gender === 'male' ? t('ui.male') : profile?.gender === 'female' ? t('ui.female') : '—', [profile, t]);
    const initials = useMemo(() => [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .map(n => n![0].toUpperCase())
        .join(''), [profile]);

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
                            onPress={() => openWithPlacement('generate_plan', () => setGeneratePlanOpen(true))}
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
                            icon={<JempText type="body-l">{currentLangFlag}</JempText>}
                            label={t('ui.language_name')}
                            onPress={() => setLangOpen(true)}
                        />
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
                            setPlanSuccessOpen(true);
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
                    <Modal
                        visible={planSuccessOpen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setPlanSuccessOpen(false)}
                    >
                        <Pressable
                            style={styles.successOverlay}
                            onPress={() => setPlanSuccessOpen(false)}
                        >
                            <Pressable style={[styles.successCard, { backgroundColor: theme.surface }]} onPress={() => {}}>
                                {/* Icon */}
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.successIconRing}
                                >
                                    <Ionicons name="checkmark" size={28} color="#fff" />
                                </LinearGradient>

                                <JempText type="h2" color={theme.text} style={styles.successTitle}>
                                    {t('plan.success_title')}
                                </JempText>
                                <JempText type="body-sm" color={theme.textMuted} style={styles.successSubtitle}>
                                    {t('plan.success_subtitle')}
                                </JempText>

                                {/* CTA */}
                                <Pressable
                                    style={styles.successBtn}
                                    onPress={() => {
                                        setPlanSuccessOpen(false);
                                        router.push('/(tabs)/plan');
                                    }}
                                >
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.successBtnGradient}
                                    >
                                        <JempText type="button" color="#fff">{t('plan.success_view')}</JempText>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable onPress={() => setPlanSuccessOpen(false)} hitSlop={12}>
                                    <JempText type="caption" color={theme.textMuted}>{t('ui.close')}</JempText>
                                </Pressable>
                            </Pressable>
                        </Pressable>
                    </Modal>
                </>
            )}
            <SupportTicketModal
                visible={supportOpen}
                onClose={() => setSupportOpen(false)}
            />
            <LanguageModal
                visible={langOpen}
                onClose={() => setLangOpen(false)}
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

    // Plan success modal
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    successCard: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 12,
    },
    successIconRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    successTitle: { textAlign: 'center' },
    successSubtitle: { textAlign: 'center', lineHeight: 20, marginBottom: 8 },
    successBtn: { width: '100%', borderRadius: 100, overflow: 'hidden' },
    successBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
