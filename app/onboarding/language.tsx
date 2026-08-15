import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/ui';
import { LANGUAGES, setAppLanguage, type AppLanguage } from '../../src/lib/i18n';
import { colors, radius, spacing } from '../../src/theme';

export default function LanguageScreen() {
  const { t } = useTranslation();

  async function choose(lang: AppLanguage) {
    await setAppLanguage(lang);
    router.replace('/');
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.logo}>🏞️</Text>
        <Text style={styles.title}>Torrens Market</Text>
        <Text style={styles.subtitle}>{t('onboarding.chooseLanguage')}</Text>
        <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.lg }}>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} style={styles.langButton} onPress={() => choose(l.code)}>
              <Text style={styles.langText}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>{t('onboarding.languageNote')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.md },
  langButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  langText: { fontSize: 18, fontWeight: '600', color: colors.text },
  note: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.lg },
});
