import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../src/lib/i18n';
import { loadStoredLanguage } from '../src/lib/i18n';
import { SessionProvider } from '../src/lib/session';

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
