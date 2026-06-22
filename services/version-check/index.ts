import { Platform } from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? ''

export const COOLDOWN_STORAGE_KEY = 'version_check_last_dialog'
export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export function parseSemver(v: string): [number, number, number] | null {
  const parts = v.split('.').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null
  return [parts[0], parts[1], parts[2]]
}

export function compareVersions(
  local: string,
  store: string,
): 'major' | 'minor' | 'patch' | 'equal' {
  const l = parseSemver(local)
  const s = parseSemver(store)
  if (!l || !s) return 'equal'
  if (s[0] > l[0]) return 'major'
  if (s[0] < l[0]) return 'equal'
  if (s[1] > l[1]) return 'minor'
  if (s[1] < l[1]) return 'equal'
  if (s[2] > l[2]) return 'patch'
  return 'equal'
}

export async function fetchStoreVersion(): Promise<{ version: string; releaseNotes: string }> {
  const endpoint = Platform.OS === 'ios' ? '/store-info/ios' : '/store-info/android'
  const res = await fetch(`${API_URL}${endpoint}`)
  if (!res.ok) throw new Error(`Store info fetch failed: ${res.status}`)
  return res.json() as Promise<{ version: string; releaseNotes: string }>
}

export async function fetchVersionCheck(
  localVersion: string,
): Promise<{ updateRequired: boolean }> {
  const res = await fetch(`${API_URL}/version-check?version=${localVersion}`)
  if (!res.ok) throw new Error(`Version check failed: ${res.status}`)
  return res.json() as Promise<{ updateRequired: boolean }>
}
