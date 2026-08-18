import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PawPrint, Star } from 'lucide-react-native';
import type { ProfileTrust } from '../lib/reviews';
import { trustTier } from '../lib/trust';
import { colors, radius } from '../theme';

/**
 * Aussie-animal trust tier chip (ADR 008): paw + tier name in tier color,
 * with ★avg (count) alongside when reviews exist.
 */
export function TrustBadge({ trust, compact }: { trust: ProfileTrust | null; compact?: boolean }) {
  const { t } = useTranslation();
  const tier = trustTier(trust?.trust_points ?? 0);
  return (
    <View style={styles.row}>
      <View style={[styles.chip, { borderColor: tier.color }]}>
        <PawPrint size={12} color={tier.color} />
        <Text style={[styles.chipText, { color: tier.color }]}>{t(`trust.${tier.slug}`)}</Text>
      </View>
      {!compact && trust && trust.review_count > 0 && (
        <View style={styles.stars}>
          <Star size={12} color={colors.textSecondary} fill={colors.textSecondary} />
          <Text style={styles.starsText}>
            {trust.avg_rating.toFixed(1)} ({trust.review_count})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsText: { fontSize: 12, color: colors.textSecondary },
});
