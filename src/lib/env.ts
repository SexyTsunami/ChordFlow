import "server-only";

/**
 * Server-side environment access.
 *
 * Secrets are read here and nowhere else. The only thing that ever crosses to
 * the browser is the boolean "is this provider configured?" summary produced by
 * `providerStatus()` — never a key, token or secret.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Treat the placeholder values from .env.example as "not configured".
  if (/^(your|changeme|replace|xxx)/i.test(trimmed)) return undefined;
  return trimmed;
}

export const serverEnv = {
  get appUrl() {
    return (
      read("NEXT_PUBLIC_APP_URL") ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
      "http://localhost:3000"
    );
  },
  get spotifyClientId() {
    return read("SPOTIFY_CLIENT_ID");
  },
  get spotifyClientSecret() {
    return read("SPOTIFY_CLIENT_SECRET");
  },
  get youtubeApiKey() {
    return read("YOUTUBE_API_KEY");
  },
  get supabaseUrl() {
    return read("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get lyricsProvider() {
    return read("LYRICS_PROVIDER");
  },
  get lyricsProviderApiKey() {
    return read("LYRICS_PROVIDER_API_KEY");
  },
  get aiProvider() {
    return read("AI_PROVIDER") ?? "openai";
  },
  get aiApiKey() {
    return read("AI_PROVIDER_API_KEY");
  },
  get aiModel() {
    return read("AI_MODEL") ?? "gpt-4o-mini";
  },
  get aiBaseUrl() {
    return read("AI_PROVIDER_BASE_URL") ?? "https://api.openai.com/v1";
  },
};

export type ProviderStatus = {
  spotify: boolean;
  youtube: boolean;
  supabase: boolean;
  lyrics: boolean;
  ai: boolean;
};

/** Safe-to-serialise summary of which integrations are usable right now. */
export function providerStatus(): ProviderStatus {
  return {
    spotify: Boolean(serverEnv.spotifyClientId && serverEnv.spotifyClientSecret),
    youtube: Boolean(serverEnv.youtubeApiKey),
    supabase: Boolean(serverEnv.supabaseUrl && serverEnv.supabaseAnonKey),
    lyrics: Boolean(serverEnv.lyricsProviderApiKey),
    ai: Boolean(serverEnv.aiApiKey),
  };
}
