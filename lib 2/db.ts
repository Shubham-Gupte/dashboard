import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

type RuntimeCache = Record<string, number>; // tmdb_id -> runtime_min

let cache: RuntimeCache | null = null;

function cachePath(): string {
  const root = process.env.DASHBOARD_ROOT;
  if (!root) throw new Error("DASHBOARD_ROOT env var not set");
  return join(root, "runtime-cache.json");
}

function loadCache(): RuntimeCache {
  if (cache) return cache;
  const p = cachePath();
  if (existsSync(p)) {
    cache = JSON.parse(readFileSync(p, "utf-8"));
  } else {
    cache = {};
  }
  return cache!;
}

function saveCache(): void {
  writeFileSync(cachePath(), JSON.stringify(cache, null, 2));
}

export function getCachedRuntime(tmdbId: number): number | undefined {
  const c = loadCache();
  return c[String(tmdbId)];
}

export function setCachedRuntime(tmdbId: number, runtime: number): void {
  const c = loadCache();
  c[String(tmdbId)] = runtime;
  saveCache();
}
