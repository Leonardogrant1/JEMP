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

    let [storeResult, checkResult] = await Promise.allSettled([
      fetchStoreVersion(),
      fetchVersionCheck(localVersion),
    ])

    // DEBUG: Erzwinge Force Update
    // checkResult = { status: 'fulfilled', value: { updateRequired: true } }
    // Backend-Kompatibilitäts-Check hat höchste Priorität
    if (checkResult.status === 'fulfilled' && checkResult.value.updateRequired) {
      setState({ status: 'force_update', storeVersion: null, releaseNotes: null, showDialog: false })
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
