export type Gender = 'male' | 'female' | 'other';

export type SessionDuration = '30min' | '45min' | '60min' | '90min';

export type UserProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  gender: Gender | null
  sport_id: string | null
  sport?: { id: string; slug: string } | null
  height_in_cm: number | null
  weight_in_kg: number | null
  preferred_workout_days: number[]
  preferred_session_duration: SessionDuration | null
  schedule_notes: string | null
  preferred_language: 'en' | 'de' | null
  timezone: string | null
  has_onboarded: boolean
  created_at: string
  updated_at: string
  last_active_at: string
}
