import gplay from 'google-play-scraper';

export async function fetchAndroidVersionInfo(appId: string) {
    try {
        const appInfo = await gplay.app({ appId });

        return {
            version: appInfo.version,            // z. B. "3.2.0"
            releaseNotes: appInfo.recentChanges, // z. B. "What's new"
        };
    } catch (error) {
        throw new Error(`Failed to fetch Android version info: ${error}`);
    }
}
