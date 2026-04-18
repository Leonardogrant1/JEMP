import { useUserDataStore } from '@/stores/UserDataStore';
import { useVisionStore } from '@/stores/VisionStore';
import { devLog } from './dev-log';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

async function fetchFirstVisionImageUrl(): Promise<string> {
    try {
        const imageKey = useVisionStore.getState().visions[0]?.imagePath;
        if (!imageKey) return '';
        const userId = useUserDataStore.getState().userId;
        const res = await fetch(
            `${BACKEND_URL}/user-data/signed-url?key=${encodeURIComponent(imageKey)}`,
            { headers: { 'x-rc-user-id': userId } },
        );
        if (!res.ok) return '';
        const { url } = await res.json() as { url: string };
        return url ?? '';
    } catch {
        devLog("Error fetching vision image url");
        return '';
    }
}

export async function openPlacementWithImage(
    openWithPlacement: (placement: string, onFeature?: () => void, params?: Record<string, any>, onDismiss?: () => void) => Promise<void>,
    placement: string,
    onFeature?: () => void,
    params?: Record<string, any>,
    onDismiss?: () => void,
): Promise<void> {
    const visionImageUrl = await fetchFirstVisionImageUrl();
    return openWithPlacement(placement, onFeature, { vision_image_url: visionImageUrl, ...params }, onDismiss);
}
