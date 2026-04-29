import { useAuth } from "@/providers/auth-provider";
import { PREMIUM_IDENTIFIER } from "@/services/purchases/revenuecat/constants";
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
            syncSubscriptionStatus();
        } else {
            superwallSignOut();
            setSubscriptionStatus({ status: "INACTIVE" });
        }
    }, [userId, isConfigured]);

    const syncSubscriptionStatus = async () => {
        const customerInfo = await Purchases.getCustomerInfo();
        const isActive = !!customerInfo.entitlements.active[PREMIUM_IDENTIFIER];
        setSubscriptionStatus(
            isActive
                ? { entitlements: [SUPERWALL_ENTITLEMENTS["full_access"]], status: "ACTIVE" }
                : { status: "INACTIVE" }
        );
    };

    return <>{children}</>;
}

