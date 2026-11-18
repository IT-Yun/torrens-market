import * as Location from 'expo-location';
import { ADELAIDE_SUBURBS } from '../data/adelaide-suburbs';
import { fuzzCoord } from './geo';

async function ensurePermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

/** Current device position, or null if permission is denied/unavailable. */
export async function getPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (!(await ensurePermission())) return null;
    const last = await Location.getLastKnownPositionAsync();
    const pos =
      last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Position fuzzed to the ~1.1km privacy grid — the only form ever uploaded (ADR 006). */
export async function getApproxPosition(): Promise<{ lat: number; lng: number } | null> {
  const pos = await getPosition();
  return pos ? { lat: fuzzCoord(pos.lat), lng: fuzzCoord(pos.lng) } : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Reverse-geocode the device position and roughly compare it with the chosen
 * suburb (Karrot-style neighbourhood check, deliberately lenient).
 */
export async function checkSuburbMatch(
  suburb: string,
): Promise<{ ok: boolean; detected: string | null }> {
  const pos = await getPosition();
  if (!pos) return { ok: false, detected: null };
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: pos.lat,
      longitude: pos.lng,
    });
    const candidates = results
      .flatMap((r) => [r.district, r.subregion, r.city, r.name])
      .filter((c): c is string => !!c);
    const target = norm(suburb);
    const ok = candidates.some((c) => {
      const n = norm(c);
      return n === target || n.includes(target) || target.includes(n);
    });
    const detected =
      candidates.find((c) => ADELAIDE_SUBURBS.some((s) => norm(s) === norm(c))) ??
      candidates[0] ??
      null;
    return { ok, detected };
  } catch {
    return { ok: false, detected: null };
  }
}

/** Position only if permission is already granted — never prompts. */
export async function getPositionIfGranted(): Promise<{ lat: number; lng: number } | null> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (!current.granted) return null;
    return await getPosition();
  } catch {
    return null;
  }
}
