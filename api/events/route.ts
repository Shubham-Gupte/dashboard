import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hour ISR

interface NycEvent {
  title: string;
  location: string;
  time: string;
  category: string;
}

async function fetchNycParksEvents(): Promise<NycEvent[]> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  // NYC Open Data - Parks events
  // Filter to Manhattan events
  const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$where=start_date_time >= '${dateStr}T00:00:00' AND start_date_time <= '${dateStr}T23:59:59' AND borough = 'Manhattan'&$limit=10&$order=start_date_time`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((e: { title?: string; event_name?: string; location?: string; park_name?: string; start_date_time?: string; category?: string }) => ({
      title: e.title || e.event_name || "Event",
      location: e.location || e.park_name || "",
      time: e.start_date_time ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(e.start_date_time)) : "",
      category: e.category || "Event",
    }));
  } catch {
    return [];
  }
}

async function fetchNycGovEvents(): Promise<NycEvent[]> {
  // NYC.gov events RSS
  try {
    const res = await fetch("https://www.nyc.gov/events/feed.rss", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "DashboardApp/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NycEvent[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const block = match[1];
      const titleMatch = titleRegex.exec(block);
      const descMatch = descRegex.exec(block);
      const title = titleMatch?.[1] || titleMatch?.[2] || "";
      const desc = descMatch?.[1] || descMatch?.[2] || "";
      if (title) {
        items.push({
          title,
          location: desc.slice(0, 60),
          time: "",
          category: "City",
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [parks, city] = await Promise.all([
      fetchNycParksEvents(),
      fetchNycGovEvents(),
    ]);

    // Dedupe by title, prefer parks (has times)
    const seen = new Set<string>();
    const events: NycEvent[] = [];
    for (const e of [...parks, ...city]) {
      const key = e.title.toLowerCase().slice(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        events.push(e);
      }
    }

    return NextResponse.json({
      events: events.slice(0, 5),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Events API error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
