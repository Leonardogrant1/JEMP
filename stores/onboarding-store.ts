import { create } from 'zustand';
import { Gender, SessionDuration, UserProfile } from '@/types/database';

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

type OnboardingStore = ProfileData & {
    targetedCategories: TargetedCategory[];
    categoryLevels: CategoryLevel[];
    equipmentIds: string[];
    environmentIds: string[]; // temporary, not written to DB
    set: (data: Partial<ProfileData & {
        targetedCategories: TargetedCategory[];
        categoryLevels: CategoryLevel[];
        equipmentIds: string[];
        environmentIds: string[];
    }>) => void;
    reset: () => void;
};

const initialState: Omit<OnboardingStore, 'set' | 'reset'> = {
    first_name: null,
    last_name: null,
    birth_date: null,
    gender: null,
    sport_id: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    timezone: null,
    targetedCategories: [],
    categoryLevels: [],
    equipmentIds: [],
    environmentIds: [],
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    ...initialState,
    set: (data) => set((state) => ({ ...state, ...data })),
    reset: () => set({ ...initialState }),
}));
