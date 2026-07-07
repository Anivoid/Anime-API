import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const referer = searchParams.get("referer") || "https://megacloud.blog/";

  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    const upstreamRes = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: new URL(referer).origin,
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse("Upstream error", { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    const body = await upstreamRes.arrayBuffer();

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Referer, Origin");
    headers.set("Cache-Control", "public, max-age=300");

    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse("Proxy error", { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Referer, Origin",
    },
  });
}
