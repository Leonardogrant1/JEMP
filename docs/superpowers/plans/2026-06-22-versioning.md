# Versioning & Update-Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prüft beim App-Start und Resume ob eine neue Store-Version vorliegt (minor → Dialog, major → Sperr-Screen) und ob das Backend die App-Version noch unterstützt (nein → Wartungs-Sperr-Screen).

**Architecture:** Ein `VersionCheckProvider` sitzt ganz oben im Provider-Stack (vor `AuthProvider`), führt beide Checks parallel via `Promise.allSettled` aus, und rendert je nach Status einen Sperr-Screen, einen dismissbaren Dialog, oder transparent `children`. Die jemp-api bekommt einen neuen `/version-check`-Endpunkt sowie In-Memory-Caching für die Store-Info-Routen.

**Tech Stack:** Expo Router, `expo-application`, `@react-native-async-storage/async-storage`, `expo-linear-gradient`, `@expo/vector-icons`, Express (jemp-api)

## Global Constraints

- `JempText` Prop heißt `type` (nicht `variant`) — Werte: `'hero' | 'h1' | 'h2' | 'body-l' | 'body-sm' | 'caption' | 'button'`
- Theme via `import { Colors, GRADIENT } from '@/constants/theme'` und `useColorScheme` via `import { useColorScheme } from '@/hooks/use-color-scheme'`
- `GRADIENT = ['#14b8a6', '#3b82f6']` (Cyan[500] → Electric[500])
- Alle App-Imports verwenden `@/`-Alias
- Backend: jemp-api unter `externals/jemp-api/`, Routen werden in `src/index.ts` direkt auf dem `app`-Objekt registriert
- Silent fail bei API-Fehlern — App läuft immer weiter wenn Checks scheitern
- `MIN_SUPPORTED_VERSION` in `externals/jemp-api/src/config/version-config.ts` manuell pflegen bei Breaking Changes

---

## File Map

**Neu (jemp-api):**
- `externals/jemp-api/src/store-info-route/cache.ts` — In-Memory-Cache Utility (getCached, setCached)
- `externals/jemp-api/src/config/version-config.ts` — MIN_SUPPORTED_VERSION Konstante
- `externals/jemp-api/src/routes/version-check-route.ts` — GET /version-check Handler

**Modifiziert (jemp-api):**
- `externals/jemp-api/src/index.ts` — store-info und version-check Routen registrieren
- `externals/jemp-api/src/store-info-route/index.ts` — Cache einbauen

**Neu (App):**
- `constants/store-urls.ts` — App Store / Play Store URLs
- `services/version-check/index.ts` — parseSemver, compareVersions, fetchStoreVersion, fetchVersionCheck
- `services/version-check/__tests__/index.test.ts` — Unit Tests
- `components/version/force-update-screen.tsx` — Major-Sperr-Screen
- `components/version/backend-maintenance-screen.tsx` — Wartungs-Sperr-Screen
- `components/version/update-dialog.tsx` — Minor/Patch-Dialog
- `providers/version-check-provider.tsx` — State Machine + Lifecycle

**Modifiziert (App):**
- `app/_layout.tsx` — VersionCheckProvider einbauen
- `.env` — EXPO_PUBLIC_API_URL hinzufügen

---

## Task 1: Backend — Cache Utility

**Files:**
- Create: `externals/jemp-api/src/store-info-route/cache.ts`

**Interfaces:**
- Produces: `getCached<T>(key: string): T | null`, `setCached<T>(key: string, data: T, ttlMs: number): void`

- [ ] **Step 1: Cache-Datei erstellen**

```ts
// externals/jemp-api/src/store-info-route/cache.ts

type CacheEntry<T> = { data: T; expiresAt: number }

const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd externals/jemp-api && npx tsc --noEmit
```
Expected: kein Output (kein Fehler)

- [ ] **Step 3: Commit**

```bash
git add externals/jemp-api/src/store-info-route/cache.ts
git commit -m "feat(api): add in-memory cache utility for store-info routes"
```

---

## Task 2: Backend — Version Config + Version-Check Route

**Files:**
- Create: `externals/jemp-api/src/config/version-config.ts`
- Create: `externals/jemp-api/src/routes/version-check-route.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `GET /version-check?version=<semver>` → `{ updateRequired: boolean }`

- [ ] **Step 1: version-config.ts erstellen**

```ts
// externals/jemp-api/src/config/version-config.ts

