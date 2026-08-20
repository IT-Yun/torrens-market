import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/BackButton';
import { useSession } from '../src/lib/session';
import { supabase } from '../src/lib/supabase';
import { colors, radius, spacing } from '../src/theme';

const PREF_KEYS = ['keyword_alerts', 'chat', 'offers', 'meetups', 'price_drops'] as const;

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(
      PREF_KEYS.map((key) => [key, (profile?.notification_prefs as Record<string, boolean>)?.[key] ?? true]),
    ),
  );

  async function toggle(key: string, value: boolean) {
    if (!session) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: next })
      .eq('id', session.user.id);
    if (error) setPrefs(prefs); // revert on failure
    else refreshProfile().catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{t('notifPrefs.title')}</Text>
        <View style={{ width: 28 }} />
      </View>
      <Text style={styles.hint}>{t('notifPrefs.hint')}</Text>
      <View style={styles.group}>
        {PREF_KEYS.map((key, index) => (
          <View key={key}>
            {index > 0 && <View style={styles.separator} />}
            <View style={styles.row}>
              <Text style={styles.rowText}>{t(`notifPrefs.${key}`)}</Text>
              <Switch
                value={prefs[key]}
                onValueChange={(value) => toggle(key, value)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.md, marginTop: 4 },
  group: {
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowText: { fontSize: 15, color: colors.text },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md },
});
