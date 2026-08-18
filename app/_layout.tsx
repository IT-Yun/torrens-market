import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import '../src/lib/i18n';
import { loadStoredLanguage } from '../src/lib/i18n';
import { registerPushToken } from '../src/lib/notifications';
import { SessionProvider, useSession } from '../src/lib/session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function routeFromNotification(data: unknown) {
  const d = (data ?? {}) as { roomId?: string; listingId?: string };
  if (d.roomId) router.push(`/chat/${d.roomId}`);
  else if (d.listingId) router.push(`/listing/${d.listingId}`);
}

/** Registers the push token on sign-in and routes notification taps. */
function PushBridge() {
  const { session } = useSession();

  useEffect(() => {
    if (session) registerPushToken(session.user.id).catch(() => {});
  }, [session]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotification(response.notification.request.content.data);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) routeFromNotification(response.notification.request.content.data);
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <SessionProvider>
      <PushBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
