import { supabase } from '@/services/supabase/client';
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

    return {
        job: null,
        isGenerating: false,
        isError: false,

        subscribe: async (userId: string) => {
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

            // Subscribe to Realtime updates
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
                        set({
                            job,
                            isGenerating: !isCompleted && !isError,
                            isError,
                        });
                    },
                )
                .subscribe();
        },

        unsubscribe: () => {
            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
        },

        clear: () => set({ job: null, isGenerating: false, isError: false }),
    };
});
