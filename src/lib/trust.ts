/**
 * Trust tiers (ADR 008): the Aussie animal ladder.
 * Points come from the DB (`profile_trust` view: count(4-5★) − count(1-2★));
 * this module only maps points → tier for display. Thresholds mirror ADR 008.
 */
export type TrustTierSlug = 'quokka' | 'bilby' | 'koala' | 'wombat' | 'wallaby' | 'kangaroo';

export const TRUST_TIERS: { slug: TrustTierSlug; min: number; color: string }[] = [
  { slug: 'quokka', min: 0, color: '#8B9A6B' },
  { slug: 'bilby', min: 3, color: '#7A8CA3' },
  { slug: 'koala', min: 8, color: '#6B7FB8' },
  { slug: 'wombat', min: 15, color: '#9A6BB8' },
  { slug: 'wallaby', min: 30, color: '#C2703E' },
  { slug: 'kangaroo', min: 50, color: '#B8860B' },
];

/** Map trust points to the highest tier reached (never below quokka). */
export function trustTier(points: number): { slug: TrustTierSlug; color: string; level: number } {
  let tier = TRUST_TIERS[0];
  let level = 1;
  for (let i = 0; i < TRUST_TIERS.length; i++) {
    if (points >= TRUST_TIERS[i].min) {
      tier = TRUST_TIERS[i];
      level = i + 1;
    }
  }
  return { slug: tier.slug, color: tier.color, level };
}
