import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button } from '../components/ui';
import i18n from './i18n';
import { supabase } from './supabase';
import { colors, spacing } from '../theme';

/**
 * Remote kill switches (admin console writes public.app_config; public-read
 * RLS). Read on launch and on foreground so ops changes apply without a
 * restart: maintenance mode, upload toggle, forced minimum version, banner.
 */

export type AppConfig = {
  maintenanceMode: boolean;
  uploadsEnabled: boolean;
  minAppVersion: string;
  banner: Record<string, string>;
};

const DEFAULTS: AppConfig = {
  maintenanceMode: false,
  uploadsEnabled: true,
  minAppVersion: '0.0.0',
  banner: {},
};

const AppConfigContext = createContext<AppConfig>(DEFAULTS);
export const useAppConfig = () => useContext(AppConfigContext);

/** true when a < b (semver-ish, numeric segments). */
export function versionLt(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db;
  }
  return false;
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_config').select('key, value');
      if (!data) return;
      const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
      setConfig({
        maintenanceMode: map.maintenance_mode === true,
        uploadsEnabled: map.uploads_enabled !== false,
        minAppVersion: typeof map.min_app_version === 'string' ? map.min_app_version : '0.0.0',
        banner: typeof map.banner === 'object' && map.banner ? map.banner : {},
      });
    } catch {
      // keep previous config on transient failures
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

/** Full-screen gate shown when the installed version is below the minimum. */
export function ForceUpdateGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { minAppVersion } = useAppConfig();
  const current = Constants.expoConfig?.version ?? '0.0.0';

  if (!versionLt(current, minAppVersion)) return <>{children}</>;
  return (
    <View style={styles.updateWrap}>
      <Text style={{ fontSize: 44 }}>🛠️</Text>
      <Text style={styles.updateTitle}>{t('config.updateTitle')}</Text>
      <Text style={styles.updateBody}>{t('config.updateBody')}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>
        <Button
          title={t('config.updateCta')}
          onPress={() =>
            Linking.openURL('itms-apps://apps.apple.com/app/id6803434941').catch(() => {})
          }
        />
      </View>
    </View>
  );
}

/** Trilingual ops banner + maintenance notice strip (renders nothing when idle). */
export function ConfigBanner() {
  const { t } = useTranslation();
  const { banner, maintenanceMode } = useAppConfig();
  const text = banner[i18n.language] || banner.en || '';
  if (!text && !maintenanceMode) return null;
  return (
    <View style={styles.bannerWrap}>
      {maintenanceMode && <Text style={styles.bannerText}>{t('config.maintenanceBody')}</Text>}
      {!!text && <Text style={styles.bannerText}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  updateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  updateTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  updateBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  bannerWrap: {
    backgroundColor: '#FBF0DA',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 2,
  },
  bannerText: { fontSize: 13, color: '#7A5A00', textAlign: 'center' },
});
