import { NextResponse } from "next/server";
import { getConfig } from "../../lib/config";
import { getRuntime, tmdbFetch } from "../../lib/tmdb";
import { XMLParser } from "fast-xml-parser";

const PROVIDER_MAP: Record<string, number> = {
  netflix: 8, prime: 9, max: 1899, crunchyroll: 283, hulu: 15, disney: 337,
};

export const revalidate = 3600; // 1 hour ISR

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface LetterboxdItem {
  title: string;
  link: string;
  "letterboxd:filmTitle": string;
  "letterboxd:filmYear": string;
  "letterboxd:watchedDate": string;
  "letterboxd:memberRating"?: string;
  "tmdb:movieId": string;
  description?: string;
}

async function scrapeWatchlistHtml(username: string): Promise<{ title: string; year: string; link: string }[]> {
  const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
  const results: { title: string; year: string; link: string }[] = [];
  for (let page = 1; page <= 5; page++) {
    const url = page === 1
      ? `https://letterboxd.com/${username}/watchlist/`
      : `https://letterboxd.com/${username}/watchlist/page/${page}/`;
    const res = await fetch(url, { headers: { "User-Agent": ua }, next: { revalidate: 3600 } });
    if (!res.ok) break;
    const html = await res.text();
    const re = /data-item-name="([^"]+)"[^>]*data-item-link="([^"]+)"/g;
    let match;
    while ((match = re.exec(html)) !== null) {
      const raw = match[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      const m = raw.match(/^(.+?)\s*\((\d{4})\)$/);
      if (m) results.push({ title: m[1], year: m[2], link: `https://letterboxd.com${match[2]}` });
    }
    if (!html.includes(`/watchlist/page/${page + 1}/`)) break;
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "diary";
  const config = getConfig();

  try {
    if (type === "watchlist") {
      const scraped = await scrapeWatchlistHtml(config.letterboxd);
      const myProviders = new Set(
        Object.entries(config.streamingProviders ?? {})
          .filter(([, on]) => on)
          .map(([k]) => PROVIDER_MAP[k])
          .filter(Boolean)
      );
      // Resolve TMDB posters + streaming availability, filter out TV shows
      const resolved = await Promise.all(
        scraped.slice(0, 15).map(async (w) => {
          try {
            const res = await tmdbFetch<{ results: { id: number; poster_path: string | null }[] }>("/search/movie", { query: w.title, year: w.year });
            const hit = res.results[0];
            if (!hit?.poster_path) return null;
            // Check watch providers
            let available = false;
            try {
              const wp = await tmdbFetch<{ results: { US?: { flatrate?: { provider_id: number }[] } } }>(`/movie/${hit.id}/watch/providers`);
              const flat = wp.results?.US?.flatrate ?? [];
              available = flat.some((p) => myProviders.has(p.provider_id));
            } catch { /* non-fatal */ }
            return { ...w, poster: `https://image.tmdb.org/t/p/w154${hit.poster_path}`, available };
          } catch {
            return null;
          }
        })
      );
      const movies = resolved.filter((w): w is NonNullable<typeof w> => w !== null).slice(0, 5);
      return NextResponse.json({ watchlist: movies, updatedAt: new Date().toISOString() });
    }

    const feedUrl = `https://letterboxd.com/${config.letterboxd}/rss/`;
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Letterboxd RSS: ${res.status}`);

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items: LetterboxdItem[] = parsed?.rss?.channel?.item ?? [];

    // Diary: filter current year, compute minutes watched
    const currentYear = new Date().getFullYear();
    const diaryItems = items.filter((item) => {
      const watched = item["letterboxd:watchedDate"];
      return watched && new Date(watched).getFullYear() === currentYear;
    });

    let totalMinutes = 0;
    const diaryEntries = [];
    for (const item of diaryItems) {
      const tmdbId = parseInt(item["tmdb:movieId"], 10);
      let runtime = 0;
      if (tmdbId) {
        try {
          runtime = await getRuntime(tmdbId);
        } catch {
          // skip runtime if TMDB lookup fails
        }
      }
      totalMinutes += runtime;
      diaryEntries.push({
        title: item["letterboxd:filmTitle"] ?? item.title,
        year: item["letterboxd:filmYear"],
        watchedDate: item["letterboxd:watchedDate"],
        rating: item["letterboxd:memberRating"] ? parseFloat(item["letterboxd:memberRating"]) : null,
        runtime,
      });
    }

    return NextResponse.json({
      diary: diaryEntries,
      totalMinutes,
      filmCount: diaryEntries.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Letterboxd API error:", err);
    return NextResponse.json({ error: "Failed to fetch Letterboxd data" }, { status: 500 });
  }
}
