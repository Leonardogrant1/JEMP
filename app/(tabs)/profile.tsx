import BugIcon from '@/assets/icons/bug.svg';
import HeadsetIcon from '@/assets/icons/headset.svg';
import LogoutIcon from '@/assets/icons/logout.svg';
import RocketIcon from '@/assets/icons/rocket.svg';
import BasketballIcon from '@/assets/icons/basketball.svg';
import GlobeIcon from '@/assets/icons/globe.svg';
import ShieldIcon from '@/assets/icons/shield.svg';
import UnitIcon from '@/assets/icons/unit.svg';
import UserIcon from '@/assets/icons/user.svg';
import { CreatorToolsSection } from '@/components/creator-tools-section';
import { JempText } from '@/components/jemp-text';
import { useTabBarInset } from '@/components/tab-bar';
import { SectionLabel } from '@/components/profile/SectionLabel';
import { SettingsGroup } from '@/components/profile/SettingsGroup';
import { SettingsRow } from '@/components/profile/SettingRow';
import { StatsStrip } from '@/components/profile/stats-strip';
import { TitleChip } from '@/components/profile/title-chip';
import { FEATURE_REQUEST_URL, PRIVACY_POLICY_URL, REPORT_BUG_URL } from '@/constants/settings';
import { displayHeight, displayWeight, UnitSystem } from '@/helpers/units';
import { Colors, Cyan, GRADIENT } from '@/constants/theme';
import { useAchievementsBackfill } from '@/hooks/use-achievements-backfill';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOverallScore } from '@/hooks/use-overall-score';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useSportGroupBannerQuery } from '@/queries/use-sport-group-banner-query';
import { supabase } from '@/services/supabase/client';
import { useDevToolsStore } from '@/stores/dev-tools-store';
import { useProfileBannerStore } from '@/stores/profile-banner-store';
import { calculateAge } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { PREMIUM_IDENTIFIER } from '@/services/purchases/revenuecat/constants';
import { useRevenueCat } from '@/services/purchases/revenuecat/providers/RevenueCatProvider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';




