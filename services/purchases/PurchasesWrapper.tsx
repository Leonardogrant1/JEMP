import { useAuth } from "@/providers/auth-provider";
import { PREMIUM_IDENTIFIER } from "@/services/purchases/revenuecat/constants";
import { useRevenueCat } from "@/services/purchases/revenuecat/providers/RevenueCatProvider";
import { SUPERWALL_API_KEYS, SUPERWALL_ENTITLEMENTS } from "@/services/purchases/superwall/constants";
import {
    CustomPurchaseControllerProvider,
    SuperwallProvider,
    useSuperwall
} from "expo-superwall";
import { useEffect } from "react";
import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { SuperwallFunctionsProvider, useSuperwallFunctions } from "./superwall/useSuperwall";

interface PurchaseWrapperProps {
    children: React.ReactNode;
}
export function PurchaseWrapper({ children }: PurchaseWrapperProps) {
    return (
        <CustomPurchaseControllerProvider
            controller={{
                onPurchase: async (params) => {
                    try {
                        const products = await Purchases.getProducts([params.productId]);
                        const product = products[0];

                        if (!product) {
                            return { type: "failed", error: "Product not found" };
                        }

                        await Purchases.purchaseStoreProduct(product);
                        return { type: "purchased" };
                    } catch (error: any) {
                        if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                            return { type: "cancelled" };
                        }
                        return { type: "failed", error: error.message };
                    }
                },

                onPurchaseRestore: async () => {
                    try {
                        await Purchases.restorePurchases();
                        return { type: "restored" };
                    } catch (error: any) {
                        return { type: "failed", error: error.message };
                    }
                },
            }}
        >
            <SuperwallProvider apiKeys={SUPERWALL_API_KEYS}>
                <SuperwallFunctionsProvider>
                    <PurchaseLogicWrapper>
                        {children}
                    </PurchaseLogicWrapper>
                </SuperwallFunctionsProvider>
            </SuperwallProvider>
        </CustomPurchaseControllerProvider>
    );
}


// necessary because to use useSuperwallFunctions we need to be inside SuperwallProvider
function PurchaseLogicWrapper({ children }: { children: React.ReactNode }) {
    const { identify, signOut: superwallSignOut, setSubscriptionStatus } = useSuperwallFunctions();
    const { customerInfo } = useRevenueCat();
    const { session } = useAuth();
    const userId = session?.user?.id;
    const isConfigured = useSuperwall((state) => state.isConfigured);

    // Identify / sign out Superwall when the user changes.
    // Guard on isConfigured: Superwall.configure() is async — calling Superwall.shared
    // before it completes triggers assertionFailure in SuperwallKit.
    useEffect(() => {
        if (!isConfigured) return;
        if (userId) {
            identify(userId);
        } else {
            superwallSignOut();
            setSubscriptionStatus({ status: "INACTIVE" });
        }
    }, [userId, isConfigured]);

    // Sync Superwall subscription status whenever RevenueCat customerInfo changes.
    // This runs AFTER RevenueCatProvider has called Purchases.logIn() and loaded the
    // correct customer info — avoiding the race condition where getCustomerInfo()
    // would return anonymous user data (no entitlements) before login completes.
    useEffect(() => {
        if (!isConfigured || !userId || customerInfo === null) return;
        const isActive = !!customerInfo.entitlements.active[PREMIUM_IDENTIFIER];
        setSubscriptionStatus(
            isActive
                ? { entitlements: [SUPERWALL_ENTITLEMENTS["full_access"]], status: "ACTIVE" }
                : { status: "INACTIVE" }
        );
    }, [customerInfo, isConfigured, userId]);

    return <>{children}</>;
}

