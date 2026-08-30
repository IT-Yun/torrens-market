import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { usePromptSheet } from './PromptSheet';

/**
 * Once-per-version update prompt.
 *
 * Two kinds of update, checked in order on app start (main tabs mounted):
 *  1. Store update — App Store has a newer version than the one running (iTunes lookup, no backend).
 *     Prompt once per store version; "Update" opens the App Store page.
 *  2. OTA update — expo-updates has a newer JS bundle for this runtime.
 *     Prompt once per update id; "Restart" fetches and reloads.
 *
 * "Once" = remembered in AsyncStorage under the version / update id, so a user who taps
 * "Later" is not nagged again for that same version. Silent on any error (offline, sim, dev).
 */
const APP_STORE_ID = '6803434941';
const KEY = 'update-prompt-shown:';

function isNewer(remote: string, local: string): boolean {
  const a = remote.split('.').map((n) => parseInt(n, 10) || 0);
  const b = local.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function useUpdatePrompt(): void {
  const { t } = useTranslation();
  const sheet = usePromptSheet();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || __DEV__) return;
    ran.current = true;
    const localVersion = Constants.expoConfig?.version ?? '0.0.0';

    (async () => {
      // 1) Store update
      try {
        const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.ityun.torrensmarket';
        const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${bundleId}&country=au`);
        const json = (await res.json()) as { results?: { version?: string }[] };
        const remote = json.results?.[0]?.version;
        if (remote && isNewer(remote, localVersion)) {
          const flag = `${KEY}store:${remote}`;
          if (!(await AsyncStorage.getItem(flag))) {
            await AsyncStorage.setItem(flag, '1');
            sheet.showConfirm(
              t('update.storeTitle', { version: remote }),
              t('update.storeBody'),
              [
                {
                  label: t('update.storeAction'),
                  onPress: () => {
                    const url =
                      Platform.OS === 'ios'
                        ? `https://apps.apple.com/app/id${APP_STORE_ID}`
                        : `https://play.google.com/store/apps/details?id=${bundleId}`;
                    Linking.openURL(url).catch(() => {});
                  },
                },
              ],
              t('update.later'),
            );
            return; // one prompt per launch is enough
          }
        }
      } catch {
        /* offline or lookup failed: stay silent */
      }

      // 2) OTA update
      try {
        if (!Updates.isEnabled) return;
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const id = check.manifest && 'id' in check.manifest ? String(check.manifest.id) : 'unknown';
        const flag = `${KEY}ota:${id}`;
        if (await AsyncStorage.getItem(flag)) return;
        await AsyncStorage.setItem(flag, '1');
        sheet.showConfirm(
          t('update.otaTitle'),
          t('update.otaBody'),
          [
            {
              label: t('update.otaAction'),
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch {
                  sheet.showToast(t('update.otaFailed'));
                }
              },
            },
          ],
          t('update.later'),
        );
      } catch {
        /* stay silent */
      }
    })();
  }, [sheet, t]);
}
