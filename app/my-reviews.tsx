import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';
import { TrustBadge } from '../src/components/TrustBadge';
import { fetchReviews, fetchTrust, type ProfileTrust, type Review } from '../src/lib/reviews';
import { timeAgo } from '../src/lib/format';
import { useSession } from '../src/lib/session';
import { TRUST_TIERS, trustTier } from '../src/lib/trust';
import { colors, radius, spacing } from '../src/theme';

export default function MyReviewsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { profileId, name } = useLocalSearchParams<{ profileId?: string; name?: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [trust, setTrust] = useState<ProfileTrust | null>(null);

  const targetId = profileId ?? session?.user.id;
  const isSelf = !profileId || profileId === session?.user.id;

  useFocusEffect(
    useCallback(() => {
      if (!targetId) return;
      fetchReviews(targetId).then(setReviews).catch(() => {});
      fetchTrust(targetId).then(setTrust).catch(() => {});
    }, [targetId]),
  );

  const tier = trustTier(trust?.trust_points ?? 0);
  const nextTier = tier.level < TRUST_TIERS.length ? TRUST_TIERS[tier.level] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>
          {isSelf ? t('review.received') : t('review.reviewsOf', { name: name ?? '' })}
        </Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.badgeRow}>
        <TrustBadge trust={trust} />
        {isSelf && nextTier && (
          <Text style={styles.nextTier}>
            {t('trust.nextTier', {
              count: nextTier.min - (trust?.trust_points ?? 0),
              name: t(`trust.${nextTier.slug}`),
            })}
          </Text>
        )}
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.reviewer}>
                {isSelf ? item.profiles?.display_name ?? '?' : t('review.anonymous')}
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={13}
                    color={n <= item.rating ? '#F5A623' : colors.border}
                    fill={n <= item.rating ? '#F5A623' : 'none'}
                  />
                ))}
              </View>
              <Text style={styles.age}>{timeAgo(item.created_at)}</Text>
            </View>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Star size={40} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>{t('review.empty')}</Text>
          </View>
        }
        contentContainerStyle={reviews.length === 0 ? { flex: 1 } : { padding: spacing.md, gap: spacing.sm }}
      />
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
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  badgeRow: { alignItems: 'center', paddingBottom: spacing.sm, gap: 4 },
  nextTier: { fontSize: 12, color: colors.textSecondary },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewer: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  stars: { flexDirection: 'row', gap: 1 },
  age: { fontSize: 12, color: colors.textSecondary },
  comment: { fontSize: 14, color: colors.text, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
