import { NextResponse } from "next/server";
import { tmdbFetch } from "../../lib/tmdb";
import { getConfig } from "../../lib/config";
import { XMLParser } from "fast-xml-parser";

export const revalidate = 21600; // 6 hours ISR

interface TmdbMovie {
  id: number;
  title: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
}

interface TmdbListResponse {
  results: TmdbMovie[];
}

// TMDB watch provider IDs (US region)
// Netflix=8, Amazon Prime Video=9, HBO Max/Max=1899, Crunchyroll=283
const PROVIDER_IDS = "8|9|1899|283";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

async function getWatchedTmdbIds(letterboxdUser: string): Promise<Set<number>> {
  const ids = new Set<number>();
  try {
    const res = await fetch(`https://letterboxd.com/${letterboxdUser}/rss/`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return ids;
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item ?? [];
    for (const item of items) {
      const tmdbId = parseInt(item["tmdb:movieId"], 10);
      if (tmdbId) ids.add(tmdbId);
    }
  } catch {
    // non-fatal — just skip filtering
  }
  return ids;
}

function score(m: TmdbMovie): number {
  return m.popularity * 0.4 + (m.vote_average * m.vote_count) / 1000 * 0.6;
}

export async function GET() {
  try {
    const config = getConfig();

    // Fetch in parallel: now playing, streaming trending, and watched list
    const [nowPlaying, streaming, watchedIds] = await Promise.all([
      tmdbFetch<TmdbListResponse>("/movie/now_playing", { region: "US" }),
      tmdbFetch<TmdbListResponse>("/discover/movie", {
        watch_region: "US",
        with_watch_providers: PROVIDER_IDS,
        sort_by: "popularity.desc",
      }),
      getWatchedTmdbIds(config.letterboxd),
    ]);

    // Merge and dedupe
    const seen = new Set<number>();
    const all: (TmdbMovie & { source: string })[] = [];
    for (const m of nowPlaying.results) {
      if (!seen.has(m.id)) { seen.add(m.id); all.push({ ...m, source: "theater" }); }
    }
    for (const m of streaming.results) {
      if (!seen.has(m.id)) { seen.add(m.id); all.push({ ...m, source: "streaming" }); }
    }

    const scored = all
      .filter((m) => !watchedIds.has(m.id))
      .map((m) => ({ ...m, _score: score(m) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);

    const maxScore = scored[0]?._score ?? 1;
    const movies = scored.map((m) => ({
      id: m.id,
      title: m.title,
      rating: m.vote_average,
      heat: m._score / maxScore,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w154${m.poster_path}` : null,
      source: m.source,
    }));

    return NextResponse.json({ movies, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Movies API error:", err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
