'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database, Json } from '../../../database.types'

export type BodyRegion = Database['public']['Enums']['body_region']
export type MovementPattern = Database['public']['Enums']['movement_pattern']

export type ExerciseListItem = {
  id: string
  name: string
  slug: string
  youtube_url: string | null
  thumbnail_storage_path: string | null
  video_storage_path: string | null
}

export type Exercise = ExerciseListItem & {
  description_i18n: { en: string; de: string } | null
  movement_pattern: MovementPattern | null
  body_region: BodyRegion | null
  category_id: string | null
  min_level: number | null
  max_level: number | null
  is_unilateral: boolean
  measurement_type: string
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

export async function getExercises(): Promise<ExerciseListItem[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, youtube_url, thumbnail_storage_path, video_storage_path')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function getExercise(id: string): Promise<Exercise & { equipmentIds: string[]; environmentIds: string[] }> {
  await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      id, name, slug, description_i18n, movement_pattern, body_region, category_id, min_level, max_level, is_unilateral, measurement_type,
      youtube_url, thumbnail_storage_path, video_storage_path,
      exercise_equipments(equipment_id),
      exercise_environments(environment_id)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { exercise_equipments, exercise_environments, ...exercise } = data as Exercise & {
    exercise_equipments: { equipment_id: string }[]
    exercise_environments: { environment_id: string }[]
  }
  return {
    ...exercise,
    equipmentIds: exercise_equipments.map(e => e.equipment_id),
    environmentIds: exercise_environments.map(e => e.environment_id),
  }
}

export async function getSignedUploadUrl(
  exerciseId: string,
  fileType: 'thumbnail' | 'video'
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  const ext = fileType === 'thumbnail' ? 'jpg' : 'mp4'
  const path = `${fileType}s/${exerciseId}.${ext}`

  const { data, error } = await supabase.storage
    .from('exercises')
    .createSignedUploadUrl(path, { upsert: true })

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateExercise(
  id: string,
  fields: {
    name?: string
    slug?: string
    description_i18n?: Json
    movement_pattern?: MovementPattern | null
    body_region?: BodyRegion | null
    category_id?: string | null
    min_level?: number | undefined
    max_level?: number | undefined
    is_unilateral?: boolean
    measurement_type?: string
    youtube_url?: string | null
    thumbnail_storage_path?: string | null
    video_storage_path?: string | null
    equipmentIds?: string[]
    environmentIds?: string[]
  }
): Promise<void> {
  await requireAdmin()
  const { equipmentIds, environmentIds, ...dbFields } = fields
  if (Object.keys(dbFields).length > 0) {
    const { error } = await supabase
      .from('exercises')
      .update({ ...dbFields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
  if (equipmentIds !== undefined) {
    await supabase.from('exercise_equipments').delete().eq('exercise_id', id)
    if (equipmentIds.length > 0) {
      const links = equipmentIds.map(eid => ({ exercise_id: id, equipment_id: eid }))
      const { error } = await supabase.from('exercise_equipments').insert(links)
      if (error) throw new Error(error.message)
    }
  }
  if (environmentIds !== undefined) {
    await supabase.from('exercise_environments').delete().eq('exercise_id', id)
    if (environmentIds.length > 0) {
      const links = environmentIds.map(eid => ({ exercise_id: id, environment_id: eid }))
      const { error } = await supabase.from('exercise_environments').insert(links)
      if (error) throw new Error(error.message)
    }
  }
}

export async function createExercise(fields: {
  name: string
  slug: string
  category_id?: string | null
  description_i18n?: Json
  movement_pattern?: MovementPattern | null
  body_region?: BodyRegion | null
  min_level?: number
  max_level?: number
  is_unilateral?: boolean
  measurement_type?: string
  equipmentIds?: string[]
  environmentIds?: string[]
  youtube_url?: string | null
}): Promise<string> {
  await requireAdmin()
  const { equipmentIds, environmentIds, min_level, max_level, ...dbFields } = fields
  const insertRow = {
    ...dbFields,
    category_id: dbFields.category_id ?? null,
    min_level: min_level ?? 1,
    max_level: max_level ?? 100,
  }
  const { data, error } = await supabase
    .from('exercises')
    .insert(insertRow)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const id = data.id
  if (equipmentIds && equipmentIds.length > 0) {
    const links = equipmentIds.map(eid => ({ exercise_id: id, equipment_id: eid }))
    const { error: eqErr } = await supabase.from('exercise_equipments').insert(links)
    if (eqErr) throw new Error(eqErr.message)
  }
  if (environmentIds && environmentIds.length > 0) {
    const links = environmentIds.map(eid => ({ exercise_id: id, environment_id: eid }))
    const { error: envErr } = await supabase.from('exercise_environments').insert(links)
    if (envErr) throw new Error(envErr.message)
  }
  return id
}

export async function deleteExercise(id: string): Promise<void> {
  await requireAdmin()
  // Junction tables have ON DELETE CASCADE, but delete explicitly to be safe
  await supabase.from('exercise_equipments').delete().eq('exercise_id', id)
  await supabase.from('exercise_environments').delete().eq('exercise_id', id)
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getExerciseRelations(): Promise<{
  categories: { id: string; slug: string; name_i18n: Json | null }[]
  equipments: { id: string; slug: string; name_i18n: Json | null }[]
  environments: { id: string; slug: string; name_i18n: Json | null }[]
}> {
  await requireUser()
  const [catResult, eqResult, envResult] = await Promise.all([
    supabase.from('categories').select('id, slug, name_i18n').order('slug'),
    supabase.from('equipments').select('id, slug, name_i18n').order('slug'),
    supabase.from('environments').select('id, slug, name_i18n').order('slug'),
  ])
  if (catResult.error) throw new Error(catResult.error.message)
  if (eqResult.error) throw new Error(eqResult.error.message)
  if (envResult.error) throw new Error(envResult.error.message)
  return {
    categories: catResult.data,
    equipments: eqResult.data,
    environments: envResult.data,
  }
}
