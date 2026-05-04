'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Json } from '../../../database.types'

export type I18n = { en: string; de: string }

export type Equipment = {
  id: string
  slug: string
  name_i18n: Json | null
  created_at: string | null
  updated_at: string | null
}

export type Environment = {
  id: string
  slug: string
  name_i18n: Json | null
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

export async function getEquipments(): Promise<Equipment[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('equipments')
    .select('id, slug, name_i18n, created_at, updated_at')
    .order('slug')
  if (error) throw new Error(error.message)
  return data
}

export async function getEquipment(id: string): Promise<Equipment & { environmentIds: string[] }> {
  await requireUser()
  const { data, error } = await supabase
    .from('equipments')
    .select('id, slug, name_i18n, created_at, updated_at, environment_equipments(environment_id)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { environment_equipments, ...equipment } = data as Equipment & { environment_equipments: { environment_id: string }[] }
  return {
    ...equipment,
    environmentIds: environment_equipments.map((e: { environment_id: string }) => e.environment_id),
  }
}

export async function getEnvironments(): Promise<Environment[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('environments')
    .select('id, slug, name_i18n')
    .order('slug')
  if (error) throw new Error(error.message)
  return data;
}

export async function createEquipment(fields: {
  slug: string
  name_i18n: I18n
  environmentIds: string[]
}): Promise<string> {
  await requireAdmin()
  const { data, error } = await supabase
    .from('equipments')
    .insert({ slug: fields.slug, name_i18n: fields.name_i18n })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  if (fields.environmentIds.length > 0) {
    const links = fields.environmentIds.map(eid => ({ equipment_id: data.id, environment_id: eid }))
    const { error: linkError } = await supabase.from('environment_equipments').insert(links)
    if (linkError) throw new Error(linkError.message)
  }
  return data.id
}

export async function updateEquipment(id: string, fields: {
  slug: string
  name_i18n: I18n
  environmentIds: string[]
}): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from('equipments')
    .update({ slug: fields.slug, name_i18n: fields.name_i18n, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  // Reset environment links
  await supabase.from('environment_equipments').delete().eq('equipment_id', id)
  if (fields.environmentIds.length > 0) {
    const links = fields.environmentIds.map(eid => ({ equipment_id: id, environment_id: eid }))
    const { error: linkError } = await supabase.from('environment_equipments').insert(links)
    if (linkError) throw new Error(linkError.message)
  }
}
