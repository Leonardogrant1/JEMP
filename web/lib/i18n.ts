import type { Json } from '../../database.types'

export type I18n = { en: string; de: string }

/**
 * Safely converts a Supabase Json field (JSONB) to a typed { en, de } object.
 * Returns { en: '', de: '' } if the value is null or not the expected shape.
 */
export function asI18n(json: Json | null | undefined): I18n {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { en: '', de: '' }
  }
  const obj = json as Record<string, Json>
  return {
    en: typeof obj.en === 'string' ? obj.en : '',
    de: typeof obj.de === 'string' ? obj.de : '',
  }
}
