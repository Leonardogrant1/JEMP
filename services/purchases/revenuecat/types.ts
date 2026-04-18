import { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";

export interface RevenueCatProps {
    purchasePackage?: (pack: PurchasesPackage) => Promise<void>;
    restorePermissions?: () => Promise<CustomerInfo>;
    packages: PurchasesPackage[];
}




