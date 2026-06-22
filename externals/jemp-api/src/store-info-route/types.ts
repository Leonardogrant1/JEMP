export type AppStoreLookupResponse = {
    resultCount: number;
    results: {
      version: string;               // z.B. "3.2.0"
      releaseNotes: string;          // z.B. "What's new text"
      trackViewUrl: string;          // Link zur App im Store
      trackName: string;             // App Name
      artworkUrl100: string;         // App Icon (100x100)
    }[];
  };
  

export type AppStoreSubsriptionEntry = {
  type: "subscriptions";
  id: string;             
}

export type AppStoreSubscriptionAttribute = {
   
    name: string;  
    productId: string;
    familySharable: boolean;
    state: "APPROVED" | "DELETED" | "IN_REVIEW" | "REJECTED" | "WAITING_FOR_REVIEW";
    subscriptionPeriod: "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS" | "LIFETIME";
    reviewNote: string;
    groupLevel: number;
}

export type AppstoreOneTimePurchaseEntry = {
  type: string;
  id: string;
  attributes: {
    name:  string;
    productId:  string;
    inAppPurchaseType: 'CONSUMABLE',
    state: 'APPROVED' | 'DELETED' | 'IN_REVIEW' | 'REJECTED' | 'WAITING_FOR_REVIEW';
    reviewNote: string;
    familySharable: boolean;
  }
}