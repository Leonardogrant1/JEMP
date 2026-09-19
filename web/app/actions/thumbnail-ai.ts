'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { asI18n } from '@/lib/i18n'

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

// Generiert per gpt-image-1 ein Thumbnail im Stil eines Referenz-Thumbnails.
// Schreibt NICHTS in den Storage — gespeichert wird erst beim Approve über den
// bestehenden Upload-Flow (getSignedUploadUrl + updateExercise).
export async function generateThumbnail(
  exerciseId: string,
  seedExerciseId: string
): Promise<{ b64: string }> {
  await requireAdmin()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const [{ data: exercise, error: exError }, { data: seed, error: seedError }] = await Promise.all([
    supabase.from('exercises').select('name, description_i18n').eq('id', exerciseId).single(),
    supabase.from('exercises').select('name, thumbnail_storage_path').eq('id', seedExerciseId).single(),
  ])
  if (exError) throw new Error(exError.message)
  if (seedError) throw new Error(seedError.message)
  if (!seed.thumbnail_storage_path) throw new Error('Seed exercise has no thumbnail')

  const { data: seedImage, error: downloadError } = await supabase.storage
    .from('exercises')
    .download(seed.thumbnail_storage_path)
  if (downloadError) throw new Error(downloadError.message)

  const description = asI18n(exercise.description_i18n).en
  const prompt =
    `Create a fitness exercise thumbnail in exactly the same visual style as the reference image: ` +
    `same character design, color palette, lighting, background and composition. ` +
    `The new thumbnail must show a different exercise: "${exercise.name}"` +
    (description ? ` — ${description}` : '')

  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('image[]', seedImage, 'seed.png')
  form.append('prompt', prompt)
  form.append('size', '1024x1024')
  form.append('quality', 'medium')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = await res.json() as { data: { b64_json: string }[] }
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI returned no image')
  return { b64 }
}
