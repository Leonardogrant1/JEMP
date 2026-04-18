import * as ImagePicker from 'expo-image-picker';

interface PickImageOptions {
    aspect?: [number, number];
    quality?: number;
    cameraType?: ImagePicker.CameraType;
}

const DEFAULTS: PickImageOptions = {
    aspect: [3, 4],
    quality: 0.85,
    cameraType: ImagePicker.CameraType.front,
};

/**
 * Opens the photo library and returns the selected image URI, or null if cancelled.
 */
export async function pickFromGallery(options?: PickImageOptions): Promise<string | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: options?.aspect ?? DEFAULTS.aspect,
        quality: options?.quality ?? DEFAULTS.quality,
    });

    return result.canceled ? null : result.assets[0].uri;
}

/**
 * Opens the camera and returns the captured image URI, or null if cancelled.
 */
export async function pickFromCamera(options?: PickImageOptions): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: options?.aspect ?? DEFAULTS.aspect,
        quality: options?.quality ?? DEFAULTS.quality,
        cameraType: options?.cameraType ?? DEFAULTS.cameraType
    });

    return result.canceled ? null : result.assets[0].uri;
}
