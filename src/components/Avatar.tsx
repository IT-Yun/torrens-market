import { Image, StyleSheet, Text, View } from 'react-native';
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
  // Country-code text badge: flag emoji (two regional indicators) renders as
  // split tofu glyphs under the RN new-architecture Release text layout.
  const flag = nationality && /^[A-Za-z]{2}$/.test(nationality) ? nationality.toUpperCase() : null;
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
          <Text style={[styles.flagText, { fontSize: Math.max(9, size * 0.17) }]}>{flag}</Text>
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
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  flagText: { color: colors.white, fontWeight: '700', letterSpacing: 0.5 },
});
