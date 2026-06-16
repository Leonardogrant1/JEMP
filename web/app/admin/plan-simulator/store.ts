import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeeklySchedule, SportSessionType, LoadProfile } from '@/types/user-data'

// ─── Types ────────────────────────────────────────────────────

export type Gender = 'male' | 'female'

export type FocusCategory = {
  category_slug: string
  priority: number
}

export type CategoryLevel = {
  category_id: string
  level_score: number
}

export type DayEnvironment = {
  day_of_week: number
  environment_id: string
}

export type UserData = {
  gender: Gender
  age: number
  height_cm: number
  weight_kg: number
  sport: string
  preferred_workout_days: number[]
  min_session_duration: number
  max_session_duration: number
  weekly_schedule: WeeklySchedule
  environment_ids: string[]
  equipment_ids: string[]
  focus_categories: FocusCategory[]
  category_levels: CategoryLevel[]
  day_environments: DayEnvironment[]
}

export type { WeeklySchedule, SportSessionType, LoadProfile }

type PlanSimulatorStore = {
  userData: UserData
  plan: unknown

  updateUserData: (patch: Partial<UserData>) => void
  updatePlan: (plan: unknown) => void
  reset: () => void
}

// ─── Defaults ─────────────────────────────────────────────────

const DEFAULT_USER_DATA: UserData = {
  gender: 'male',
  age: 22,
  height_cm: 180,
  weight_kg: 75,
  sport: 'soccer',
  preferred_workout_days: [1, 3, 5],
  min_session_duration: 45,
  max_session_duration: 90,
  weekly_schedule: { sessions: [], notes: null },
  environment_ids: [],
  equipment_ids: [],
  focus_categories: [],
  category_levels: [],
  day_environments: [],
}

// ─── Store ────────────────────────────────────────────────────

export const usePlanSimulatorStore = create<PlanSimulatorStore>()(
  persist(
    (set) => ({
      userData: DEFAULT_USER_DATA,
      plan: null,

      updateUserData(patch) {
        set(state => ({ userData: { ...state.userData, ...patch } }))
      },

      updatePlan(plan) {
        set({ plan })
      },

      reset() {
        set({ userData: DEFAULT_USER_DATA, plan: null })
      },
    }),
    {
      name: 'plan-simulator',
      partialize: state => ({ userData: state.userData, plan: state.plan }),
    },
  ),
)
