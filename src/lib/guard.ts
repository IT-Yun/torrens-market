import { Alert } from 'react-native';
import { router } from 'expo-router';
import i18n from './i18n';

/**
 * Guest gate (guideline 5.1.1(v)): browsing never requires an account;
 * account-backed actions funnel through this prompt into the auth screen.
 */
export function promptSignIn(): void {
  Alert.alert(i18n.t('auth.requiredTitle'), i18n.t('auth.requiredBody'), [
    { text: i18n.t('common.cancel'), style: 'cancel' },
    { text: i18n.t('auth.signIn'), onPress: () => router.push('/auth') },
  ]);
}
