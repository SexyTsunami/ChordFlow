import "server-only";

import { serverEnv } from "@/lib/env";
import { fetchWithTimeout, isAbortError, safeLogValue } from "./http";
import {
  providerFailure,
  type AIChordAssistant,
  type AiChordRequest,
  type AiChordResponse,
  type AiTask,
  type ProviderResult,
} from "./types";

/**
 * Optional AI chord assistance.
 *
 * Gemini uses the native generateContent API (with Google Search on
 * estimates). Other keys still go through an OpenAI-compatible chat URL.
 *
 * Hard rules encoded in the prompt and enforced by the UI:
 *  - It never claims to have analysed audio. ChordFlow has no audio analysis.
 *  - Output is always labelled an estimate, never "verified".
 *  - It will not reproduce copyrighted lyrics; it only works on text the user
 *    supplied and confirmed they may use.
 *  - Search is Gemini's official Google Search tool, not ChordFlow scraping
 *    tab or lyric sites.
 */

const DISCLAIMER =
  "AI estimate — not verified. ChordFlow does not analyse audio and does not scrape chord sites. Gemini may Google the title and artist to cross-check commonly cited keys and progressions. Check it against the recording by ear.";

const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
]);

const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];

const SYSTEM_PROMPT = `You are a guitar arrangement assistant inside an app called ChordFlow.

Hard rules:
- You CANNOT hear audio. Never claim to have listened to or analysed a recording.
- Never output copyrighted song lyrics. Never invent lyric lines.
- Never paste a full published tab or copy a long sequence from one page.
- Always describe chord suggestions as estimates that need checking by ear.
- Prefer common, guitar-friendly voicings (open chords, simple sevenths).
- Chord symbols use standard notation: C, Am, G7, Fmaj7, D/F#, Bm7b5.

When Google Search is available, look up the song by title and artist. Prefer
sources that mention the key or a commonly played guitar progression
(interviews, reviews, music-theory writeups, public discussions). Cross-check
when sources disagree and say so in "message". Use search to verify, then
return your own concise chords-only estimate.

Respond ONLY with minified JSON matching:
{"message": string, "suggestion": {"chords"?: string[], "capo"?: number, "key"?: string, "lines"?: string[], "sections"?: [{"type": string, "label"?: string, "chords": string[]}]}}

"message" is short markdown-free prose (max 500 characters). Mention whether
search agreed, conflicted, or found little.
"lines" uses inline bracket chord notation and must not include lyrics unless the user already supplied them.
"sections" is the preferred form for structure-only estimates: type is one of intro, verse, pre-chorus, chorus, bridge, outro.
Omit "suggestion" entirely when the task does not produce structured output.`;

const TASK_PROMPTS: Record<AiTask, string> = {
  "suggest-progression":
    "Suggest a plausible chord progression per section for this song, based only on the information given. Flag clearly that it is a starting point.",
  "estimate-structure":
    "Search for this title and artist, then estimate a guitar-friendly chord structure. Return suggestion.sections with intro/verse/pre-chorus/chorus/bridge/outro as appropriate. Each section is a short repeating sequence (4-8 chords). Do not output any lyrics. If sources conflict or you are unsure, still give a plausible estimate and say so in message. Include a guessed key when you have one.",
  "simplify-chords":
    "Rewrite the supplied chords as beginner-friendly substitutions (open shapes, fewer barres). Explain each substitution in one clause.",
  "explain-progression":
    "Explain the supplied chord progression: the likely key, the roman numeral function of each chord, and why it sounds the way it does.",
  "suggest-capo":
    "Recommend capo positions that turn the supplied chords into easy open shapes. Give the resulting shapes for each suggestion.",
  "align-chords":
    "Align the supplied chords to the supplied lyric lines, returning inline bracket notation. Keep every lyric character exactly as given; only insert [Chord] markers.",
  "convert-sheet":
    "Convert the user's pasted chord sheet into ChordFlow inline bracket notation, one array entry per line. Preserve section headers as lines like '[[Chorus]]'. Do not invent lyrics or chords that are not in the input.",
};

export function isAiConfigured(): boolean {
  return Boolean(serverEnv.aiApiKey);
}

function isGeminiProvider(): boolean {
  const base = serverEnv.aiBaseUrl.toLowerCase();
  const model = serverEnv.aiModel.toLowerCase();
  return (
    base.includes("generativelanguage.googleapis.com") ||
    base.includes("ai.google.dev") ||
    model.startsWith("gemini")
  );
}

function usesWebSearch(task: AiTask): boolean {
  return task === "estimate-structure" || task === "suggest-progression";
}

