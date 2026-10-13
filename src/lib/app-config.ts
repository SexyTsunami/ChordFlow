/**
 * Branding and one-line configuration.
 * Change `APP_NAME` here and it updates the UI, metadata and PWA manifest.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "ChordFlow";

export const APP_TAGLINE = "Your personal guitar songbook";

export const APP_DESCRIPTION =
  "A personal guitar songbook from your ChordDatabase folder: browse by song or artist, transpose every chord, and save play favourites plus a singing key.";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
