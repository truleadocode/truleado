import { NextResponse } from "next/server";

// SSRF protection: tight regex allowlist of CDNs we proxy profile pictures
// and post thumbnails from. Each platform uses region-specific subdomains so
// regexes are friendlier than enumerating individual hosts.
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  // Instagram / Facebook
  /^instagram\.fna\.fbcdn\.net$/i,
  /^instagram\.[a-z0-9-]+\.fna\.fbcdn\.net$/i,
  /^scontent\.cdninstagram\.com$/i,
  /^scontent[a-z0-9.-]*\.cdninstagram\.com$/i,
  // YouTube (channel avatars, video thumbnails)
  /^yt3\.googleusercontent\.com$/i,
  /^yt3\.ggpht\.com$/i,
  /^lh3\.googleusercontent\.com$/i,
  /^i\.ytimg\.com$/i,
  // TikTok (regional p-sign-* subdomains)
  /^p[0-9]+-sign[a-z0-9-]*\.tiktokcdn(-us)?\.com$/i,
  /^p[0-9]+-pu-sign[a-z0-9-]*\.tiktokcdn(-us)?\.com$/i,
  /^p[0-9]+\.tiktokcdn\.com$/i,
  // Twitter / X
  /^pbs\.twimg\.com$/i,
  /^abs\.twimg\.com$/i,
  // Twitch
  /^static-cdn\.jtvnw\.net$/i,
  // Influencers.club's own picture CDN (24h-expiring temp URLs)
  /^[a-z0-9]+\.cloudfront\.net$/i,
  // Influencers.club audience-block avatars (notable_users, lookalikes)
  /^img\.onsocial\.ai$/i,
];

function isAllowedUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) return null;

  return parsed;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const url = isAllowedUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  // Instagram CDN images often set Cross-Origin-Resource-Policy: same-origin which
  // blocks direct <img src="https://..."> embedding. Proxying makes the browser
  // request same-origin while the server fetches the remote image.
  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      // A couple of CDNs are picky about headers; this is intentionally minimal.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // Avoid sending cookies even if the environment has any.
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream error: ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";

  // Cache in the browser/CDN briefly; the underlying URLs are typically stable.
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
