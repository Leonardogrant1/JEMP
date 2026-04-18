

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const prepareForWidget = async (imagePath: string, visionId: string) => {
    // Widget Größe ist max ~400px breit — nicht 2K nötig!
    const context = ImageManipulator.manipulate(imagePath);

    context.resize({ width: 400 });

    const renderedImage = await context.renderAsync();
    const result = await renderedImage.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.85,
    });
    return result.uri;
};