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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BackButton } from '../src/components/BackButton';
import { usePromptSheet } from '../src/components/PromptSheet';
import { Button } from '../src/components/ui';
import { submitFeedback, type FeedbackKind } from '../src/lib/feedback';
import { GuestCta } from '../src/components/GuestCta';
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';

const KINDS: FeedbackKind[] = ['bug', 'suggestion', 'other'];

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const sheet = usePromptSheet();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!session || !message.trim()) return;
    setBusy(true);
    try {
      await submitFeedback(session.user.id, kind, message);
      sheet.showToast(t('feedback.done'));
      router.back();
    } catch (e) {
      Alert.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }


  if (!session) return <GuestCta emoji="💬" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{t('feedback.title')}</Text>
        <View style={{ width: 28 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>{t('feedback.hint')}</Text>
          <View style={styles.kindRow}>
            {KINDS.map((k) => (
              <Pressable
                key={k}
                style={[styles.chip, kind === k && styles.chipSelected]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.chipText, kind === k && { color: colors.white }]}>
                  {t(`feedback.kind_${k}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.textarea}
            placeholder={t('feedback.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Button
            title={t('feedback.submit')}
            loading={busy}
            disabled={!message.trim()}
            onPress={send}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: spacing.md, gap: spacing.md },
  hint: { fontSize: 13, color: colors.textSecondary },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
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
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 140,
    backgroundColor: colors.white,
  },
});
