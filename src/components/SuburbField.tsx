import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { ADELAIDE_SUBURBS } from '../data/adelaide-suburbs';
import { Field } from './ui';
import { colors, radius, spacing } from '../theme';

const MAX_SUGGESTIONS = 6;

/** Suburb input with Adelaide-metro autocomplete suggestions. */
export function SuburbField({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const starts = ADELAIDE_SUBURBS.filter((s) => s.toLowerCase().startsWith(q));
    const contains = ADELAIDE_SUBURBS.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [value]);

  const exactMatch =
    suggestions.length === 1 && suggestions[0].toLowerCase() === value.trim().toLowerCase();

  return (
    <View style={{ gap: spacing.xs }}>
      <Field
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {open && !exactMatch && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surface }]}
              onPress={() => {
                onChangeText(s);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={s}
            >
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.optionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.text },
});
