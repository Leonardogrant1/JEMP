import { MediaHandler } from '@/lib/media-handler';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { scheduleTrialEndReminder } from '@/services/notifications';
import { UserCloudSync } from '@/services/user-cloud-sync';
import { WidgetBridge } from '@/services/widgets/widget-bridge';
import { useUserDataStore } from "@/stores/UserDataStore";
import { useVisionStore } from "@/stores/VisionStore";
import { getOrCreateAnonymousId } from "@/utils/anonymous-id";
import { devError, devLog } from '@/utils/dev-log';
import { wait } from '@/utils/wait';
import { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import Purchases, { type CustomerInfo, PurchasesPackage } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { PREMIUM_IDENTIFIER, REVENUECAT_API_KEYS } from "../constants";

interface RevenueCatContextType {
    packages: PurchasesPackage[];
    customerInfo: CustomerInfo | null;
    generationCount: number | null;
    presentPaywall: () => Promise<PAYWALL_RESULT>;
    refreshUserInfo: () => Promise<void>;
    refreshGenerationCount: () => Promise<void>;
    hasEntitlement: (entitlement: string) => boolean;
    refreshUserInfoWithRetry: (entitlement: string) => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

interface RevenueCatProviderProps {
    children: React.ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [generationCount, setGenerationCount] = useState<number | null>(null);

    const fetchGenerationCount = async () => {
        const userId = useUserDataStore.getState().userId;
        if (!userId) return;
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/user-data/generations`, {
                headers: { 'x-rc-user-id': userId },
            });
            if (!res.ok) return;
            const { count } = await res.json();
            setGenerationCount(count);
        } catch {
            // silent fail — count stays null
            devLog("Failed to fetch generation count")
        }
    };

    useEffect(() => {
        const init = async () => {
            const apiKey = Platform.OS === "ios"
                ? REVENUECAT_API_KEYS.ios
                : REVENUECAT_API_KEYS.android;

            const userId = await getOrCreateAnonymousId();

            Purchases.configure({ apiKey });
            Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
            await Purchases.logIn(userId);
            trackerManager.identify(userId);

            useUserDataStore.setState({ userId });

            const [info] = await Promise.all([
                Purchases.getCustomerInfo(),
                UserCloudSync.restore().catch((e) => { console.log(e); return false; }),
            ]);
            setCustomerInfo(info);
            useUserDataStore.setState({ isPremium: info.entitlements.active[PREMIUM_IDENTIFIER] !== undefined });

            fetchGenerationCount();

            const visions = useVisionStore.getState().visions;
            await Promise.all(visions.map((v) => MediaHandler.resolveUri(v.imagePath).catch(() => { })));
            WidgetBridge.sync(visions).catch(() => { });

            loadOfferings();
        };
        init();

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') refreshUserInfo();
        });
        return () => sub.remove();
    }, []);

    const loadOfferings = async () => {
        const offerings = await Purchases.getOfferings();
        setPackages(offerings.current?.availablePackages ?? []);
    };

    const hasEntitlement = (entitlement: string) => {
        return customerInfo?.entitlements.active[entitlement] !== undefined;
    };

    const refreshUserInfo = async () => {
        // Snapshot vor dem Refresh
        const wasOnTrial = customerInfo?.entitlements.active[PREMIUM_IDENTIFIER]?.periodType === 'TRIAL';

        await Purchases.invalidateCustomerInfoCache();
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        useUserDataStore.setState({ isPremium: info.entitlements.active[PREMIUM_IDENTIFIER] !== undefined });
        await fetchGenerationCount();

        // Neuer Trial erkannt (vorher kein Trial, jetzt Trial aktiv)
        const isNowOnTrial = info.entitlements.active[PREMIUM_IDENTIFIER]?.periodType === 'TRIAL';
        if (!wasOnTrial && isNowOnTrial) {
            trackerManager.track('trial_started');

            const entitlement = info.entitlements.active[PREMIUM_IDENTIFIER];
            const trialEndISO = entitlement?.expirationDate
                ?? (entitlement?.latestPurchaseDate
                    ? new Date(new Date(entitlement.latestPurchaseDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
                    : null);

            if (trialEndISO) {
                const language = useUserDataStore.getState().language;
                scheduleTrialEndReminder(trialEndISO, language).catch(() => { });
            }
        }
    };


    const refreshUserInfoWithRetry = async (entitlement: string) => {
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                const customerInfo = await Purchases.getCustomerInfo();

                const hasActiveEntitlement =
                    customerInfo != null &&
                    customerInfo.entitlements != null &&
                    customerInfo.entitlements.active[entitlement] !== undefined;

                devLog(`Refresh attempt ${attempt}: active entitlement =`, hasActiveEntitlement);

                if (hasActiveEntitlement) {
                    return true;
                }
            } catch (error) {
                devError(`Refresh attempt ${attempt} failed:`, error);
            }

            if (attempt < 5) {
                await wait(2000);
            }
        }

        return false;
    };

    const presentPaywall = async () => {
        const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: PREMIUM_IDENTIFIER
        });
        return paywallResult;
    };

    return (
        <RevenueCatContext.Provider value={{ packages, customerInfo, generationCount, presentPaywall, refreshUserInfo, refreshGenerationCount: fetchGenerationCount, hasEntitlement, refreshUserInfoWithRetry }}>
            {children}
        </RevenueCatContext.Provider>
    );
}

export const useRevenueCat = () => {
    const ctx = useContext(RevenueCatContext);
    if (!ctx) throw new Error("useRevenueCat must be used within RevenueCatProvider");
    return ctx;
};
