import { Image, StyleSheet, Text, View } from 'react-native';
import { flagEmoji } from '../lib/format';
import { colors } from '../theme';

/**
 * Profile avatar: photo if available, otherwise initial on a tinted circle.
 * When a nationality is set, a small flag badge overlaps the bottom-right.
 */
export function Avatar({
  name,
  url,
  nationality,
  size = 48,
}: {
  name: string | null | undefined;
  url?: string | null;
  nationality?: string | null;
  size?: number;
}) {
  const flag = flagEmoji(nationality);
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={{ width: size, height: size }}>
      {url ? (
        <Image source={{ uri: url }} style={round} />
      ) : (
        <View style={[styles.fallback, round]}>
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
            {(name ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      {flag && (
        <View style={[styles.flagBadge, { borderRadius: size * 0.18 }]}>
          <Text style={{ fontSize: Math.max(12, size * 0.24) }}>{flag}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontWeight: '700', color: colors.primary },
  flagBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: colors.white,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
