'use server'

import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Separate anon client for sending OTP — signInWithOtp requires anon key, not service role
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function sendAdminOtp(email: string): Promise<{ error?: string }> {
  // Look up user in auth.users via admin API — no RLS, case-insensitive
  const { data: profile, error: listError } = await supabase.from('user_profiles').select('id, role').eq('email', email.toLowerCase()).single()

  if (listError && listError.code != "PGRST116") return { error: listError.message }

  const authUser = profile?.role == 'admin'
  if (!authUser) {
    return { error: 'No admin account found for this email.' }
  }

  if (!profile || profile.role !== 'admin') {
    return { error: 'No admin account found for this email.' }
  }

  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  if (error) return { error: error.message }
  return {}
}
