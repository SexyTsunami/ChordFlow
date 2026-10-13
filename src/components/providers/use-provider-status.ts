"use client";

import * as React from "react";
import type { ProviderStatus } from "@/lib/env";

/**
 * Which server-side integrations are configured.
 * The endpoint returns booleans only — no keys ever reach the browser.
 */

let cache: ProviderStatus | null = null;
let inFlight: Promise<ProviderStatus | null> | null = null;

async function load(): Promise<ProviderStatus | null> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = fetch("/api/config")
      .then((r) => (r.ok ? (r.json() as Promise<ProviderStatus>) : null))
      .then((value) => {
        cache = value;
        return value;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useProviderStatus() {
  // Always start empty so SSR HTML matches the first client render.
  // The module cache is applied after mount.
  const [status, setStatus] = React.useState<ProviderStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    if (cache) {
      setStatus(cache);
      setLoading(false);
      return;
    }
    load().then((value) => {
      if (!active) return;
      setStatus(value);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { status, loading };
}
