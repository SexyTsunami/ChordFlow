import { NextResponse } from "next/server";
import { searchItunesPreview } from "@/lib/itunes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clip(value: string | null, max = 180): string {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Proxies the iTunes Search API so the browser can play Apple's 30s
 * previews without CORS issues. Returns JSON only — never a media file.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = clip(params.get("title"));
  const artist = clip(params.get("artist"));
  if (!title || !artist) {
    return NextResponse.json(
      { ok: false, preview: null, error: "Title and artist are required." },
      { status: 400 },
    );
  }

  try {
    const preview = await searchItunesPreview({
      title,
      artist,
      titleEn: clip(params.get("titleEn")) || undefined,
      artistZh: clip(params.get("artistZh")) || undefined,
    });
    return NextResponse.json(
      { ok: true, preview },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, preview: null, error: "Could not reach Apple's catalog." },
      { status: 502 },
    );
  }
}
