'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type SessionThumbnail = {
  image_group: string
  storage_path: string | null
}

async function requireUser() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { },
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

export async function getSessionThumbnails(): Promise<SessionThumbnail[]> {
  await requireUser()

  // All image groups actually used by exercises, plus any group that already has a thumbnail
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('image_group')
    .not('image_group', 'is', null)
  if (error) throw new Error(error.message)

  const { data: thumbs, error: thumbsError } = await supabase
    .from('session_thumbnails')
    .select('image_group, storage_path')
  if (thumbsError) throw new Error(thumbsError.message)

  const pathByGroup = new Map(thumbs.map(t => [t.image_group, t.storage_path]))
  const groups = [...new Set([
    ...exercises.map(e => e.image_group as string),
    ...thumbs.map(t => t.image_group),
  ])].sort()

  return groups.map(image_group => ({
    image_group,
    storage_path: pathByGroup.get(image_group) ?? null,
  }))
}

export async function getSessionThumbnailUploadUrl(
  imageGroup: string,
  fileType: string
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${imageGroup}-${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('session-thumbnails')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateSessionThumbnail(
  imageGroup: string,
  storage_path: string | null
): Promise<void> {
  await requireAdmin()

  const { data: old } = await supabase
    .from('session_thumbnails')
    .select('storage_path')
    .eq('image_group', imageGroup)
    .maybeSingle()

  const { error } = await supabase
    .from('session_thumbnails')
    .upsert({ image_group: imageGroup, storage_path, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)

  if (old?.storage_path && old.storage_path !== storage_path) {
    await supabase.storage.from('session-thumbnails').remove([old.storage_path])
  }
}
