'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BODY_REGIONS, EXERCISE_IMAGE_GROUPS, LATERALITIES, MOVEMENT_PATTERNS } from '@/lib/db-enums'
import type { BodyRegion, ExerciseImageGroup, Laterality, MovementPattern } from './exercises'

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

export type ExercisePrefill = {
  slug: string
  description_de: string
  description_en: string
  category_id: string
  movement_pattern: MovementPattern | ''
  body_region: BodyRegion | ''
  min_level: number
  max_level: number
  intensity_score: number
  exercise_type: string
  measurement_type: string
  laterality: Laterality
  image_group: ExerciseImageGroup | ''
  equipmentIds: string[]
  environmentIds: string[]
  blockTypeIds: string[]
}

// Kalibrierungs-Beispiele: bewusst über Kategorien/Intensitäten gestreut,
// damit das Modell Level/Intensity auf der bestehenden Skala verortet
const EXAMPLE_SLUGS = [
  'bench_press', 'overhead_press', 'goblet_squat', 'dumbbell_rdl', 'pogos',
  'box_jump', 'depth_jump', 'farmers_walk', 'mountain_climber', 'jefferson_curl',
  'banded_lateral_raise', 'sprint_30m',
]

export async function prefillExercise(name: string, roughDescription: string): Promise<ExercisePrefill> {
  await requireAdmin()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const [cats, eqs, envs, bts, examplesRes] = await Promise.all([
    supabase.from('categories').select('id, slug'),
    supabase.from('equipments').select('id, slug'),
    supabase.from('environments').select('id, slug'),
    supabase.from('block_types').select('id, slug'),
    supabase.from('exercises').select(`
      name, slug, body_region, movement_pattern, min_level, max_level, intensity_score,
      laterality, measurement_type, exercise_type, image_group,
      category:categories(slug), exercise_equipments(equipments(slug)),
      exercise_environments(environments(slug)), exercise_blocks(block_types(slug))
    `).in('slug', EXAMPLE_SLUGS),
  ])
  for (const r of [cats, eqs, envs, bts, examplesRes]) {
    if (r.error) throw new Error(r.error.message)
  }

  const examples = (examplesRes.data ?? []).map((e: any) => ({
    ...e,
    category: e.category?.slug ?? null,
    exercise_equipments: e.exercise_equipments.map((x: any) => x.equipments.slug),
    exercise_environments: e.exercise_environments.map((x: any) => x.environments.slug),
    exercise_blocks: e.exercise_blocks.map((x: any) => x.block_types.slug),
  }))

  const slugList = (rows: { slug: string }[] | null) => (rows ?? []).map(r => r.slug)
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['slug', 'description_de', 'description_en', 'category', 'movement_pattern', 'body_region',
      'min_level', 'max_level', 'intensity_score', 'exercise_type', 'measurement_type', 'laterality',
      'image_group', 'equipments', 'environments', 'block_types'],
    properties: {
      slug: { type: 'string', pattern: '^[a-z0-9]+(_[a-z0-9]+)*$' },
      description_de: { type: 'string' },
      description_en: { type: 'string' },
      category: { type: 'string', enum: slugList(cats.data) },
      movement_pattern: { type: 'string', enum: [...MOVEMENT_PATTERNS] },
      body_region: { type: 'string', enum: [...BODY_REGIONS] },
      min_level: { type: 'integer', minimum: 1, maximum: 100 },
      max_level: { type: 'integer', minimum: 1, maximum: 100 },
      intensity_score: { type: 'integer', minimum: 1, maximum: 10 },
      exercise_type: { type: 'string', enum: ['dynamic', 'restorative', 'breathing'] },
      measurement_type: { type: 'string', enum: ['reps', 'duration', 'distance', 'reps_or_duration'] },
      laterality: { type: 'string', enum: [...LATERALITIES] },
      image_group: { type: 'string', enum: [...EXERCISE_IMAGE_GROUPS] },
      equipments: { type: 'array', items: { type: 'string', enum: slugList(eqs.data) } },
      environments: { type: 'array', items: { type: 'string', enum: slugList(envs.data) } },
      block_types: { type: 'array', items: { type: 'string', enum: slugList(bts.data) } },
    },
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      response_format: { type: 'json_schema', json_schema: { name: 'exercise_prefill', strict: true, schema } },
      messages: [
        {
          role: 'system',
          content:
            'You classify exercises for JEMP, a sports training app for athletes. ' +
            'Given an exercise name and a rough description (German or English), produce the full catalog entry. ' +
            'Descriptions: 1-2 polished sentences each, German (description_de) and English (description_en), in the style of the examples — technique cue first, then the training effect. ' +
            'Calibrate min_level (user level 1-100 at which the exercise unlocks), max_level (usually 100, lower only for pure beginner drills) and intensity_score (1-10) against the provided examples. ' +
            'equipments: only the load-bearing equipment (convention: landmine_press lists only barbell). Empty array = bodyweight. ' +
            'environments: where it is realistically performable (gym/home/outdoor). ' +
            'block_types: primary/secondary for main stimuli, accessory for isolation/support work, warmup only for genuine warm-up drills. ' +
            `Existing examples for calibration:\n${JSON.stringify(examples)}`,
        },
        { role: 'user', content: `Name: ${name}\nBeschreibung: ${roughDescription}` },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  const p = JSON.parse(content)

  // Slugs → lokale IDs; unbekannte Werte fallen weg statt das Form zu korrumpieren
  const idBySlug = (rows: { id: string; slug: string }[] | null) =>
    new Map((rows ?? []).map(r => [r.slug, r.id]))
  const catMap = idBySlug(cats.data)
  const eqMap = idBySlug(eqs.data)
  const envMap = idBySlug(envs.data)
  const btMap = idBySlug(bts.data)

  return {
    slug: p.slug,
    description_de: p.description_de,
    description_en: p.description_en,
    category_id: catMap.get(p.category) ?? '',
    movement_pattern: p.movement_pattern,
    body_region: p.body_region,
    min_level: Math.min(100, Math.max(1, p.min_level)),
    max_level: Math.min(100, Math.max(1, p.max_level)),
    intensity_score: Math.min(10, Math.max(1, p.intensity_score)),
    exercise_type: p.exercise_type,
    measurement_type: p.measurement_type,
    laterality: p.laterality,
    image_group: p.image_group,
    equipmentIds: p.equipments.map((s: string) => eqMap.get(s)).filter(Boolean),
    environmentIds: p.environments.map((s: string) => envMap.get(s)).filter(Boolean),
    blockTypeIds: p.block_types.map((s: string) => btMap.get(s)).filter(Boolean),
  }
}
