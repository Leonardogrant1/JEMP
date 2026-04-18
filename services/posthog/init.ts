import PostHog from "posthog-react-native";

if (!process.env.EXPO_PUBLIC_POSTHOG_EU_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_POSTHOG_EU_API_KEY in environment variables");
}

let posthogInstance: PostHog | null = null;

/**
 * Initialize PostHog SDK
 * Should be called after ATT consent (if trackingAllowed is true)
 */
export function initPosthog(options?: { trackingAllowed?: boolean }) {
    if (posthogInstance) {
        return posthogInstance; // Already initialized
    }

    // Initialize PostHog with tracking configuration
    posthogInstance = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_EU_API_KEY!, {
        host: process.env.EXPO_PUBLIC_POSTHOG_URL,
        enableSessionReplay: options?.trackingAllowed !== false,
        sessionReplayConfig: {
            maskAllTextInputs: true,
            maskAllImages: true,
            maskAllSandboxedViews: true,
            captureLog: true,
            captureNetworkTelemetry: true,
            throttleDelayMs: 1000,
        },
    });

    return posthogInstance;
}

/**
 * Get PostHog instance (may be null if not initialized)
 */
export function getPosthog(): PostHog | null {
    return posthogInstance;
}
