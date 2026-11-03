const ASSETS_URL = process.env.EXPO_PUBLIC_ASSETS_URL ?? "";

/**
 * Builds the full URL for a static asset key stored in the database
 * (e.g. "presets/netflix.webp"). Only keys are stored, so switching hosts
 * (backend serve-static → R2/CDN) only requires changing EXPO_PUBLIC_ASSETS_URL.
 * Full URLs are returned as-is.
 */
export function getAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;

  const base = ASSETS_URL.endsWith("/") ? ASSETS_URL : `${ASSETS_URL}/`;
  return `${base}${key.replace(/^\/+/, "")}`;
}
