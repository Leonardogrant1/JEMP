export type SportItem = { slug: string; label: string };

export const SPORT_GROUPS: { title: string; titleKey: string; sports: SportItem[] }[] = [
    {
        title: 'Kampfsport',
        titleKey: 'sport_group.martial_arts',
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
        titleKey: 'sport_group.team',
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
        titleKey: 'sport_group.athletics',
        sports: [
            { slug: 'sprinting', label: 'Sprint' },
            { slug: 'jumping', label: 'Sprung' },
            { slug: 'throwing', label: 'Wurf' },
        ],
    },
    {
        title: 'Kraft',
        titleKey: 'sport_group.strength',
        sports: [
            { slug: 'powerlifting', label: 'Powerlifting' },
            { slug: 'weightlifting', label: 'Gewichtheben' },
            { slug: 'crossfit', label: 'CrossFit' },
            { slug: 'bodybuilding', label: 'Bodybuilding' },
        ],
    },
    {
        title: 'Ausdauer',
        titleKey: 'sport_group.endurance',
        sports: [
            { slug: 'running', label: 'Laufen' },
            { slug: 'cycling', label: 'Radfahren' },
            { slug: 'swimming', label: 'Schwimmen' },
            { slug: 'triathlon', label: 'Triathlon' },
        ],
    },
    {
        title: 'Racket',
        titleKey: 'sport_group.racket',
        sports: [
            { slug: 'tennis', label: 'Tennis' },
            { slug: 'badminton', label: 'Badminton' },
            { slug: 'squash', label: 'Squash' },
        ],
    },
    {
        title: 'Sonstiges',
        titleKey: 'sport_group.other',
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

/** @deprecated Use getSportLabelI18n(slug, t) for localized labels */
export function getSportLabel(slug: string | null | undefined): string | null {
    if (!slug) return null;
    return SPORT_LABEL_MAP[slug] ?? null;
}

export function getSportLabelI18n(slug: string | null | undefined, t: (key: string) => string): string | null {
    if (!slug) return null;
    return t(`sport.${slug}`);
}