export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const overallScore = useOverallScore(profile?.id);
    useAchievementsBackfill();
    const devButtonsVisible = useDevToolsStore(s => s.devButtonsVisible);
    const setDevButtonsVisible = useDevToolsStore(s => s.setDevButtonsVisible);

    const { hasEntitlement } = useRevenueCat();
    const isSubscribed = hasEntitlement(PREMIUM_IDENTIFIER);
    const { openWithPlacement } = useSuperwallFunctions();

    const [subModalVisible, setSubModalVisible] = useState(false);
    const [subModalStep, setSubModalStep] = useState<'details' | 'feedback' | 'instructions'>('details');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    const SUB_MANAGEMENT_URL = Platform.select({
        ios: 'https://apps.apple.com/account/subscriptions',
        android: 'https://play.google.com/store/account/subscriptions?package=studio.northbyte.jemp',
        default: 'https://play.google.com/store/account/subscriptions',
    });

    const feedbackOptions = [
        { key: 'profile.subscription_feedback_option_1', trackerVal: 'dislike_plan' },
        { key: 'profile.subscription_feedback_option_2', trackerVal: 'found_another_app' },
        { key: 'profile.subscription_feedback_option_3', trackerVal: 'just_looking' },
        { key: 'profile.subscription_feedback_option_4', trackerVal: 'no_longer_needed' }
    ];

    const router = useRouter();

    const queryClient = useQueryClient();
    const refreshBanner = useCallback(() => {
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['sport-group-banner'] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient]);

    useFocusEffect(refreshBanner);

    // Also refresh when the app returns to the foreground while this tab is open
    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') refreshBanner();
        });
        return () => sub.remove();
    }, [refreshBanner]);

    function handleSignOut() {
        router.push('/sign-out-confirm');
    }


    const unitSystem: UnitSystem = profile?.unit_system === 'imperial' ? 'imperial' : 'metric';
    const weightDisplay = profile?.weight_in_kg ? displayWeight(profile.weight_in_kg, unitSystem) : null;
    const heightDisplay = profile?.height_in_cm ? displayHeight(profile.height_in_cm, unitSystem) : null;

    const sportLabel = useMemo(() => (profile?.sport as any)?.name_i18n?.[i18n.language] ?? null, [profile, i18n.language]);
    // Banner chain: sport banner → sport group banner → bundled default
    const sportBannerPath = (profile?.sport as any)?.banner_storage_path as string | undefined;
    const sportGroupName = (profile?.sport as any)?.group_name as string | undefined;
    const groupBannerQuery = useSportGroupBannerQuery(sportBannerPath ? undefined : sportGroupName);
    const bannerUrl = useMemo(() => {
        const path = sportBannerPath ?? groupBannerQuery.data;
        if (!path) return null;
        return supabase.storage.from('sport-banners').getPublicUrl(path).data.publicUrl;
    }, [sportBannerPath, groupBannerQuery.data]);

    // While the group-banner query is still resolving, fall back to the last
    // known URL for this user instead of flashing the bundled default.
    const resolving = !sportBannerPath && !!sportGroupName && groupBannerQuery.isPending;
    const userId = profile?.id;
    const lastBannerUrl = useProfileBannerStore(s => (userId ? s.bannersByUser[userId] : undefined));
    const setLastBannerUrl = useProfileBannerStore(s => s.setLastBannerUrl);
    useEffect(() => {
        if (!userId || resolving) return;
        if (bannerUrl !== lastBannerUrl) setLastBannerUrl(userId, bannerUrl);
    }, [userId, resolving, bannerUrl, lastBannerUrl, setLastBannerUrl]);
    // undefined → never resolved for this user: render no image rather than the wrong one
    const displayBannerUrl = resolving ? lastBannerUrl : bannerUrl;
    const age = useMemo(() => profile?.birth_date ? calculateAge(profile.birth_date) : null, [profile]);
    const initials = useMemo(() => [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .map(n => n![0].toUpperCase())
        .join(''), [profile]);

    const tabBarInset = useTabBarInset();
    const insets = useSafeAreaInsets();
    const bannerHeight = insets.top + 210;

    // Parallax: pulling down zooms the banner (top edge stays pinned),
    // scrolling up moves it away at half the scroll speed.
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler(e => {
        scrollY.value = e.contentOffset.y;
    });
    const bannerStyle = useAnimatedStyle(() => {
        const y = scrollY.value;
        const scale = interpolate(y, [-bannerHeight, 0], [2, 1], Extrapolation.CLAMP);
        // Fades out while scrolling down, back in when scrolling up
        const opacity = interpolate(y, [0, bannerHeight * 0.55], [1, 0], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY: -y / 2 }, { scale }] };
    });

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]}>
            {/* Fixed background behind the scroll — sport banner shining through a scrim */}
            <Animated.View style={[styles.fixedBanner, { height: bannerHeight }, bannerStyle]}>
                {displayBannerUrl !== undefined && (
                    <ExpoImage
                        source={displayBannerUrl ?? require('@/assets/stock_images/sprints.jpg')}
                        style={styles.bannerImage}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="disk"
                    />
                )}
                {/* Scrim: dims the image so it reads as background, not content */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.45 }]} />
                <LinearGradient
                    colors={[`${theme.background}00`, theme.background]}
                    style={styles.bannerFade}
                    pointerEvents="none"
                />
            </Animated.View>

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: tabBarInset }}
                showsVerticalScrollIndicator={false}
            >
                {/* Transparent spacer — the fixed banner shows through here */}
                <View style={{ height: bannerHeight - 96 }} />

                <View style={styles.contentWrap}>

                {/* ── Avatar + name ── */}
                <View style={styles.hero}>
                    {/* Avatar overlapping the banner's bottom edge */}
                    <View style={[styles.avatarCutout, { backgroundColor: theme.background }]}>
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
                    </View>

                    <JempText type="h1" style={styles.heroName}>
                        {profile?.first_name} {profile?.last_name ?? ''}
                    </JempText>
                    {profile?.email && (
                        <JempText type="body-sm" color={theme.textMuted}>
                            {profile.email}
                        </JempText>
                    )}
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
                    <TitleChip
                        score={overallScore}
                        onPress={() => router.push(overallScore !== null ? '/achievements' : '/(tabs)/assessments')}
                    />
                </View>

                {/* ── Stats strip (tap to edit) ── */}
                <Pressable onPress={() => router.push('/edit-profile')}>
                    <StatsStrip
                    items={[
                        { label: t('ui.age'), value: age !== null ? String(age) : '—' },
                        {
                            label: t('ui.weight'),
                            value: weightDisplay?.value ?? '—',
                            unit: weightDisplay?.unit,
                        },
                        {
                            label: t('ui.height'),
                            value: heightDisplay?.value ?? '—',
                            unit: heightDisplay?.unit ?? undefined,
                        },
                        {
                            label: t('ui.gender'),
                            value: profile?.gender ? undefined : '—',
                            icon: profile?.gender === 'male'
                                ? <Ionicons name="male" size={22} color={theme.text} />
                                : profile?.gender === 'female'
                                    ? <Ionicons name="female" size={22} color={theme.text} />
                                    : undefined,
                        },
                    ]}
                    />
                </Pressable>

                {/* ── Profile ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_profile')} />
                    <SettingsGroup>
                        <SettingsRow
                            icon={<UserIcon width={20} height={20} color={theme.textMuted} />}
                            label={t('ui.edit_personal_data')}
                            onPress={() => router.push('/edit-profile')}
                        />
                        <SettingsRow
                            icon={<BasketballIcon width={20} height={20} />}
                            label={t('ui.sport')}
                            onPress={() => router.push('/sport')}
                            rightElement={
                                <View style={styles.settingsValueRow}>
                                    {sportLabel && (
                                        <JempText type="caption" color={theme.textMuted}>
                                            {sportLabel}
                                        </JempText>
                                    )}
                                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                </View>
                            }
                        />
                        <SettingsRow
                            icon={<UnitIcon width={20} height={20} />}
                            label={t('ui.unit_system')}
                            onPress={() => router.push('/units')}
                            rightElement={
                                <View style={styles.settingsValueRow}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {unitSystem === 'imperial'
                                            ? `${t('ui.unit_imperial')} (lbs · ft)`
                                            : `${t('ui.unit_metric')} (kg · cm)`}
                                    </JempText>
                                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                </View>
                            }
                        />
                        <SettingsRow
                            icon={<GlobeIcon width={20} height={20} />}
                            label={t('ui.language')}
                            onPress={() => router.push('/language')}
                            rightElement={
                                <View style={styles.settingsValueRow}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {i18n.language === 'de' ? 'Deutsch' : 'English'}
                                    </JempText>
                                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                </View>
                            }
                        />
                        <SettingsRow
                            icon={<Ionicons name="trophy-outline" size={20} color={theme.textMuted} />}
                            label={t('achievements.screen_title')}
                            onPress={() => router.push('/achievements')}
                        />
                    </SettingsGroup>
                </View>

                {/* ── Support ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_support')} />
                    <SettingsGroup>
                        <SettingsRow
                            icon={<RocketIcon width={20} height={20} color={theme.textMuted} />}
                            label={t('ui.feature_request')}
                            onPress={() => {
                                trackerManager.track('feature_request_opened');
                                WebBrowser.openBrowserAsync(FEATURE_REQUEST_URL);
                            }}
                        />
                        <SettingsRow
                            icon={<BugIcon width={20} height={20} color={theme.textMuted} />}
                            label={t('ui.report_bug')}
                            onPress={() => {
                                trackerManager.track('bug_report_opened');
                                WebBrowser.openBrowserAsync(REPORT_BUG_URL);
                            }}
                        />
                        <SettingsRow
                            icon={<HeadsetIcon width={20} height={20} color={theme.textMuted} />}
                            label={t('ui.support_ticket')}
                            onPress={() => router.push('/support-ticket')}
                        />
                        <SettingsRow
                            icon={<ShieldIcon width={20} height={20} color={theme.textMuted} />}
                            label={t('ui.privacy_policy')}
                            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
                        />
                    </SettingsGroup>
                </View>

                {/* ── Account ── */}
                <View style={styles.settingsSection}>
                    <SectionLabel label={t('ui.section_account')} />
                    <SettingsGroup>
                        {isSubscribed ? (
                            <SettingsRow
                                icon={<Ionicons name="card-outline" size={20} color={theme.textMuted} />}
                                label={t('profile.subscription_mine')}
                                onPress={() => {
                                    setSubModalStep('details');
                                    setSelectedReason(null);
                                    setSubModalVisible(true);
                                }}
                            />
                        ) : (
                            <SettingsRow
                                icon={<Ionicons name="sparkles-outline" size={20} color={Cyan[500]} />}
                                label={t('profile.subscription_unlock')}
                                onPress={() => {
                                    openWithPlacement('unlock');
                                }}
                            />
                        )}
                        <SettingsRow
                            icon={<LogoutIcon width={20} height={20} />}
                            label={t('ui.sign_out')}
                            onPress={handleSignOut}
                        />
                        <SettingsRow
                            icon={<Ionicons name="trash-outline" size={20} color="#ef4444" />}
                            label={t('ui.delete_account')}
                            onPress={() => router.push('/delete-account')}
                            destructive
                        />
                    </SettingsGroup>
                </View>

                {/* ── Creator tools (affiliate/admin only) ── */}
                <CreatorToolsSection />

                {/* ── Developer (DEV builds only) ── */}
                {__DEV__ && (
                    <View style={styles.settingsSection}>
                        <SectionLabel label="DEV" />
                        <SettingsGroup>
                            <SettingsRow
                                icon={<Ionicons name="construct-outline" size={20} color={theme.textMuted} />}
                                label="DEV Buttons"
                                onPress={() => setDevButtonsVisible(!devButtonsVisible)}
                                rightElement={
                                    <Switch
                                        value={devButtonsVisible}
                                        onValueChange={setDevButtonsVisible}
                                        trackColor={{ true: Cyan[500] }}
                                    />
                                }
                            />
                        </SettingsGroup>
                    </View>
                )}

                </View>
            </Animated.ScrollView>

            <Modal
                visible={subModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSubModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                        {subModalStep === 'details' && (
                            <>
                                <View style={[styles.successIconRing, { backgroundColor: `${Cyan[500]}15` }]}>
                                    <Ionicons name="card" size={32} color={Cyan[400]} />
                                </View>

                                <JempText type="h2" color={theme.text} style={styles.modalTitle}>
                                    {t('profile.subscription_modal_title')}
                                </JempText>

                                <JempText type="body-m" color={theme.textMuted} style={styles.modalSubtitle}>
                                    {t('profile.subscription_modal_active')}
                                </JempText>

                                <TouchableOpacity
                                    style={[styles.modalPrimaryBtn, { backgroundColor: theme.text }]}
                                    onPress={() => setSubModalVisible(false)}
                                >
                                    <JempText type="body-m" color={theme.background} style={{ fontWeight: '600' }}>
                                        {t('ui.cancel')}
                                    </JempText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalSecondaryBtn, { borderColor: '#ef4444', marginTop: 4 }]}
                                    onPress={() => setSubModalStep('feedback')}
                                >
                                    <JempText type="body-sm" color="#ef4444" style={{ fontWeight: '600' }}>
                                        {t('profile.subscription_cancel')}
                                    </JempText>
                                </TouchableOpacity>
                            </>
                        )}

                        {subModalStep === 'feedback' && (
                            <>
                                <JempText type="h2" color={theme.text} style={styles.modalTitle}>
                                    {t('profile.subscription_feedback_title')}
                                </JempText>

                                <JempText type="body-m" color={theme.textMuted} style={styles.modalSubtitle}>
                                    {t('profile.subscription_feedback_subtitle')}
                                </JempText>

                                <View style={styles.feedbackOptionsList}>
                                    {feedbackOptions.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.key}
                                            style={[styles.feedbackOptionRow, { backgroundColor: theme.background, borderColor: theme.borderDivider }]}
                                            onPress={() => {
                                                trackerManager.track('subscription_cancellation_survey', { reason: opt.trackerVal });
                                                setSelectedReason(opt.trackerVal);
                                                setSubModalStep('instructions');
                                            }}
                                        >
                                            <JempText type="body-m" color={theme.text} style={{ flex: 1, paddingRight: 8 }}>
                                                {t(opt.key)}
                                            </JempText>
                                            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={styles.modalBackBtn}
                                    onPress={() => setSubModalStep('details')}
                                >
                                    <JempText type="body-sm" color={theme.textMuted}>
                                        {t('ui.session_cancel_confirm_back')}
                                    </JempText>
                                </TouchableOpacity>
                            </>
                        )}

                        {subModalStep === 'instructions' && (
                            <>
                                <View style={[styles.successIconRing, { backgroundColor: `${theme.textMuted}15` }]}>
                                    <Ionicons name="information-circle" size={32} color={theme.textMuted} />
                                </View>

                                <JempText type="h2" color={theme.text} style={styles.modalTitle}>
                                    {t('profile.subscription_cancel')}
                                </JempText>

                                <JempText type="body-m" color={theme.textMuted} style={styles.modalSubtitle}>
                                    {t('profile.subscription_cancel_instructions')}
                                </JempText>

                                <TouchableOpacity
                                    style={[styles.modalPrimaryBtn, { backgroundColor: Cyan[500] }]}
                                    onPress={async () => {
                                        try {
                                            await Linking.openURL(SUB_MANAGEMENT_URL);
                                        } catch (err) {
                                            console.warn('Could not open subscription URL', err);
                                        }
                                        setSubModalVisible(false);
                                    }}
                                >
                                    <JempText type="body-m" color="#000000" style={{ fontWeight: '600' }}>
                                        {t('profile.subscription_manage')}
                                    </JempText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalBackBtn}
                                    onPress={() => setSubModalVisible(false)}
                                >
                                    <JempText type="body-sm" color={theme.textMuted}>
                                        {t('ui.cancel')}
                                    </JempText>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Fixed banner behind the scroll
    fixedBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    bannerImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bannerFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 130,
    },

    // Transparent content — the banner fades out underneath while scrolling
    contentWrap: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 28,
    },

    // Hero
    hero: { alignItems: 'center', gap: 6, paddingBottom: 12 },
    avatarCutout: {
        marginTop: -52,
        borderRadius: 56,
        padding: 4,
        marginBottom: 6,
    },
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

    // Settings sections
    settingsSection: { gap: 8 },

    settingsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },



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

    // Subscription Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        gap: 16,
        maxWidth: 400,
    },
    modalTitle: {
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
    },
    modalPrimaryBtn: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    modalSecondaryBtn: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBackBtn: {
        paddingVertical: 8,
        marginTop: 4,
    },
    feedbackOptionsList: {
        width: '100%',
        gap: 10,
        marginVertical: 8,
    },
    feedbackOptionRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
});
