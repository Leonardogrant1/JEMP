'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Json } from '../../../database.types'
export type { MetricUnit } from '@/lib/metric-units'
import type { MetricUnit } from '@/lib/metric-units'

export type Metric = {  
  id: string
  slug: string
  unit: MetricUnit
  higher_is_better: boolean
  name_i18n: Json | null
  created_at: string | null
  updated_at: string | null
}

async function requireUser() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

async function requireAdmin() {
  const user = await requireUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user
}

export async function getMetrics(): Promise<Metric[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('metrics')
    .select('id, slug, unit, higher_is_better, name_i18n, created_at, updated_at')
    .order('slug')
  if (error) throw new Error(error.message)
  return data
}

export async function getMetric(id: string): Promise<Metric> {
  await requireUser()
  const { data, error } = await supabase
    .from('metrics')
    .select('id, slug, unit, higher_is_better, name_i18n, created_at, updated_at')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createMetric(fields: {
  slug: string
  unit: MetricUnit
  higher_is_better: boolean
  name_i18n: Json
}): Promise<string> {
  await requireAdmin()
  const { data, error } = await supabase
    .from('metrics')
    .insert(fields)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function updateMetric(id: string, fields: {
  slug: string
  unit: MetricUnit
  higher_is_better: boolean
  name_i18n: Json
}): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from('metrics')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
