import { useEffect, useState } from 'react';
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
import { BadgeCheck, Camera, ChevronLeft, MapPin } from 'lucide-react-native';
import { Avatar, PRESET_ANIMALS, PRESET_BGS } from '../../src/components/Avatar';
import { SuburbField } from '../../src/components/SuburbField';
import { Button, Field, Screen } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import { checkSuburbMatch } from '../../src/lib/location';
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

  // Cold-start recovery: if the profile arrives after mount (fetch raced the
  // token refresh), prefill the blank fields — and when the user is already
  // onboarded and this is NOT an explicit edit (no back stack), go home.
  useEffect(() => {
    if (!profile) return;
    setDisplayName((v) => (v === '' ? profile.display_name ?? '' : v));
    setSuburb((v) => (v === '' ? profile.suburb ?? '' : v));
    setNationality((v) => v ?? profile.nationality ?? null);
    if (profile.suburb && !router.canGoBack()) router.replace('/(tabs)/home');
  }, [profile]);
  const [nationality, setNationality] = useState<string | null>(profile?.nationality ?? null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePickerAsset | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<string | null>(
    profile?.avatar_url?.startsWith('preset:') ? profile.avatar_url.slice(7) : null,
  );
  const [busy, setBusy] = useState(false);
  const [suburbCheck, setSuburbCheck] = useState<'idle' | 'checking' | 'ok' | 'mismatch'>(
    profile?.suburb_verified_at && profile?.suburb ? 'ok' : 'idle',
  );
  const [detected, setDetected] = useState<string | null>(null);

  async function verifySuburb() {
    setSuburbCheck('checking');
    const result = await checkSuburbMatch(suburb.trim());
    setDetected(result.detected);
    setSuburbCheck(result.ok ? 'ok' : 'mismatch');
  }

  async function save() {
    if (!session) return;
    const nameChanged = displayName.trim() !== (profile?.display_name ?? '');
    // Client-side 30-day nickname cooldown — mirrors the DB trigger so the
    // request never reaches the trigger's error path (which hard-crashed
    // Hermes when surfaced from the response microtask).
    if (nameChanged && profile?.display_name_changed_at) {
      const nextAt = new Date(profile.display_name_changed_at).getTime() + 30 * 24 * 3600 * 1000;
      if (Date.now() < nextAt) {
        const date = new Date(nextAt).toLocaleDateString(
          i18n.language === 'zh' ? 'zh-CN' : i18n.language,
          { year: 'numeric', month: 'short', day: 'numeric' },
        );
        Alert.alert(t('profileSetup.nameCooldown'), t('profileSetup.nameCooldownUntil', { date }));
        return;
      }
    }
    setBusy(true);
    try {
      let avatarUrl = avatarPreset && !avatarAsset ? `preset:${avatarPreset}` : profile?.avatar_url ?? null;
      if (avatarAsset) avatarUrl = await uploadAvatar(session.user.id, avatarAsset);
      const patch: Record<string, unknown> = {
        suburb: suburb.trim(),
        suburb_verified_at: suburbCheck === 'ok' ? new Date().toISOString() : null,
        nationality,
        avatar_url: avatarUrl,
        preferred_language: i18n.language,
      };
      if (nameChanged) patch.display_name = displayName.trim();
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (e) {
      const msg = (e as Error).message ?? '';
      // Deferred: alerting synchronously from the rejection microtask
      // triggered a Hermes segfault on-device.
      setTimeout(() => {
        if (/once every 30 days/i.test(msg)) Alert.alert(t('profileSetup.nameCooldown'));
        else if (/row-level security|banned/i.test(msg)) Alert.alert(t('common.restricted'));
        else Alert.alert(msg || t('auth.error'));
      }, 50);
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
                if (asset) {
                  setAvatarAsset(asset);
                  setAvatarPreset(null);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profileSetup.photo')}
            >
              <Avatar
                name={displayName || profile?.display_name}
                url={
                  avatarAsset?.uri ??
                  (avatarPreset ? `preset:${avatarPreset}` : profile?.avatar_url)
                }
                nationality={nationality}
                size={96}
              />
              <View style={styles.cameraBadge}>
                <Camera size={16} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.photoHint}>{t('profileSetup.photoHint')}</Text>
            <Text style={styles.presetLabel}>{t('profileSetup.presetPick')}</Text>
            <View style={styles.presetRow}>
              {PRESET_ANIMALS.map((animal, i) => {
                const bgIdx = i % PRESET_BGS.length;
                const value = `${animal.key}:${bgIdx}`;
                const selected = avatarPreset === value && !avatarAsset;
                return (
                  <Pressable
                    key={animal.key}
                    style={[
                      styles.presetCircle,
                      { backgroundColor: PRESET_BGS[bgIdx] },
                      selected && styles.presetSelected,
                    ]}
                    onPress={() => {
                      setAvatarPreset(value);
                      setAvatarAsset(null);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 22 }}>{animal.emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <Field
              label={t('profileSetup.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={styles.note}>{t('profileSetup.nameCooldown')}</Text>
          </View>
          <SuburbField
            label={t('profileSetup.suburb')}
            placeholder={t('profileSetup.suburbPlaceholder')}
            value={suburb}
            onChangeText={(text) => {
              setSuburb(text);
              setSuburbCheck('idle');
            }}
          />
          {suburb.trim() !== '' &&
            (suburbCheck === 'ok' ? (
              <View style={styles.verifyRow}>
                <BadgeCheck size={15} color={colors.primary} />
                <Text style={styles.verifiedText}>{t('profileSetup.suburbVerified')}</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <Pressable
                  style={styles.verifyRow}
                  onPress={verifySuburb}
                  disabled={suburbCheck === 'checking'}
                  accessibilityRole="button"
                >
                  <MapPin size={15} color={colors.primary} />
                  <Text style={styles.verifyText}>
                    {suburbCheck === 'checking' ? '…' : t('profileSetup.verifyLocation')}
                  </Text>
                </Pressable>
                {suburbCheck === 'mismatch' &&
                  (detected ? (
                    <Pressable
                      onPress={() => {
                        setSuburb(detected);
                        setSuburbCheck('idle');
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.mismatchText}>
                        {t('profileSetup.locationMismatch', { suburb: detected })}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.mismatchText}>{t('profileSetup.locationUnavailable')}</Text>
                  ))}
              </View>
            ))}

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
  presetLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  presetCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSelected: { borderColor: colors.primary },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  verifyText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  verifiedText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  mismatchText: { fontSize: 12, color: colors.textSecondary, textDecorationLine: 'underline' },
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
