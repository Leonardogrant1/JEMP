'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Json } from '../../../database.types'

export type I18n = { en: string; de: string }

export type Assessment = {
  id: string
  slug: string
  name: string
  name_i18n: Json | null
  description_i18n: Json | null
  category_id: string | null
  measured_metric_id: string | null
  min_level: number | null
  max_level: number | null
  created_at: string | null
  updated_at: string | null
}

export type AssessmentWithRelations = Assessment & {
  category_slug: string
  metric_slug: string
  metric_unit: string
  equipmentIds: (string | null)[]
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

export async function getAssessments(): Promise<AssessmentWithRelations[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id, slug, name, name_i18n, description_i18n, category_id, measured_metric_id, min_level, max_level, created_at, updated_at,
      categories(slug),
      metrics(slug, unit)
    `)
    .order('slug')
  if (error) throw new Error(error.message)
  return (data as unknown[]).map((row: unknown) => {
    const r = row as Assessment & { categories: { slug: string } | null; metrics: { slug: string; unit: string } | null }
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      name_i18n: r.name_i18n,
      description_i18n: r.description_i18n,
      category_id: r.category_id,
      measured_metric_id: r.measured_metric_id,
      min_level: r.min_level,
      max_level: r.max_level,
      created_at: r.created_at,
      updated_at: r.updated_at,
      category_slug: r.categories?.slug ?? '',
      metric_slug: r.metrics?.slug ?? '',
      metric_unit: r.metrics?.unit ?? '',
      equipmentIds: [],
    }
  })
}

export async function getAssessment(id: string): Promise<AssessmentWithRelations> {
  await requireUser()
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id, slug, name, name_i18n, description_i18n, category_id, measured_metric_id, min_level, max_level, created_at, updated_at,
      categories(slug),
      metrics(slug, unit),
      assessment_equipments(equipment_id)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const r = data 
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    name_i18n: r.name_i18n,
    description_i18n: r.description_i18n,
    category_id: r.category_id,
    measured_metric_id: r.measured_metric_id,
    min_level: r.min_level,
    max_level: r.max_level,
    created_at: r.created_at,
    updated_at: r.updated_at,
    category_slug: r.categories?.slug ?? '',
    metric_slug: r.metrics?.slug ?? '',
    metric_unit: r.metrics?.unit ?? '',
    equipmentIds: r.assessment_equipments.map(e => e.equipment_id),
  }
}

export async function createAssessment(fields: {
  slug: string
  name: string
  name_i18n: I18n
  description_i18n: I18n
  category_id: string
  measured_metric_id: string
  min_level: number
  max_level: number
  equipmentIds: string[]
}): Promise<string> {
  await requireAdmin()
  const { equipmentIds, ...rest } = fields
  const { data, error } = await supabase
    .from('assessments')
    .insert(rest)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  if (equipmentIds.length > 0) {
    const links = equipmentIds.map(eid => ({ assessment_id: data.id, equipment_id: eid }))
    const { error: linkError } = await supabase.from('assessment_equipments').insert(links)
    if (linkError) throw new Error(linkError.message)
  }
  return data.id
}

export async function updateAssessment(id: string, fields: {
  slug: string
  name: string
  name_i18n: I18n
  description_i18n: I18n
  category_id: string
  measured_metric_id: string
  min_level: number
  max_level: number
  equipmentIds: string[]
}): Promise<void> {
  await requireAdmin()
  const { equipmentIds, ...rest } = fields
  const { error } = await supabase
    .from('assessments')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await supabase.from('assessment_equipments').delete().eq('assessment_id', id)
  if (equipmentIds.length > 0) {
    const links = equipmentIds.map(eid => ({ assessment_id: id, equipment_id: eid }))
    const { error: linkError } = await supabase.from('assessment_equipments').insert(links)
    if (linkError) throw new Error(linkError.message)
  }
}
