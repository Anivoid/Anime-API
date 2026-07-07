import { NextResponse } from "next/server";

const ZORO_BASE = "https://api.consumet.org/anime/zoro";

interface StreamSource {
  url: string;
  type: string;
  quality: string;
  isM3U8: boolean;
}

interface StreamResponse {
  sources: StreamSource[];
  subtitles: { url: string; lang: string }[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("episodeId");
  const server = searchParams.get("server") || "hd-2";
  const type = searchParams.get("type") || "sub";

  if (!episodeId) {
    return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  }

  try {
    // Try to get streaming URL from Consumet API
    const res = await fetch(
      `${ZORO_BASE}/watch?episodeId=${episodeId}&server=${server}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
    );

    if (res.ok) {
      const data: StreamResponse = await res.json();

      if (data.sources && data.sources.length > 0) {
        // Find the best HLS source
        const hlsSource = data.sources.find((s) => s.isM3U8) || data.sources[0];

        return NextResponse.json({
          streams: [
            {
              url: hlsSource.url,
              type: hlsSource.type,
              quality: hlsSource.quality,
              isM3U8: hlsSource.isM3U8,
            },
          ],
          subtitles: data.subtitles || [],
          intro: data.intro,
          outro: data.outro,
          headers: {},
        });
      }
    }

    // Fallback: try different server
    const fallbackRes = await fetch(
      `${ZORO_BASE}/watch?episodeId=${episodeId}&server=vidcloud`,
      { headers: { "Accept": "application/json" }, next: { revalidate: 30 } }
    );

    if (fallbackRes.ok) {
      const data: StreamResponse = await fallbackRes.json();
      if (data.sources && data.sources.length > 0) {
        const hlsSource = data.sources.find((s) => s.isM3U8) || data.sources[0];
        return NextResponse.json({
          streams: [{ url: hlsSource.url, type: hlsSource.type, quality: hlsSource.quality, isM3U8: hlsSource.isM3U8 }],
          subtitles: data.subtitles || [],
          intro: data.intro,
          outro: data.outro,
          headers: {},
        });
      }
    }

    return NextResponse.json({ error: "No streams available", streams: [] }, { status: 404 });
  } catch (error) {
    console.error("Stream resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 });
  }
}
