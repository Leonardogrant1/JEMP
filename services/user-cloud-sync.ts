import { useUserDataStore } from '@/stores/UserDataStore';
import { useVisionStore } from '@/stores/VisionStore';
import { devLog } from '@/utils/dev-log';
import { fetch } from 'expo/fetch';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export class UserCloudSync {
    static async upload(): Promise<void> {
        const { userId } = useUserDataStore.getState();
        const hasHydrated = useUserDataStore.persist.hasHydrated();
        devLog('UserCloudSync.upload() called');
        devLog('userId', userId);
        devLog('hasHydrated', hasHydrated);
        if (!userId || !hasHydrated) return;

        const s = useUserDataStore.getState();
        const backup = {
            visions: useVisionStore.getState().visions,
            hasOnboarded: s.hasOnboarded,
            hasSeenTutorial: s.hasSeenTutorial,
            name: s.name,
            birthday: s.birthday,
            gender: s.gender,
            notifications: s.notifications,
            imagesUsed: s.imagesUsed,
            selfReferenceImages: s.selfReferenceImages,
        };

        console.log(JSON.stringify(backup));

        if (Object.keys(backup).length === 0) return;

        await fetch(`${BACKEND_URL}/user-data/backup`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-rc-user-id': userId,
            },
            body: JSON.stringify(backup),
        });
    }

    static async deleteVisionImage(visionId: string): Promise<void> {
        const userId = useUserDataStore.getState().userId;
        if (!userId) return;

        await fetch(`${BACKEND_URL}/user-data/vision-image?visionId=${visionId}`, {
            method: 'DELETE',
            headers: { 'x-rc-user-id': userId },
        });
    }

    static async restore(): Promise<boolean> {
        const userId = useUserDataStore.getState().userId;
        if (!userId) return false;

        // Skip restore if this is not a fresh install
        if (useVisionStore.getState().visions.length > 0) return false;

        const res = await fetch(`${BACKEND_URL}/user-data/backup`, {
            headers: { 'x-rc-user-id': userId },
        });
        if (!res.ok) return false; // 404 = no backup exists yet

        const backup = await res.json() as {
            visions: any[];
            hasOnboarded: boolean;
            hasSeenTutorial: boolean;
            name: string;
            birthday: string | null;
            gender: 'male' | 'female' | 'other';
            notifications: boolean;
            imagesUsed: number;
            selfReferenceImages: {
                face_front: string | null;
                face_left: string | null;
                face_right: string | null;
                face_smile: string | null;
                body: string | null;
            };
        };

        const { visions, ...userData } = backup;
        useVisionStore.setState({ visions });

        // If selfReferenceImages are missing/null in the backup, fall back to
        // the predictable R2 key pattern so images aren't orphaned after a
        // corrupted backup restore.
        const slots = ['face_front', 'face_left', 'face_right', 'body'] as const;
        const restoredSelfRef = userData.selfReferenceImages ?? { face_front: null, face_left: null, face_right: null, face_smile: null, body: null };
        const allNull = slots.every((s) => restoredSelfRef[s] == null);
        const selfReferenceImages = allNull
            ? { face_front: `self-reference/${userId}/face_front`, face_left: `self-reference/${userId}/face_left`, face_smile: `self-reference/${userId}/face_smile`, face_right: `self-reference/${userId}/face_right`, body: `self-reference/${userId}/body` }
            : restoredSelfRef;

        useUserDataStore.setState({
            hasOnboarded: userData.hasOnboarded ?? false,
            hasSeenTutorial: userData.hasSeenTutorial ?? false,
            name: userData.name ?? '',
            birthday: userData.birthday ?? null,
            gender: userData.gender ?? 'other',
            notifications: userData.notifications ?? false,
            imagesUsed: userData.imagesUsed ?? 0,
            selfReferenceImages,
        });

        return true;
    }
}
