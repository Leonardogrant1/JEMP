'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export type Exercise = {
  id: string
  name: string
  slug: string
  youtube_url: string | null
  thumbnail_storage_path: string | null
  video_storage_path: string | null
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

export async function getExercises(): Promise<Exercise[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, youtube_url, thumbnail_storage_path, video_storage_path')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function getExercise(id: string): Promise<Exercise> {
  await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, youtube_url, thumbnail_storage_path, video_storage_path')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
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
    youtube_url?: string
    thumbnail_storage_path?: string
    video_storage_path?: string
  }
): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from('exercises')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
