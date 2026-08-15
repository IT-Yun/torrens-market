import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Screen } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/theme';

const NATIONALITY_CODES = ['CN', 'KR', 'AU', 'IN', 'VN', 'JP', 'MY', 'HK', 'TW', 'OTHER'];

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [suburb, setSuburb] = useState(profile?.suburb ?? '');
  const [nationality, setNationality] = useState<string | null>(profile?.nationality ?? null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        suburb: suburb.trim(),
        nationality,
        preferred_language: i18n.language,
      })
      .eq('id', session.user.id);
    setBusy(false);
    if (error) {
      Alert.alert(error.message);
      return;
    }
    await refreshProfile();
    router.replace('/(tabs)/home');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.lg }}>
        {router.canGoBack() && (
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{t('profileSetup.title')}</Text>

        <Field
          label={t('profileSetup.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Field
          label={t('profileSetup.suburb')}
          placeholder={t('profileSetup.suburbPlaceholder')}
          value={suburb}
          onChangeText={setSuburb}
        />

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.label}>{t('profileSetup.nationality')}</Text>
          <Text style={styles.note}>{t('profileSetup.nationalityNote')}</Text>
          <View style={styles.chips}>
            {NATIONALITY_CODES.map((codeKey) => {
              const selected = nationality === codeKey;
              return (
                <Pressable
                  key={codeKey}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setNationality(selected ? null : codeKey)}
                >
                  <Text style={[styles.chipText, selected && { color: colors.white }]}>
                    {t(`nationalities.${codeKey}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title={t('profileSetup.done')}
          loading={busy}
          disabled={!displayName.trim() || !suburb.trim()}
          onPress={save}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 32, color: colors.text, lineHeight: 34 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  note: { fontSize: 12, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
});
