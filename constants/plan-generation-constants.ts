import { SessionDuration } from "@/types/database";
import { Phase } from "@/types/plan-generation";

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

const WEEK_DAYS: { dow: number; key: string }[] = [
    { dow: 1, key: 'onboarding.workout_prefs_day_mon' },
    { dow: 2, key: 'onboarding.workout_prefs_day_tue' },
    { dow: 3, key: 'onboarding.workout_prefs_day_wed' },
    { dow: 4, key: 'onboarding.workout_prefs_day_thu' },
    { dow: 5, key: 'onboarding.workout_prefs_day_fri' },
    { dow: 6, key: 'onboarding.workout_prefs_day_sat' },
    { dow: 7, key: 'onboarding.workout_prefs_day_sun' },
];

const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'equipment-env', 'goals', 'body', 'schedule', 'weekly'];


export { DURATIONS, PHASES, WEEK_DAYS };

