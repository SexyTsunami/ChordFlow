import "server-only";

/** Fetch with an abort timeout. Never logs headers, so tokens cannot leak. */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/**
 * Redact anything token-shaped before it reaches a log line.
 * Used by every provider's error path.
 */
export function safeLogValue(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text
    .replace(/(access_token|refresh_token|api[_-]?key|authorization)["':\s]+[^",}\s]+/gi, "$1=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .slice(0, 500);
}