/**
 * Minimum App-Version die dieses Backend noch unterstützt.
 * Erhöhen bei Breaking API Changes → alle älteren Apps werden gesperrt.
 */
export const MIN_SUPPORTED_VERSION = '1.0.0'
```

- [ ] **Step 2: version-check-route.ts erstellen**

```ts
// externals/jemp-api/src/routes/version-check-route.ts

import { Request, Response } from 'express'
import { MIN_SUPPORTED_VERSION } from '../config/version-config'

function parseSemver(v: string): [number, number, number] | null {
  const parts = v.split('.').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null
  return [parts[0], parts[1], parts[2]]
}

function isVersionSupported(version: string): boolean {
  const app = parseSemver(version)
  const min = parseSemver(MIN_SUPPORTED_VERSION)
  // Bei Parse-Fehler: fail open — App nicht sperren
  if (!app || !min) return true
  if (app[0] !== min[0]) return app[0] > min[0]
  if (app[1] !== min[1]) return app[1] > min[1]
  return app[2] >= min[2]
}

export function versionCheckHandler(req: Request, res: Response): void {
  const version = req.query.version as string | undefined
  if (!version) {
    res.status(400).json({ error: 'version query param required' })
    return
  }
  res.json({ updateRequired: !isVersionSupported(version) })
}
```

- [ ] **Step 3: Route in src/index.ts registrieren**

In `externals/jemp-api/src/index.ts` nach dem `/health`-Endpunkt einfügen:

```ts
// Am Anfang der Datei hinzufügen:
import { versionCheckHandler } from './routes/version-check-route'

// Nach dem health check:
app.get('/version-check', versionCheckHandler)
```

- [ ] **Step 4: TypeScript-Check**

```bash
cd externals/jemp-api && npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 5: Manuell testen** (Server muss laufen)

```bash
# Terminal 1: Server starten
cd externals/jemp-api && npm run dev

# Terminal 2: Requests absetzen
curl "http://localhost:3001/version-check?version=1.0.0"
# Expected: {"updateRequired":false}

curl "http://localhost:3001/version-check?version=0.9.0"
# Expected: {"updateRequired":true}

curl "http://localhost:3001/version-check"
# Expected: {"error":"version query param required"} mit Status 400
```

- [ ] **Step 6: Commit**

```bash
git add externals/jemp-api/src/config/version-config.ts \
        externals/jemp-api/src/routes/version-check-route.ts \
        externals/jemp-api/src/index.ts
git commit -m "feat(api): add /version-check endpoint with min supported version config"
```

---

## Task 3: Backend — Caching in Store-Info Route

**Files:**
- Modify: `externals/jemp-api/src/store-info-route/index.ts`

**Interfaces:**
- Consumes: `getCached<T>`, `setCached<T>` aus `./cache`

- [ ] **Step 1: store-info route modifizieren**

Die Datei `externals/jemp-api/src/store-info-route/index.ts` komplett ersetzen:

```ts
import { Router, type Request, type Response } from 'express'
import logger from 'src/utils/pino-logger'
import { fetchIosVersionInfo, fetchAndroidVersionInfo } from './helpers'
import { fetchIOSProducts } from './helpers/fetch-ios-products'
import { fetchAndroidProducts } from './helpers/fetch-android-products'
import { refillableSubscriptions } from 'database/constants'
import { getCached, setCached } from './cache'

const router: Router = Router()

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

router.get('/ios', async (_: Request, res: Response) => {
  try {
    if (!process.env.IOS_BUNDLE_ID) {
      throw new Error('IOS_BUNDLE_ID environment variable is not set')
    }

    const cached = getCached<{ version: string; releaseNotes: string }>('store-info-ios')
    if (cached) {
      res.status(200).send(cached)
      return
    }

    const storeInfo = await fetchIosVersionInfo(process.env.IOS_BUNDLE_ID)
    setCached('store-info-ios', storeInfo, TWO_HOURS_MS)
    res.status(200).send(storeInfo)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/ios/products', async (_: Request, res: Response) => {
  try {
    const products = await fetchIOSProducts()
    res.status(200).send(products)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/android', async (_: Request, res: Response) => {
  try {
    if (!process.env.ANDROID_PACKAGE_NAME) {
      throw new Error('ANDROID_PACKAGE_NAME environment variable is not set')
    }

    const cached = getCached<{ version: string; releaseNotes: string }>('store-info-android')
    if (cached) {
      res.status(200).send(cached)
      return
    }

    const storeInfo = await fetchAndroidVersionInfo(process.env.ANDROID_PACKAGE_NAME)
    setCached('store-info-android', storeInfo, TWO_HOURS_MS)
    res.status(200).send(storeInfo)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/android/products', async (_: Request, res: Response) => {
  try {
    const products = await fetchAndroidProducts()
    res.status(200).send(products)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/refillable-subscriptions', async (_: Request, res: Response) => {
  res.status(200).send(refillableSubscriptions)
})

export default router
```

