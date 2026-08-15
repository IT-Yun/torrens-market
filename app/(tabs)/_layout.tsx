import { useCallback, useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart, Home, MessageCircle, User } from 'lucide-react-native';
import { fetchUnreadCount } from '../../src/lib/chat';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    if (session) fetchUnreadCount(session.user.id).then(setUnread).catch(() => {});
  }, [session]);

  useEffect(() => {
    refreshUnread();
    if (!session) return;
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshUnread)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_participants' },
        refreshUnread,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, refreshUnread]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, focused }) => (
            <Heart size={24} color={color} strokeWidth={2} fill={focused ? color : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} strokeWidth={2} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.white, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
