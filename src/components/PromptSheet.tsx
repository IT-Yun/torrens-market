import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Apple, Mail } from 'lucide-react-native';
import { signInWithApple, signInWithProvider } from '../lib/auth';
import { GoogleLogo } from './GoogleLogo';
import { colors, motion, radius, shadows, spacing } from '../theme';

/**
 * Branded bottom sheet used for all in-app prompts (replaces bare system
 * alerts) and for the guest sign-in gate (guideline 5.1.1(v)). Backed by
 * @gorhom/bottom-sheet since 1.0.1 (ADR-018): gesture dismiss, spring
 * physics, frosted backdrop, haptic feedback.
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

function Backdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42}>
      <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
    </BottomSheetBackdrop>
  );
}

export function PromptSheetProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const afterDismiss = useRef<(() => void) | null>(null);
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (request) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      modalRef.current?.present();
    }
  }, [request]);

  useEffect(() => {
    Animated.timing(toastAnim, {
      toValue: toast ? 1 : 0,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [toast, toastAnim]);

  const hide = useCallback((after?: () => void) => {
    afterDismiss.current = after ?? null;
    modalRef.current?.dismiss();
  }, []);

  const onDismiss = useCallback(() => {
    setRequest(null);
    const run = afterDismiss.current;
    afterDismiss.current = null;
    run?.();
  }, []);

  const api: SheetApi = {
    showSignIn: (reasonKey) =>
      setRequest({ kind: 'signIn', reasonKey: reasonKey ?? 'gate.reason_default' }),
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

  function runAction(action: SheetAction) {
    if (action.variant === 'destructive') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    hide(action.onPress);
  }

  return (
    <SheetContext.Provider value={api}>
      {children}
      <BottomSheetModal
        ref={modalRef}
        onDismiss={onDismiss}
        enablePanDownToClose={!busy}
        backdropComponent={Backdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
          ]}
        >
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
              <Pressable style={styles.dismiss} disabled={busy} onPress={() => hide()}>
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
                  onPress={() => runAction(action)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: action.variant === 'secondary' ? colors.text : colors.white },
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={styles.dismiss} onPress={() => hide()}>
                <Text style={styles.dismissText}>{request.dismissLabel ?? t('common.cancel')}</Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
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
  sheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.sheet,
  },
  handle: { backgroundColor: colors.border, width: 40 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
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
  dismiss: { alignItems: 'center', paddingVertical: 10 },
  dismissText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(20,30,26,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '85%',
    ...shadows.card,
  },
  toastText: { color: colors.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
