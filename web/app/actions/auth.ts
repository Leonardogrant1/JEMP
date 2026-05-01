'use server'

import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Separate anon client for sending OTP — signInWithOtp requires anon key, not service role
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function sendAdminOtp(email: string): Promise<{ error?: string }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('email', email)
    .single()

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
