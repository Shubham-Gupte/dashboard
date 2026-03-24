import { NextResponse } from "next/server";
import { getConfig } from "../../lib/config";
import { getRuntime } from "../../lib/tmdb";
import { XMLParser } from "fast-xml-parser";

export const revalidate = 3600; // 1 hour ISR

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface LetterboxdItem {
  title: string;
  link: string;
  "letterboxd:filmTitle": string;
  "letterboxd:filmYear": string;
  "letterboxd:watchedDate": string;
  "letterboxd:memberRating"?: string;
  "tmdb:movieId": string;
  description?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "diary";
  const config = getConfig();

  try {
    const feedUrl =
      type === "watchlist"
        ? `https://letterboxd.com/${config.letterboxd}/watchlist/rss/`
        : `https://letterboxd.com/${config.letterboxd}/rss/`;

    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      if (type === "watchlist" && res.status === 403) {
        // Letterboxd blocks server-side watchlist RSS — return empty
        return NextResponse.json({ watchlist: [], updatedAt: new Date().toISOString(), note: "Letterboxd watchlist RSS blocked server-side" });
      }
      throw new Error(`Letterboxd RSS: ${res.status}`);
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items: LetterboxdItem[] = parsed?.rss?.channel?.item ?? [];

    if (type === "watchlist") {
      const watchlist = items.slice(0, 10).map((item) => ({
        title: item["letterboxd:filmTitle"] ?? item.title,
        year: item["letterboxd:filmYear"],
        link: item.link,
      }));
      return NextResponse.json({ watchlist, updatedAt: new Date().toISOString() });
    }

    // Diary: filter current year, compute minutes watched
    const currentYear = new Date().getFullYear();
    const diaryItems = items.filter((item) => {
      const watched = item["letterboxd:watchedDate"];
      return watched && new Date(watched).getFullYear() === currentYear;
    });

    let totalMinutes = 0;
    const diaryEntries = [];
    for (const item of diaryItems) {
      const tmdbId = parseInt(item["tmdb:movieId"], 10);
      let runtime = 0;
      if (tmdbId) {
        try {
          runtime = await getRuntime(tmdbId);
        } catch {
          // skip runtime if TMDB lookup fails
        }
      }
      totalMinutes += runtime;
      diaryEntries.push({
        title: item["letterboxd:filmTitle"] ?? item.title,
        year: item["letterboxd:filmYear"],
        watchedDate: item["letterboxd:watchedDate"],
        rating: item["letterboxd:memberRating"] ? parseFloat(item["letterboxd:memberRating"]) : null,
        runtime,
      });
    }

    return NextResponse.json({
      diary: diaryEntries,
      totalMinutes,
      filmCount: diaryEntries.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Letterboxd API error:", err);
    return NextResponse.json({ error: "Failed to fetch Letterboxd data" }, { status: 500 });
  }
}
