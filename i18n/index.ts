import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en';
import de from './locales/de';

const DE_REGIONS = ['DE', 'AT', 'CH'];

export type AppLanguage = 'de' | 'en';

export function detectLanguage(): AppLanguage {
    const region = getLocales()[0]?.regionCode ?? '';
    return DE_REGIONS.includes(region) ? 'de' : 'en';
}

export function initI18n(language?: AppLanguage) {
    if (i18n.isInitialized) {
        if (language) i18n.changeLanguage(language);
        return i18n;
    }

    i18n.use(initReactI18next).init({
        resources: {
            en: { translation: en },
            de: { translation: de },
        },
        lng: language ?? detectLanguage(),
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        initImmediate: false,
    });

    return i18n;
}

export function changeLanguage(lang: AppLanguage) {
    i18n.changeLanguage(lang);
}

export default i18n;
