export type SelfReferenceImages = {
    face_front:  string | null
    face_left:   string | null
    face_right:  string | null
    face_smile:  string | null
    body:        string | null
}

export type MotivationStyle = 'affirmation' | 'fuel'

export type PrimaryCategory = 'wealth' | 'lifestyle' | 'body' | 'mindset'

export type UserData = {
    userId: string
    hasOnboarded: boolean
    hasSeenTutorial: boolean
    name: string
    birthday: string | null
    gender: 'male' | 'female' | 'other'
    notifications: boolean
    notificationsPerDay: number
    notificationStartHour: number
    notificationEndHour: number
    haptics: boolean
    imagesUsed: number
    isPremium: boolean
    selfReferenceImages: SelfReferenceImages
    motivationStyle: MotivationStyle
    primaryCategory: PrimaryCategory | null
    visionDescription: string
    language: 'de' | 'en'
}

export function calculateAge(birthday: string): number {
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}
