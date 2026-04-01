import type { StationData, TransitProvider } from "./types";

const R = 6_371_000; // Earth radius in meters

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns the nearest station plus all others within walkable radius (~300m). */
export function findNearby(lat: number, lon: number, stations: StationData[], radiusM = 300): StationData[] {
  const withDist = stations.map((s) => ({ s, d: haversine(lat, lon, s.lat, s.lon) }));
  withDist.sort((a, b) => a.d - b.d);
  if (withDist.length === 0) return [];
  const threshold = Math.max(withDist[0].d + radiusM, radiusM);
  return withDist.filter((x) => x.d <= threshold).map((x) => x.s);
}

export function detectProvider(lat: number, lon: number, providers: TransitProvider[]): TransitProvider | null {
  for (const p of providers) {
    const [s, w, n, e] = p.bounds;
    if (lat >= s && lat <= n && lon >= w && lon <= e) return p;
  }
  return null;
}
