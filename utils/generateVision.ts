const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type GenerateVisionResult = {
    phrase: string;
    category: string;
    imageUrl: string;   // signed URL for preview
    imageKey: string;
    visionId: string;
    affirmationsAffirmation: string[];
    affirmationsFuel: string[];
};

export type RegenerateVisionResult = {
    imageUrl: string;
    imageKey: string;
};

export async function regenerateVision(visionId: string, description: string, userId: string, existingPhrases?: string[], language: 'de' | 'en' = 'en'): Promise<RegenerateVisionResult> {
    const response = await fetch(`${BACKEND_URL}/vision/regenerate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rc-user-id': userId,
        },
        body: JSON.stringify({ visionId, visionDescription: description, existingPhrases, language }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Regeneration failed (${response.status})`);
    }

    const data = await response.json();
    return { imageUrl: data.signedUrl, imageKey: data.imageKey };
}

export async function generateVision(description: string, userId: string, existingPhrases?: string[], motivationStyle?: string, language: 'de' | 'en' = 'en'): Promise<GenerateVisionResult> {
    const response = await fetch(`${BACKEND_URL}/vision/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rc-user-id': userId,
        },
        body: JSON.stringify({ visionDescription: description, existingPhrases, motivationStyle, language }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Generation failed (${response.status})`);
    }

    const data = await response.json();
    return {
        phrase: data.phrase,
        category: data.category,
        imageUrl: data.signedUrl,
        imageKey: data.imageKey,
        visionId: data.visionId,
        affirmationsAffirmation: data.affirmationsAffirmation ?? [],
        affirmationsFuel: data.affirmationsFuel ?? [],
    };
}
