import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AppstoreOneTimePurchaseEntry, AppStoreSubscriptionAttribute, AppStoreSubsriptionEntry } from '../types';
import logger from 'src/utils/pino-logger';

/**
 * Ruft alle freigegebenen iOS In-App-Produkte vom App Store Connect ab.
 */
export async function fetchIOSProducts() {
  try {
    const apiCredsb64 = process.env.APPSTORE_CONNECT_API_CREDENTIALS_B64;
    const apiKeyId = process.env.APPSTORE_CONNECT_API_KEY_ID;
    const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;

    if (!apiCredsb64 || !apiKeyId || !issuerId) {
      throw new Error("Fehlende Umgebungsvariablen für App Store Connect API");
    }

    if (!process.env.IOS_APP_ID) {
      throw new Error("IOS_APP_ID Umgebungsvariable fehlt");
    }


  const privateKey = Buffer.from(apiCredsb64, 'base64').toString('utf8');

  // 1. JWT Token generieren
  const generateToken = () => {
    return jwt.sign(
      {
        iss: issuerId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 5), // 5 Minuten
        aud: 'appstoreconnect-v1',
      },
      privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: apiKeyId,
          typ: 'JWT',
        },
      }
    );
  };

  let token = generateToken();

  // Helper function to make API calls with token refresh on 401
  const makeApiCall = async (url: string, retryCount = 0) => {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response;
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount === 0) {
        token = generateToken();
        return makeApiCall(url, 1);
      }
      throw error;
    }
  };

  // get one-time purchases

  const oneTimePurchaseResponse = await makeApiCall(
    `https://api.appstoreconnect.apple.com/v1/apps/${process.env.IOS_APP_ID}/inAppPurchasesV2`
  );

 

  const oneTimePurchaseIds = (oneTimePurchaseResponse.data.data as AppstoreOneTimePurchaseEntry[]).filter(e => e.attributes.state === "APPROVED").map(e => e.attributes.productId)

  // 2. Versuche zuerst die neue API-Struktur
  let products: AppStoreSubsriptionEntry[] = [];
  
  try {
    // Zuerst die Subscription Groups abrufen
    const subscriptionGroupsResponse = await makeApiCall(
      `https://api.appstoreconnect.apple.com/v1/apps/${process.env.IOS_APP_ID}/subscriptionGroups`
    );

    const subscriptionGroups = subscriptionGroupsResponse.data.data;

    if (subscriptionGroups.length === 0) {
      return {
        one_time: oneTimePurchaseIds,
        subscription: [],
      };
    }

    // Alle Subscriptions aus allen Groups sammeln
    const allSubscriptions: AppStoreSubsriptionEntry[] = [];
    
    for (const group of subscriptionGroups) {
      try {
        const subscriptionsResponse = await makeApiCall(
          `https://api.appstoreconnect.apple.com/v1/subscriptionGroups/${group.id}/subscriptions`
        );
        allSubscriptions.push(...subscriptionsResponse.data.data);
      } catch (error: any) {
        logger.error(error);
      }
    }

    products = allSubscriptions;
    
  } catch (error: any) {
    logger.error(error);
    // Fallback: Versuche die alte hardcodierte Group ID
    try {
      const response = await makeApiCall(
        `https://api.appstoreconnect.apple.com/v1/subscriptionGroups/21481516/relationships/subscriptions`
      );
      products = response.data.data as AppStoreSubsriptionEntry[];
    } catch (fallbackError: any) {
      // Wenn alles fehlschlägt, gib nur die One-Time Purchases zurück
      return {
        one_time: oneTimePurchaseIds,
        subscription: [],
      };
    }
  }

  const singleProductData = products.map(async (productEntry) => {
    try {
      const productResponse = await makeApiCall(
        `https://api.appstoreconnect.apple.com/v1/subscriptions/${productEntry.id}`
      );

      return {
        id: productEntry.id,
        type: productEntry.type,
        attributes: productResponse.data.data.attributes as AppStoreSubscriptionAttribute,
      };
    } catch (error: any) {
      logger.error(error);
      // Skip this product if it fails
      return null;
    }
  })



  const subscriptionIds = (await Promise.all(singleProductData))
    .filter(e => e !== null && e.attributes.state === "APPROVED")
    .map(e => e!.attributes.productId);
    return {
      one_time: oneTimePurchaseIds,
      subscription: subscriptionIds,
    }
  } catch (error) {
    logger.error(error);
    throw error;
  }
}
