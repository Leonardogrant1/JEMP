import i18n from '@/i18n';

/** @deprecated Use getCategoryLabel(slug, t) instead */
export const CATEGORY_LABELS: Record<string, string> = {
    strength: 'Kraft',
    jumps: 'Sprünge',
    lower_body_plyometrics: 'Unterkörper Plyometrie',
    upper_body_plyometrics: 'Oberkörper Plyometrie',
    mobility: 'Mobilität',
};

/** @deprecated Use getCategoryDescription(slug, t) instead */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    strength: 'Maximalkraft, Muskelaufbau und funktionelle Stärke.',
    jumps: 'Sprungkraft, Explosivität und vertikale Leistung.',
    lower_body_plyometrics: 'Reaktivkraft und Schnelligkeit im Unterkörper — z.B. für Sprints.',
    upper_body_plyometrics: 'Explosive Kraft im Oberkörper — z.B. für Schlagbewegungen, Würfe.',
    mobility: 'Beweglichkeit, Gelenkstabilität und Körperkontrolle.',
};

export type CategoryI18n = { en?: string | null; de?: string | null } | null | undefined

function pickI18n(data: CategoryI18n): string | null {
    if (!data) return null;
    const lang = i18n.language?.startsWith('de') ? 'de' : 'en';
    return data[lang] || data.en || data.de || null;
}

export function getCategoryLabel(
    slug: string,
    t: (key: string) => string,
    name_i18n?: CategoryI18n,
): string {
    return pickI18n(name_i18n) ?? t(`category.${slug}`);
}

export function getCategoryLabelShort(slug: string, t: (key: string) => string): string {
    return t(`category.${slug}_short`);
}

export function getCategoryDescription(
    slug: string,
    t: (key: string) => string,
    description_i18n?: CategoryI18n,
): string {
    return pickI18n(description_i18n) ?? t(`category.${slug}_desc`);
}
