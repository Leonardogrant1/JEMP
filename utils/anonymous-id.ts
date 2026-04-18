import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_KEY = 'veezy_anonymous_id';

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Returns the stable anonymous ID from Keychain.
 * Creates and persists a new UUID on first call.
 * Survives app deletion — same ID after reinstall.
 */
export async function getOrCreateAnonymousId(): Promise<string> {
    const existing = await SecureStore.getItemAsync(KEYCHAIN_KEY);
    if (existing) return existing;

    const newId = generateUUID();
    await SecureStore.setItemAsync(KEYCHAIN_KEY, newId);
    return newId;
}
