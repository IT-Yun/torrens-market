import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../src/theme';

export default function ChatScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.empty}>
        <Text style={styles.emoji}>💬</Text>
        <Text style={styles.text}>{t('chat.empty')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emoji: { fontSize: 44 },
  text: { fontSize: 15, color: colors.textSecondary },
});
