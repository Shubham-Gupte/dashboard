import { NextResponse } from "next/server";
import { tmdbFetch } from "../../lib/tmdb";

export const revalidate = 21600; // 6 hours ISR

interface TmdbMovie {
  id: number;
  title: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
}

interface NowPlayingResponse {
  results: TmdbMovie[];
}

function blockbusterScore(m: TmdbMovie): number {
  return m.popularity * 0.4 + (m.vote_average * m.vote_count) / 1000 * 0.6;
}

export async function GET() {
  try {
    const data = await tmdbFetch<NowPlayingResponse>("/movie/now_playing", { region: "US" });
    const scored = data.results
      .map((m) => ({ ...m, score: blockbusterScore(m) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const maxScore = scored[0]?.score ?? 1;
    const movies = scored.map((m) => ({
      id: m.id,
      title: m.title,
      rating: m.vote_average,
      heat: m.score / maxScore,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w154${m.poster_path}` : null,
    }));

    return NextResponse.json({ movies, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Movies API error:", err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
