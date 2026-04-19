import i18n, { AppLanguage } from '@/i18n';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { scheduleTrialEndReminder } from '@/services/notifications';
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
    presentPaywall: () => Promise<PAYWALL_RESULT>;
    refreshUserInfo: () => Promise<void>;
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

            const [info] = await Promise.all([
                Purchases.getCustomerInfo(),
            ]);
            setCustomerInfo(info);
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
                const language = (i18n.language || 'en') as AppLanguage;
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
        <RevenueCatContext.Provider value={{ packages, customerInfo, presentPaywall, refreshUserInfo, hasEntitlement, refreshUserInfoWithRetry }}>
            {children}
        </RevenueCatContext.Provider>
    );
}

export const useRevenueCat = () => {
    const ctx = useContext(RevenueCatContext);
    if (!ctx) throw new Error("useRevenueCat must be used within RevenueCatProvider");
    return ctx;
};