- [ ] **Step 2: store-info router in src/index.ts registrieren**

In `externals/jemp-api/src/index.ts` ergänzen:

```ts
// Import hinzufügen:
import storeInfoRouter from './store-info-route'

// Nach dem /version-check Endpunkt:
app.use('/store-info', storeInfoRouter)
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd externals/jemp-api && npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 4: Commit**

```bash
git add externals/jemp-api/src/store-info-route/index.ts \
        externals/jemp-api/src/index.ts
git commit -m "feat(api): add 2h in-memory caching to store-info routes"
```

---

## Task 4: App — Version Check Service + Tests

**Files:**
- Create: `services/version-check/index.ts`
- Create: `services/version-check/__tests__/index.test.ts`

**Interfaces:**
- Produces:
  - `parseSemver(v: string): [number, number, number] | null`
  - `compareVersions(local: string, store: string): 'major' | 'minor' | 'patch' | 'equal'`
  - `fetchStoreVersion(): Promise<{ version: string; releaseNotes: string }>`
  - `fetchVersionCheck(localVersion: string): Promise<{ updateRequired: boolean }>`
  - `COOLDOWN_STORAGE_KEY: string`
  - `TWO_DAYS_MS: number`

- [ ] **Step 1: Store-URL Konstanten erstellen**

```ts
// constants/store-urls.ts
import { Platform } from 'react-native'

/**
 * App Store / Play Store URLs für Update-Links.
 * App Store ID und Package Name eintragen sobald die App live ist.
 */
const IOS_STORE_URL = 'https://apps.apple.com/app/id000000000' // ← App Store ID ersetzen
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.jemp.app' // ← Package Name ersetzen

export const STORE_URL = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL
```

- [ ] **Step 2: Failing Tests schreiben**

```ts
// services/version-check/__tests__/index.test.ts
import { parseSemver, compareVersions } from '../index'

describe('parseSemver', () => {
  it('parst eine gültige Version', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
  })

  it('gibt null für leeren String zurück', () => {
    expect(parseSemver('')).toBeNull()
  })

  it('gibt null für nicht-numerische Teile zurück', () => {
    expect(parseSemver('1.x.3')).toBeNull()
  })

  it('gibt null zurück wenn nicht genau 3 Teile', () => {
    expect(parseSemver('1.2')).toBeNull()
    expect(parseSemver('1.2.3.4')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('erkennt major update', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe('major')
  })

  it('erkennt minor update', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBe('minor')
  })

  it('erkennt patch update', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe('patch')
  })

  it('gibt equal zurück wenn Versionen identisch', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe('equal')
  })

  it('gibt equal zurück wenn lokale Version neuer ist (Dev-Build)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe('equal')
    expect(compareVersions('1.5.0', '1.4.0')).toBe('equal')
  })

  it('gibt equal zurück bei ungültigen Versionsstrings', () => {
    expect(compareVersions('invalid', '1.0.0')).toBe('equal')
    expect(compareVersions('1.0.0', 'invalid')).toBe('equal')
  })
})
```

- [ ] **Step 3: Tests zum Scheitern bringen**

```bash
npx jest services/version-check --no-coverage
```
Expected: `Cannot find module '../index'`

- [ ] **Step 4: Service implementieren**

```ts
// services/version-check/index.ts
import { Platform } from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

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
```

- [ ] **Step 5: Tests laufen lassen**

```bash
npx jest services/version-check --no-coverage
```
Expected: alle Tests grün, `7 passed`

- [ ] **Step 6: Commit**

```bash
git add constants/store-urls.ts \
        services/version-check/index.ts \
        services/version-check/__tests__/index.test.ts
