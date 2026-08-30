import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Apple, Mail } from 'lucide-react-native';
import { signInWithApple, signInWithProvider } from '../lib/auth';
import { GoogleLogo } from './GoogleLogo';
import { colors, motion, radius, shadows, spacing } from '../theme';

/**
 * Branded bottom sheet used for all in-app prompts (replaces bare system
 * alerts) and for the guest sign-in gate (guideline 5.1.1(v)): guests keep
 * browsing freely; account actions open this sheet with a per-action reason
 * and the full set of sign-in options inline.
 */

export type SheetAction = {
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  onPress: () => void;
};

type SheetRequest =
  | { kind: 'signIn'; reasonKey: string }
  | { kind: 'confirm'; title: string; body?: string; actions: SheetAction[]; dismissLabel?: string };

type SheetApi = {
  showSignIn: (reasonKey?: string) => void;
  showConfirm: (
    title: string,
    body: string | undefined,
    actions: SheetAction[],
    dismissLabel?: string,
  ) => void;
  showInfo: (title: string, body?: string) => void;
  showToast: (message: string) => void;
};

const SheetContext = createContext<SheetApi>({
  showSignIn: () => {},
  showConfirm: () => {},
  showInfo: () => {},
  showToast: () => {},
});
export const usePromptSheet = () => useContext(SheetContext);

// Module-level bridge so non-component code (guards) can open the sheet.
let bridge: SheetApi | null = null;
export function showSignInSheet(reasonKey?: string): void {
  bridge?.showSignIn(reasonKey);
}

export function PromptSheetProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const anim = useState(() => new Animated.Value(0))[0];
  const toastAnim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (request) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, ...motion.spring }).start();
    }
  }, [request, anim]);

  useEffect(() => {
    Animated.timing(toastAnim, {
      toValue: toast ? 1 : 0,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [toast, toastAnim]);

  const hide = useCallback(
    (after?: () => void) => {
      Animated.timing(anim, { toValue: 0, duration: motion.fast, useNativeDriver: true }).start(() => {
        setRequest(null);
        after?.();
      });
    },
    [anim],
  );

  const close = useCallback(() => {
    if (!busy) hide();
  }, [busy, hide]);

  const api: SheetApi = {
    showSignIn: (reasonKey) => setRequest({ kind: 'signIn', reasonKey: reasonKey ?? 'gate.reason_default' }),
    showConfirm: (title, body, actions, dismissLabel) =>
      setRequest({ kind: 'confirm', title, body, actions, dismissLabel }),
    showInfo: (title, body) =>
      setRequest({ kind: 'confirm', title, body, actions: [], dismissLabel: t('common.ok') }),
    showToast: (message) => {
      setToast(message);
      setTimeout(() => setToast((current) => (current === message ? null : current)), 2200);
    },
  };

  useEffect(() => {
    bridge = api;
    return () => {
      bridge = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAuth(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      hide();
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg !== 'auth_cancelled') {
        hide();
        setTimeout(() => showSignInSheetError(t), 250);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Modal visible={request != null} transparent animationType="none" onRequestClose={close}>
        <Animated.View style={[styles.backdropFill, { opacity: anim }]} />
        <Pressable style={styles.backdrop} onPress={close}>
          <Animated.View
            style={{
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) },
              ],
            }}
          >
          <Pressable
            style={[
              styles.sheet,
              shadows.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
            ]}
            onPress={() => {}}
          >
            <View style={styles.handle} />
            {request?.kind === 'signIn' && (
              <>
                <Text style={styles.title}>{t('auth.requiredTitle')}</Text>
                <Text style={styles.body}>{t(request.reasonKey)}</Text>
                {Platform.OS === 'ios' && (
                  <Pressable
                    style={[styles.btn, styles.appleBtn]}
                    disabled={busy}
                    onPress={() => runAuth(() => signInWithApple())}
                  >
                    <Apple size={18} color={colors.white} fill={colors.white} />
                    <Text style={[styles.btnText, { color: colors.white }]}>
                      {t('auth.continueWithApple')}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.btn, styles.googleBtn]}
                  disabled={busy}
                  onPress={() => runAuth(() => signInWithProvider('google'))}
                >
                  <GoogleLogo size={17} />
                  <Text style={[styles.btnText, { color: colors.text }]}>
                    {t('auth.continueWithGoogle')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.emailBtn]}
                  disabled={busy}
                  onPress={() => hide(() => router.push('/auth'))}
                >
                  <Mail size={17} color={colors.primary} />
                  <Text style={[styles.btnText, { color: colors.primary }]}>
                    {t('gate.withEmail')}
                  </Text>
                </Pressable>
                <Pressable style={styles.dismiss} disabled={busy} onPress={close}>
                  <Text style={styles.dismissText}>{t('gate.keepBrowsing')}</Text>
                </Pressable>
              </>
            )}
            {request?.kind === 'confirm' && (
              <>
                <Text style={styles.title}>{request.title}</Text>
                {request.body ? <Text style={styles.body}>{request.body}</Text> : null}
                {request.actions.map((action) => (
                  <Pressable
                    key={action.label}
                    style={[
                      styles.btn,
                      action.variant === 'destructive'
                        ? styles.destructiveBtn
                        : action.variant === 'secondary'
                          ? styles.googleBtn
                          : styles.primaryBtn,
                    ]}
                    onPress={() => hide(action.onPress)}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        {
                          color:
                            action.variant === 'secondary' ? colors.text : colors.white,
                        },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.dismiss} onPress={close}>
                  <Text style={styles.dismissText}>{request.dismissLabel ?? t('common.cancel')}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 84,
              opacity: toastAnim,
              transform: [
                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SheetContext.Provider>
  );
}

function showSignInSheetError(t: (k: string) => string): void {
  // Deferred plain alert as the last-resort error surface.
  // (Alert inside the sheet's own microtask crashed Hermes before — keep deferred.)
  const { Alert } = require('react-native') as typeof import('react-native');
  Alert.alert(t('auth.error'));
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,20,0.5)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  appleBtn: { backgroundColor: '#000' },
  googleBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  emailBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  primaryBtn: { backgroundColor: colors.primary },
  destructiveBtn: { backgroundColor: '#B4423E' },
  btnText: { fontSize: 15, fontWeight: '700' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(20,30,26,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  toastText: { color: colors.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dismiss: { alignItems: 'center', paddingVertical: 10 },
  dismissText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
