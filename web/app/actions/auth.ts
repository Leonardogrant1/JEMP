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
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) return { error: listError.message }

  const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) {
    return { error: 'No admin account found for this email.' }
  }

  // Check role via user ID — service role bypasses RLS
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', authUser.id)
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
