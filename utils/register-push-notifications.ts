import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { devLog } from "./dev-log";



export async function registerPushNotifications() {
    if (Platform.OS == "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500]
        })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        devLog("Notifications permission not granted");
        return {
            status: finalStatus,
            pushTokenString: null
        }
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    devLog("Expo push token:", token);
    return {
        status: finalStatus,
        pushTokenString: token
    }
}