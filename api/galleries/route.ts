import { NextResponse } from "next/server";

export const revalidate = 86400; // 24 hour ISR

interface Exhibit {
  artist: string;
  gallery: string;
  location: string;
}

interface Gallery {
  name: string;
  address: string;
  distance: string;
}

// Chelsea coordinates (241 W 24th St)
const LAT = 40.7448;
const LON = -73.9968;

// ── Chelsea gallery scrapers ───────────────────────────────────────────

async function fetchDavidZwirner(): Promise<Exhibit[]> {
  try {
    const res = await fetch("https://www.davidzwirner.com/exhibitions", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Look for artist names in exhibition headings
    const exhibits: Exhibit[] = [];
    const regex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let match;
    const skip = new Set(["featured spring exhibitions", "currently on view", "upcoming", "past", "exhibitions"]);
    while ((match = regex.exec(html)) !== null && exhibits.length < 2) {
      const name = match[1].trim();
      if (name.length > 2 && !skip.has(name.toLowerCase())) {
        exhibits.push({ artist: name, gallery: "David Zwirner", location: "W 19th St" });
      }
    }
    return exhibits;
  } catch { return []; }
}

async function fetchPace(): Promise<Exhibit[]> {
  try {
    const res = await fetch("https://www.pacegallery.com/exhibitions/", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const exhibits: Exhibit[] = [];
    const regex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let match;
    let inNY = false;
    const skip = new Set(["new york", "los angeles", "london", "seoul", "hong kong", "geneva", "tokyo", "exhibitions"]);
    while ((match = regex.exec(html)) !== null && exhibits.length < 3) {
      const name = match[1].trim();
      const lower = name.toLowerCase();
      if (lower === "new york") { inNY = true; continue; }
      if (lower.includes("new york") && lower.includes("125")) { inNY = false; continue; }
      if (skip.has(lower) || lower.startsWith("los ") || lower.startsWith("london") || lower.startsWith("seoul")) { inNY = false; continue; }
      if (inNY && name.length > 2) {
        exhibits.push({ artist: name, gallery: "Pace", location: "W 25th St" });
      }
    }
    return exhibits;
  } catch { return []; }
}

async function fetchMoMA(): Promise<Exhibit[]> {
  try {
    const res = await fetch("https://www.moma.org/calendar/exhibitions", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const exhibits: Exhibit[] = [];
    // MoMA uses various heading patterns for exhibition titles
    const regex = /<h[23][^>]*>\s*(?:<a[^>]*>)?\s*([^<]+)/gi;
    let match;
    const skip = new Set(["exhibitions", "current", "upcoming", "past", "on view", "calendar"]);
    while ((match = regex.exec(html)) !== null && exhibits.length < 2) {
      const title = match[1].trim();
      if (title.length > 3 && !skip.has(title.toLowerCase())) {
        exhibits.push({ artist: title, gallery: "MoMA", location: "W 53rd St" });
      }
    }
    return exhibits;
  } catch { return []; }
}

async function fetchWhitney(): Promise<Exhibit[]> {
  try {
    const res = await fetch("https://whitney.org/exhibitions", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const exhibits: Exhibit[] = [];
    const regex = /<h[23][^>]*>\s*<a[^>]*>\s*([^<]+)/gi;
    let match;
    while ((match = regex.exec(html)) !== null && exhibits.length < 2) {
      const title = match[1].trim();
      if (title.length > 3 && !title.toLowerCase().includes("menu") && !title.toLowerCase().includes("exhibition")) {
        exhibits.push({ artist: title, gallery: "Whitney", location: "Gansevoort St" });
      }
    }
    return exhibits;
  } catch { return []; }
}

// ── Nearby galleries from OpenStreetMap ─────────────────────────────────

async function fetchNearbyGalleries(): Promise<Gallery[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["tourism"="gallery"](around:800,${LAT},${LON});
      way["tourism"="gallery"](around:800,${LAT},${LON});
    );
    out center tags 20;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return data.elements
      .filter((el: { tags?: { name?: string } }) => el.tags?.name)
      .map((el: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: { name: string; "addr:street"?: string; "addr:housenumber"?: string } }) => {
        const elLat = el.lat ?? el.center?.lat ?? LAT;
        const elLon = el.lon ?? el.center?.lon ?? LON;
        const dist = haversine(LAT, LON, elLat, elLon);
        const street = el.tags["addr:housenumber"] && el.tags["addr:street"]
          ? `${el.tags["addr:housenumber"]} ${el.tags["addr:street"]}`
          : el.tags["addr:street"] || "";
        return { name: el.tags.name, address: street, distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`, distanceM: dist };
      })
      .sort((a: { distanceM: number }, b: { distanceM: number }) => a.distanceM - b.distanceM)
      .slice(0, 6)
      .map(({ distanceM: _, ...rest }: { distanceM: number; name: string; address: string; distance: string }) => rest);
  } catch { return []; }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET() {
  try {
    // Chelsea galleries first, then museums
    const [zwirner, pace, moma, whitney, nearby] = await Promise.all([
      fetchDavidZwirner(),
      fetchPace(),
      fetchMoMA(),
      fetchWhitney(),
      fetchNearbyGalleries(),
    ]);

    // Chelsea first, museums after
    const exhibits = [...zwirner, ...pace, ...whitney, ...moma];

    return NextResponse.json({
      exhibits,
      nearby,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Galleries API error:", err);
    return NextResponse.json({ error: "Failed to fetch galleries" }, { status: 500 });
  }
}
