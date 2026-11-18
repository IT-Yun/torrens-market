import { Image, StyleSheet, Text, View } from 'react-native';
import { flagEmoji } from '../lib/format';
import { colors } from '../theme';

/**
 * Australian-themed preset avatars (emoji — license-free, OTA-friendly).
 * 12 animals × 6 pastel backgrounds = 72 combinations. Users with no photo
 * get a stable per-user "random" preset derived from their id, so defaults
 * rarely collide visibly.
 */
export const PRESET_ANIMALS = [
  { key: 'koala', emoji: '🐨' },
  { key: 'kangaroo', emoji: '🦘' },
  { key: 'cockatoo', emoji: '🦜' },
  { key: 'croc', emoji: '🐊' },
  { key: 'dolphin', emoji: '🐬' },
  { key: 'platypus', emoji: '🦆' },
  { key: 'turtle', emoji: '🐢' },
  { key: 'echidna', emoji: '🦔' },
  { key: 'penguin', emoji: '🐧' },
  { key: 'owl', emoji: '🦉' },
  { key: 'octopus', emoji: '🐙' },
  { key: 'butterfly', emoji: '🦋' },
] as const;

export const PRESET_BGS = ['#E8F0EB', '#F6E7D8', '#FDECEC', '#E3EEF8', '#EFE9F6', '#FBF0DA'];

function hashCode(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable pseudo-random preset url for a user with no photo. */
export function presetFromSeed(seed: string): string {
  const h = hashCode(seed);
  const animal = PRESET_ANIMALS[h % PRESET_ANIMALS.length];
  const bg = Math.floor(h / PRESET_ANIMALS.length) % PRESET_BGS.length;
  return `preset:${animal.key}:${bg}`;
}

/** Parse "preset:<animal>[:<bgIndex>]" (bare legacy form included). */
export function parsePreset(
  url: string | null | undefined,
): { emoji: string; bg: string } | undefined {
  if (!url?.startsWith('preset:')) return undefined;
  const [key, bgRaw] = url.slice(7).split(':');
  const animal = PRESET_ANIMALS.find((a) => a.key === key);
  if (!animal) return undefined;
  const bgIdx = Number.parseInt(bgRaw ?? '', 10);
  const bg =
    PRESET_BGS[Number.isNaN(bgIdx) ? hashCode(key) % PRESET_BGS.length : bgIdx % PRESET_BGS.length];
  return { emoji: animal.emoji, bg };
}

/**
 * Profile avatar: photo if available; a chosen or seeded animal preset
 * otherwise; initial on a tinted circle as the last resort. When a
 * nationality is set, a small flag badge overlaps the bottom-right.
 */
export function Avatar({
  name,
  url,
  nationality,
  seed,
  size = 48,
}: {
  name: string | null | undefined;
  url?: string | null;
  nationality?: string | null;
  /** Stable id (e.g. user id) used to assign a default preset when there is no photo. */
  seed?: string | null;
  size?: number;
}) {
  // Flag emoji badge (Sean's device feedback). Real devices render regional
  // indicators fine — the earlier tofu boxes were a simulator font gap.
  const flag = flagEmoji(nationality);
  const round = { width: size, height: size, borderRadius: size / 2 };
  const preset = parsePreset(url) ?? (!url && seed ? parsePreset(presetFromSeed(seed)) : undefined);
  return (
    <View style={{ width: size, height: size }}>
      {preset ? (
        <View
          style={[
            round,
            { backgroundColor: preset.bg, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Text style={{ fontSize: size * 0.52 }}>{preset.emoji}</Text>
        </View>
      ) : url ? (
        <Image source={{ uri: url }} style={round} />
      ) : (
        <View style={[styles.fallback, round]}>
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
            {(name ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      {flag && (
        <View style={[styles.flagBadge, { borderRadius: size * 0.2 }]}>
          <Text style={{ fontSize: Math.max(11, size * 0.22) }}>{flag}</Text>
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
    right: -5,
    bottom: -5,
    backgroundColor: colors.white,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
