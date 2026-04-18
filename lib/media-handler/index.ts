import { File, Paths } from 'expo-file-system';
import { useUserDataStore } from '@/stores/UserDataStore';

export class MediaHandler {

    static toUri(relativePath: string): string {
        return `${Paths.document.uri}${relativePath}`;
    }

    static exists(relativePath: string): boolean {
        return new File(Paths.document, relativePath).exists;
    }

    static async saveFromRemote(remoteUrl: string, relativePath: string): Promise<string> {
        const dest = new File(Paths.document, relativePath);
        if (!dest.parentDirectory.exists) {
            dest.parentDirectory.create({ intermediates: true });
        }
        if (dest.exists) dest.delete();
        await File.downloadFileAsync(remoteUrl, dest);
        return relativePath;
    }

    static saveFromLocal(sourceUri: string, relativePath: string): string {
        const dest = new File(Paths.document, relativePath);
        if (!dest.parentDirectory.exists) {
            dest.parentDirectory.create({ intermediates: true });
        }
        const source = new File(sourceUri);
        if (dest.exists) dest.delete();
        source.copy(dest);
        return relativePath;
    }

    static delete(relativePath: string): void {
        const file = new File(Paths.document, relativePath);
        if (file.exists) file.delete();
    }

    static async resolveUri(relativePath: string): Promise<string> {
        if (MediaHandler.exists(relativePath)) {
            return MediaHandler.toUri(relativePath);
        }
        try {
            const userId = useUserDataStore.getState().userId;
            if (!userId) return MediaHandler.toUri(relativePath);
            const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
            const res = await fetch(
                `${BACKEND_URL}/user-data/signed-url?key=${encodeURIComponent(relativePath)}`,
                { headers: { 'x-rc-user-id': userId } },
            );
            if (!res.ok) return MediaHandler.toUri(relativePath);
            const { url } = await res.json() as { url: string };
            await MediaHandler.saveFromRemote(url, relativePath);
        } catch {
            // silently fall back — image will appear broken
        }
        return MediaHandler.toUri(relativePath);
    }
}
