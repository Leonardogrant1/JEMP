import { create } from 'zustand';
import { UserProfile } from '@/types/database';

type OnboardingData = Pick<
    UserProfile,
    | 'first_name'
    | 'last_name'
    | 'birth_date'
    | 'gender'
    | 'sports_category'
    | 'height_in_cm'
    | 'weight_in_kg'
    | 'preferred_workout_days'
    | 'preferred_session_duration'
    | 'timezone'
>;

type OnboardingStore = OnboardingData & {
    set: (data: Partial<OnboardingData>) => void;
    reset: () => void;
};

const initialState: OnboardingData = {
    first_name: null,
    last_name: null,
    birth_date: null,
    gender: null,
    sports_category: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    timezone: null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    ...initialState,
    set: (data) => set((state) => ({ ...state, ...data })),
    reset: () => set(initialState),
}));