git commit -m "feat: add version check service with semver comparison logic"
```

---

## Task 5: App — Block Screens

**Files:**
- Create: `components/version/force-update-screen.tsx`
- Create: `components/version/backend-maintenance-screen.tsx`

**Interfaces:**
- Consumes: `STORE_URL` aus `@/constants/store-urls`, `JempText` aus `@/components/jemp-text`, `Colors, GRADIENT` aus `@/constants/theme`, `useColorScheme` aus `@/hooks/use-color-scheme`
- Produces: `<ForceUpdateScreen releaseNotes={string | null} />`, `<BackendMaintenanceScreen />`

- [ ] **Step 1: ForceUpdateScreen erstellen**

```tsx
// components/version/force-update-screen.tsx
import { JempText } from '@/components/jemp-text'
import { Colors, GRADIENT } from '@/constants/theme'
import { STORE_URL } from '@/constants/store-urls'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  releaseNotes: string | null
}

export function ForceUpdateScreen({ releaseNotes }: Props) {
  const scheme = useColorScheme() ?? 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-up-circle-outline" size={40} color={GRADIENT[0]} />
        </View>

        <JempText type="h1" style={styles.title}>
          Update erforderlich
        </JempText>

        <JempText type="body-l" color={colors.textMuted} style={styles.body}>
          Diese Version der App wird nicht mehr unterstützt. Bitte update die App um weiterzumachen.
        </JempText>

        {releaseNotes ? (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}>
            <JempText type="body-sm" color={colors.textMuted}>
              {releaseNotes}
            </JempText>
          </View>
        ) : null}
      </View>

      <Pressable onPress={() => Linking.openURL(STORE_URL)} style={styles.buttonWrapper}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <JempText type="button" color="#fff">
            Jetzt updaten
          </JempText>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  notesCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    width: '100%',
    marginTop: 8,
  },
  buttonWrapper: {
    marginTop: 24,
  },
  button: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: BackendMaintenanceScreen erstellen**

```tsx
// components/version/backend-maintenance-screen.tsx
import { JempText } from '@/components/jemp-text'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function BackendMaintenanceScreen() {
  const scheme = useColorScheme() ?? 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
      </View>

      <JempText type="h1" style={styles.title}>
        Wartung
      </JempText>

      <JempText type="body-l" color={colors.textMuted} style={styles.body}>
        Wir führen gerade Wartungsarbeiten durch. Die App ist in Kürze wieder verfügbar.
      </JempText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
})
```

- [ ] **Step 3: TypeScript-Check**

```bash
npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 4: Commit**

```bash
git add components/version/force-update-screen.tsx \
        components/version/backend-maintenance-screen.tsx
git commit -m "feat: add ForceUpdateScreen and BackendMaintenanceScreen components"
```

---

## Task 6: App — Update Dialog

**Files:**
- Create: `components/version/update-dialog.tsx`

**Interfaces:**
- Consumes: `JempText`, `Colors`, `GRADIENT`, `useColorScheme`
- Produces: `<UpdateDialog storeVersion={string} releaseNotes={string | null} onDismiss={() => void} />`

- [ ] **Step 1: UpdateDialog erstellen**

```tsx
// components/version/update-dialog.tsx
import { JempText } from '@/components/jemp-text'
import { Colors, GRADIENT } from '@/constants/theme'
import { STORE_URL } from '@/constants/store-urls'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { LinearGradient } from 'expo-linear-gradient'
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native'

type Props = {
  storeVersion: string
  releaseNotes: string | null
  onDismiss: () => void
}

