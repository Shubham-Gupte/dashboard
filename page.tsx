"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

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
  useEffect(() => setMounted(true), []);

  // ── SWR hooks ──────────────────────────────────────────────────────
  const { data: movies } = useSWR("/dashboard/api/movies", fetcher, { refreshInterval: 6 * 3600_000 });
  const { data: watchlist } = useSWR("/dashboard/api/letterboxd?type=watchlist", fetcher, { refreshInterval: 3600_000 });
  const { data: diary } = useSWR("/dashboard/api/letterboxd?type=diary", fetcher, { refreshInterval: 3600_000 });
  const { data: booksRead } = useSWR("/dashboard/api/goodreads?shelf=read", fetcher, { refreshInterval: 3600_000 });
  const { data: booksToRead } = useSWR("/dashboard/api/goodreads?shelf=to-read", fetcher, { refreshInterval: 3600_000 });
  const { data: weather } = useSWR("/dashboard/api/weather", fetcher, { refreshInterval: 1800_000 });
  const { data: subway } = useSWR("/dashboard/api/subway", fetcher, { refreshInterval: 30_000 });
  const { data: calendar } = useSWR("/dashboard/api/calendar", fetcher, { refreshInterval: 300_000 });
  const { data: funFact } = useSWR("/dashboard/api/fun-fact", fetcher, { refreshInterval: 3600_000 });

  const now = new Date().toISOString();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-light tracking-tight font-mono">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1 font-mono">
          {mounted ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00A0"}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ── Weather ────────────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Weather</h2>
            <span className="text-xs text-neutral-600">{timeAgo(weather?.updatedAt)}</span>
          </div>
          {weather?.current ? (
            <>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-light font-mono">{weather.current.temp}°</span>
                <span className="text-neutral-400 text-sm">{weather.current.condition}</span>
              </div>
              <div className="text-xs text-neutral-500 space-x-4">
                <span>Feels {weather.current.feelsLike}°</span>
                <span>Wind {weather.current.windSpeed} mph</span>
                <span>{weather.current.humidity}% humidity</span>
              </div>
              {weather.forecast && (
                <div className="flex gap-4 mt-4 pt-4 border-t border-neutral-800">
                  {weather.forecast.map((d: { high: number; low: number; condition: string }, i: number) => (
                    <div key={i} className="text-xs text-neutral-400">
                      <div className="text-neutral-300 font-mono">{d.high}° / {d.low}°</div>
                      <div>{d.condition}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Calendar ───────────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Today</h2>
            <span className="text-xs text-neutral-600">{timeAgo(calendar?.updatedAt)}</span>
          </div>
          {calendar?.events ? (
            calendar.events.length > 0 ? (
              <ul className="space-y-3">
                {calendar.events.map((e: { summary: string; start: string; end: string; location?: string }, i: number) => (
                  <li key={i} className="border-l-2 border-neutral-700 pl-3">
                    <div className="text-sm font-medium">{e.summary}</div>
                    <div className="text-xs text-neutral-500">
                      {e.start.includes("T") ? `${formatTime(e.start, "America/New_York")} – ${formatTime(e.end, "America/New_York")}` : "All day"}
                    </div>
                    {e.location && <div className="text-xs text-neutral-600">{e.location}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-600 text-sm">No events today</p>
            )
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Subway ─────────────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Subway</h2>
            <span className="text-xs text-neutral-600">{timeAgo(subway?.updatedAt)}</span>
          </div>
          {subway ? (
            <>
              <div className="text-sm text-neutral-300 mb-2">{subway.station}</div>
              <div className="flex gap-2 mb-3">
                {subway.lines?.map((l: string) => {
                  const bg: Record<string, string> = {
                    "1": "bg-[#EE352E]", "2": "bg-[#EE352E]", "3": "bg-[#EE352E]",
                    "4": "bg-[#00933C]", "5": "bg-[#00933C]", "6": "bg-[#00933C]",
                    "7": "bg-[#B933AD]",
                    A: "bg-[#0039A6]", C: "bg-[#0039A6]", E: "bg-[#0039A6]",
                    B: "bg-[#FF6319]", D: "bg-[#FF6319]", F: "bg-[#FF6319]", M: "bg-[#FF6319]",
                    N: "bg-[#FCCC0A] text-black", Q: "bg-[#FCCC0A] text-black", R: "bg-[#FCCC0A] text-black", W: "bg-[#FCCC0A] text-black",
                    G: "bg-[#6CBE45]", L: "bg-[#A7A9AC]",
                    J: "bg-[#996633]", Z: "bg-[#996633]",
                  };
                  return (
                    <span key={l} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${bg[l] ?? "bg-neutral-700"}`}>
                      {l}
                    </span>
                  );
                })}
              </div>
              {subway.arrivals?.length > 0 ? (
                <ul className="space-y-1">
                  {subway.arrivals.map((a: { line: string; minutes: number; direction: string }, i: number) => (
                    <li key={i} className="text-sm text-neutral-400 font-mono">
                      <span className="text-neutral-200 font-bold">{a.line}</span> · {a.minutes} min · {a.direction}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-600">{subway.message ?? "No arrivals"}</p>
              )}
            </>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Movies in Theaters ──────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">In Theaters</h2>
            <span className="text-xs text-neutral-600">{timeAgo(movies?.updatedAt)}</span>
          </div>
          {movies?.movies ? (
            <ul className="space-y-3">
              {movies.movies.map((m: { id: number; title: string; rating: number; heat: number; poster: string | null }) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.poster && (
                    <img src={m.poster} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round(m.heat * 100)}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500 font-mono">{m.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Letterboxd Watchlist ────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Watchlist</h2>
            <span className="text-xs text-neutral-600">{timeAgo(watchlist?.updatedAt)}</span>
          </div>
          {watchlist?.watchlist ? (
            <ul className="space-y-2">
              {watchlist.watchlist.map((w: { title: string; year: string; link: string }, i: number) => (
                <li key={i} className="text-sm">
                  <span className="text-neutral-200">{w.title}</span>
                  <span className="text-neutral-600 ml-1">({w.year})</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Minutes Watched ────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Watched This Year</h2>
            <span className="text-xs text-neutral-600">{timeAgo(diary?.updatedAt)}</span>
          </div>
          {diary ? (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <div>
                  <span className="text-4xl font-light font-mono">{diary.filmCount ?? 0}</span>
                  <span className="text-neutral-500 text-sm ml-1">films</span>
                </div>
                <div>
                  <span className="text-4xl font-light font-mono">{diary.totalMinutes ? Math.round(diary.totalMinutes / 60) : 0}</span>
                  <span className="text-neutral-500 text-sm ml-1">hours</span>
                </div>
              </div>
              {diary.diary?.slice(0, 5).map((d: { title: string; watchedDate: string; rating: number | null; runtime: number }, i: number) => (
                <div key={i} className="text-xs text-neutral-500 flex justify-between py-0.5">
                  <span className="text-neutral-400 truncate mr-2">{d.title}</span>
                  <span className="flex-shrink-0">{d.rating ? `${"★".repeat(Math.round(d.rating))}` : "—"}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Books Read This Year ───────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Books Read</h2>
            <span className="text-xs text-neutral-600">{timeAgo(booksRead?.updatedAt)}</span>
          </div>
          {booksRead ? (
            <>
              <div className="text-4xl font-light font-mono mb-3">{booksRead.count ?? 0}</div>
              <ul className="space-y-2">
                {booksRead.books?.slice(0, 5).map((b: { title: string; author: string; rating: number | null; pages: number | null }, i: number) => (
                  <li key={i} className="text-sm">
                    <div className="text-neutral-300 truncate">{b.title}</div>
                    <div className="text-xs text-neutral-600">{b.author} {b.rating ? `· ${b.rating}/5` : ""}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── To-Read / Recs ─────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">To Read</h2>
            <span className="text-xs text-neutral-600">{timeAgo(booksToRead?.updatedAt)}</span>
          </div>
          {booksToRead?.books ? (
            <ul className="space-y-2">
              {booksToRead.books.map((b: { title: string; author: string; avgRating: number; pages: number | null }, i: number) => (
                <li key={i} className="text-sm">
                  <div className="text-neutral-300 truncate">{b.title}</div>
                  <div className="text-xs text-neutral-600">
                    {b.author} · {b.avgRating.toFixed(1)} avg {b.pages ? `· ${b.pages}p` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>

        {/* ── Time Elsewhere ─────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">World Clock</h2>
            <span className="text-xs text-neutral-600">live</span>
          </div>
          <div className="space-y-3">
            {TIMEZONES.map((tz) => (
              <div key={tz.label} className="flex justify-between items-baseline">
                <span className="text-sm text-neutral-400">{tz.label}</span>
                <span className="text-xl font-mono font-light">
                  {mounted ? new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: tz.tz,
                    hour12: true,
                  }).format(new Date()) : "--:--"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fun Fact ───────────────────────────────────────────────── */}
        <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Fun Fact</h2>
            <span className="text-xs text-neutral-600">{timeAgo(funFact?.updatedAt)}</span>
          </div>
          {funFact?.fact ? (
            <p className="text-sm text-neutral-300 leading-relaxed">{funFact.fact}</p>
          ) : (
            <div className="text-neutral-600 text-sm">Loading...</div>
          )}
        </section>
      </div>
    </div>
  );
}
