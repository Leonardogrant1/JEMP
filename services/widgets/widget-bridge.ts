import { MediaHandler } from '@/lib/media-handler';
import { useUserDataStore } from '@/stores/UserDataStore';
import { Vision } from '@/types/vision';
import { devLog } from '@/utils/dev-log';
import { prepareForWidget } from '@/utils/prepare-image-for-widget';
import { ExtensionStorage } from '@bacons/apple-targets';
import { Directory, File, Paths } from 'expo-file-system';

const APP_GROUP = 'group.studio.northbyte.veezy';
const STORAGE_KEY = 'visions';

type WidgetEntry = {
    phrase: string;
    imagePath: string; // relativ zum App Group Container, z.B. "vision-images/<userId>/<visionId>.jpg"
    category?: string;
};

export class WidgetBridge {
    /**
     * Syncs all visions to the App Group container.
     * Only writes images that don't exist yet — use updateImage() when a vision's image changes.
     */
    static async sync(visions: Vision[]): Promise<void> {
        const appGroupDir = Paths.appleSharedContainers[APP_GROUP];
        if (!appGroupDir) return;

        const isPremium = useUserDataStore.getState().isPremium;
        if (!isPremium) visions = visions.slice(0, 3);

        // Remove widget images that no longer have a corresponding vision
        const activeWidgetPaths = new Set(visions.map((v) => `${v.imagePath}.jpg`));
        for (const vision of visions) {
            const dir = new Directory(appGroupDir, `vision-images/${vision.imagePath.split('/')[1]}`);
            if (!dir.exists) continue;
            for (const file of dir.list()) {
                const relativePath = `vision-images/${vision.imagePath.split('/')[1]}/${file.name}`;
                if (!activeWidgetPaths.has(relativePath)) file.delete();
            }
        }

        const storage = new ExtensionStorage(APP_GROUP);

        const entries: WidgetEntry[] = await Promise.all(
            visions.map(async (vision) => {
                const widgetPath = `${vision.imagePath}.jpg`;
                const dest = new File(appGroupDir, widgetPath);

                if (!dest.exists) {
                    if (!dest.parentDirectory.exists) dest.parentDirectory.create({ intermediates: true });
                    const compressedUri = await prepareForWidget(MediaHandler.toUri(vision.imagePath), vision.id);
                    new File(compressedUri).copy(dest);
                }

                return { phrase: vision.phrase, imagePath: widgetPath, category: vision.category };
            })
        );

        storage.set(STORAGE_KEY, JSON.stringify(entries));
        ExtensionStorage.reloadWidget();

        devLog('Widget synced', entries);
    }

    /**
     * Overwrites a single vision's widget image.
     * Call this after a vision's image is regenerated.
     */
    static async updateImage(imagePath: string, visionId: string): Promise<void> {
        const appGroupDir = Paths.appleSharedContainers[APP_GROUP];
        if (!appGroupDir) return;

        const widgetPath = `${imagePath}.jpg`;
        const dest = new File(appGroupDir, widgetPath);

        if (!dest.parentDirectory.exists) dest.parentDirectory.create({ intermediates: true });

        const compressedUri = await prepareForWidget(MediaHandler.toUri(imagePath), visionId);
        if (dest.exists) dest.delete();
        new File(compressedUri).copy(dest);

        ExtensionStorage.reloadWidget();
    }
}
