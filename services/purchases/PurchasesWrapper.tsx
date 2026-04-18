import { REVENUECAT_API_KEYS } from "@/services/purchases/revenuecat/constants";
import { SUPERWALL_API_KEYS, SUPERWALL_ENTITLEMENTS } from "@/services/purchases/superwall/constants";
import {
    CustomPurchaseControllerProvider,
    SuperwallProvider
} from "expo-superwall";
import { useEffect } from "react";
import { Platform } from "react-native";
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
    const { setSubscriptionStatus } = useSuperwallFunctions();

    useEffect(() => {
        const apiKey = Platform.OS === "ios"
            ? REVENUECAT_API_KEYS.ios
            : REVENUECAT_API_KEYS.android;

        Purchases.configure({ apiKey });
        Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);
        loadOfferings();
        setSWSubsriptionStatus();
    }, []);

    const loadOfferings = async () => {
        const offerings = await Purchases.getOfferings();
    };

    const setSWSubsriptionStatus = async () => {
        const customerInfo = await Purchases.getCustomerInfo();
        const isPremium = customerInfo.entitlements.active.premium;

        console.log("isPremium", customerInfo);

        setSubscriptionStatus(
            isPremium ? {
                entitlements: [SUPERWALL_ENTITLEMENTS["premium"]],
                status: "ACTIVE"
            } : {
                status: "INACTIVE"
            }
        )
    }

    return <>{children}</>;
}

