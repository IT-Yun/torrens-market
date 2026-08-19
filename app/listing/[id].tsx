import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui';
import { startChat } from '../../src/lib/chat';
import { isFavorite, toggleFavorite } from '../../src/lib/favorites';
import { blockUser, reportListing, type ReportReason } from '../../src/lib/moderation';
import i18n from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';
import {
  fetchCategories,
  fetchListing,
  fetchSellerListings,
  formatPrice,
  photoUrl,
  recordView,
  type Category,
  type ListingCard,
  type ListingDetail,
} from '../../src/lib/listings';
import {
  BadgeCheck,
  Car,
  ChevronRight,
  Footprints,
  Heart,
  MapPin,
  Package,
  X,
} from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { fetchTrust, type ProfileTrust } from '../../src/lib/reviews';
import { haversineKm, travelEstimate } from '../../src/lib/geo';
import { getPosition } from '../../src/lib/location';
import { colors, radius, spacing } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liked, setLiked] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [sellerTrust, setSellerTrust] = useState<ProfileTrust | null>(null);
  const [otherListings, setOtherListings] = useState<ListingCard[]>([]);
  const lang = i18n.language;

  useEffect(() => {
    if (!listing?.seller_id) return;
    fetchTrust(listing.seller_id).then(setSellerTrust).catch(() => {});
    fetchSellerListings(listing.seller_id, listing.id)
      .then(setOtherListings)
      .catch(() => {});
  }, [listing?.seller_id, listing?.id]);

  useEffect(() => {
    if (id) {
      fetchListing(id).then(setListing).catch(() => {});
      recordView(id);
      if (session) isFavorite(session.user.id, id).then(setLiked).catch(() => {});
    }
    fetchCategories().then(setCategories).catch(() => {});
  }, [id, session]);

  useEffect(() => {
    if (listing?.lat == null || listing?.lng == null) return;
    getPosition()
      .then((pos) => {
        if (pos) setDistanceKm(haversineKm(pos.lat, pos.lng, listing.lat!, listing.lng!));
      })
      .catch(() => {});
  }, [listing?.lat, listing?.lng]);

  function openModeration() {
    if (!session || !listing) return;
    const reasons: [string, ReportReason][] = [
      [t('report.spam'), 'spam'],
      [t('report.scam'), 'scam'],
      [t('report.inappropriate'), 'inappropriate'],
      [t('report.other'), 'other'],
    ];
    Alert.alert(t('report.menuTitle'), undefined, [
      {
        text: t('report.action'),
        onPress: () =>
          Alert.alert(
            t('report.reasonTitle'),
            undefined,
            reasons
              .map(([label, reason]) => ({
                text: label,
                onPress: async () => {
                  await reportListing(session.user.id, listing.id, listing.seller_id, reason).catch(
                    () => {},
                  );
                  Alert.alert(t('report.done'));
                },
              }))
              .concat([{ text: t('common.cancel'), onPress: async () => {} }]),
          ),
      },
      {
        text: t('block.action'),
        style: 'destructive',
        onPress: async () => {
          await blockUser(session.user.id, listing.seller_id).catch(() => {});
          Alert.alert(t('block.done'));
          router.back();
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function onToggleFavorite() {
    if (!session || !id) return;
    const next = !liked;
    setLiked(next);
    try {
      await toggleFavorite(session.user.id, id, next);
    } catch {
      setLiked(!next);
    }
  }

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.favorites')}
            accessibilityState={{ selected: liked }}
          >
            <Heart
              size={24}
              color={liked ? colors.primary : colors.textSecondary}
              fill={liked ? colors.primary : 'none'}
            />
          </Pressable>
          {session?.user.id !== listing.seller_id && (
            <Pressable
              onPress={openModeration}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('report.menuTitle')}
            >
              <Text style={styles.moreButton}>⋯</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {photos.length > 0 ? (
              photos.map((p) => (
                <Pressable
                  key={p.storage_path}
                  onPress={() => setViewerOpen(true)}
                  accessibilityRole="imagebutton"
                >
                  <Image source={{ uri: photoUrl(p.storage_path) }} style={styles.photo} />
                </Pressable>
              ))
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Package size={40} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
            )}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((p, i) => (
                <View key={p.storage_path} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.headerBlock}>
            {listing.status !== 'active' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {t(listing.status === 'sold' ? 'listingDetail.sold' : 'listingDetail.reserved')}
                </Text>
              </View>
            )}
            <Text style={styles.title}>{listing.title}</Text>
            {listing.price_cents === 0 ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>{t('common.free')}</Text>
              </View>
            ) : (
              <Text style={styles.price}>{formatPrice(listing.price_cents)}</Text>
            )}
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{t(`conditions.${listing.condition}`)}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{t(`pickupModes.${listing.pickup_mode}`)}</Text>
              </View>
              {listing.payment_method !== 'any' && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{t(`paymentMethods.${listing.payment_method}`)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.meta}>
              {[
                listing.suburb,
                listing.view_count > 0 ? t('listingDetail.views', { count: listing.view_count }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {distanceKm != null &&
            (() => {
              const est = travelEstimate(distanceKm);
              const km = distanceKm < 10 ? distanceKm.toFixed(1) : String(Math.round(distanceKm));
              return (
                <View style={styles.distanceRow}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.distanceText}>{t('listingDetail.distance', { km })}</Text>
                  {est.mode === 'walk' ? (
                    <Footprints size={14} color={colors.textSecondary} />
                  ) : (
                    <Car size={14} color={colors.textSecondary} />
                  )}
                  <Text style={styles.distanceText}>
                    {t(est.mode === 'walk' ? 'listingDetail.walkTime' : 'listingDetail.driveTime', {
                      min: est.minutes,
                    })}
                  </Text>
                </View>
              );
            })()}

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

          <Pressable
            style={styles.sellerCard}
            onPress={() => router.push(`/user/${listing.seller_id}`)}
            accessibilityRole="button"
          >
            <Avatar
              name={listing.profiles.display_name}
              url={listing.profiles.avatar_url}
              nationality={listing.profiles.nationality}
              size={44}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sellerName}>{listing.profiles.display_name}</Text>
                {listing.profiles.is_phone_verified && (
                  <>
                    <BadgeCheck size={15} color={colors.primary} />
                    <Text style={styles.verifiedText}>{t('profile.verified')}</Text>
                  </>
                )}
              </View>
              <TrustBadge trust={sellerTrust} />
              <Text style={styles.meta}>
                {[
                  listing.profiles.suburb,
                  listing.profiles.nationality
                    ? t(`nationalities.${listing.profiles.nationality}`)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <View style={styles.sellerCta}>
              <ChevronRight size={18} color={colors.textSecondary} />
              <Text style={styles.sellerCtaText}>{t('profile.viewProfile')}</Text>
            </View>
          </Pressable>

          {otherListings.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.attrTitle}>
                {t('listingDetail.moreFromSeller', { name: listing.profiles.display_name })}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {otherListings.map((other) => {
                    const thumb = [...other.listing_photos].sort(
                      (a, b) => a.sort_order - b.sort_order,
                    )[0];
                    return (
                      <Pressable
                        key={other.id}
                        style={styles.miniCard}
                        onPress={() => router.push(`/listing/${other.id}`)}
                        accessibilityRole="button"
                      >
                        {thumb ? (
                          <Image
                            source={{ uri: photoUrl(thumb.storage_path) }}
                            style={styles.miniPhoto}
                          />
                        ) : (
                          <View style={[styles.miniPhoto, styles.miniPlaceholder]}>
                            <Package size={20} color={colors.textSecondary} />
                          </View>
                        )}
                        <Text style={styles.miniTitle} numberOfLines={1}>
                          {other.title}
                        </Text>
                        <Text style={styles.miniPrice}>{formatPrice(other.price_cents, t('common.free'))}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {session?.user.id !== listing.seller_id && (
        <View style={styles.footer}>
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.footerHeart}>
            <Heart
              size={24}
              color={liked ? colors.primary : colors.textSecondary}
              fill={liked ? colors.primary : 'none'}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerPrice}>{formatPrice(listing.price_cents, t('common.free'))}</Text>
            <Text style={styles.footerMeta}>{t(`pickupModes.${listing.pickup_mode}`)}</Text>
          </View>
          <View style={{ width: 150 }}>
            <Button
              title={t('listingDetail.chat')}
              onPress={async () => {
                try {
                  const roomId = await startChat(listing.id);
                  router.push(`/chat/${roomId}`);
                } catch (e) {
                  Alert.alert((e as Error).message);
                }
              }}
            />
          </View>
        </View>
      )}
      <Modal visible={viewerOpen} transparent={false} animationType="fade">
        <View style={styles.viewer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: photoIndex * width, y: 0 }}
          >
            {photos.map((p) => (
              <Image
                key={p.storage_path}
                source={{ uri: photoUrl(p.storage_path) }}
                style={styles.viewerPhoto}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
          <Pressable
            style={styles.viewerClose}
            onPress={() => setViewerOpen(false)}
            hitSlop={12}
            accessibilityRole="button"
          >
            <X size={26} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontSize: 32, color: colors.text, lineHeight: 34 },
  heart: { fontSize: 24 },
  moreButton: { fontSize: 26, color: colors.text, fontWeight: '700' },
  photo: { width, height: width * 0.9, backgroundColor: colors.surface },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: spacing.sm },
  headerBlock: { gap: 6 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  price: { fontSize: 18, fontWeight: '800', color: colors.text },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeBadgeText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
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
    gap: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sellerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  verifiedText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  sellerCta: { alignItems: 'center', gap: 2 },
  sellerCtaText: { fontSize: 10, color: colors.textSecondary },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  miniCard: { width: 120, gap: 3 },
  miniPhoto: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.surface },
  miniPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  miniTitle: { fontSize: 13, color: colors.text },
  miniPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  viewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerPhoto: { width, height: '100%' },
  viewerClose: { position: 'absolute', top: 56, right: 20 },
  distanceText: { fontSize: 13, color: colors.textSecondary },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    opacity: 0.45,
  },
  dotActive: { opacity: 1 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerHeart: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: spacing.md,
  },
  footerPrice: { fontSize: 18, fontWeight: '800', color: colors.text },
  footerMeta: { fontSize: 12, color: colors.textSecondary },
});
