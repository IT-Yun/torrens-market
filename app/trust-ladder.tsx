import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/BackButton';
import { useSession } from '../src/lib/session';
import { TRUST_TIERS } from '../src/lib/trust';
import { colors, radius, spacing } from '../src/theme';

const TIER_EMOJI: Record<string, string> = {
  quokka: '🐿️',
  bilby: '🐰',
  koala: '🐨',
  wombat: '🦫',
  wallaby: '🦘',
  kangaroo: '👑',
};

export default function TrustLadderScreen() {
  const { t } = useTranslation();
  useSession(); // keep session context warm for the back stack

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{t('trustLadder.title')}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('trustLadder.intro')}</Text>

        {[...TRUST_TIERS].map((tier, index) => (
          <View key={tier.slug} style={[styles.tierCard, { borderColor: tier.color }]}>
            <View style={[styles.emojiRing, { backgroundColor: `${tier.color}22` }]}>
              <Text style={{ fontSize: 26 }}>{TIER_EMOJI[tier.slug]}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.tierName, { color: tier.color }]}>
                Lv.{index + 1} {t(`trust.${tier.slug}`)}
              </Text>
              <Text style={styles.tierPoints}>
                {t('trustLadder.pointsNeeded', { points: tier.min })}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>{t('trustLadder.howTitle')}</Text>
          <Text style={styles.howText}>{t('trustLadder.how1')}</Text>
          <Text style={styles.howText}>{t('trustLadder.how2')}</Text>
          <Text style={styles.howText}>{t('trustLadder.how3')}</Text>
        </View>
      </ScrollView>
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
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xs },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  emojiRing: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: { fontSize: 16, fontWeight: '800' },
  tierPoints: { fontSize: 13, color: colors.textSecondary },
  howCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  howTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  howText: { fontSize: 13, color: colors.text, lineHeight: 19 },
});