export function UpdateDialog({ storeVersion, releaseNotes, onDismiss }: Props) {
  const scheme = useColorScheme() ?? 'dark'
  const colors = Colors[scheme]

  const handleUpdate = () => {
    Linking.openURL(STORE_URL)
    onDismiss()
  }

  return (
    <Modal transparent animationType="fade" visible>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}>
          <JempText type="h2" style={styles.title}>
            Update verfügbar
          </JempText>

          <JempText type="body-sm" color={colors.textMuted} style={styles.version}>
            Version {storeVersion}
          </JempText>

          {releaseNotes ? (
            <JempText type="body-sm" color={colors.textMuted} style={styles.notes}>
              {releaseNotes}
            </JempText>
          ) : null}

          <Pressable onPress={handleUpdate} style={styles.buttonWrapper}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <JempText type="button" color="#fff">
                Jetzt updaten
              </JempText>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDismiss} style={styles.laterButton}>
            <JempText type="body-sm" color={colors.textMuted}>
              Später
            </JempText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    gap: 8,
  },
  title: {
    marginBottom: 2,
  },
  version: {
    marginBottom: 4,
  },
  notes: {
    marginBottom: 8,
  },
  buttonWrapper: {
    marginTop: 8,
  },
  button: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
})
```

- [ ] **Step 2: TypeScript-Check**

```bash
npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 3: Commit**

```bash
git add components/version/update-dialog.tsx
git commit -m "feat: add UpdateDialog component with cooldown dismiss"
```

---

## Task 7: App — VersionCheckProvider

**Files:**
- Create: `providers/version-check-provider.tsx`

**Interfaces:**
- Consumes: `compareVersions`, `fetchStoreVersion`, `fetchVersionCheck`, `COOLDOWN_STORAGE_KEY`, `TWO_DAYS_MS` aus `@/services/version-check`; `ForceUpdateScreen`, `BackendMaintenanceScreen`, `UpdateDialog` aus `@/components/version/*`; `expo-application`, `@react-native-async-storage/async-storage`
- Produces: `<VersionCheckProvider>` — wrappable Provider-Komponente

- [ ] **Step 1: Provider erstellen**

```tsx
// providers/version-check-provider.tsx
import { BackendMaintenanceScreen } from '@/components/version/backend-maintenance-screen'
import { ForceUpdateScreen } from '@/components/version/force-update-screen'
import { UpdateDialog } from '@/components/version/update-dialog'
import {
  COOLDOWN_STORAGE_KEY,
  TWO_DAYS_MS,
  compareVersions,
  fetchStoreVersion,
  fetchVersionCheck,
} from '@/services/version-check'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Application from 'expo-application'
import { useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'

type UpdateStatus = 'ok' | 'update_available' | 'force_update' | 'maintenance'

type State = {
  status: UpdateStatus
  storeVersion: string | null
  releaseNotes: string | null
  showDialog: boolean
}

const BACKGROUND_THRESHOLD_MS = 60 * 1000

async function isCooldownActive(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(COOLDOWN_STORAGE_KEY)
  if (!raw) return false
  return Date.now() - new Date(raw).getTime() < TWO_DAYS_MS
}

async function setCooldown(): Promise<void> {
  await AsyncStorage.setItem(COOLDOWN_STORAGE_KEY, new Date().toISOString())
}

type Props = { children: React.ReactNode }

export function VersionCheckProvider({ children }: Props) {
  const [state, setState] = useState<State>({
    status: 'ok',
    storeVersion: null,
    releaseNotes: null,
    showDialog: false,
  })
  const backgroundedAt = useRef<number | null>(null)

  async function runChecks() {
    const localVersion = Application.nativeApplicationVersion
    if (!localVersion) return

    const [storeResult, checkResult] = await Promise.allSettled([
      fetchStoreVersion(),
      fetchVersionCheck(localVersion),
    ])

    // Backend-Kompatibilitäts-Check hat höchste Priorität
    if (checkResult.status === 'fulfilled' && checkResult.value.updateRequired) {
      setState({ status: 'maintenance', storeVersion: null, releaseNotes: null, showDialog: false })
      return
    }

    // Store-Versions-Vergleich
    if (storeResult.status === 'fulfilled') {
      const { version: storeVersion, releaseNotes } = storeResult.value
      const diff = compareVersions(localVersion, storeVersion)

      if (diff === 'major') {
        setState({ status: 'force_update', storeVersion, releaseNotes, showDialog: false })
        return
      }

      if (diff === 'minor') {
        const cooldown = await isCooldownActive()
        setState({
          status: cooldown ? 'ok' : 'update_available',
          storeVersion,
          releaseNotes,
          showDialog: !cooldown,
        })
        return
      }
    }

    // patch, equal, oder alle Checks fehlgeschlagen → ok
    setState((prev) => ({ ...prev, status: 'ok', showDialog: false }))
  }

  useEffect(() => {
    runChecks()

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now()
      } else if (nextState === 'active' && backgroundedAt.current !== null) {
        const elapsed = Date.now() - backgroundedAt.current
        backgroundedAt.current = null
        if (elapsed >= BACKGROUND_THRESHOLD_MS) {
          runChecks()
        }
      }
    })

    return () => sub.remove()
  }, [])

  async function handleDismiss() {
    await setCooldown()
    setState((prev) => ({ ...prev, status: 'ok', showDialog: false }))
  }

  if (state.status === 'maintenance') {
    return <BackendMaintenanceScreen />
  }

  if (state.status === 'force_update') {
    return <ForceUpdateScreen releaseNotes={state.releaseNotes} />
  }

  return (
    <>
      {children}
      {state.status === 'update_available' && state.showDialog && (
        <UpdateDialog
          storeVersion={state.storeVersion!}
          releaseNotes={state.releaseNotes}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 3: Commit**

```bash
git add providers/version-check-provider.tsx
git commit -m "feat: add VersionCheckProvider with state machine and lifecycle check"
```

---

## Task 8: App — Wire up + Env

**Files:**
- Modify: `app/_layout.tsx`
- Modify/Create: `.env`

**Interfaces:**
- Consumes: `VersionCheckProvider` aus `@/providers/version-check-provider`

- [ ] **Step 1: EXPO_PUBLIC_API_URL in .env setzen**

In `.env` (oder `.env.local`) die Zeile hinzufügen:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Für Produktion in EAS Secrets hinterlegen:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://api.jemp.app
```

