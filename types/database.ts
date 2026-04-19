export type UserProfile = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    birth_date: string | null
    gender: 'male' | 'female' | 'other' | null
    sports_category: 'combat_sports' | 'team_sports' | 'individual_sports' | 'endurance_sports' | 'other' | null
    height_in_cm: number | null
    weight_in_kg: number | null
    preferred_workout_days: number[]
    preferred_session_duration: '30min' | '45min' | '60min' | '90min' | null
    timezone: string | null
    has_onboarded: boolean
    has_seen_tutorial: boolean
    created_at: string
    updated_at: string
    last_active_at: string
}
