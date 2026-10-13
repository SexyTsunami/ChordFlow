import "server-only";

import { fetchWithTimeout, isAbortError, safeLogValue } from "./http";
import { providerFailure, type ProviderResult } from "./types";

const PAGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchPublicHtml(
  url: string,
): Promise<ProviderResult<string>> {
  try {
    const response = await fetchWithTimeout(url, {
      timeoutMs: 15_000,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": PAGE_UA,
      },
    });
    if (response.status === 404) {
      return providerFailure("not_found", "That playlist page could not be found.");
    }
    if (!response.ok) {
      return providerFailure(
        "upstream_error",
        `The playlist page returned HTTP ${response.status}.`,
      );
    }
    return { ok: true, data: await response.text() };
  } catch (error) {
    if (isAbortError(error)) {
      return providerFailure("timeout", "The playlist page did not respond in time.");
    }
    console.error("[playlist-page] fetch failed:", safeLogValue(error));
    return providerFailure("upstream_error", "Could not reach the playlist page.");
  }
}
