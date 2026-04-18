import * as TrackingTransparency from "expo-tracking-transparency";
import { Platform } from "react-native";

export async function getATTStatus() {
    if (Platform.OS !== "ios") return TrackingTransparency.PermissionStatus.GRANTED as const; // Android: kein ATT

    const current = await TrackingTransparency.getTrackingPermissionsAsync();

    if (current.status === TrackingTransparency.PermissionStatus.UNDETERMINED) {
        const req = await TrackingTransparency.requestTrackingPermissionsAsync();
        return req.status;
    }

    return current.status;
}
