import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import ko from '../locales/ko.json';
import zh from '../locales/zh.json';

export type AppLanguage = 'ko' | 'en' | 'zh';
export const LANGUAGE_STORAGE_KEY = 'torrens.language';

export const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return code === 'ko' || code === 'zh' ? code : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ko: { translation: ko }, zh: { translation: zh } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Returns the stored language, or null if the user hasn't chosen one yet. */
export async function loadStoredLanguage(): Promise<AppLanguage | null> {
  const stored = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) as AppLanguage | null;
  if (stored) await i18n.changeLanguage(stored);
  return stored;
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
