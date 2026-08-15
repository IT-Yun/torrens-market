import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import {
  fetchCategories,
  fetchListing,
  formatPrice,
  photoUrl,
  type Category,
  type ListingDetail,
} from '../../src/lib/listings';
import { colors, radius, spacing } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const lang = i18n.language;

  useEffect(() => {
    if (id) fetchListing(id).then(setListing).catch(() => {});
    fetchCategories().then(setCategories).catch(() => {});
  }, [id]);

  const category = useMemo(
    () => categories.find((c) => c.id === listing?.category_id) ?? null,
    [categories, listing],
  );

  if (!listing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const photos = [...listing.listing_photos].sort((a, b) => a.sort_order - b.sort_order);
  const attributeRows = (category?.field_template ?? [])
    .filter((f) => f.type !== 'photo' && listing.attributes[f.key] != null && listing.attributes[f.key] !== '')
    .map((f) => ({
      label: f.label_i18n[lang] ?? f.label_i18n.en ?? f.key,
      value:
        f.type === 'boolean'
          ? t(listing.attributes[f.key] ? 'listingCreate.yes' : 'listingCreate.no')
          : `${listing.attributes[f.key]}${f.unit ? ` ${f.unit}` : ''}`,
    }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      </View>
      <ScrollView>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.length > 0 ? (
            photos.map((p) => (
              <Image key={p.storage_path} source={{ uri: photoUrl(p.storage_path) }} style={styles.photo} />
            ))
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={{ fontSize: 40 }}>📦</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price_cents)}</Text>
          <Text style={styles.meta}>
            {[listing.suburb, t(`conditions.${listing.condition}`), t(`pickupModes.${listing.pickup_mode}`)].join(' · ')}
          </Text>

          {attributeRows.length > 0 && (
            <View style={styles.attrCard}>
              <Text style={styles.attrTitle}>{t('listingDetail.detailsTitle')}</Text>
              {attributeRows.map((row) => (
                <View key={row.label} style={styles.attrRow}>
                  <Text style={styles.attrLabel}>{row.label}</Text>
                  <Text style={styles.attrValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

          <View style={styles.sellerCard}>
            <Text style={styles.attrTitle}>{t('listingDetail.sellerTitle')}</Text>
            <Text style={styles.sellerName}>
              {listing.profiles.display_name}
              {listing.profiles.is_phone_verified ? `  ✓ ${t('profile.verified')}` : ''}
            </Text>
            <Text style={styles.meta}>
              {[
                listing.profiles.suburb,
                listing.profiles.nationality ? t(`nationalities.${listing.profiles.nationality}`) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* Chat flow lands in M4 */}
        <Button title={t('listingDetail.chat')} onPress={() => Alert.alert('M4 🚧')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  back: { fontSize: 32, color: colors.text, lineHeight: 34 },
  photo: { width, height: width * 0.9, backgroundColor: colors.surface },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.primary },
  meta: { fontSize: 13, color: colors.textSecondary },
  attrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  attrTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between' },
  attrLabel: { fontSize: 14, color: colors.textSecondary },
  attrValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: spacing.sm },
  sellerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sellerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
