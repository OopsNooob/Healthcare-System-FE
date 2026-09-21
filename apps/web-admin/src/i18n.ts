import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

// Initialize with default or saved language
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app_language') || 'vi';
  }
  return 'vi';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en.translation },
      vi: { translation: vi.translation }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_language', lng);
  }
});

export default i18n;
