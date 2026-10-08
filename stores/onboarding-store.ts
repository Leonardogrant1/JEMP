import { create } from 'zustand';
import { Gender, SessionDuration, UserProfile } from '@/types/database';
import type { PillarLevel } from '@/lib/pillar-budget';
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
    | 'unit_system'
    | 'sprints_covered_by_club'
    | 'sprint_distance'
    | 'preferred_day_durations'
>;

export type TargetedCategory = {
    categoryId: string;
    slug: string;
    priority: number;
};

export type CategoryLevel = {
    categoryId: string;
    // Nur fürs Tracking (PostHog) — Persistenz läuft weiter über categoryId
    slug?: string;
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
    pillarLevels: PillarLevel[];
    sprintClubAnswered: boolean;
    categoryLevels: CategoryLevel[];
    equipmentIds: string[];
    // Explizit ABGEWÄHLTES Equipment — Quelle der Wahrheit beim Re-Mount des
    // Equipment-Steps: equipmentIds wird aus (Items der aktuellen Environments
    // − deselectedEquipmentIds) neu abgeleitet. Würde stattdessen die Auswahl
    // persistiert, wären nach einem Environment-Wechsel alle Geräte des neuen
    // Environments deselektiert (Prod-Bug: Gym-User ohne Hanteln).
    deselectedEquipmentIds: string[];
    environmentIds: string[];
    // Nur fürs Tracking (PostHog) — Persistenz läuft weiter über environmentIds
    environmentSlugs: string[];
    equipmentEnvironments: EquipmentEnvironment[];
    dayEnvironments: DayEnvironment[];
    weekly_schedule: WeeklySchedule;
    referral_code: string | null;
    // Nur fürs Tracking (PostHog) — wird nicht ins Profil geschrieben
    attribution_source: string | null;
    name_source: 'apple' | 'google' | null;
    set: (data: Partial<ProfileData & {
        sport_slug: string | null;
        targetedCategories: TargetedCategory[];
        pillarLevels: PillarLevel[];
        sprintClubAnswered: boolean;
        categoryLevels: CategoryLevel[];
        equipmentIds: string[];
        deselectedEquipmentIds: string[];
        environmentIds: string[];
        environmentSlugs: string[];
        equipmentEnvironments: EquipmentEnvironment[];
        dayEnvironments: DayEnvironment[];
        weekly_schedule: WeeklySchedule;
        referral_code: string | null;
        attribution_source: string | null;
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
    sprints_covered_by_club: false,
    sprint_distance: null,
    preferred_day_durations: null,
    sport_slug: null,
    height_in_cm: null,
    weight_in_kg: null,
    preferred_workout_days: [],
    preferred_session_duration: null,
    schedule_notes: null,
    timezone: null,
    unit_system: 'metric',
    targetedCategories: [],
    pillarLevels: [],
    sprintClubAnswered: false,
    categoryLevels: [],
    equipmentIds: [],
    deselectedEquipmentIds: [],
    environmentIds: [],
    environmentSlugs: [],
    equipmentEnvironments: [],
    dayEnvironments: [],
    weekly_schedule: { sessions: [], notes: null },
    referral_code: null,
    attribution_source: null,
    name_source: null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    ...initialState,
    set: (data) => set((state) => ({ ...state, ...data })),
    reset: () => set({ ...initialState }),
}));
