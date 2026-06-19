import { create } from 'zustand';
import { Gender, SessionDuration, UserProfile } from '@/types/database';
import { WeeklySchedule } from '@/types/user-data';

type ProfileData = Pick<
    UserProfile,
    | 'first_name'
    | 'last_name'
    | 'birth_date'
    | 'gender'
    | 'sport_id'
    | 'height_in_cm'
    | 'weight_in_kg'
    | 'preferred_workout_days'
    | 'preferred_session_duration'
    | 'schedule_notes'
    | 'timezone'
>;

export type TargetedCategory = {
    categoryId: string;
    slug: string;
    priority: number;
};

export type CategoryLevel = {
    categoryId: string;
    score: number;
};

export type DayEnvironment = {
    day_of_week: number;
    environment_id: string;
};

export type EquipmentEnvironment = {
    equipment_id: string;
    environment_id: string;
};

type OnboardingStore = ProfileData & {
    sport_slug: string | null;
    targetedCategories: TargetedCategory[];
    categoryLevels: CategoryLevel[];
    equipmentIds: string[];
    environmentIds: string[];
    equipmentEnvironments: EquipmentEnvironment[];
    dayEnvironments: DayEnvironment[];
    weekly_schedule: WeeklySchedule;
    referral_code: string | null;
    name_source: 'apple' | 'google' | null;
    set: (data: Partial<ProfileData & {
        sport_slug: string | null;
        targetedCategories: TargetedCategory[];
        categoryLevels: CategoryLevel[];
        equipmentIds: string[];
        environmentIds: string[];
        equipmentEnvironments: EquipmentEnvironment[];
        dayEnvironments: DayEnvironment[];
        weekly_schedule: WeeklySchedule;
        referral_code: string | null;
        name_source: 'apple' | 'google' | null;
    }>) => void;
    reset: () => void;
};

const initialState: Omit<OnboardingStore, 'set' | 'reset'> = {
    first_name: null,
    last_name: null,
    birth_date: null,
    gender: null,
    sport_id: null,
    sport_slug: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    schedule_notes: null,
    timezone: null,
    targetedCategories: [],
    categoryLevels: [],
    equipmentIds: [],
    environmentIds: [],
    equipmentEnvironments: [],
    dayEnvironments: [],
    weekly_schedule: { sessions: [], notes: null },
    referral_code: null,
    name_source: null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    ...initialState,
    set: (data) => set((state) => ({ ...state, ...data })),
    reset: () => set({ ...initialState }),
}));
