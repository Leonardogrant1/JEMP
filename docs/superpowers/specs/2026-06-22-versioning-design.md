# Versioning & Update-Check — Design Spec

**Datum:** 2026-06-22  
**Status:** Approved

---

## Ziel

Die App prüft beim Start und bei jedem Resume aus dem Hintergrund:
1. Ist eine neuere Version im App Store / Play Store verfügbar? (minor → Dialog, major → Sperr-Screen)
2. Unterstützt das Backend die aktuelle App-Version noch? (nein → Wartungs-Sperr-Screen)

---

## Architektur

### Provider-Position

```
PostHogProvider
  └── VersionCheckProvider        ← neu, ganz oben
        └── GestureHandlerRootView
              └── QueryClientProvider
                    └── AuthProvider
                          └── ... (Rest des Stacks)
```

Prüfung läuft **vor dem Login** — Wartungsmodus und Force-Updates betreffen alle User.

### Neue Dateien

```
providers/version-check-provider.tsx
services/version-check/index.ts
components/version/force-update-screen.tsx
components/version/backend-maintenance-screen.tsx
components/version/update-dialog.tsx

externals/jemp-api/src/store-info-route/cache.ts
externals/jemp-api/src/store-info-route/helpers/index.ts   (re-export, unverändert)
externals/jemp-api/src/config/version-config.ts
externals/jemp-api/src/routes/version-check-route.ts
```

---

## State Machine

```
idle → loading →
  "maintenance"       Backend inkompatibel → Sperr-Screen
  "force_update"      Major-Versionssprung → Sperr-Screen
  "update_available"  Minor-Sprung + Cooldown abgelaufen → Dialog
  "ok"                Patch-Sprung, gleiche Version, oder API-Fehler
```

**Priority:** `maintenance > force_update > update_available > ok`

---

## Data Flow

```
App-Start / Resume (≥60s im Hintergrund)
  │
  ├── Application.nativeApplicationVersion  →  "1.1.0"  (expo-application)
  │
  └── Promise.allSettled([
        GET /store-info/ios|android    →  { version, releaseNotes }
        GET /version-check?version=…  →  { updateRequired }
      ])
          │
          ├── updateRequired === true              → "maintenance"
          ├── major(store) > major(local)          → "force_update"
          ├── minor(store) > minor(local)
          │     + Cooldown > 2 Tage               → "update_available"
          │     + Cooldown ≤ 2 Tage               → "ok"
          ├── patch(store) > patch(local)          → "ok"  (kein Dialog)
          └── API-Fehler (beide Checks)            → "ok"  (silent fail)
```

**Semver-Parsing:** Kein externes Package — `version.split(".")` auf `[major, minor, patch]`. Ungültige Strings → silent fail → `"ok"`.

**Resume-Guard:** `useRef<number>` hält den Timestamp beim Hintergrund-Eintritt. Check nur wenn ≥ 60 Sekunden vergangen.

---

## API-Calls (App → jemp-api)

Base-URL aus `EXPO_PUBLIC_API_URL` (Env-Variable).

| Endpoint | Methode | Response |
|---|---|---|
| `/store-info/ios` | GET | `{ version: string, releaseNotes: string }` |
| `/store-info/android` | GET | `{ version: string, releaseNotes: string }` |
| `/version-check?version=1.1.0` | GET | `{ updateRequired: boolean }` |

Platform-Detection: `Platform.OS === "ios"` → `/store-info/ios`, sonst `/store-info/android`.

---

## Backend — jemp-api

### Caching (`src/store-info-route/cache.ts`)

In-memory Cache, lebt im Node.js-Prozess (wird bei Server-Restart gecleart).

```ts
type CacheEntry<T> = { data: T; expiresAt: number }
const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null
export function setCached<T>(key: string, data: T, ttlMs: number): void
```

- `/store-info/ios` → TTL **2 Stunden**
- `/store-info/android` → TTL **2 Stunden**
- `/version-check` → **kein Cache** (nur Config-Lookup, kein externer Call)

### Version-Config (`src/config/version-config.ts`)

```ts
export const MIN_SUPPORTED_VERSION = "1.0.0"
```

Wird manuell gepflegt wenn ein Breaking Change deployed wird. Kein DB-Eintrag.

### `/version-check` Route (`src/routes/version-check-route.ts`)

```
GET /version-check?version=1.1.0
→ { updateRequired: true | false }
```

Vergleich: `semver(queryVersion) < semver(MIN_SUPPORTED_VERSION)` → `updateRequired: true`.

---

## UI Components

Alle Komponenten nutzen `useColorScheme()`, `theme`-Tokens, `JempText` und `useSafeAreaInsets`.

### `force-update-screen.tsx`

Vollbild, kein Dismiss, kein Back-Gesture.

- Zentrierter Content, Ionicon (64px, gradient-tint)
- `JempText` h1 "Update erforderlich"
- `JempText` body-l muted — Erklärungstext
- `releaseNotes` in Surface-Card (14px radius, 16px padding) falls vorhanden
- Gradient-Pill-Button "Jetzt updaten" (Cyan→Electric, 52px Höhe, 100px radius) → `Linking.openURL()` zu App Store / Play Store

### `backend-maintenance-screen.tsx`

Vollbild, kein Dismiss.

- Gleiches Layout wie force-update-screen
- Anderes Icon + Text ("Wir sind gleich zurück")
- Kein Button — nur Information
- Verschwindet automatisch beim nächsten Resume wenn Backend wieder kompatibel

### `update-dialog.tsx`

Zentrierte Card über App-Inhalt, App bleibt im Hintergrund nutzbar.

- `rgba(0,0,0,0.5)` Backdrop — Tap dismisst Dialog + setzt Cooldown
- Surface-Card (14px radius, 20px padding)
- `JempText` h2 "Update verfügbar", Version-String
- `releaseNotes` Text (`body-sm`, `textMuted`)
- Gradient-Pill-Button "Jetzt updaten" → Store
- Text-only "Später" darunter (kein Button-Style, `textMuted`) → dismiss + Cooldown setzen

### Rendering-Logik im Provider

```tsx
if (status === "maintenance") return <BackendMaintenanceScreen />
if (status === "force_update") return <ForceUpdateScreen releaseNotes={releaseNotes} />
return (
  <>
    {children}
    {status === "update_available" && showDialog && (
      <UpdateDialog
        releaseNotes={releaseNotes}
        storeVersion={storeVersion}
        onDismiss={handleDismiss}
      />
    )}
  </>
)
```

---

## Error Handling

| Szenario | Verhalten |
|---|---|
| Network-Fehler (ein Check) | `Promise.allSettled` — anderer Check wertet trotzdem aus |
| Beide Checks fehlgeschlagen | `status: "ok"` — silent fail |
| Ungültige Versionstrings | silent fail → `"ok"` |
| `IOS_BUNDLE_ID` / `ANDROID_PACKAGE_NAME` nicht gesetzt | API wirft 500, App macht silent fail |

---

## Cooldown

- AsyncStorage Key: `version_check_last_dialog`
- Wert: ISO-Timestamp
- < 2 Tage seit letztem Dialog → Dialog überspringen, direkt `"ok"`
- Gesetzt bei: "Später"-Tap und "Jetzt updaten"-Tap

---

## Offene Punkte

- Store-URLs (App Store ID, Play Store Package Name) müssen als Konstanten hinterlegt werden sobald die App live ist.
- `EXPO_PUBLIC_API_URL` muss in `.env` und EAS-Secrets gepflegt werden.
