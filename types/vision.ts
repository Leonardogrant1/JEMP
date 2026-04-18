export type VisionCategory =
    | 'wealth'
    | 'body'
    | 'lifestyle'
    | 'relationships'
    | 'mindset'
    | 'purpose';

export type Vision = {
    id: string
    title: string
    phrase: string
    category: VisionCategory
    imagePath: string
    createdAt: string
    imageVersion: number
    affirmationsAffirmation?: string[]
    affirmationsFuel?: string[]
}
