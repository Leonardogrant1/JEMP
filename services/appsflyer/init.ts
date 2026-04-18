import { devLog } from "@/utils/dev-log";
import type { InitSDKOptions } from "react-native-appsflyer";
import appsFlyer from "react-native-appsflyer";

const appsFlyerOptions: InitSDKOptions = {
    isDebug: true,
    appId: process.env.EXPO_PUBLIC_APPSFLYER_APP_ID,
    devKey: process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY!,
    onInstallConversionDataListener: true,
    timeToWaitForATTUserAuthorization: 10,
    onDeepLinkListener: true,
};

/**
 * Initialize AppsFlyer SDK
 */
export function initAppsFlyer() {
    const successCallback = (result?: unknown) => {
        devLog("AppsFlyer SDK initialized:", result);
    };

    const errorCallback = (error?: Error) => {
        devLog("AppsFlyer SDK initialization error:", error);
    };

    // Register listener for install conversion data to prevent warnings
    // This is required when onInstallConversionDataListener is set to true
    appsFlyer.onInstallConversionData((data: any) => {
        devLog("AppsFlyer install conversion data:", data);
        // You can handle attribution data here if needed
    });

    appsFlyer.initSdk(appsFlyerOptions, successCallback, errorCallback);
}

