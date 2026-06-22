
import { androidpublisher_v3 as AndroidPublisherApi, google } from 'googleapis';


/**
 * Ruft alle freigegebenen Android In-App-Produkte vom Google Play Store ab.
 */
export async function fetchAndroidProducts() {


    if (
        !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64
    )
        throw new Error("Google service account credentials not found");

    const decodedKey = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64!, "base64").toString("utf-8").replace(/\\n/g, "\n");


    const authClient = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        key: decodedKey,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });


    const androidPublisher = new AndroidPublisherApi.Androidpublisher({
        auth: authClient,
    });

    const oneTime = await androidPublisher.inappproducts.list({
        packageName: process.env.ANDROID_PACKAGE_NAME
    });

    const subscriptions = await androidPublisher.monetization.subscriptions.list({
        packageName: process.env.ANDROID_PACKAGE_NAME
    });


    const oneTimePurchaseIds = oneTime.data.inappproduct?.filter(p => p.status === "active").map(p => p.sku) || [];
 
    const subscriptionIds = subscriptions.data.subscriptions?.filter(s => !s.archived).map(s => s.productId) || [];

    return {
        one_time: oneTimePurchaseIds,
        subscription: subscriptionIds
    }

}
