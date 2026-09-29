import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];
export const STORAGE_KEY = 'pollee_language';

const getInitialLanguage = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LANGUAGES.includes(stored)) return stored;
  return 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

export const changeLanguage = (lang) => {
  if (!LANGUAGES.includes(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
};

export default i18n;