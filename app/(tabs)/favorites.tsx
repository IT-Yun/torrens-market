import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { ListingRow } from '../../src/components/ListingRow';
import { fetchFavorites } from '../../src/lib/favorites';
import type { ListingCard } from '../../src/lib/listings';
import { GuestCta } from '../../src/components/GuestCta';
import { useSession } from '../../src/lib/session';
import { colors, spacing } from '../../src/theme';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [items, setItems] = useState<ListingCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (session) fetchFavorites(session.user.id).then(setItems).catch(() => {});
    }, [session]),
  );


  if (!session) return <GuestCta emoji="🐨" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingRow item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🐨</Text>
            <Text style={styles.text}>{t('favorites.empty')}</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emoji: { fontSize: 44 },
  text: { fontSize: 15, color: colors.textSecondary },
});
