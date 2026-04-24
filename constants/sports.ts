export type SportItem = { slug: string; label: string };

export const SPORT_GROUPS: { title: string; sports: SportItem[] }[] = [
    {
        title: 'Kampfsport',
        sports: [
            { slug: 'boxing', label: 'Boxen' },
            { slug: 'mma', label: 'MMA' },
            { slug: 'wrestling', label: 'Wrestling' },
            { slug: 'judo', label: 'Judo' },
            { slug: 'bjj', label: 'BJJ' },
            { slug: 'kickboxing', label: 'Kickboxen' },
            { slug: 'karate', label: 'Karate' },
            { slug: 'taekwondo', label: 'Taekwondo' },
        ],
    },
    {
        title: 'Teamsport',
        sports: [
            { slug: 'football', label: 'American Football' },
            { slug: 'basketball', label: 'Basketball' },
            { slug: 'volleyball', label: 'Volleyball' },
            { slug: 'handball', label: 'Handball' },
            { slug: 'rugby', label: 'Rugby' },
            { slug: 'hockey', label: 'Hockey' },
            { slug: 'soccer', label: 'Fußball' },
        ],
    },
    {
        title: 'Leichtathletik',
        sports: [
            { slug: 'sprinting', label: 'Sprint' },
            { slug: 'jumping', label: 'Sprung' },
            { slug: 'throwing', label: 'Wurf' },
        ],
    },
    {
        title: 'Kraft',
        sports: [
            { slug: 'powerlifting', label: 'Powerlifting' },
            { slug: 'weightlifting', label: 'Gewichtheben' },
            { slug: 'crossfit', label: 'CrossFit' },
            { slug: 'bodybuilding', label: 'Bodybuilding' },
        ],
    },
    {
        title: 'Ausdauer',
        sports: [
            { slug: 'running', label: 'Laufen' },
            { slug: 'cycling', label: 'Radfahren' },
            { slug: 'swimming', label: 'Schwimmen' },
            { slug: 'triathlon', label: 'Triathlon' },
        ],
    },
    {
        title: 'Racket',
        sports: [
            { slug: 'tennis', label: 'Tennis' },
            { slug: 'badminton', label: 'Badminton' },
            { slug: 'squash', label: 'Squash' },
        ],
    },
    {
        title: 'Sonstiges',
        sports: [
            { slug: 'gymnastics', label: 'Turnen' },
            { slug: 'climbing', label: 'Klettern' },
            { slug: 'other', label: 'Anderes' },
        ],
    },
];

const SPORT_LABEL_MAP: Record<string, string> = Object.fromEntries(
    SPORT_GROUPS.flatMap(g => g.sports.map(s => [s.slug, s.label]))
);

export function getSportLabel(slug: string | null | undefined): string | null {
    if (!slug) return null;
    return SPORT_LABEL_MAP[slug] ?? null;
}
