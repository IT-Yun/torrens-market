import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ChevronLeft, MapPin } from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
import { ListingRow } from '../../src/components/ListingRow';
import { TrustBadge } from '../../src/components/TrustBadge';
import { fetchListingStats, fetchSellerListings, type ListingCard } from '../../src/lib/listings';
import { getPositionIfGranted } from '../../src/lib/location';
import { fetchTrust, type ProfileTrust } from '../../src/lib/reviews';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/theme';

type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  suburb: string | null;
  suburb_verified_at: string | null;
  nationality: string | null;
  is_phone_verified: boolean;
};

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [trust, setTrust] = useState<ProfileTrust | null>(null);
  const [stats, setStats] = useState<{ active: number; sold: number } | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, suburb, suburb_verified_at, nationality, is_phone_verified')
      .eq('id', id)
      .single()
      .then(({ data }) => setProfile((data as PublicProfile) ?? null));
    fetchTrust(id).then(setTrust).catch(() => {});
    fetchListingStats(id).then(setStats).catch(() => {});
    fetchSellerListings(id).then(setListings).catch(() => {});
    getPositionIfGranted().then((p) => p && setPos(p)).catch(() => {});
  }, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{profile?.display_name ?? ''}</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingRow item={item} viewerPos={pos} />}
        ListHeaderComponent={
          profile && (
            <>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar
                  name={profile.display_name}
                  url={profile.avatar_url}
                  nationality={profile.nationality}
                  size={64}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{profile.display_name}</Text>
                    {profile.is_phone_verified && <BadgeCheck size={17} color={colors.primary} />}
                  </View>
                  <View style={styles.nameRow}>
                    {profile.suburb_verified_at && <MapPin size={13} color={colors.primary} />}
                    <Text style={styles.meta}>
                      {[
                        profile.suburb,
                        profile.nationality ? t(`nationalities.${profile.nationality}`) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.statStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{stats?.active ?? '–'}</Text>
                  <Text style={styles.statLabel}>{t('myListings.status.active')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{stats?.sold ?? '–'}</Text>
                  <Text style={styles.statLabel}>{t('myListings.status.sold')}</Text>
                </View>
                <View style={styles.statDivider} />
                <Pressable
                  style={styles.statCol}
                  onPress={() =>
                    router.push({
                      pathname: '/my-reviews',
                      params: { profileId: profile.id, name: profile.display_name },
                    })
                  }
                  accessibilityRole="button"
                >
                  <TrustBadge trust={trust} compact />
                  <Text style={styles.statLabel}>{t('trust.tierLabel')}</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.sectionTitle}>{t('profile.sellingSection')}</Text>
          </>
          )
        }
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('home.empty')}</Text>}
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
  card: {
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textSecondary },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
