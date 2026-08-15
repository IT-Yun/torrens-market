import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Camera, ChevronLeft } from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
import { SuburbField } from '../../src/components/SuburbField';
import { Button, Field, Screen } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import { pickAvatar, uploadAvatar } from '../../src/lib/profile';
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
  const [avatarAsset, setAvatarAsset] = useState<ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!session) return;
    setBusy(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarAsset) avatarUrl = await uploadAvatar(session.user.id, avatarAsset);
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          suburb: suburb.trim(),
          nationality,
          avatar_url: avatarUrl,
          preferred_language: i18n.language,
        })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {router.canGoBack() && (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
              <ChevronLeft size={28} color={colors.text} />
            </Pressable>
          )}
          <Text style={styles.title}>{t('profileSetup.title')}</Text>

          <View style={styles.avatarWrap}>
            <Pressable
              onPress={async () => {
                const asset = await pickAvatar();
                if (asset) setAvatarAsset(asset);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profileSetup.photo')}
            >
              <Avatar
                name={displayName || profile?.display_name}
                url={avatarAsset?.uri ?? profile?.avatar_url}
                nationality={nationality}
                size={96}
              />
              <View style={styles.cameraBadge}>
                <Camera size={16} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.photoHint}>{t('profileSetup.photoHint')}</Text>
          </View>

          <Field
            label={t('profileSetup.displayName')}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <SuburbField
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
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  avatarWrap: { alignItems: 'center', gap: spacing.xs },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  photoHint: { fontSize: 12, color: colors.textSecondary },
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
