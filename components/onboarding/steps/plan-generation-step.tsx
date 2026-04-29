import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { GeneratingView } from '@/components/ui/generating-view';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/query-keys';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export function PlanGenerationStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const onboardingData = useOnboardingStore();
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function generate() {
        setError(null);
        setIsComplete(false);
        try {

            if (session) {
                const {
                    set,
                    reset,
                    targetedCategories,
                    categoryLevels,
                    equipmentIds,
                    environmentIds,
                    ...profileData
                } = onboardingData;

                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({ ...profileData })
                    .eq('id', session.user.id);
                if (profileError) throw profileError;

                await Promise.all([
                    supabase.from('user_targeted_categories').delete().eq('user_id', session.user.id),
                    supabase.from('user_category_levels').delete().eq('user_id', session.user.id),
                    supabase.from('user_environments').delete().eq('user_id', session.user.id),
                    supabase.from('user_equipments').delete().eq('user_id', session.user.id),
                ]);

                if (targetedCategories.length > 0) {
                    const { error: catError } = await supabase.from('user_targeted_categories').insert(
                        targetedCategories.map(({ categoryId, priority }) => ({
                            user_id: session.user.id,
                            category_id: categoryId,
                            priority,
                        }))
                    );
                    if (catError) throw catError;
                }

                if (categoryLevels.length > 0) {
                    const { error: levelError } = await supabase.from('user_category_levels').insert(
                        categoryLevels.map(({ categoryId, score }) => ({
                            user_id: session.user.id,
                            category_id: categoryId,
                            level_score: score,
                        }))
                    );
                    if (levelError) throw levelError;
                }

                if (environmentIds.length > 0) {
                    const { error: envError } = await supabase.from('user_environments').insert(
                        environmentIds.map((environment_id) => ({
                            user_id: session.user.id,
                            environment_id,
                        }))
                    );
                    if (envError) throw envError;
                }

                if (equipmentIds.length > 0) {
                    const { error: equipError } = await supabase.from('user_equipments').insert(
                        equipmentIds.map((equipment_id) => ({
                            user_id: session.user.id,
                            equipment_id,
                        }))
                    );
                    if (equipError) throw equipError;
                }

                const { error: genError } = await supabase.functions.invoke('generate-trainings-plan');
                if (genError) throw genError;

                // Invalidate plan cache only if a previous plan was already loaded
                const cached = queryClient.getQueryData<{ plan: any }>(queryKeys.plan(session.user.id));
                if (cached?.plan != null) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.plan(session.user.id) });
                }

                reset();
            }

            trackerManager.track('plan_generation_success');
            setIsComplete(true);
        } catch (err: any) {
            trackerManager.track('plan_generation_failed', { error: err?.message });
            setError(err?.message ?? t('plan.error_generate'));
        }
    }

    return (
        <View style={styles.container}>
            <GeneratingView
                error={error}
                isComplete={isComplete}
                onRetry={() => { hasStarted.current = false; generate(); }}
                onClose={nextStep}
                onAnimationComplete={nextStep}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
