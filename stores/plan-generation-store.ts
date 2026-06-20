import { supabase } from '@/services/supabase/client';
import { AppState, AppStateStatus } from 'react-native';
import { create } from 'zustand';

export type PlanGenerationJob = {
    id: string;
    user_id: string;
    workflow_id: string | null;
    status: string;
    phase_detail: string | null;
    error: string | null;
    plan_id: string | null;
    created_at: string;
    updated_at: string;
};

type PlanGenerationState = {
    job: PlanGenerationJob | null;
    isGenerating: boolean;
    isError: boolean;
    subscribe: (userId: string) => Promise<void>;
    unsubscribe: () => void;
    clear: () => void;
};


export const usePlanGenerationStore = create<PlanGenerationState>((set) => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let currentUserId: string | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    function startChannel(userId: string) {
        if (channel !== null) return;

        channel = supabase
            .channel(`plan-generation-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'plan_generation_jobs',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const job = payload.new as PlanGenerationJob;
                    const isCompleted = job.status === 'completed';
                    const isError = job.status === 'error';
                    set({ job, isGenerating: !isCompleted && !isError, isError });

                },
            )
            .subscribe();
    }

    async function rehydrate(userId: string) {
        // Re-fetch current job state in case we missed updates while backgrounded
        const { data } = await supabase
            .from('plan_generation_jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!data) return;

        const isCompleted = data.status === 'completed';
        const isError = data.status === 'error';
        set({
            job: data,
            isGenerating: !isCompleted && !isError,
            isError,
        });
    }

    return {
        job: null,
        isGenerating: false,
        isError: false,

        subscribe: async (userId: string) => {
            currentUserId = userId;

            // Fetch current active job first
            const { data } = await supabase
                .from('plan_generation_jobs')
                .select('*')
                .eq('user_id', userId)
                .not('status', 'in', '(completed,error)')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                set({ job: data, isGenerating: true, isError: false });
            }

            startChannel(userId);

            // Re-subscribe and re-fetch on foreground to recover from dropped WS connection
            if (!appStateSubscription) {
                appStateSubscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
                    if (state === 'active' && currentUserId) {
                        // Restart channel if it dropped
                        if (channel === null) {
                            startChannel(currentUserId);
                        }
                        // Re-fetch in case we missed the completed event while backgrounded
                        await rehydrate(currentUserId);
                    }
                });
            }
        },

        unsubscribe: () => {
            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
            if (appStateSubscription) {
                appStateSubscription.remove();
                appStateSubscription = null;
            }
            currentUserId = null;
        },

        clear: () => set({ job: null, isGenerating: false, isError: false }),
    };
});
