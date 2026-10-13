import type { ChordEstimate } from "./estimate";

type EstimateResponse = ChordEstimate & {
  sections?: ChordEstimate["sections"];
  error?: { message: string; hint?: string };
};

export type EstimateStatus =
  | { phase: "request" }
  | { phase: "wait"; seconds: number; reason: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterSeconds(response: Response, fallback = 20): number {
  const raw = Number(response.headers.get("Retry-After") ?? fallback);
  if (!Number.isFinite(raw) || raw < 1) return fallback;
  return Math.min(Math.ceil(raw), 45);
}

export async function requestChordEstimate(
  title: string,
  artist: string,
  onStatus?: (status: EstimateStatus) => void,
): Promise<ChordEstimate> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    onStatus?.({ phase: "request" });
    const response = await fetch("/api/ai/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, artist }),
    });
    const json = (await response.json()) as EstimateResponse;

    if (response.status === 429) {
      const seconds = retryAfterSeconds(response);
      onStatus?.({
        phase: "wait",
        seconds,
        reason: "Rate limit — pausing, then continuing the list.",
      });
      await sleep(seconds * 1000);
      continue;
    }

    if (response.status === 501) {
      throw new Error(
        json.error?.hint ??
          "Set AI_PROVIDER_API_KEY in .env.local to estimate chords.",
      );
    }

    if (!response.ok || !json.sections?.length) {
      throw new Error(
        [json.error?.message, json.error?.hint]
          .filter(Boolean)
          .join(" ") || "The model did not return a chord structure.",
      );
    }

    return {
      title,
      artist,
      key: json.key ?? null,
      capo: json.capo ?? 0,
      sections: json.sections,
      message: json.message,
      model: json.model,
      disclaimer: json.disclaimer,
    };
  }

  throw new Error("The estimate service kept rate-limiting this request.");
}
