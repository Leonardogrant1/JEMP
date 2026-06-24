import { WeeklyScheduleSession } from "@/types/user-data";

const PLAN_FEATURES = [
    'plan.feature_weekly_plan',
    'plan.feature_exercises',
    'plan.feature_assessments',
    'plan.feature_tracking',
] as const;

function computeProgress(status: string, phaseDetail: string | null): number {
    if (status === 'completed') return 1;
    if (status === 'fetching_data') return 0.08;
    if (status === 'planning_week') return 0.22;
    if (status === 'generating_session') {
        if (phaseDetail) {
            const [cur, tot] = phaseDetail.split('/').map(Number);
            if (tot > 0) return 0.25 + (cur / tot) * 0.60;
        }
        return 0.28;
    }
    if (status === 'saving') return 0.90;
    return 0;
}

function getStageLabel(t: (k: string, opts?: any) => string, status: string, phaseDetail: string | null): string {
    if (status === 'completed') return t('planGeneration.completed_label');
    if (status === 'fetching_data') return t('planGeneration.fetching_data');
    if (status === 'planning_week') return t('planGeneration.planning_week');
    if (status === 'generating_session' && phaseDetail) {
        const [cur, tot] = phaseDetail.split('/').map(Number);
        return t('planGeneration.generating_session', { current: cur, total: tot });
    }
    if (status === 'saving') return t('planGeneration.saving');
    return t('planGeneration.title');
}

function getSessionTypes(sportSlug: string | null | undefined, combatSportSlugs: Set<string>): { key: WeeklyScheduleSession['type']; labelKey: string }[] {
    const isCombat = combatSportSlugs.has(sportSlug ?? '');
    return [
        { key: 'team_training', labelKey: 'onboarding.weekly_schedule_type_training' },
        { key: 'game', labelKey: isCombat ? 'onboarding.weekly_schedule_type_fight' : 'onboarding.weekly_schedule_type_game' },
        { key: 'tournament', labelKey: 'onboarding.weekly_schedule_type_tournament' },
    ];
}

export {
    computeProgress, getSessionTypes, getStageLabel, PLAN_FEATURES
};

