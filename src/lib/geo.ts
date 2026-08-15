/**
 * Location privacy + distance helpers (ADR 006).
 * Exact GPS never leaves the device: coordinates are fuzzed to a ~1.1km
 * grid before upload, and distance/travel time is computed on-device.
 */

/** Round a coordinate to 2 decimal places (~1.1 km grid at Adelaide's latitude). */
export function fuzzCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Rough travel estimate: walk (4.5 km/h) up to 2 km, otherwise urban
 * drive (30 km/h + 2 min buffer). Deliberately approximate — shown with "~".
 */
export function travelEstimate(km: number): { mode: 'walk' | 'drive'; minutes: number } {
  if (km <= 2) return { mode: 'walk', minutes: Math.max(1, Math.round((km / 4.5) * 60)) };
  return { mode: 'drive', minutes: Math.max(3, Math.round((km / 30) * 60) + 2) };
}

/** Compact distance label: 850m under 1km, 1.2km under 10, then whole km. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
