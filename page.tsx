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
              <div className="flex items-center gap-4 mb-2">
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
                </div>
              </div>
              {weather.forecast && (
                <div className="flex gap-4 mt-4 pt-4 border-t border-[#AE645533]">
                  {weather.forecast.map((d: { high: number; low: number; condition: string; weatherCode: number }, i: number) => {
                    const day = i === 0 ? "Today" : new Date(Date.now() + i * 86400000).toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <WeatherIcon code={d.weatherCode} size={18} />
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-[#AE6455]">{day}</div>
                          <div className="text-[#F4C9AC] font-mono">{d.high}° / {d.low}°</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {funFact?.fact && (
                <div className="mt-4 pt-3 border-t border-[#AE645533]">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-1">Fun Fact</div>
                  <p className="text-xs text-[#EF9870] leading-relaxed">{funFact.fact}</p>
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
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">What to Watch</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(movies?.updatedAt)}</span>
          </div>
          {movies?.movies ? (
            <ul className="space-y-3">
              {movies.movies.map((m: { id: number; title: string; rating: number; heat: number; poster: string | null; source: string }) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.poster && (
                    <img src={m.poster} alt="" className={`w-8 h-12 rounded object-cover flex-shrink-0 ${m.source === "theater" ? "ring-2 ring-[#EE352E]" : ""}`} />
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

        {/* ── Books ─────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#EF9870]">Books</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(booksRead?.updatedAt)}</span>
          </div>
          {booksRead ? (
            <>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-light font-mono text-[#F4C9AC]">{booksRead.count ?? 0}</span>
                <span className="text-[#AE6455] text-sm">read in &apos;26</span>
              </div>
              <ul className="space-y-1.5">
                {booksRead.books?.slice(0, 3).map((b: { title: string; author: string; rating: number | null; pages: number | null }, i: number) => (
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
          {booksToRead?.books && (
            <div className="mt-4 pt-3 border-t border-[#AE645533]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#AE6455] mb-2">Up Next</div>
              <ul className="space-y-1.5">
                {booksToRead.books.slice(0, 3).map((b: { title: string; author: string; avgRating: number; pages: number | null }, i: number) => (
                  <li key={i} className="text-sm">
                    <div className="text-[#EF9870] truncate">{b.title}</div>
                    <div className="text-xs text-[#AE6455]">{b.author}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── TBD ─────────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533] flex items-center justify-center">
          <span className="text-sm font-mono uppercase tracking-widest text-[#AE645544]">TBD</span>
        </section>

        {/* ── TBD ─────────────────────────────────────────────────────── */}
        <section className="bg-[#2A1F1B] rounded-xl p-6 border border-[#AE645533] flex items-center justify-center">
          <span className="text-sm font-mono uppercase tracking-widest text-[#AE645544]">TBD</span>
        </section>
      </div>
    </div>
  );
}
