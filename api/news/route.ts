import { NextResponse } from "next/server";

export const revalidate = 900; // 15 min ISR

interface HnItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
}

interface NewsItem {
  title: string;
  url: string;
  source: "HN" | "NYT" | "MKT";
  score?: number;
  change?: string;
}

async function fetchHnTopStories(count: number): Promise<NewsItem[]> {
  const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
    next: { revalidate: 900 },
  });
  if (!idsRes.ok) return [];
  const ids: number[] = await idsRes.json();

  const items = await Promise.all(
    ids.slice(0, count).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        next: { revalidate: 900 },
      });
      if (!res.ok) return null;
      return res.json() as Promise<HnItem>;
    })
  );

  return items
    .filter((item): item is HnItem => item !== null && !!item.title)
    .map((item) => ({
      title: item.title,
      url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
      source: "HN" as const,
      score: item.score,
    }));
}

async function fetchNytNews(count: number): Promise<NewsItem[]> {
  const res = await fetch("https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", {
    next: { revalidate: 900 },
  });
  if (!res.ok) return [];
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
    const block = match[1];
    const titleMatch = titleRegex.exec(block);
    const linkMatch = linkRegex.exec(block);
    const title = titleMatch?.[1] ?? "";
    const url = linkMatch?.[1] ?? "";
    if (title && url) {
      items.push({ title, url, source: "NYT" });
    }
  }
  return items;
}

const TICKERS = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "NASDAQ" },
  { symbol: "^DJI", label: "DOW" },
];

async function fetchMarketQuotes(): Promise<NewsItem[]> {
  const results = await Promise.all(
    TICKERS.map(async ({ symbol, label }) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
            next: { revalidate: 300 },
          }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose;
        const diff = price - prevClose;
        const pct = ((diff / prevClose) * 100).toFixed(2);
        const sign = diff >= 0 ? "+" : "";
        const arrow = diff >= 0 ? "▲" : "▼";

        return {
          title: `${label}  ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  ${arrow} ${sign}${pct}%`,
          url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
          source: "MKT" as const,
          change: sign + pct + "%",
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is NewsItem => r !== null);
}

export async function GET() {
  try {
    const [hn, nyt, market] = await Promise.all([
      fetchHnTopStories(5),
      fetchNytNews(5),
      fetchMarketQuotes(),
    ]);

    // Round-robin: NYT, HN, MKT, NYT, HN, MKT, ...
    const combined: NewsItem[] = [];
    const sources = [nyt, hn, market];
    const maxLen = Math.max(nyt.length, hn.length, market.length);
    for (let i = 0; i < maxLen; i++) {
      for (const src of sources) {
        if (i < src.length) combined.push(src[i]);
      }
    }

    return NextResponse.json({ stories: combined, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("News API error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
