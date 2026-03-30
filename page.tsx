"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

const MTA_COLORS: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  G: "#6CBE45", L: "#A7A9AC",
  J: "#996633", Z: "#996633",
};

type MovieItem = { id: number; title: string; genre: string | null; rating: number; heat: number; poster: string | null; source: string };

function useIsPi(): boolean {
  const [isPi, setIsPi] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsPi(/linux.*arm|aarch64/.test(ua));
  }, []);
  return isPi;
}

const ITEM_H = 56;
const VISIBLE = 5;

type LinkRenderer = (props: { href: string; title: string; source: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) => React.ReactNode;

function CreditsCycle({ movies, renderLink }: { movies: MovieItem[]; renderLink: LinkRenderer }) {
  const [px, setPx] = useState(0);
  const count = movies.length;
  const totalH = count * ITEM_H;

  useEffect(() => {
    if (count <= VISIBLE) return;
    let raf: number;
    let last: number | null = null;
    const speed = 0.02; // px per ms (~20px/s)
    const tick = (ts: number) => {
      if (last !== null) setPx((p) => (p + speed * (ts - last!)) % totalH);
      last = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, totalH]);

  if (count <= VISIBLE) {
    return (
      <div className="space-y-1">
        {movies.map((m) => <MovieRow key={m.id} movie={m} renderLink={renderLink} />)}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ height: VISIBLE * ITEM_H }}>
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#2A1F1B] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#2A1F1B] to-transparent z-10 pointer-events-none" />
      <div style={{ transform: `translateY(${-px}px)` }}>
        {/* Triple for seamless wrap */}
        {[0, 1, 2].map((batch) =>
          movies.map((m, i) => <MovieRow key={`${batch}-${m.id}-${i}`} movie={m} renderLink={renderLink} />)
        )}
      </div>
    </div>
  );
}

function MovieRow({ movie: m, renderLink }: { movie: MovieItem; renderLink: LinkRenderer }) {
  const inner = (
    <>
      {m.poster && (
        <img src={m.poster} alt="" className={`w-8 h-12 rounded object-cover flex-shrink-0 ${
          m.source === "theater" ? "ring-2 ring-[#EE352E]" : m.source === "watchlist" ? "ring-2 ring-[#4A90D9]" : ""
        }`} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate text-[#F4C9AC]">{m.title}{m.genre && <span className="text-[#AE6455] text-xs ml-1.5">· {m.genre}</span>}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-[#1A1210] rounded-full overflow-hidden">
            <div className="h-full bg-[#EF9870] rounded-full" style={{ width: `${Math.round(m.heat * 100)}%` }} />
          </div>
          <span className="text-xs text-[#AE6455] font-mono">{m.rating.toFixed(1)}</span>
        </div>
      </div>
    </>
  );
  return (
    <div style={{ height: ITEM_H }}>
      {renderLink({
        href: `https://www.themoviedb.org/movie/${m.id}`,
        title: m.title,
        source: "MOVIE",
        className: "flex items-center gap-3 hover:bg-[#AE645511] rounded px-1 -mx-1 transition-colors h-full",
        children: inner,
      })}
    </div>
  );
}

function SubwayIcon({ line, size = 20 }: { line: string; size?: number }) {
  const bg = MTA_COLORS[line] ?? "#555";
  const isYellow = ["N", "Q", "R", "W"].includes(line);
  return (
    <span
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.55 }}
      className={`inline-flex items-center justify-center rounded-full font-bold leading-none ${isYellow ? "text-black" : "text-white"}`}
    >
      {line}
    </span>
  );
}

// WMO weather code → Font Awesome SVG icon (free set)
function WeatherIcon({ code, size = 24 }: { code?: number; size?: number }) {
  if (code == null) return null;
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 512 512", fill: "currentColor" };

  // Sun: clear (0), mostly clear (1)
  if (code <= 1) return (
    <svg {...props} className="text-[#FCCC0A]">
      <path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM256 160a96 96 0 1 0 0 192 96 96 0 1 0 0-192z"/>
    </svg>
  );

  // Partly cloudy (2)
  if (code === 2) return (
    <svg {...props} className="text-[#F4C9AC]">
      <path d="M294.2 1.2c5.1 2.1 8.7 6.7 9.6 12.1l14.1 84.7 84.7 14.1c5.4 .9 10 4.5 12.1 9.6s1.5 10.9-1.6 15.4l-38.5 55c-2.2-.1-4.4-.2-6.7-.2c-23.3 0-45.1 6.2-64 17.1l0-1.1c0-53-43-96-96-96s-96 43-96 96 43 96 96 96c8.1 0 15.9-1 23.4-2.9c-3.6 11.6-5.4 24-5.4 36.9 0 6 .4 11.8 1.3 17.5l-43.5 30c-4.5 3.1-10.2 3.7-15.4 1.6s-8.7-6.7-9.6-12.1L243.3 278.2l-84.7-14.1c-5.4-.9-10-4.5-12.1-9.6s-1.5-10.9 1.6-15.4L186.6 192l-38.5-47.1c-3.1-4.5-3.7-10.2-1.6-15.4s6.7-8.7 12.1-9.6l84.7-14.1 14.1-84.7c.9-5.4 4.5-10 9.6-12.1s10.9-1.5 15.4 1.6L320 49.1l47.1-38.5c4.5-3.1 10.2-3.7 15.4-1.6zM288 224a64 64 0 1 1 128 0 64 64 0 1 1-128 0zM304 384a144 144 0 1 1 288 0 144 144 0 1 1-288 0zm-16 0a160 160 0 0 0 160 160H128c-70.7 0-128-57.3-128-128 0-61.9 44-113.6 102.4-125.4 4.1-40.7 38.6-72.6 80.6-72.6 34.5 0 64.3 21.5 76.2 51.9 9.8-3.9 20.5-5.9 31.8-5.9z"/>
    </svg>
  );

  // Overcast (3)
  if (code === 3) return (
    <svg {...props} className="text-[#AE6455]">
      <path d="M0 336c0 79.5 64.5 144 144 144H512c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32C167.6 32 96 103.6 96 192c0 2.7 .1 5.4 .2 8C40.2 219.8 0 273.2 0 336z"/>
    </svg>
  );

  // Fog (45, 48)
  if (code === 45 || code === 48) return (
    <svg {...props} className="text-[#AE6455]">
      <path d="M0 336c0 79.5 64.5 144 144 144H512c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32C167.6 32 96 103.6 96 192c0 2.7 .1 5.4 .2 8C40.2 219.8 0 273.2 0 336z" opacity="0.6"/>
    </svg>
  );

  // Drizzle/light rain (51-55, 80)
  if ((code >= 51 && code <= 55) || code === 80) return (
    <svg {...props} className="text-[#6CAADF]">
      <path d="M96 320c-53 0-96-43-96-96c0-42.5 27.6-78.6 65.9-91.2C168.9 40.5 259.8-15.2 369.1 8.9c82.2 18.2 144.8 86.4 152.7 169.9C576 189.4 640 260 640 345c0 79.5-64.5 144-144 144H144 96zm49.8 84.8l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8zm128-24l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8zm128 24l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8z"/>
    </svg>
  );

  // Rain (61-65, 81-82)
  if ((code >= 61 && code <= 65) || (code >= 81 && code <= 82)) return (
    <svg {...props} className="text-[#4A90D9]">
      <path d="M96 320c-53 0-96-43-96-96c0-42.5 27.6-78.6 65.9-91.2C168.9 40.5 259.8-15.2 369.1 8.9c82.2 18.2 144.8 86.4 152.7 169.9C576 189.4 640 260 640 345c0 79.5-64.5 144-144 144H144 96zm49.8 84.8l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8zm128-24l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8zm128 24l-4.4 7c-9.1 14.5-28.3 18.9-42.8 9.8s-18.9-28.3-9.8-42.8l4.4-7c9.1-14.5 28.3-18.9 42.8-9.8s18.9 28.3 9.8 42.8z"/>
    </svg>
  );

  // Snow (71-77, 85-86)
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return (
    <svg {...props} className="text-[#D4E5F7]">
      <path d="M234.5 5.7c13.4-6.6 29.2-2.1 37.4 10.4L384 192l112.2-176c8.3-12.5 24-17 37.4-10.4s19.6 21.2 14.4 35.2L440 256l108 215.2c5.2 14-1 29.5-14.4 35.2s-29.2 2.1-37.4-10.4L384 320 271.8 496c-8.3 12.5-24 17-37.4 10.4s-19.6-21.2-14.4-35.2L328 256 220 40.8c-5.2-14 1-29.5 14.4-35.2z"/>
    </svg>
  );

  // Thunderstorm (95-99)
  if (code >= 95) return (
    <svg {...props} className="text-[#FCCC0A]">
      <path d="M0 224c0 53 43 96 96 96h47.2L96 384H54.8C24.6 384 0 408.6 0 438.8c0 25.9 18.1 48.3 43.4 53.8l154.4 33.2c-6-17.5-9.8-36.1-9.8-55.8c0-97.2 78.8-176 176-176c27.2 0 52.8 6.4 75.8 17.6C494.4 247 544 189 544 120C544 53.7 490.3 0 424 0c-24.3 0-46.8 7.3-65.7 19.7C329.3 7.5 294.8 0 259 0 155.4 0 72 83.4 72 187v5.4C30.8 206.8 0 247.4 0 296v-72zm325.6 32l-37.1 96H352l-69.3 160 37.1-128H256l69.3-128z"/>
    </svg>
  );

  // Default: cloud
  return (
    <svg {...props} className="text-[#AE6455]">
      <path d="M0 336c0 79.5 64.5 144 144 144H512c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32C167.6 32 96 103.6 96 192c0 2.7 .1 5.4 .2 8C40.2 219.8 0 273.2 0 336z"/>
    </svg>
  );
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatTime(dateStr: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    hour12: true,
  }).format(new Date(dateStr));
}

// ── Timezones (client-side only, no API) ──────────────────────────────
const TIMEZONES = [
  { label: "NYC", tz: "America/New_York" },
  { label: "UTC", tz: "UTC" },
  { label: "SF", tz: "America/Los_Angeles" },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [quietOnly, setQuietOnly] = useState(false);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [shared, setShared] = useState<Set<string>>(new Set());
  const { mutate } = useSWRConfig();
  const isPi = useIsPi();

  useEffect(() => setMounted(true), []);

  // ── SWR hooks ──────────────────────────────────────────────────────
  // refreshWhenHidden keeps polling even when tab is backgrounded (TV dashboard)
  const swr = (ms: number) => ({ refreshInterval: ms, refreshWhenHidden: true });
  const { data: movies } = useSWR("/dashboard/api/movies", fetcher, swr(6 * 3600_000));
  const { data: watchlist } = useSWR("/dashboard/api/letterboxd?type=watchlist", fetcher, swr(3600_000));
  const { data: diary } = useSWR("/dashboard/api/letterboxd?type=diary", fetcher, swr(3600_000));
  const { data: booksRead } = useSWR("/dashboard/api/goodreads?shelf=read", fetcher, swr(3600_000));
  const { data: booksToRead } = useSWR("/dashboard/api/goodreads?shelf=to-read", fetcher, swr(3600_000));
  const { data: weather } = useSWR("/dashboard/api/weather", fetcher, swr(1800_000));
  const { data: subway } = useSWR("/dashboard/api/subway", fetcher, swr(30_000));
  const { data: calendar } = useSWR("/dashboard/api/calendar", fetcher, swr(300_000));
  const { data: funFact } = useSWR("/dashboard/api/fun-fact", fetcher, swr(3600_000));
  const { data: events } = useSWR("/dashboard/api/events", fetcher, swr(3600_000));
  const { data: galleries } = useSWR("/dashboard/api/galleries", fetcher, swr(86400_000));
  const { data: todos } = useSWR("/dashboard/api/todo", fetcher, swr(600_000));
  const { data: trending } = useSWR("/dashboard/api/trending-books", fetcher, swr(86400_000));
  const { data: news } = useSWR("/dashboard/api/news", fetcher, swr(900_000));

  const shareToDiscord = async (title: string, url: string, source: string) => {
    if (shared.has(url)) return;
    setShared((prev) => new Set(prev).add(url));
    await fetch("/dashboard/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, source }),
    });
  };

  // On Pi: tap sends to Discord. On desktop: normal link.
  const DashLink = ({ href, title, source, className, style, children }: {
    href: string; title: string; source: string; className?: string; style?: React.CSSProperties; children: React.ReactNode;
  }) => {
    if (isPi) {
      return (
        <button
          onClick={() => shareToDiscord(title, href, source)}
          className={`${className ?? ""} ${shared.has(href) ? "opacity-40" : ""}`}
          style={style}
        >
          {children}
          {shared.has(href) && <span className="text-[#6CBE45] text-[8px] ml-1">✓</span>}
        </button>
      );
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>{children}</a>;
  };

  const completeTodo = async (blockId: string) => {
    setCompleting((prev) => new Set(prev).add(blockId));
    fetch("/dashboard/api/todo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    // After fade-out animation, optimistically remove from local cache
    setTimeout(() => {
      mutate("/dashboard/api/todo", (current: { personal?: { id: string }[]; work?: { id: string }[]; updatedAt?: string } | undefined) => {
        if (!current) return current;
        return {
          ...current,
          personal: current.personal?.filter((t) => t.id !== blockId),
          work: current.work?.filter((t) => t.id !== blockId),
        };
      }, { revalidate: false });
      setCompleting((prev) => { const next = new Set(prev); next.delete(blockId); return next; });
    }, 400);
  };

  const now = new Date().toISOString();

  return (
    <div className="min-h-screen bg-[#1A1210] text-[#F4C9AC] p-6 md:p-10">
      {/* Header */}
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-mono text-[#F4C9AC]">Dashboard</h1>
          <p className="text-[#AE6455] text-sm mt-1 font-mono">
            {mounted ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00A0"}
            {funFact?.fact && <span className="text-xs italic tracking-wide ml-3 opacity-70">— {funFact.fact}</span>}
          </p>
        </div>
        <div className="flex gap-6 items-baseline font-mono">
          {TIMEZONES.map((tz) => (
            <div key={tz.label} className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[#AE6455]">{tz.label}</div>
              <div className="text-lg font-light text-[#F4C9AC]">
                {mounted ? new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: tz.tz,
                  hour12: true,
                }).format(new Date()) : "--:--"}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── News Ticker ──────────────────────────────────────────────── */}
      {news?.stories?.length > 0 && (
        <div className="mb-5 bg-[#2A1F1B] rounded-xl border border-[#AE645533] overflow-hidden">
          <div className="flex items-center">
            <div className="bg-[#AE645533] px-3 py-2 flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#EF9870]">News</span>
            </div>
            <div className="overflow-hidden flex-1 py-2">
              <div className="animate-ticker flex whitespace-nowrap">
                {[...news.stories, ...news.stories].map((s: { title: string; url: string; source: string }, i: number) => {
                  const isShared = shared.has(s.url);
                  const badge = (
                    <span className={`font-mono text-[10px] mr-2 px-1.5 py-0.5 rounded ${
                      s.source === "HN" ? "bg-[#FF660022] text-[#FF6600]" : s.source === "MKT" ? "bg-[#6CBE4522] text-[#6CBE45]" : "bg-[#AE645522] text-[#EF9870]"
                    }`}>{isShared ? "✓" : s.source}</span>
                  );
                  if (isPi) {
                    return (
                      <button
                        key={i}
                        onClick={() => shareToDiscord(s.title, s.url, s.source)}
                        className={`inline-flex items-center mx-6 text-xs transition-opacity ${isShared ? "opacity-40" : "hover:opacity-70 cursor-pointer"}`}
                      >
                        {badge}
                        <span className="text-[#F4C9AC]">{s.title}</span>
                      </button>
                    );
                  }
                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mx-6 text-xs hover:opacity-70 transition-opacity"
                    >
                      {badge}
                      <span className="text-[#F4C9AC]">{s.title}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:portrait:grid-cols-2 gap-5 auto-rows-min">
        {/* ── Weather ────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-5 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Weather</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(weather?.updatedAt)}</span>
          </div>
          {weather?.current ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <WeatherIcon code={weather.current.weatherCode} size={40} />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light font-mono text-[#F4C9AC]">{weather.current.temp}°</span>
                      <span className="text-[#EF9870] text-sm">{weather.current.condition}</span>
                    </div>
                    <div className="text-xs text-[#AE6455] space-x-3 mt-1">
                      <span>Feels {weather.current.feelsLike}°</span>
                      <span>Wind {weather.current.windSpeed} mph</span>
                      <span>{weather.current.humidity}%</span>
                    </div>
                    {weather.current.precipMessage && (
                      <div className="text-xs text-[#FCCC0A] mt-1">{weather.current.precipMessage}</div>
                    )}
                  </div>
                </div>
                {weather.forecast && (
                  <div className="ml-auto flex flex-col gap-1.5 flex-shrink-0">
                    {weather.forecast.map((d: { high: number; low: number; condition: string; weatherCode: number }, i: number) => {
                      const day = i === 0 ? "Today" : new Date(Date.now() + i * 86400000).toLocaleDateString("en-US", { weekday: "short" });
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <WeatherIcon code={d.weatherCode} size={14} />
                          <span className="text-[10px] text-[#AE6455] w-8">{day}</span>
                          <span className="text-[#F4C9AC] font-mono text-[11px]">{d.high}°/{d.low}°</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {galleries?.exhibits?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#AE645533]">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-2">Nearby Art Galleries</div>
                  <div className="space-y-1">
                    {galleries.exhibits.slice(0, 4).map((g: { artist: string; gallery: string; location: string }, i: number) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span className="text-[#EF9870] truncate mr-2">{g.artist}</span>
                        <span className="text-[#AE6455] flex-shrink-0 text-[10px]">{g.gallery}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Calendar ───────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533] max-h-[400px] flex flex-col">
          <div className="flex justify-between items-baseline mb-4 flex-shrink-0">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Today</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(calendar?.updatedAt)}</span>
          </div>
          {calendar?.events ? (
            calendar.events.length > 0 ? (() => {
              const events = calendar.events as { summary: string; start: string; end: string; location?: string }[];
              const allTimed = events.filter((e) => e.start.includes("T")).sort((a, b) => a.start.localeCompare(b.start));
              const allDay = events.filter((e) => !e.start.includes("T"));
              const nowMs = Date.now();
              const oneHourAgo = nowMs - 3600000;

              // Keep: events ending after 1 hour ago (shows last completed + all upcoming)
              const timed = mounted
                ? allTimed.filter((e) => new Date(e.end).getTime() > oneHourAgo)
                : allTimed;

              // Build rows: event rows with free gaps between them
              const rows: { type: "event" | "free"; summary?: string; start?: string; end?: string; location?: string; duration?: number }[] = [];
              for (let i = 0; i < timed.length; i++) {
                const ev = timed[i];
                // Insert free gap before this event
                const prevEnd = i === 0 ? null : new Date(timed[i - 1].end).getTime();
                const thisStart = new Date(ev.start).getTime();
                if (prevEnd && thisStart - prevEnd >= 30 * 60000) {
                  rows.push({ type: "free", duration: Math.round((thisStart - prevEnd) / 60000) });
                }
                rows.push({ type: "event", ...ev });
              }

              return (
                <div className="overflow-y-auto flex-1 min-h-0">
                  {allDay.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {allDay.map((e, i) => (
                        <div key={i} className="text-xs bg-[#AE645533] rounded px-2 py-1 text-[#EF9870]">{e.summary}</div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    {rows.map((row, i) => {
                      if (row.type === "free") {
                        const hrs = Math.floor(row.duration! / 60);
                        const mins = row.duration! % 60;
                        const label = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
                        return (
                          <div key={i} className="flex items-center gap-2 py-1 px-2">
                            <div className="flex-1 border-t border-dashed border-[#AE645533]" />
                            <span className="text-[10px] font-mono text-[#6CBE45] whitespace-nowrap">{label} free</span>
                            <div className="flex-1 border-t border-dashed border-[#AE645533]" />
                          </div>
                        );
                      }
                      const isPast = mounted && new Date(row.end!).getTime() < nowMs;
                      const isCurrent = mounted && new Date(row.start!).getTime() <= nowMs && new Date(row.end!).getTime() > nowMs;
                      return (
                        <div key={i} className={`flex items-start gap-2 rounded px-2 py-1.5 ${
                          isCurrent ? "bg-[#AE645522]" : ""
                        } ${isPast ? "opacity-40" : ""}`}>
                          <div className="w-14 flex-shrink-0 text-[11px] font-mono text-[#AE6455] pt-px">
                            {formatTime(row.start!, "America/New_York")}
                          </div>
                          <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${isCurrent ? "bg-[#FCCC0A]" : "bg-[#EF9870]"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#F4C9AC] leading-tight truncate">{row.summary}</div>
                            {row.location && <div className="text-[10px] text-[#AE645599] truncate">{row.location}</div>}
                          </div>
                          <div className="text-[10px] font-mono text-[#AE645588] flex-shrink-0 pt-px">
                            {formatTime(row.end!, "America/New_York")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <p className="text-[#AE6455] text-sm">No events today</p>
            )
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Subway ─────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Subway</h2>
              {subway?.lines?.map((l: string) => (
                <SubwayIcon key={l} line={l} size={16} />
              ))}
            </div>
            <div className="flex items-baseline gap-2">
              {subway?.station && <span className="text-[10px] text-[#AE6455] font-mono">{subway.station}</span>}
              <span className="text-xs text-[#AE6455]">{timeAgo(subway?.updatedAt)}</span>
            </div>
          </div>
          {subway ? (
            <>
              {subway.arrivals?.length > 0 ? (
                <div className="grid grid-cols-2 gap-px bg-[#AE645533]">
                  {["Uptown", "Downtown"].map((dir) => {
                    const trains = subway.arrivals.filter((a: { direction: string }) => a.direction === dir);
                    return (
                      <div key={dir} className="bg-[#2A1F1B] p-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#AE6455] mb-3">{dir === "Downtown" ? "↓ Downtown" : "↑ Uptown"}</div>
                        <div className="space-y-2">
                          {trains.length > 0 ? trains.map((a: { line: string; minutes: number; direction: string }, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                              <SubwayIcon line={a.line} size={18} />
                              <span className={`font-mono text-sm ${a.minutes === 0 ? "text-[#F4C9AC] font-bold" : "text-[#EF9870]"}`}>
                                {a.minutes === 0 ? "NOW" : a.minutes}
                              </span>
                            </div>
                          )) : (
                            <div className="text-xs text-[#AE645566] font-mono">—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#AE6455] font-mono">{subway.message ?? "No arrivals"}</p>
              )}
              {subway.alerts?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#AE645533] space-y-2">
                  {subway.alerts.map((a: { lines: string[]; header: string; description: string }, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-[#FCCC0A] flex-shrink-0">&#9888;</span>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          {a.lines.map((l: string) => (
                            <SubwayIcon key={l} line={l} size={14} />
                          ))}
                        </div>
                        <span className="text-[#EF9870]">{a.header}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {events?.events?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#AE645533]">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-2">Nearby Today</div>
                  <div className="space-y-1.5">
                    {events.events.slice(0, 3).map((e: { title: string; location: string; time: string; category: string }, i: number) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span className="text-[#F4C9AC] truncate mr-2">{e.title}</span>
                        {e.time && <span className="text-[#AE6455] flex-shrink-0 font-mono">{e.time}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Movies (cycles: Now Showing ↔ This Year) ────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-5 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Now Showing</h2>
              <button onClick={() => setQuietOnly((p) => !p)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                quietOnly ? "border-[#EF9870] bg-[#EF987022] text-[#EF9870]" : "border-[#AE645533] text-[#AE6455]"
              }`}>Quiet Only</button>
            </div>
            <span className="text-xs text-[#AE6455]">{timeAgo(movies?.updatedAt)}</span>
          </div>
          {(() => {
            const filtered = movies?.movies?.filter((m: { genre: string | null }) => !quietOnly || !m.genre || !["Action", "Horror", "Thriller"].includes(m.genre)).slice(0, 8) ?? [];
            return filtered.length > 0 ? (
              <CreditsCycle movies={filtered} renderLink={DashLink} />
            ) : (
              <div className="text-[#AE6455] text-sm">Loading...</div>
            );
          })()}
        </section>

        {/* ── To-Do ──────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-5 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">To-Do</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(todos?.updatedAt)}</span>
          </div>
          {todos ? (
            <div className="grid grid-cols-2 gap-px bg-[#AE645522] rounded overflow-hidden">
              {todos.personal?.length > 0 && (
                <div className="bg-[#2A1F1B] p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-3">Personal</div>
                  <ul>
                    {todos.personal.map((t: { id: string; text: string }) => (
                      <li
                        key={t.id}
                        className={`overflow-hidden transition-all duration-400 ease-in-out ${completing.has(t.id) ? "max-h-0 opacity-0 mb-0" : "max-h-12 opacity-100 mb-2.5"}`}
                      >
                        <div className={`text-xs text-[#F4C9AC] flex items-start gap-2 leading-relaxed transition-all duration-300 ${completing.has(t.id) ? "line-through translate-x-2" : ""}`}>
                          <button
                            onClick={() => completeTodo(t.id)}
                            disabled={completing.has(t.id)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border border-[#AE6455] flex-shrink-0 hover:bg-[#AE645544] transition-colors flex items-center justify-center"
                          >
                            {completing.has(t.id) && <span className="text-[#6CBE45] text-[10px]">✓</span>}
                          </button>
                          <span>{t.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {todos.work?.length > 0 && (
                <div className="bg-[#2A1F1B] p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-3">Work</div>
                  <ul>
                    {todos.work.map((t: { id: string; text: string }) => (
                      <li
                        key={t.id}
                        className={`overflow-hidden transition-all duration-400 ease-in-out ${completing.has(t.id) ? "max-h-0 opacity-0 mb-0" : "max-h-12 opacity-100 mb-2.5"}`}
                      >
                        <div className={`text-xs text-[#F4C9AC] flex items-start gap-2 leading-relaxed transition-all duration-300 ${completing.has(t.id) ? "line-through translate-x-2" : ""}`}>
                          <button
                            onClick={() => completeTodo(t.id)}
                            disabled={completing.has(t.id)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border border-[#AE6455] flex-shrink-0 hover:bg-[#AE645544] transition-colors flex items-center justify-center"
                          >
                            {completing.has(t.id) && <span className="text-[#6CBE45] text-[10px]">✓</span>}
                          </button>
                          <span>{t.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Books ────────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-5 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Books</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(booksRead?.updatedAt)}</span>
          </div>
          {trending?.books?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-3">Bestsellers</div>
              <div className="flex items-start gap-3">
                {booksRead && (
                  <div className="flex-shrink-0 pr-2 border-r border-[#AE645522] self-center text-center">
                    <div className="text-[8px] font-mono uppercase tracking-widest text-[#AE6455] mb-1">&apos;26</div>
                    <span className="text-2xl font-light font-mono text-[#F4C9AC]">{booksRead.count ?? 0}</span>
                    <div className="text-[9px] text-[#AE6455]">read</div>
                  </div>
                )}
                {trending.books.slice(0, 5).map((b: { title: string; author: string; cover: string; rank: number; weeks: number }, i: number) => (
                  <DashLink key={i} href={`https://www.google.com/search?q=${encodeURIComponent(b.title + " " + b.author + " book")}`} title={`${b.title} by ${b.author}`} source="BOOK" className="flex flex-col items-center hover:opacity-80 transition-opacity" style={{ width: "48px" }}>
                    <img src={b.cover} alt="" className="w-12 h-[72px] rounded object-cover ring-1 ring-[#AE645533]" />
                    <div className="text-[8px] text-[#AE6455] text-center leading-tight mt-1.5 line-clamp-2">{b.title.charAt(0) + b.title.slice(1).toLowerCase()}</div>
                  </DashLink>
                ))}
              </div>
              {booksRead?.books?.[0] && (
                <div className="text-[10px] text-[#AE6455] mt-2">Last read: {booksRead.books[0].link ? (
                  <DashLink href={booksRead.books[0].link} title={booksRead.books[0].title} source="BOOK" className="text-[#EF9870] hover:underline">{booksRead.books[0].title}</DashLink>
                ) : (
                  <span className="text-[#EF9870]">{booksRead.books[0].title}</span>
                )}</div>
              )}
            </div>
          )}
          {(watchlist?.watchlist?.length > 0 || diary) && (
            <div className="mt-3 pt-3 border-t border-[#AE645522]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-3">Up Next</div>
              <div className="flex items-start gap-3">
                {diary && (
                  <div className="flex-shrink-0 pr-2 border-r border-[#AE645522] self-center text-center">
                    <div className="text-[8px] font-mono uppercase tracking-widest text-[#AE6455] mb-1">&apos;26</div>
                    <span className="text-2xl font-light font-mono text-[#F4C9AC]">{diary.filmCount ?? 0}</span>
                    <div className="text-[9px] text-[#AE6455]">watched</div>
                    <div className="text-xs font-mono text-[#AE6455] mt-0.5">{diary.totalMinutes ? Math.round(diary.totalMinutes / 60) : 0} hrs</div>
                  </div>
                )}
                {watchlist?.watchlist?.filter((w: { poster: string | null }) => w.poster).slice(0, 5).map((w: { title: string; year: string; link: string; poster: string | null; available?: boolean }, i: number) => (
                  <DashLink key={i} href={w.link} title={w.title} source="FILM" className="flex flex-col items-center hover:opacity-80 transition-opacity" style={{ width: "44px" }}>
                    <img src={w.poster!} alt={w.title} className={`w-11 h-[66px] rounded object-cover ${
                      w.available ? "ring-2 ring-[#EF9870] shadow-[0_0_8px_rgba(239,152,112,0.5)]" : "ring-1 ring-[#AE645533]"
                    }`} />
                    <div className={`text-[7px] text-center leading-tight mt-1 line-clamp-1 ${w.available ? "text-[#EF9870]" : "text-[#AE6455]"}`}>{w.title}</div>
                  </DashLink>
                ))}
              </div>
              {diary?.diary?.[0] && (
                <div className="text-[10px] text-[#AE6455] mt-2">Last watched: {diary.diary[0].link ? (
                  <DashLink href={diary.diary[0].link} title={diary.diary[0].title} source="FILM" className="text-[#EF9870] hover:underline">{diary.diary[0].title}</DashLink>
                ) : (
                  <span className="text-[#EF9870]">{diary.diary[0].title}</span>
                )}</div>
              )}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
