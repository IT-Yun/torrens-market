import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeSnippet, flagEmoji, formatPrice, timeAgo } from '../src/lib/format.ts';
import { formatDistance, fuzzCoord, haversineKm, travelEstimate } from '../src/lib/geo.ts';
import { suggestCategorySlug } from '../src/lib/categorize.ts';

test('formatPrice renders AUD with grouping', () => {
  assert.equal(formatPrice(125000), '$1,250');
  assert.equal(formatPrice(999), '$9.99');
  assert.equal(formatPrice(0), 'Free');
});

test('timeAgo buckets minutes, hours, days', () => {
  const now = Date.parse('2026-08-15T12:00:00Z');
  assert.equal(timeAgo('2026-08-15T11:59:40Z', now), '1m');
  assert.equal(timeAgo('2026-08-15T11:15:00Z', now), '45m');
  assert.equal(timeAgo('2026-08-15T09:00:00Z', now), '3h');
  assert.equal(timeAgo('2026-08-12T12:00:00Z', now), '3d');
});

test('attributeSnippet: car pattern "year · km"', () => {
  assert.equal(attributeSnippet({ year: 2019, odometer_km: 82000 }), '2019 · 82,000km');
});

test('attributeSnippet: furniture dimensions', () => {
  assert.equal(attributeSnippet({ dimensions: '120×80×75' }), '120×80×75cm');
});

test('attributeSnippet: cosmetics expiry', () => {
  assert.equal(attributeSnippet({ expiry_date: '2026-12' }), 'EXP 2026-12');
});

test('attributeSnippet: brand beats brand_model, max two parts', () => {
  assert.equal(attributeSnippet({ brand: 'Gucci', brand_model: 'x', purchase_date: '2024-01' }), 'Gucci');
  assert.equal(
    attributeSnippet({ year: 2020, odometer_km: 1000, dimensions: '1×1×1' }),
    '2020 · 1,000km',
  );
});

test('attributeSnippet: empty/no known keys -> null', () => {
  assert.equal(attributeSnippet({}), null);
  assert.equal(attributeSnippet({ unknown_key: 'v' }), null);
});

test('flagEmoji: country codes and OTHER bucket', () => {
  assert.equal(flagEmoji('KR'), '🇰🇷');
  assert.equal(flagEmoji('cn'), '🇨🇳');
  assert.equal(flagEmoji('OTHER'), null);
  assert.equal(flagEmoji(null), null);
});

test('geo: fuzzCoord snaps to ~1.1km grid', () => {
  assert.equal(fuzzCoord(-34.928497), -34.93);
  assert.equal(fuzzCoord(138.600739), 138.6);
});

test('geo: haversineKm and travelEstimate', () => {
  const km = haversineKm(-34.93, 138.6, -34.93, 138.65); // ~4.6km east
  assert.ok(km > 4 && km < 5);
  assert.deepEqual(travelEstimate(1.5), { mode: 'walk', minutes: 20 });
  assert.equal(travelEstimate(4.6).mode, 'drive');
});

test('suggestCategorySlug: trilingual keywords, priority order', () => {
  assert.equal(suggestCategorySlug('IKEA desk white'), 'furniture');
  assert.equal(suggestCategorySlug('아이폰 15 프로'), 'electronics');
  assert.equal(suggestCategorySlug('婴儿推车 almost new'), 'baby_kids');
  assert.equal(suggestCategorySlug('Yamaha motorbike 2019'), 'cars_bikes');
  assert.equal(suggestCategorySlug('road bike shimano'), 'cars_bikes');
  assert.equal(suggestCategorySlug('random thing'), null);
});

test('formatDistance: m under 1km, decimals under 10km', () => {
  assert.equal(formatDistance(0.83), '850m');
  assert.equal(formatDistance(1.24), '1.2km');
  assert.equal(formatDistance(12.6), '13km');
});
