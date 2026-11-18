import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '../theme';

/**
 * Standard back button: 44pt touch target (Apple HIG minimum) — replaces
 * the old bare-glyph backs that were hard to tap (device-QA feedback).
 */
export function BackButton({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={10}
      style={{ padding: 8, margin: -8 }}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
    >
      <ChevronLeft size={28} color={colors.text} strokeWidth={2.2} />
    </Pressable>
  );
}