function geminiModelsToTry(): string[] {
  const configured = serverEnv.aiModel.replace(/^models\//, "");
  const models = [
    RETIRED_GEMINI_MODELS.has(configured) ? null : configured,
    ...GEMINI_FALLBACK_MODELS,
  ].filter((model): model is string => Boolean(model));
  return [...new Set(models)];
}

function buildUserPrompt(request: AiChordRequest): string {
  const parts: string[] = [TASK_PROMPTS[request.task]];
  if (request.songTitle) parts.push(`Song title: ${request.songTitle}`);
  if (request.artist) parts.push(`Artist: ${request.artist}`);
  if (request.key) parts.push(`Key: ${request.key}`);
  if (request.chords?.length) parts.push(`Chords in use: ${request.chords.join(" ")}`);
  if (request.notes) parts.push(`Notes from the user: ${request.notes}`);
  if (request.userContent) {
    parts.push(
      "User-supplied content (the user has confirmed they have the right to use this):",
      request.userContent.slice(0, 6000),
    );
  }
  return parts.join("\n\n");
}

function extractJson(content: string): { message?: string; suggestion?: unknown } | null {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function geminiErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    if (message) return message.slice(0, 280);
  } catch {
    /* use the status fallback */
  }
  return `The AI provider returned HTTP ${status}.`;
}

function geminiResponseText(payload: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
    };
  }>;
}): { text: string; searched: boolean; sources: string[] } {
  const candidate = payload.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  const queries = candidate?.groundingMetadata?.webSearchQueries ?? [];
  const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => chunk.web?.title || chunk.web?.uri)
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
  return {
    text,
    searched: queries.length > 0 || sources.length > 0,
    sources,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiPayload = Parameters<typeof geminiResponseText>[0];

async function geminiGenerate(
  model: string,
  body: Record<string, unknown>,
): Promise<{ status: number; error: string; payload: GeminiPayload | null }> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": serverEnv.aiApiKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      timeoutMs: 50_000,
    },
  );
  const raw = await response.text();
  let payload: GeminiPayload | null = null;
  try {
    payload = JSON.parse(raw) as GeminiPayload;
  } catch {
    payload = null;
  }
  return {
    status: response.status,
    error: geminiErrorMessage(response.status, raw),
    payload,
  };
}

function suggestionFromParsed(
  parsed: { message?: string; suggestion?: unknown; sections?: unknown } | null,
): AiChordResponse["suggestion"] | undefined {
  if (!parsed) return undefined;
  if (parsed.suggestion && typeof parsed.suggestion === "object") {
    return parsed.suggestion as AiChordResponse["suggestion"];
  }
  if (Array.isArray(parsed.sections)) {
    return { sections: parsed.sections as NonNullable<AiChordResponse["suggestion"]>["sections"] };
  }
  return undefined;
}

function hasSections(suggestion: AiChordResponse["suggestion"] | undefined): boolean {
  return Boolean(
    suggestion?.sections?.some((section) => (section.chords ?? []).length > 0),
  );
}

