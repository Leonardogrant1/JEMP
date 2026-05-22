'use server'

import { supabase } from '@/lib/supabase';

export type SportOption = { id: string; slug: string; name: string }
export type EnvironmentOption = { id: string; slug: string; name: string }
export type EquipmentOption = { id: string; slug: string; name: string; environment_ids: string[] }
export type CategoryOption = { id: string; slug: string; name: string }

export type SimulatorRefData = {
  sports: SportOption[]
  environments: EnvironmentOption[]
  equipments: EquipmentOption[]
  categories: CategoryOption[]
}

function label(name_i18n: unknown, slug: string): string {
  if (name_i18n && typeof name_i18n === 'object') {
    const n = name_i18n as Record<string, string>
    return n.de ?? n.en ?? slug
  }
  return slug
}

export async function getSimulatorRefData(): Promise<SimulatorRefData> {
  const [
    { data: sports },
    { data: environments },
    { data: equipments },
    { data: categories },
  ] = await Promise.all([
    supabase.from('sports').select('id, slug, name_i18n').order('slug'),
    supabase.from('environments').select('id, slug, name_i18n').order('slug'),
    supabase.from('equipments').select('id, slug, name_i18n, environment_equipments(environment_id)').order('slug'),
    supabase.from('categories').select('id, slug, name_i18n').order('slug'),
  ])

  console.log('getSimulatorRefData', sports?.length, environments?.length, equipments?.length, categories?.length)

  return {
    sports: (sports ?? []).map(s => ({ id: s.id, slug: s.slug, name: label(s.name_i18n, s.slug) })),
    environments: (environments ?? []).map(e => ({ id: e.id, slug: e.slug, name: label(e.name_i18n, e.slug) })),
    equipments: (equipments ?? []).map(e => ({
      id: e.id,
      slug: e.slug,
      name: label(e.name_i18n, e.slug),
      environment_ids: (e.environment_equipments as any[]).map((r: any) => r.environment_id),
    })),
    categories: (categories ?? []).map(c => ({ id: c.id, slug: c.slug, name: label(c.name_i18n, c.slug) })),
  }
}
