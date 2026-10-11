/**
 * AdSense configuration. The publisher id and unit ids are public (they appear
 * in the served HTML), so they live in source rather than in env vars.
 *
 * A slot without a unit id keeps rendering the dashed placeholder. Ads only
 * load in production builds, so local dev never requests or clicks real ads.
 */
export const ADSENSE_CLIENT = 'ca-pub-5767456757193205';

/** AdSlot `id` -> AdSense `data-ad-slot` unit id. Leave a slot out to keep the placeholder. */
export const AD_UNITS: Record<string, string> = {
  'home-leaderboard': '3427763553',
  'home-feed-1': '1227966462',
  'game-bottom': '1564017549',
};

export const ADS_ENABLED = import.meta.env.PROD;

export const adsenseScriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
