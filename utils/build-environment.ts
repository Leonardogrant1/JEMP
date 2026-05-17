import { isTestFlight } from 'expo-testflight';
import { Platform } from 'react-native';

export function isBetaBuild(): boolean {
    if (__DEV__) return true; // Im Dev wie Beta behandeln
    if (Platform.OS !== 'ios') return false;
    return isTestFlight;
}

export function getBuildEnvironment(): 'SANDBOX' | 'PRODUCTION' {
    return isBetaBuild() ? 'SANDBOX' : 'PRODUCTION';
}
