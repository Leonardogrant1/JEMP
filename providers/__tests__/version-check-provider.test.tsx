import { act, create, ReactTestRenderer } from 'react-test-renderer'
import React from 'react'
import { Text } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { fetchStoreVersion, fetchVersionCheck } from '@/services/version-check'
import { VersionCheckProvider } from '../version-check-provider'

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn() }))
jest.mock('expo-application', () => ({ nativeApplicationVersion: '2.0.0' }))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/services/version-check', () => {
  const actual = jest.requireActual('@/services/version-check')
  return { ...actual, fetchStoreVersion: jest.fn(), fetchVersionCheck: jest.fn() }
})
jest.mock('@/components/version/force-update-screen', () => {
  const { Text } = require('react-native')
  const React = require('react')
  return { ForceUpdateScreen: () => React.createElement(Text, null, 'force-update-screen') }
})
jest.mock('@/components/version/backend-maintenance-screen', () => {
  const { Text } = require('react-native')
  const React = require('react')
  return { BackendMaintenanceScreen: () => React.createElement(Text, null, 'maintenance-screen') }
})
jest.mock('@/components/version/update-dialog', () => ({ UpdateDialog: () => null }))

const mockFetchStoreVersion = fetchStoreVersion as jest.Mock
const mockFetchVersionCheck = fetchVersionCheck as jest.Mock

function Children() {
  return <Text>app-children</Text>
}

async function renderProvider(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer
  await act(async () => {
    tree = create(
      <VersionCheckProvider>
        <Children />
      </VersionCheckProvider>,
    )
  })
  return tree
}

function renderedTexts(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((t) => t.props.children)
}

describe('VersionCheckProvider', () => {
  const originalDev = (global as any).__DEV__

  beforeEach(() => {
    jest.clearAllMocks()
    // Prod-Verhalten testen: __DEV__-Skip deaktivieren
    ;(global as any).__DEV__ = false
  })

  afterEach(() => {
    ;(global as any).__DEV__ = originalDev
  })

  it('zeigt ForceUpdateScreen UND versteckt den Splash, wenn Backend updateRequired meldet', async () => {
    mockFetchVersionCheck.mockResolvedValue({ updateRequired: true })
    mockFetchStoreVersion.mockResolvedValue({ version: '2.0.0', releaseNotes: '' })

    const tree = await renderProvider()

    expect(renderedTexts(tree)).toEqual(['force-update-screen'])
    expect(SplashScreen.hideAsync).toHaveBeenCalled()
  })

  it('zeigt ForceUpdateScreen UND versteckt den Splash bei Major-Sprung zur Store-Version', async () => {
    mockFetchVersionCheck.mockResolvedValue({ updateRequired: false })
    mockFetchStoreVersion.mockResolvedValue({ version: '3.0.0', releaseNotes: 'notes' })

    const tree = await renderProvider()

    expect(renderedTexts(tree)).toEqual(['force-update-screen'])
    expect(SplashScreen.hideAsync).toHaveBeenCalled()
  })

  it('rendert die App und fasst den Splash nicht an, wenn Version aktuell ist', async () => {
    mockFetchVersionCheck.mockResolvedValue({ updateRequired: false })
    mockFetchStoreVersion.mockResolvedValue({ version: '2.0.0', releaseNotes: '' })

    const tree = await renderProvider()

    expect(renderedTexts(tree)).toEqual(['app-children'])
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled()
  })

  it('rendert die App, wenn beide Checks fehlschlagen (fail open)', async () => {
    mockFetchVersionCheck.mockRejectedValue(new Error('network down'))
    mockFetchStoreVersion.mockRejectedValue(new Error('network down'))

    const tree = await renderProvider()

    expect(renderedTexts(tree)).toEqual(['app-children'])
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled()
  })

  it('skippt die Checks im Dev-Client und blockt die App nie', async () => {
    ;(global as any).__DEV__ = true
    mockFetchVersionCheck.mockResolvedValue({ updateRequired: true })
    mockFetchStoreVersion.mockResolvedValue({ version: '9.9.9', releaseNotes: '' })

    const tree = await renderProvider()

    expect(renderedTexts(tree)).toEqual(['app-children'])
    expect(mockFetchVersionCheck).not.toHaveBeenCalled()
    expect(mockFetchStoreVersion).not.toHaveBeenCalled()
  })
})
