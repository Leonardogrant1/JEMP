import { Platform } from 'react-native'

/**
 * App Store / Play Store URLs für Update-Links.
 * App Store ID und Package Name eintragen sobald die App live ist.
 */
const IOS_STORE_URL = 'https://apps.apple.com/app/id000000000' // ← App Store ID ersetzen
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.jemp.app' // ← Package Name ersetzen

export const STORE_URL = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL
