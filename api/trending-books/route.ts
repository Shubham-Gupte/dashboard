import { NextResponse } from "next/server";

export const revalidate = 86400; // 24 hour ISR

interface NytBook {
  title: string;
  author: string;
  description: string;
  book_image: string;
  rank: number;
  weeks_on_list: number;
  primary_isbn13: string;
}

interface NytList {
  list_name: string;
  display_name: string;
  books: NytBook[];
}

export async function GET() {
  const apiKey = process.env.NYT_BOOKS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NYT Books API not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=${apiKey}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`NYT API: ${res.status}`);
    const data = await res.json();

    const lists: NytList[] = data.results?.lists ?? [];

    // Pick fiction + nonfiction combined lists
    const targetLists = ["Combined Print & E-Book Fiction", "Combined Print & E-Book Nonfiction"];
    const books = targetLists.flatMap((name) => {
      const list = lists.find((l) => l.display_name === name);
      if (!list) return [];
      return list.books.slice(0, 3).map((b) => ({
        title: b.title,
        author: b.author,
        description: b.description,
        cover: b.book_image,
        rank: b.rank,
        weeks: b.weeks_on_list,
        category: name.includes("Fiction") ? "Fiction" : "Nonfiction",
      }));
    });

    return NextResponse.json({ books, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("NYT Books API error:", err);
    return NextResponse.json({ error: "Failed to fetch trending books" }, { status: 500 });
  }
}
