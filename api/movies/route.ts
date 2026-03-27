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
const PROVIDER_MAP: Record<string, number> = {
  netflix: 8,
  prime: 9,
  max: 1899,
  crunchyroll: 283,
  hulu: 15,
  disney: 337,
};

function getProviderIds(config: ReturnType<typeof getConfig>): string {
  const providers = config.streamingProviders ?? {};
  return Object.entries(providers)
    .filter(([, enabled]) => enabled)
    .map(([key]) => PROVIDER_MAP[key])
    .filter(Boolean)
    .join("|");
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

async function fetchLetterboxdRssIds(url: string): Promise<Set<number>> {
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

async function fetchLetterboxdWatchlist(username: string): Promise<Set<number>> {
  const ids = new Set<number>();
  const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
  try {
    // Scrape paginated watchlist HTML
    const names: { title: string; year: string }[] = [];
    for (let page = 1; page <= 5; page++) {
      const url = page === 1
        ? `https://letterboxd.com/${username}/watchlist/`
        : `https://letterboxd.com/${username}/watchlist/page/${page}/`;
      const res = await fetch(url, { headers: { "User-Agent": ua }, next: { revalidate: 3600 } });
      if (!res.ok) break;
      const html = await res.text();
      // Extract data-item-name="Title (Year)" from poster divs
      const re = /data-item-name="([^"]+)"/g;
      let match;
      while ((match = re.exec(html)) !== null) {
        const raw = match[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
        const m = raw.match(/^(.+?)\s*\((\d{4})\)$/);
        if (m) names.push({ title: m[1], year: m[2] });
      }
      // Stop if no next page
      if (!html.includes(`/watchlist/page/${page + 1}/`)) break;
    }

    // Resolve TMDB IDs via search (parallel, batched)
    const searches = names.map(({ title, year }) =>
      tmdbFetch<{ results: { id: number }[] }>("/search/movie", { query: title, year })
        .then((r) => r.results[0]?.id)
        .catch(() => undefined)
    );
    const results = await Promise.all(searches);
    for (const id of results) {
      if (id) ids.add(id);
    }
  } catch {
    // non-fatal
  }
  return ids;
}

function score(m: TmdbMovie): number {
  return m.vote_average;
}

export async function GET() {
  try {
    const config = getConfig();

    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const providerIds = getProviderIds(config);

    // Fetch in parallel: now playing, streaming (discover by provider), watched, and watchlist
    const [nowPlaying, streaming, watchedIds, watchlistIds] = await Promise.all([
      tmdbFetch<TmdbListResponse>("/movie/now_playing", { region: "US" }),
      tmdbFetch<TmdbListResponse>("/discover/movie", {
        watch_region: "US",
        with_watch_providers: providerIds,
        sort_by: "popularity.desc",
        "vote_count.gte": "50",
        "release_date.gte": cutoff,
      }),
      fetchLetterboxdRssIds(`https://letterboxd.com/${config.letterboxd}/rss/`),
      fetchLetterboxdWatchlist(config.letterboxd),
    ]);

    // Merge, dedupe, filter to last 90 days (watchlist bypasses date filter)
    const seen = new Set<number>();
    const all: (TmdbMovie & { source: string })[] = [];
    const isRecent = (m: TmdbMovie) => m.release_date != null && m.release_date >= cutoff;
    for (const m of nowPlaying.results) {
      if (!seen.has(m.id) && isRecent(m)) { seen.add(m.id); all.push({ ...m, source: "theater" }); }
    }
    for (const m of streaming.results) {
      if (!seen.has(m.id) && (isRecent(m) || watchlistIds.has(m.id))) {
        seen.add(m.id); all.push({ ...m, source: "streaming" });
      }
    }

    const unwatched = all
      .filter((m) => !watchedIds.has(m.id))
      .map((m) => ({ ...m, _score: score(m), fromWatchlist: watchlistIds.has(m.id) }))
      .sort((a, b) => b._score - a._score);

    // Guarantee: 2 theater, 1 watchlist (if in trending/now_playing), fill rest
    const reserved = new Set<number>();
    const picks: typeof unwatched = [];

    const theaters = unwatched.filter((m) => m.source === "theater");
    for (const m of theaters.slice(0, 2)) { picks.push(m); reserved.add(m.id); }

    const watchlistPick = unwatched.find((m) => m.fromWatchlist && !reserved.has(m.id));
    if (watchlistPick) { picks.push({ ...watchlistPick, source: "watchlist" }); reserved.add(watchlistPick.id); }

    for (const m of unwatched) {
      if (picks.length >= 15) break;
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
