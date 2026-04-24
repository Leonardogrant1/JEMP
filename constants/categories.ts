import { Cyan, Electric } from './theme';

export type CategorySlug =
    | 'strength'
    | 'jumps'
    | 'lower_body_plyometrics'
    | 'upper_body_plyometrics'
    | 'mobility';

export interface CategoryMeta {
    color: string;
    bgColor: string;
    borderColor: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
    strength: {
        color: Electric[700],   // dark blue
        bgColor: `${Electric[700]}18`,
        borderColor: `${Electric[700]}30`,
    },
    jumps: {
        color: Electric[400],   // mid blue
        bgColor: `${Electric[400]}18`,
        borderColor: `${Electric[400]}30`,
    },
    lower_body_plyometrics: {
        color: Electric[200],   // light blue
        bgColor: `${Electric[200]}18`,
        borderColor: `${Electric[200]}30`,
    },
    upper_body_plyometrics: {
        color: Cyan[300],       // light teal
        bgColor: `${Cyan[300]}18`,
        borderColor: `${Cyan[300]}30`,
    },
    mobility: {
        color: Cyan[600],       // mid teal
        bgColor: `${Cyan[600]}18`,
        borderColor: `${Cyan[600]}30`,
    },
};

export function getCategoryMeta(slug: string): CategoryMeta {
    return CATEGORY_META[slug] ?? {
        color: Cyan[500],
        bgColor: `${Cyan[500]}18`,
        borderColor: `${Cyan[500]}30`,
    };
}

