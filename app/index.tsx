import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_STORAGE_KEY } from '../src/lib/i18n';
import { useSession } from '../src/lib/session';
import { colors } from '../src/theme';

export default function Index() {
  const { session, profile, loading } = useSession();
  const [langChosen, setLangChosen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((v) => setLangChosen(v != null));
  }, []);

  if (loading || langChosen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!langChosen) return <Redirect href="/onboarding/language" />;
  // Entry offers sign-in AND a prominent guest path (guideline 5.1.1(v)).
  if (!session) return <Redirect href="/auth" />;
  if (!profile?.suburb) return <Redirect href="/onboarding/profile" />;
  return <Redirect href="/(tabs)/home" />;
}
