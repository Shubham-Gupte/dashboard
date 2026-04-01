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

export function findNearest(lat: number, lon: number, stations: StationData[]): StationData | null {
  let best: StationData | null = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const d = haversine(lat, lon, s.lat, s.lon);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

export function detectProvider(lat: number, lon: number, providers: TransitProvider[]): TransitProvider | null {
  for (const p of providers) {
    const [s, w, n, e] = p.bounds;
    if (lat >= s && lat <= n && lon >= w && lon <= e) return p;
  }
  return null;
}