- [ ] **Step 2: VersionCheckProvider in _layout.tsx einfügen**

In `app/_layout.tsx` den Import hinzufügen:

```tsx
import { VersionCheckProvider } from '@/providers/version-check-provider'
```

Dann `VersionCheckProvider` direkt innerhalb von `PostHogProvider` und außerhalb von `GestureHandlerRootView` einbauen — so dass er vor dem gesamten restlichen Stack läuft:

```tsx
// Vorher:
<PostHogProvider ...>
  <GestureHandlerRootView ...>
    ...

// Nachher:
<PostHogProvider ...>
  <VersionCheckProvider>
    <GestureHandlerRootView ...>
      ...
    </GestureHandlerRootView>
  </VersionCheckProvider>
</PostHogProvider>
```

- [ ] **Step 3: TypeScript-Check**

```bash
npx tsc --noEmit
```
Expected: kein Output

- [ ] **Step 4: Manuell testen — Happy Path**

```bash
npx expo start
```

App starten → Normal öffnen, kein Dialog erscheint (lokale Version == Store-Version im Dev-Modus).

- [ ] **Step 5: Manuell testen — Update-Dialog**

In `services/version-check/index.ts` temporär die lokale Version überschreiben um Minor-Update zu simulieren:

```ts
// Temporär für Test — danach rückgängig machen:
export async function fetchStoreVersion() {
  return { version: '99.0.0', releaseNotes: 'Viele neue Features!' }
}
```

App neu starten → Update-Dialog soll erscheinen. "Später" tippen → Dialog schließt. App in Hintergrund für >60s → Resume → Dialog erscheint NICHT (Cooldown aktiv). AsyncStorage leeren und neu starten → Dialog erscheint wieder.

- [ ] **Step 6: Temporären Test-Code rückgängig machen**

```ts
// services/version-check/index.ts — echte Implementierung wiederherstellen
export async function fetchStoreVersion(): Promise<{ version: string; releaseNotes: string }> {
  const endpoint = Platform.OS === 'ios' ? '/store-info/ios' : '/store-info/android'
  const res = await fetch(`${API_URL}${endpoint}`)
  if (!res.ok) throw new Error(`Store info fetch failed: ${res.status}`)
  return res.json() as Promise<{ version: string; releaseNotes: string }>
}
```

- [ ] **Step 7: Commit**

```bash
git add app/_layout.tsx .env
git commit -m "feat: wire VersionCheckProvider into root layout"
```
