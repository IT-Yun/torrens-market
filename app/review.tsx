import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';
import { Button } from '../src/components/ui';
import { submitReview } from '../src/lib/reviews';
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { listingId, revieweeId, name } = useLocalSearchParams<{
    listingId: string;
    revieweeId: string;
    name: string;
  }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session || !listingId || !revieweeId) return;
    setBusy(true);
    try {
      await submitReview({
        listingId,
        reviewerId: session.user.id,
        revieweeId,
        rating,
        comment,
      });
      Alert.alert(t('review.done'));
      router.back();
    } catch (e) {
      Alert.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('review.title')}</Text>
          <Text style={styles.subtitle}>{t('review.ratePrompt', { name })}</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${n}`}
              >
                <Star
                  size={40}
                  color={n <= rating ? '#F5A623' : colors.border}
                  fill={n <= rating ? '#F5A623' : 'none'}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.comment}
            placeholder={t('review.commentPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
          />

          <Button title={t('review.submit')} loading={busy} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  comment: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
});
