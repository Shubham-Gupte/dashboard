"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

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
    <div className="min-h-screen bg-[#1A1210] text-[#F4C9AC] p-6 md:p-10">
      {/* Header */}
      <header className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-mono text-[#F4C9AC]">Dashboard</h1>
          <p className="text-[#AE6455] text-sm mt-1 font-mono">
            {mounted ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00A0"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ── Weather ────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Weather</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(weather?.updatedAt)}</span>
          </div>
          {weather?.current ? (
            <>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-light font-mono text-[#F4C9AC]">{weather.current.temp}°</span>
                <span className="text-[#EF9870] text-sm">{weather.current.condition}</span>
              </div>
              <div className="text-xs text-[#AE6455] space-x-4">
                <span>Feels {weather.current.feelsLike}°</span>
                <span>Wind {weather.current.windSpeed} mph</span>
                <span>{weather.current.humidity}% humidity</span>
              </div>
              {weather.forecast && (
                <div className="flex gap-4 mt-4 pt-4 border-t border-[#AE645533]">
                  {weather.forecast.map((d: { high: number; low: number; condition: string }, i: number) => (
                    <div key={i} className="text-xs text-[#EF9870]">
                      <div className="text-[#F4C9AC] font-mono">{d.high}° / {d.low}°</div>
                      <div>{d.condition}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Calendar ───────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Today</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(calendar?.updatedAt)}</span>
          </div>
          {calendar?.events ? (
            calendar.events.length > 0 ? (
              <ul className="space-y-3">
                {calendar.events.map((e: { summary: string; start: string; end: string; location?: string }, i: number) => (
                  <li key={i} className="border-l-2 border-[#AE6455] pl-3">
                    <div className="text-sm font-medium text-[#F4C9AC]">{e.summary}</div>
                    <div className="text-xs text-[#AE6455]">
                      {e.start.includes("T") ? `${formatTime(e.start, "America/New_York")} – ${formatTime(e.end, "America/New_York")}` : "All day"}
                    </div>
                    {e.location && <div className="text-xs text-[#AE645599]">{e.location}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#AE6455] text-sm">No events today</p>
            )
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Subway ─────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Subway</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(subway?.updatedAt)}</span>
          </div>
          {subway ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-mono font-light text-[#F4C9AC]">{subway.station}</span>
                <div className="flex gap-1 ml-auto">
                  {subway.lines?.map((l: string) => (
                    <SubwayIcon key={l} line={l} size={20} />
                  ))}
                </div>
              </div>
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
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Movies in Theaters ──────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">In Theaters</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(movies?.updatedAt)}</span>
          </div>
          {movies?.movies ? (
            <ul className="space-y-3">
              {movies.movies.map((m: { id: number; title: string; rating: number; heat: number; poster: string | null }) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.poster && (
                    <img src={m.poster} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate text-[#F4C9AC]">{m.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-[#1A1210] rounded-full overflow-hidden">
                        <div className="h-full bg-[#EF9870] rounded-full" style={{ width: `${Math.round(m.heat * 100)}%` }} />
                      </div>
                      <span className="text-xs text-[#AE6455] font-mono">{m.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Letterboxd Watchlist ────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Watchlist</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(watchlist?.updatedAt)}</span>
          </div>
          {watchlist?.watchlist ? (
            <ul className="space-y-2">
              {watchlist.watchlist.map((w: { title: string; year: string; link: string }, i: number) => (
                <li key={i} className="text-sm">
                  <span className="text-[#F4C9AC]">{w.title}</span>
                  <span className="text-[#AE6455] ml-1">({w.year})</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Minutes Watched ────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Watched This Year</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(diary?.updatedAt)}</span>
          </div>
          {diary ? (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <div>
                  <span className="text-4xl font-light font-mono text-[#F4C9AC]">{diary.filmCount ?? 0}</span>
                  <span className="text-[#AE6455] text-sm ml-1">films</span>
                </div>
                <div>
                  <span className="text-4xl font-light font-mono text-[#F4C9AC]">{diary.totalMinutes ? Math.round(diary.totalMinutes / 60) : 0}</span>
                  <span className="text-[#AE6455] text-sm ml-1">hours</span>
                </div>
              </div>
              {diary.diary?.slice(0, 5).map((d: { title: string; watchedDate: string; rating: number | null; runtime: number }, i: number) => (
                <div key={i} className="text-xs text-[#AE6455] flex justify-between py-0.5">
                  <span className="text-[#EF9870] truncate mr-2">{d.title}</span>
                  <span className="flex-shrink-0 text-[#F4C9AC]">{d.rating ? `${"★".repeat(Math.round(d.rating))}` : "—"}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Books Read This Year ───────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Read in '26</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(booksRead?.updatedAt)}</span>
          </div>
          {booksRead ? (
            <>
              <div className="text-4xl font-light font-mono mb-3 text-[#F4C9AC]">{booksRead.count ?? 0}</div>
              <ul className="space-y-2">
                {booksRead.books?.slice(0, 5).map((b: { title: string; author: string; rating: number | null; pages: number | null }, i: number) => (
                  <li key={i} className="text-sm">
                    <div className="text-[#F4C9AC] truncate">{b.title}</div>
                    <div className="text-xs text-[#AE6455]">{b.author} {b.rating ? `· ${b.rating}/5` : ""}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── To-Read / Recs ─────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">To Read</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(booksToRead?.updatedAt)}</span>
          </div>
          {booksToRead?.books ? (
            <ul className="space-y-2">
              {booksToRead.books.slice(0, 5).map((b: { title: string; author: string; avgRating: number; pages: number | null }, i: number) => (
                <li key={i} className="text-sm">
                  <div className="text-[#F4C9AC] truncate">{b.title}</div>
                  <div className="text-xs text-[#AE6455]">
                    {b.author} · {b.avgRating.toFixed(1)} avg {b.pages ? `· ${b.pages}p` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>

        {/* ── Fun Fact ───────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Fun Fact</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(funFact?.updatedAt)}</span>
          </div>
          {funFact?.fact ? (
            <p className="text-sm text-[#F4C9AC] leading-relaxed">{funFact.fact}</p>
          ) : (
            <div className="text-[#AE6455] text-sm">Loading...</div>
          )}
        </section>
      </div>
    </div>
  );
}
