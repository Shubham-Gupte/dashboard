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
  release_date?: string;
  genre_ids?: number[];
}

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

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

async function fetchLetterboxdIds(url: string): Promise<Set<number>> {
  const ids = new Set<number>();
  try {
    const res = await fetch(url, {
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
    // non-fatal
  }
  return ids;
}

function score(m: TmdbMovie, maxPop: number): number {
  const normPop = maxPop > 0 ? m.popularity / maxPop : 0; // 0-1
  const normRating = m.vote_average / 10; // 0-1
  const confidence = Math.min(m.vote_count / 500, 1); // 0-1, saturates at 500 votes
  return normPop * 0.3 + normRating * confidence * 0.7;
}

export async function GET() {
  try {
    const config = getConfig();

    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    // Fetch in parallel: now playing, trending, watched, and watchlist
    const [nowPlaying, trending, watchedIds, watchlistIds] = await Promise.all([
      tmdbFetch<TmdbListResponse>("/movie/now_playing", { region: "US" }),
      tmdbFetch<TmdbListResponse>("/trending/movie/week"),
      fetchLetterboxdIds(`https://letterboxd.com/${config.letterboxd}/rss/`),
      fetchLetterboxdIds(`https://letterboxd.com/${config.letterboxd}/watchlist/rss/`),
    ]);

    // Merge, dedupe, filter to last 90 days (watchlist bypasses date filter)
    const seen = new Set<number>();
    const all: (TmdbMovie & { source: string })[] = [];
    const isRecent = (m: TmdbMovie) => m.release_date != null && m.release_date >= cutoff;
    for (const m of nowPlaying.results) {
      if (!seen.has(m.id) && isRecent(m)) { seen.add(m.id); all.push({ ...m, source: "theater" }); }
    }
    for (const m of trending.results) {
      if (!seen.has(m.id) && (isRecent(m) || watchlistIds.has(m.id))) {
        seen.add(m.id); all.push({ ...m, source: "streaming" });
      }
    }

    const maxPop = Math.max(...all.map((m) => m.popularity), 1);
    const unwatched = all
      .filter((m) => !watchedIds.has(m.id))
      .map((m) => ({ ...m, _score: score(m, maxPop), fromWatchlist: watchlistIds.has(m.id) }))
      .sort((a, b) => b._score - a._score);

    // Guarantee: 2 theater, 1 watchlist (if available on streaming), fill rest
    const reserved = new Set<number>();
    const picks: typeof unwatched = [];

    const theaters = unwatched.filter((m) => m.source === "theater");
    for (const m of theaters.slice(0, 2)) { picks.push(m); reserved.add(m.id); }

    const watchlistPick = unwatched.find((m) => m.fromWatchlist && !reserved.has(m.id));
    if (watchlistPick) { picks.push({ ...watchlistPick, source: "watchlist" }); reserved.add(watchlistPick.id); }

    for (const m of unwatched) {
      if (picks.length >= 5) break;
      if (!reserved.has(m.id)) { picks.push(m); reserved.add(m.id); }
    }

    const scored = picks.sort((a, b) => b._score - a._score);

    const maxScore = scored[0]?._score ?? 1;
    const movies = scored.map((m) => ({
      id: m.id,
      title: m.title,
      genre: m.genre_ids?.map((id) => GENRE_MAP[id]).filter(Boolean)[0] ?? null,
      rating: Math.round(m.vote_average * 10) / 10,
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
