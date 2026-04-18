import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'veezy' });

export const StorageKeys = {
    USER_DATA:   'user.data',
    VISIONS:     'visions',
    WIDGET_DATA: 'widget.data',
} as const;

export function getUserData() {
    const raw = storage.getString(StorageKeys.USER_DATA);
    return raw ? JSON.parse(raw) : null;
}

export function setUserData(data: unknown) {
    storage.set(StorageKeys.USER_DATA, JSON.stringify(data));
}

export function getVisions() {
    const raw = storage.getString(StorageKeys.VISIONS);
    return raw ? JSON.parse(raw) : [];
}

export function setVisions(visions: unknown) {
    storage.set(StorageKeys.VISIONS, JSON.stringify(visions));
}
