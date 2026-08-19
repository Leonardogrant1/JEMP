import { JempText } from '@/components/jemp-text';
import { SettingsGroup } from '@/components/profile/SettingsGroup';
import { SettingsRow } from '@/components/profile/SettingRow';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { canUseCreatorTools } from '@/utils/creator-tools';
import { devResetPlan } from '@/utils/dev-reset-plan';
import { resetOnboardingProfile } from '@/utils/reset-onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

type CreatorAction = 'refill' | 'resetOnboarding' | 'resetPlan' | 'seedHistory' | 'completePlan';

export function CreatorToolsSection() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const resetOnboardingStore = useOnboardingStore(s => s.reset);
    const queryClient = useQueryClient();

    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState<CreatorAction | null>(null);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    if (!profile || !canUseCreatorTools(profile.role)) return null;

    async function run(action: CreatorAction, fn: () => Promise<string>) {
        setBusy(action);
        setStatus(null);
        try {
            const text = await fn();
            setStatus({ ok: true, text });
        } catch (e: any) {
            setStatus({ ok: false, text: e?.message ?? 'Error' });
        } finally {
            setBusy(null);
        }
    }

    const refillAssessments = () => run('refill', async () => {
        const { error } = await supabase.rpc('fn_refill_user_assessments');
        if (error) throw new Error(error.message);
        await queryClient.invalidateQueries({ queryKey: ['assessments'] });
        return t('ui.creator_refill_done');
    });

    const resetOnboarding = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_reset_onboarding'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_reset_onboarding'),
                style: 'destructive',
                onPress: () => run('resetOnboarding', async () => {
                    await resetOnboardingProfile(profile.id);
                    resetOnboardingStore();
                    await refreshProfile();
                    return t('ui.creator_reset_onboarding_done');
                }),
            },
        ],
    );

    const resetPlan = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_reset_plan'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_reset_plan'),
                style: 'destructive',
                onPress: () => run('resetPlan', async () => {
                    const { sessionsCreated } = await devResetPlan(profile.id);
                    await queryClient.invalidateQueries({ queryKey: ['plan'] });
                    await queryClient.invalidateQueries({ queryKey: ['session-detail'] });
                    await queryClient.invalidateQueries({ queryKey: ['plan-exercise-progress'] });
                    return t('ui.creator_reset_plan_done', { count: sessionsCreated });
                }),
            },
        ],
    );

    const seedHistory = () => run('seedHistory', async () => {
        const { error } = await supabase.rpc('fn_dev_seed_category_history', { p_days: 10 });
        if (error) throw new Error(error.message);
        await queryClient.invalidateQueries({ queryKey: ['category-history'] });
        return t('ui.creator_seed_history_done');
    });

    const completePlan = () => Alert.alert(
        t('ui.creator_confirm_title'),
        t('ui.creator_confirm_complete_plan'),
        [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.creator_complete_plan'),
                style: 'destructive',
                onPress: () => run('completePlan', async () => {
                    const { error } = await supabase.rpc('fn_dev_complete_active_plan');
                    if (error) throw new Error(error.message);
                    await queryClient.invalidateQueries({ queryKey: ['plan'] });
                    await queryClient.invalidateQueries({ queryKey: ['session-detail'] });
                    await queryClient.invalidateQueries({ queryKey: ['plan-exercise-progress'] });
                    await queryClient.invalidateQueries({ queryKey: ['category-history'] });
                    return t('ui.creator_complete_plan_done');
                }),
            },
        ],
    );

    return (
        <View style={styles.section}>
            <SettingsGroup>
                <SettingsRow
                    icon={<Ionicons name="videocam-outline" size={20} color={theme.textMuted} />}
                    label={t('ui.creator_tools')}
                    onPress={() => setExpanded(e => !e)}
                    rightElement={<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSubtle} />}
                />
                {expanded && (
                    <SettingsRow
                        icon={<Ionicons name="clipboard-outline" size={20} color={theme.textMuted} />}
                        label={t('ui.creator_refill_assessments')}
                        onPress={refillAssessments}
                        loading={busy === 'refill'}
                    />
                )}
                {expanded && (
                    <SettingsRow
                        icon={<Ionicons name="refresh-outline" size={20} color={theme.textMuted} />}
                        label={t('ui.creator_reset_onboarding')}
                        onPress={resetOnboarding}
                        loading={busy === 'resetOnboarding'}
                    />
                )}
                {expanded && (
                    <SettingsRow
                        icon={<Ionicons name="repeat-outline" size={20} color={theme.textMuted} />}
                        label={t('ui.creator_reset_plan')}
                        onPress={resetPlan}
                        loading={busy === 'resetPlan'}
                    />
                )}
                {expanded && (
                    <SettingsRow
                        icon={<Ionicons name="trending-up-outline" size={20} color={theme.textMuted} />}
                        label={t('ui.creator_seed_history')}
                        onPress={seedHistory}
                        loading={busy === 'seedHistory'}
                    />
                )}
                {expanded && (
                    <SettingsRow
                        icon={<Ionicons name="trophy-outline" size={20} color={theme.textMuted} />}
                        label={t('ui.creator_complete_plan')}
                        onPress={completePlan}
                        loading={busy === 'completePlan'}
                    />
                )}
            </SettingsGroup>
            {expanded && status && (
                <JempText type="caption" color={status.ok ? '#22c55e' : '#ef4444'} style={styles.status}>
                    {status.text}
                </JempText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { gap: 10 },
    status: { textAlign: 'center', paddingTop: 2 },
});
