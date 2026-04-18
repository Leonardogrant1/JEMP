import { Entitlement } from "expo-superwall";


const SUPERWALL_API_KEY_IOS = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY_IOS;
const SUPERWALL_API_KEY_ANDROID = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY_ANDROID;

if (!SUPERWALL_API_KEY_IOS || !SUPERWALL_API_KEY_ANDROID) {
    throw new Error("Missing SUPERWALL_API_KEY_IOS or SUPERWALL_API_KEY_ANDROID in environment variables");
}

export const SUPERWALL_API_KEYS = {
    ios: SUPERWALL_API_KEY_IOS,
    android: SUPERWALL_API_KEY_ANDROID,
}


export const SUPERWALL_ENTITLEMENTS: Record<string, Entitlement> = {
    "premium": {
        id: "premium",
        type: "SERVICE_LEVEL"
    }
}
