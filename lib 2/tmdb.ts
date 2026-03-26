import { getCachedRuntime, setCachedRuntime } from "./db";

const TMDB_BASE = "https://api.themoviedb.org/3";

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not set");
  return key;
}

export async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getRuntime(tmdbId: number): Promise<number> {
  const cached = getCachedRuntime(tmdbId);
  if (cached !== undefined) return cached;

  const data = await tmdbFetch<{ runtime: number }>(`/movie/${tmdbId}`);
  const runtime = data.runtime ?? 0;
  setCachedRuntime(tmdbId, runtime);
  return runtime;
}