async function runGemini(
  request: AiChordRequest,
): Promise<ProviderResult<AiChordResponse>> {
  const userPrompt = buildUserPrompt(request);
  const search = usesWebSearch(request.task);
  let lastError = "The AI provider returned no chord structure.";
  let lastStatus = 502;
  let rateLimited = false;

  for (const model of geminiModelsToTry()) {
    if (rateLimited) break;

    const tryOnce = async (
      withSearch: boolean,
      prompt: string,
      jsonMode: boolean,
    ) => {
      let result = await geminiGenerate(model, {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });
      if (result.status === 429) {
        await sleep(15_000);
        result = await geminiGenerate(model, {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        });
      }
      return result;
    };

    if (search) {
      const lookUp = await tryOnce(
        true,
        [
          `Search the public web for "${request.songTitle ?? ""}" by "${request.artist ?? ""}".`,
          "Find the commonly cited concert key and guitar verse/chorus progressions.",
          "Summarize in under 350 words. No lyrics. No full published tab.",
          "If sources disagree, say so and list both. Name 2-4 source titles.",
          "Then also output ChordFlow JSON on the last line if you can:",
          '{"message": string, "suggestion": {"key": string, "capo": number, "sections": [{"type": string, "chords": string[]}]}}',
        ].join(" "),
        false,
      );
      lastStatus = lookUp.status;
      lastError = lookUp.error;
      if (lookUp.status === 401 || lookUp.status === 403) {
        return providerFailure("unauthorized", "The AI provider rejected the API key.");
      }
      if (lookUp.status === 429) {
        rateLimited = true;
        lastError = "The AI provider is rate limiting this key.";
        break;
      }

      const notes = lookUp.payload ? geminiResponseText(lookUp.payload) : { text: "", searched: false, sources: [] };
      const fromSearch = suggestionFromParsed(extractJson(notes.text));
      if (hasSections(fromSearch)) {
        const parsed = extractJson(notes.text);
        return {
          ok: true,
          data: {
            message: `${parsed?.message ?? "Search-checked chord estimate."}${
              notes.sources.length ? ` Sources: ${notes.sources.slice(0, 2).join("; ")}.` : ""
            }`.slice(0, 600),
            suggestion: fromSearch,
            model,
            disclaimer: DISCLAIMER,
          },
        };
      }

      const structured = await tryOnce(
        false,
        [
          userPrompt,
          notes.text
            ? `Search notes to honour (do not copy lyrics or a full tab):\n${notes.text.slice(0, 3500)}`
            : "Search returned little. Give a cautious guitar-friendly estimate and say so.",
        ].join("\n\n"),
        true,
      );
      lastStatus = structured.status;
      lastError = structured.error;
      if (structured.status === 429) {
        rateLimited = true;
        lastError = "The AI provider is rate limiting this key.";
        break;
      }
      if (structured.payload) {
        const text = geminiResponseText(structured.payload).text;
        const parsed = extractJson(text);
        const suggestion = suggestionFromParsed(parsed);
        if (hasSections(suggestion) || parsed?.message) {
          return {
            ok: true,
            data: {
              message: `${parsed?.message ?? "Search-checked chord estimate."}${
                notes.searched || notes.sources.length
                  ? ` Google Search checked${notes.sources.length ? `: ${notes.sources.slice(0, 2).join("; ")}` : ""}.`
                  : ""
              }`.slice(0, 600),
              suggestion,
              model,
              disclaimer: DISCLAIMER,
            },
          };
        }
      }
      continue;
    }

    const plain = await tryOnce(false, userPrompt, true);
    lastStatus = plain.status;
    lastError = plain.error;
    if (plain.status === 401 || plain.status === 403) {
      return providerFailure("unauthorized", "The AI provider rejected the API key.");
    }
    if (plain.status === 429) {
      rateLimited = true;
      lastError = "The AI provider is rate limiting this key.";
      break;
    }
    if (plain.status === 404) continue;
    if (!plain.payload) continue;
    const parsed = extractJson(geminiResponseText(plain.payload).text);
    const suggestion = suggestionFromParsed(parsed);
    if (!parsed?.message && !hasSections(suggestion)) continue;
    return {
      ok: true,
      data: {
        message: String(parsed?.message ?? "AI chord estimate"),
        suggestion,
        model,
        disclaimer: DISCLAIMER,
      },
    };
  }

  if (rateLimited) {
    return providerFailure(
      "rate_limited",
      lastError,
      "Wait about 30 seconds, then tap Estimate again. Gemini search shares a tight free-tier limit.",
    );
  }

  return providerFailure(
    "upstream_error",
    lastError,
    lastStatus === 404
      ? "Gemini retired the configured model. ChordFlow tries current Flash models automatically."
      : "Gemini searched or replied, but ChordFlow could not read a chord list. Try Estimate again.",
  );
}

async function runOpenAiCompatible(
  request: AiChordRequest,
): Promise<ProviderResult<AiChordResponse>> {
  const response = await fetchWithTimeout(
    `${serverEnv.aiBaseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: serverEnv.aiModel,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(request) },
        ],
      }),
      timeoutMs: 45_000,
    },
  );

  if (response.status === 401 || response.status === 403) {
    return providerFailure("unauthorized", "The AI provider rejected the API key.");
  }
  if (response.status === 429) {
    return providerFailure("rate_limited", "The AI provider is rate limiting this key.");
  }
  if (!response.ok) {
    const raw = await response.text();
    return providerFailure("upstream_error", geminiErrorMessage(response.status, raw));
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);

  if (!parsed?.message) {
    return providerFailure(
      "upstream_error",
      "The AI provider returned a response ChordFlow could not read.",
    );
  }

  const suggestion = parsed.suggestion as AiChordResponse["suggestion"];
  return {
    ok: true,
    data: {
      message: String(parsed.message),
      suggestion: suggestion && typeof suggestion === "object" ? suggestion : undefined,
      model: serverEnv.aiModel,
      disclaimer: DISCLAIMER,
    },
  };
}

export const aiChordAssistant: AIChordAssistant = {
  id: "openai-compatible",
  isConfigured: isAiConfigured,

  async run(request): Promise<ProviderResult<AiChordResponse>> {
    if (!isAiConfigured()) {
      return providerFailure(
        "not_configured",
        "AI chord assistance is turned off.",
        "Set AI_PROVIDER_API_KEY (and optionally AI_MODEL / AI_PROVIDER_BASE_URL) to enable it. The manual editor works without it.",
      );
    }

    try {
      return isGeminiProvider() ? await runGemini(request) : await runOpenAiCompatible(request);
    } catch (error) {
      if (isAbortError(error)) {
        return providerFailure("timeout", "The AI provider did not respond in time.");
      }
      console.error("[ai] request failed:", safeLogValue(error));
      return providerFailure("upstream_error", "Could not reach the AI provider.");
    }
  },
};

export { DISCLAIMER as AI_DISCLAIMER };
