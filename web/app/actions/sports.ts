'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Json } from '../../../database.types'

export type Sport = {
  id: string
  slug: string
  name_i18n: Json | null
  banner_storage_path: string | null
  animation_storage_path: string | null
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

export type SportGroup = {
  group_name: string
  banner_storage_path: string | null
  animation_storage_path: string | null
}

export async function getSports(): Promise<Sport[]> {
  await requireUser()
  const { data, error } = await supabase
    .from('sports')
    .select('id, slug, name_i18n, banner_storage_path, animation_storage_path')
    .order('slug')
  if (error) throw new Error(error.message)
  return data
}

export async function getSportGroups(): Promise<SportGroup[]> {
  await requireUser()
  const { data: sports, error } = await supabase
    .from('sports')
    .select('group_name')
    .order('group_name')
  if (error) throw new Error(error.message)

  const { data: banners, error: bannersError } = await supabase
    .from('sport_group_banners')
    .select('group_name, banner_storage_path')
  if (bannersError) throw new Error(bannersError.message)

  const { data: animations, error: animationsError } = await supabase
    .from('sport_group_animations')
    .select('group_name, animation_storage_path')
  if (animationsError) throw new Error(animationsError.message)

  const bannerByGroup = new Map(banners.map(b => [b.group_name, b.banner_storage_path]))
  const animationByGroup = new Map(animations.map(a => [a.group_name, a.animation_storage_path]))
  const groups = [...new Set(sports.map(s => s.group_name))]
  return groups.map(group_name => ({
    group_name,
    banner_storage_path: bannerByGroup.get(group_name) ?? null,
    animation_storage_path: animationByGroup.get(group_name) ?? null,
  }))
}

export async function getSportBannerUploadUrl(
  sportId: string,
  fileType: string
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg'
  // Timestamped path so a new upload gets a fresh URL (no stale CDN/app caches)
  const path = `banners/${sportId}-${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('sport-banners')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateSportBanner(
  id: string,
  banner_storage_path: string | null
): Promise<void> {
  await requireAdmin()

  const { data: old } = await supabase
    .from('sports')
    .select('banner_storage_path')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('sports')
    .update({ banner_storage_path })
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (old?.banner_storage_path && old.banner_storage_path !== banner_storage_path) {
    await supabase.storage.from('sport-banners').remove([old.banner_storage_path])
  }
}

export async function getSportGroupBannerUploadUrl(
  groupName: string,
  fileType: string
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg'
  const path = `groups/${groupName}-${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('sport-banners')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateSportGroupBanner(
  groupName: string,
  banner_storage_path: string | null
): Promise<void> {
  await requireAdmin()

  const { data: old } = await supabase
    .from('sport_group_banners')
    .select('banner_storage_path')
    .eq('group_name', groupName)
    .maybeSingle()

  const { error } = await supabase
    .from('sport_group_banners')
    .upsert({ group_name: groupName, banner_storage_path, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)

  if (old?.banner_storage_path && old.banner_storage_path !== banner_storage_path) {
    await supabase.storage.from('sport-banners').remove([old.banner_storage_path])
  }
}

// ── Training-day Lottie animations (same pattern as banners) ──────────────

export async function getSportAnimationUploadUrl(
  sportId: string
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  // Timestamped path so a new upload gets a fresh URL (no stale CDN/app caches)
  const path = `animations/${sportId}-${Date.now()}.json`
  const { data, error } = await supabase.storage
    .from('sport-animations')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateSportAnimation(
  id: string,
  animation_storage_path: string | null
): Promise<void> {
  await requireAdmin()

  const { data: old } = await supabase
    .from('sports')
    .select('animation_storage_path')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('sports')
    .update({ animation_storage_path })
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (old?.animation_storage_path && old.animation_storage_path !== animation_storage_path) {
    await supabase.storage.from('sport-animations').remove([old.animation_storage_path])
  }
}

export async function getSportGroupAnimationUploadUrl(
  groupName: string
): Promise<{ signedUrl: string; path: string }> {
  await requireAdmin()

  const path = `groups/${groupName}-${Date.now()}.json`
  const { data, error } = await supabase.storage
    .from('sport-animations')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateSportGroupAnimation(
  groupName: string,
  animation_storage_path: string | null
): Promise<void> {
  await requireAdmin()

  const { data: old } = await supabase
    .from('sport_group_animations')
    .select('animation_storage_path')
    .eq('group_name', groupName)
    .maybeSingle()

  const { error } = await supabase
    .from('sport_group_animations')
    .upsert({ group_name: groupName, animation_storage_path, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)

  if (old?.animation_storage_path && old.animation_storage_path !== animation_storage_path) {
    await supabase.storage.from('sport-animations').remove([old.animation_storage_path])
  }
}
