import { NextResponse } from "next/server";
import { getConfig } from "../../lib/config";
import { XMLParser } from "fast-xml-parser";

export const revalidate = 3600;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface GoodreadsItem {
  title: string;
  author_name: string;
  book_image_url: string;
  book_published: string;
  average_rating: string;
  user_rating: string;
  user_read_at: string;
  user_date_added: string;
  num_pages: string;
  link: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shelf = searchParams.get("shelf") ?? "read";
  const config = getConfig();

  try {
    const feedUrl = `https://www.goodreads.com/review/list_rss/${config.goodreads}?shelf=${shelf}`;
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DashboardBot/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Goodreads RSS: ${res.status}`);

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items: GoodreadsItem[] = parsed?.rss?.channel?.item ?? [];

    if (shelf === "read") {
      const currentYear = new Date().getFullYear();

      const books = items.map((item) => ({
        title: item.title,
        author: item.author_name,
        image: item.book_image_url,
        rating: item.user_rating ? parseInt(item.user_rating, 10) : null,
        avgRating: parseFloat(item.average_rating),
        pages: item.num_pages ? parseInt(item.num_pages, 10) : null,
        readAt: item.user_read_at,
        addedAt: item.user_date_added,
        link: item.link,
      }));

      // user_read_at is often empty in Goodreads RSS. Fall back to
      // user_date_added (when the book was moved to the "read" shelf),
      // which Goodreads always populates.
      const count = books.filter((b) => {
        const dateStr = b.readAt || b.addedAt;
        return dateStr && new Date(dateStr).getFullYear() === currentYear;
      }).length;

      return NextResponse.json({
        books,
        count,
        updatedAt: new Date().toISOString(),
      });
    }

    // to-read shelf
    const recs = items.slice(0, 10).map((item) => ({
      title: item.title,
      author: item.author_name,
      image: item.book_image_url,
      avgRating: parseFloat(item.average_rating),
      pages: item.num_pages ? parseInt(item.num_pages, 10) : null,
      link: item.link,
    }));

    return NextResponse.json({ books: recs, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Goodreads API error:", err);
    return NextResponse.json({ error: "Failed to fetch Goodreads data" }, { status: 500 });
  }
}
