"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

function useGeolocation(): { lat: number; lon: number } | null {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { maximumAge: 300_000, timeout: 10_000 },
    );
  }, []);
  return coords;
}

type MovieItem = { id: number; title: string; genre: string | null; rating: number; heat: number; poster: string | null; source: string };

function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#EF9870", "#6CBE45", "#FCCC0A", "#F4C9AC", "#EE352E", "#4A90D9"];
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * canvas.height * 0.3,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rot += p.vr;
        p.life -= 0.008;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  useEffect(() => { if (!active) fired.current = false; }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

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
  const totalH = movies.length * ITEM_H;

  useEffect(() => {
    if (movies.length <= VISIBLE) return;
    let raf: number;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last !== null) setPx((p) => (p + 0.02 * (ts - last!)) % totalH);
      last = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movies.length, totalH]);

  if (movies.length <= VISIBLE) {
    return (
      <div className="space-y-1">
        {movies.map((m) => <MovieRow key={m.id} movie={m} renderLink={renderLink} />)}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ height: VISIBLE * ITEM_H }}>
      <div className="absolute inset-x-0 top-0 h-10 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--c-glow), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-10 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, var(--c-glow), transparent)" }} />
      <div className="gpu-scroll" style={{ transform: `translate3d(0,${-px}px,0)` }}>
        {/* Triple for seamless wrap */}
        {[0, 1, 2].map((batch) =>
          movies.map((m, i) => <MovieRow key={`${batch}-${m.id}-${i}`} movie={m} renderLink={renderLink} />)
        )}
      </div>
    </div>
  );
}

function MovieRow({ movie: m, renderLink }: { movie: MovieItem; renderLink: LinkRenderer }) {
  return (
    <div style={{ height: ITEM_H }}>
      {renderLink({
        href: `https://www.themoviedb.org/movie/${m.id}`,
        title: m.title,
        source: "MOVIE",
        className: "flex items-center gap-3 hover:bg-[#AE645511] rounded-lg px-2 transition-all duration-200 h-full group",
        children: <>
          {m.poster && (
            <img src={m.poster} alt="" className={`w-8 h-12 rounded object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              m.source === "theater" ? "ring-2 ring-[#EE352E]" : m.source === "watchlist" ? "ring-2 ring-[#4A90D9]" : ""
            }`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate text-[#F4C9AC]">{m.title}{m.genre && <span className="text-[#AE6455] text-xs ml-1.5">· {m.genre}</span>}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-[#1A1210] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(m.heat * 100)}%`, background: "linear-gradient(90deg, #AE6455, #EF9870)" }} />
              </div>
              <span className="text-xs text-[#AE6455] font-mono">{m.rating.toFixed(1)}</span>
            </div>
          </div>
        </>,
      })}
    </div>
  );
}


function TransitIcon({ line, size = 20, lineStyles }: { line: string; size?: number; lineStyles?: Record<string, { color: string; textColor: string }> }) {
  const style = lineStyles?.[line];
  return (
    <span
      style={{ width: size, height: size, backgroundColor: style?.color ?? "#555", color: style?.textColor ?? "#fff", fontSize: size * 0.55 }}
      className="inline-flex items-center justify-center rounded-full font-bold leading-none"
    >
      {line}
    </span>
  );
}

// WMO weather code → Font Awesome SVG icon (free set)
function WeatherIcon({ code, size = 24 }: { code?: number; size?: number }) {
  if (code == null) return null;
  const props = { width: size, height: size, viewBox: "0 0 512 512", fill: "currentColor" };

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
  return `${Math.floor(mins / 60)}h ago`;
}

function formatTime(dateStr: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    hour12: true,
  }).format(new Date(dateStr));
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
}

function Skeleton() {
  return <div className="space-y-3"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /><div className="skeleton h-3 w-2/3" /></div>;
}

function StaleData({ label, updatedAt }: { label: string; updatedAt?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#AE6455]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EE352E] animate-pulse flex-shrink-0" />
      <span>{label} unavailable{updatedAt ? ` · last update ${timeAgo(updatedAt)}` : ""}</span>
    </div>
  );
}

// ── Timezones (client-side only, no API) ──────────────────────────────
const BASE_TIMEZONES = [
  { label: "NYC", tz: "America/New_York" },
  { label: "UTC", tz: "UTC" },
  { label: "SF", tz: "America/Los_Angeles" },
];

const TZ_MAP: Record<string, { label: string; tz: string }> = {
  HKT:  { label: "HK",   tz: "Asia/Hong_Kong" },
  IST:  { label: "IN",   tz: "Asia/Kolkata" },
  JST:  { label: "JP",   tz: "Asia/Tokyo" },
  KST:  { label: "KR",   tz: "Asia/Seoul" },
  SGT:  { label: "SG",   tz: "Asia/Singapore" },
  GMT:  { label: "GMT",  tz: "Europe/London" },
  BST:  { label: "UK",   tz: "Europe/London" },
  CET:  { label: "CET",  tz: "Europe/Paris" },
  CEST: { label: "CET",  tz: "Europe/Paris" },
  EET:  { label: "EET",  tz: "Europe/Bucharest" },
  MSK:  { label: "MSK",  tz: "Europe/Moscow" },
  AEST: { label: "SYD",  tz: "Australia/Sydney" },
  NZST: { label: "NZ",   tz: "Pacific/Auckland" },
  CST:  { label: "CHI",  tz: "America/Chicago" },
  MST:  { label: "DEN",  tz: "America/Denver" },
  HST:  { label: "HI",   tz: "Pacific/Honolulu" },
  AKST: { label: "AK",   tz: "America/Anchorage" },
  BRT:  { label: "BR",   tz: "America/Sao_Paulo" },
  GST:  { label: "DXB",  tz: "Asia/Dubai" },
  ICT:  { label: "BKK",  tz: "Asia/Bangkok" },
  WIB:  { label: "JKT",  tz: "Asia/Jakarta" },
  PHT:  { label: "PH",   tz: "Asia/Manila" },
  PKT:  { label: "PK",   tz: "Asia/Karachi" },
  TRT:  { label: "IST",  tz: "Europe/Istanbul" },
  CAT:  { label: "JNB",  tz: "Africa/Johannesburg" },
  WAT:  { label: "LOS",  tz: "Africa/Lagos" },
  EAT:  { label: "NBO",  tz: "Africa/Nairobi" },
};

function resolveTimezones(slug?: string): { label: string; tz: string }[] {
  if (!slug) return BASE_TIMEZONES;
  const match = TZ_MAP[slug.toUpperCase()];
  if (match) return [BASE_TIMEZONES[0], BASE_TIMEZONES[1], match];
  try {
    Intl.DateTimeFormat(undefined, { timeZone: slug });
    return [BASE_TIMEZONES[0], BASE_TIMEZONES[1], { label: slug.split("/").pop()?.replace(/_/g, " ").slice(0, 5).toUpperCase() ?? slug, tz: slug }];
  } catch {
    return BASE_TIMEZONES;
  }
}

function TodoColumn({ label, list, items, pending, goalStart, goalDone, dismissed, completing, addingTo, newTodoText, onComplete, onSetAdding, onSetText, onAdd }: {
  label: string; list: "personal" | "work";
  items: { id: string; text: string }[] | undefined;
  pending: { id: string; text: string; list: "personal" | "work" }[];
  goalStart: number; goalDone: number;
  dismissed: Set<string>; completing: Set<string>;
  addingTo: "personal" | "work" | null; newTodoText: string;
  onComplete: (id: string, list: "personal" | "work") => void;
  onSetAdding: (list: "personal" | "work" | null) => void;
  onSetText: (text: string) => void;
  onAdd: (list: "personal" | "work") => void;
}) {
  return (
    <div className="p-3" style={{ background: "var(--c-bg-inner-2)" }}>
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#AE6455] mb-2">{label}</div>
      {goalStart > 0 && (
        <div className="h-1 bg-[#1A1210] rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all duration-700 ease-out ${goalDone >= goalStart ? "progress-glow-done" : "progress-glow"}`}
            style={{ width: `${Math.min(100, (goalDone / goalStart) * 100)}%` }} />
        </div>
      )}
      <ul>
        {items?.filter((t) => !dismissed.has(t.id)).map((t) => (
          <li key={t.id} className={`overflow-hidden transition-all duration-400 ease-in-out ${completing.has(t.id) ? "max-h-0 opacity-0 mb-0" : "max-h-12 opacity-100 mb-2.5"}`}>
            <div className={`text-xs text-[#F4C9AC] flex items-start gap-2 leading-relaxed transition-all duration-300 ${completing.has(t.id) ? "line-through translate-x-2" : ""}`}>
              <button
                onClick={() => onComplete(t.id, list)}
                disabled={completing.has(t.id)}
                className="mt-0.5 w-3.5 h-3.5 rounded border border-[#AE645566] flex-shrink-0 hover:border-[#EF9870] hover:bg-[#EF987022] transition-all duration-200 flex items-center justify-center"
              >
                {completing.has(t.id) && <span className="text-[#6CBE45] text-[10px]">✓</span>}
              </button>
              <span>{t.text}</span>
            </div>
          </li>
        ))}
        {pending.filter((p) => p.list === list).map((p) => (
          <li key={p.id} className="max-h-12 opacity-70 mb-2.5">
            <div className="text-xs text-[#F4C9AC] flex items-start gap-2 leading-relaxed">
              <span className="mt-0.5 w-3.5 h-3.5 rounded border border-[#AE645533] flex-shrink-0" />
              <span>{p.text}</span>
            </div>
          </li>
        ))}
      </ul>
      {addingTo === list ? (
        <input
          autoFocus
          value={newTodoText}
          onChange={(e) => onSetText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAdd(list); if (e.key === "Escape") { onSetAdding(null); onSetText(""); } }}
          onBlur={() => setTimeout(() => { onSetAdding(null); onSetText(""); }, 150)}
          className="w-full text-xs bg-transparent border-b border-[#AE645544] text-[#F4C9AC] outline-none mt-1 pb-1 placeholder-[#AE645566]"
          placeholder="Add todo..."
        />
      ) : (
        <button onClick={() => onSetAdding(list)} className="text-[10px] text-[#AE6455] hover:text-[#EF9870] transition-colors mt-1">+ add</button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams<{ tz?: string[] }>();
  const TIMEZONES = resolveTimezones(params.tz?.[0]);
  const [mounted, setMounted] = useState(false);
  const [quietOnly, setQuietOnly] = useState(false);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<"personal" | "work" | null>(null);
  const [newTodoText, setNewTodoText] = useState("");
  const [pendingTodos, setPendingTodos] = useState<{ id: string; text: string; list: "personal" | "work" }[]>([]);
  const [pomo, setPomo] = useState<{ running: boolean; endAt: number; mode: "work" | "break" | "long"; cycle: number }>({ running: false, endAt: 0, mode: "work", cycle: 0 });
  const [pomoRemaining, setPomoRemaining] = useState(0);
  const [goalStats, setGoalStats] = useState<{ date: string; personal: { start: number; done: number }; work: { start: number; done: number }; streak: number }>({ date: "", personal: { start: 0, done: 0 }, work: { start: 0, done: 0 }, streak: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [pomoFlash, setPomoFlash] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isPi = useIsPi();
  const geo = useGeolocation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const saved = localStorage.getItem("dash-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("dash-theme", theme);
  }, [theme]);

  // Tick seconds for the 60-dot progress line
  useEffect(() => {
    setSeconds(new Date().getSeconds());
    const id = setInterval(() => setSeconds(new Date().getSeconds()), 1000);
    return () => clearInterval(id);
  }, []);

  // Clear dismissed IDs every 10 min — by then Notion has processed the updates
  useEffect(() => {
    const id = setInterval(() => setDismissed(new Set()), 600_000);
    return () => clearInterval(id);
  }, []);

  // Pomodoro timer tick
  useEffect(() => {
    if (!pomo.running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((pomo.endAt - Date.now()) / 1000));
      setPomoRemaining(left);
      if (left <= 0) {
        // Flash screen red
        setPomoFlash(true);
        setTimeout(() => setPomoFlash(false), 1500);
        // Auto-transition
        if (pomo.mode === "work") {
          const nextCycle = pomo.cycle + 1;
          const isLong = nextCycle % 4 === 0;
          const dur = isLong ? 15 * 60000 : 5 * 60000;
          setPomo({ running: true, endAt: Date.now() + dur, mode: isLong ? "long" : "break", cycle: nextCycle });
        } else {
          const dur = 25 * 60000;
          setPomo({ running: true, endAt: Date.now() + dur, mode: "work", cycle: pomo.cycle });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [pomo]);

  // ── SWR hooks ──────────────────────────────────────────────────────
  // refreshWhenHidden keeps polling even when tab is backgrounded (TV dashboard)
  const swr = (ms: number) => ({ refreshInterval: ms, refreshWhenHidden: true });
  const { data: movies, error: moviesErr } = useSWR("/dashboard/api/movies", fetcher, swr(6 * 3600_000));
  const { data: watchlist } = useSWR("/dashboard/api/letterboxd?type=watchlist", fetcher, swr(3600_000));
  const { data: diary } = useSWR("/dashboard/api/letterboxd?type=diary", fetcher, swr(3600_000));
  const { data: booksRead } = useSWR("/dashboard/api/goodreads?shelf=read", fetcher, swr(3600_000));
  const { data: weather, error: weatherErr } = useSWR("/dashboard/api/weather", fetcher, swr(1800_000));
  const transitUrl = geo ? `/dashboard/api/transit?lat=${geo.lat}&lon=${geo.lon}` : "/dashboard/api/transit";
  const { data: subway, error: subwayErr } = useSWR(transitUrl, fetcher, swr(30_000));
  const { data: calendar, error: calendarErr } = useSWR("/dashboard/api/calendar", fetcher, swr(300_000));
  const { data: funFact } = useSWR("/dashboard/api/fun-fact", fetcher, swr(3600_000));
  const { data: events } = useSWR("/dashboard/api/events", fetcher, swr(3600_000));
  const { data: galleries } = useSWR("/dashboard/api/galleries", fetcher, swr(86400_000));
  const { data: todos, error: todosErr } = useSWR("/dashboard/api/todo", fetcher, swr(600_000));
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

  // Clear pending todos once they appear in the SWR data (Notion indexed them)
  useEffect(() => {
    if (!todos || pendingTodos.length === 0) return;
    const allTexts = new Set([
      ...(todos.personal ?? []).map((t: { text: string }) => t.text),
      ...(todos.work ?? []).map((t: { text: string }) => t.text),
    ]);
    setPendingTodos((prev) => prev.filter((p) => !allTexts.has(p.text)));
  }, [todos]);

  // Goal tracking: load from localStorage on mount + when todos first arrive
  useEffect(() => {
    if (!todos) return;
    const today = new Date().toISOString().slice(0, 10);
    const stored = JSON.parse(localStorage.getItem("todoGoal") ?? "{}");

    if (stored.date === today) {
      // Resume today's stats from storage — done counts are persistent, not derived
      if (JSON.stringify(stored) !== JSON.stringify(goalStats)) {
        setGoalStats(stored);
      }
    } else {
      // New day: snapshot current todo counts, carry streak
      const pNow = (todos.personal?.length ?? 0);
      const wNow = (todos.work?.length ?? 0);
      const totalStart = (stored.personal?.start ?? 0) + (stored.work?.start ?? 0);
      const totalDone = (stored.personal?.done ?? 0) + (stored.work?.done ?? 0);
      const prevComplete = stored.date ? totalDone >= totalStart && totalStart > 0 : false;
      const streak = prevComplete ? (stored.streak ?? 0) + 1 : stored.date ? 0 : (stored.streak ?? 0);
      const next = { date: today, personal: { start: pNow, done: 0 }, work: { start: wNow, done: 0 }, streak };
      setGoalStats(next);
      localStorage.setItem("todoGoal", JSON.stringify(next));
    }
  }, [todos]);

  // Trigger confetti when hitting 100%
  const totalStart = goalStats.personal.start + goalStats.work.start;
  const totalDone = goalStats.personal.done + goalStats.work.done;
  useEffect(() => {
    if (totalStart > 0 && totalDone >= totalStart && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [totalDone, totalStart]);

  const startPomo = () => {
    setPomo({ running: true, endAt: Date.now() + 25 * 60000, mode: "work", cycle: pomo.cycle });
    setPomoRemaining(25 * 60);
  };
  const stopPomo = () => {
    setPomo({ ...pomo, running: false });
    setPomoRemaining(0);
  };

  const addTodo = async (list: "personal" | "work") => {
    const text = newTodoText.trim();
    if (!text) return;
    setNewTodoText("");
    setAddingTo(null);
    const tempId = `temp-${Date.now()}`;
    // Optimistically add to local pending list (survives SWR re-fetches)
    setPendingTodos((prev) => [...prev, { id: tempId, text, list }]);
    // Create in Notion — fire and forget
    fetch("/dashboard/api/todo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, list }),
    });
  };

  const completeTodo = async (blockId: string, list: "personal" | "work") => {
    setCompleting((prev) => new Set(prev).add(blockId));
    fetch("/dashboard/api/todo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    // After fade-out animation, add to dismissed set (survives SWR re-fetches)
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(blockId));
      setCompleting((prev) => { const next = new Set(prev); next.delete(blockId); return next; });
      // Persist incremented done count to localStorage
      setGoalStats((prev) => {
        const next = { ...prev, [list]: { ...prev[list], done: prev[list].done + 1 } };
        localStorage.setItem("todoGoal", JSON.stringify(next));
        return next;
      });
    }, 400);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col p-6 md:p-10 relative" data-theme={theme} style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
      {/* Subtle radial glow behind content */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(174,100,85,0.06) 0%, transparent 60%)" }} />
      {pomoFlash && <div className="fixed inset-0 bg-[#EE352E] opacity-30 z-50 pointer-events-none animate-pulse" />}
      {/* Header */}
      <header className="mb-4 flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
        <div className="min-w-0">
          <p className="text-[#AE6455] text-base font-mono">
            {mounted ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00A0"}
            {funFact?.fact && funFact.fact.length <= 80 && <span className="text-sm italic tracking-wide ml-3 opacity-60 hidden md:inline">— {funFact.fact}</span>}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end font-mono flex-shrink-0">
          <div className="flex gap-6 items-baseline">
            {TIMEZONES.map((tz) => (
              <div key={tz.label} className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#AE645588]">{tz.label}</div>
                <div className="text-lg font-light text-[#F4C9AC] tabular-nums">
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
          {/* 60-second dot progress */}
          <div className="flex gap-[2px] mt-2">
            {Array.from({ length: 60 }, (_, i) => (
              <div
                key={i}
                className={`w-[3px] h-[3px] rounded-full transition-colors duration-300 ${
                  i <= seconds ? "bg-[#EF9870]" : "bg-[#AE645533]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
            className="self-end mt-1.5 text-[10px] font-mono tracking-widest transition-colors hover:text-[#EF9870]"
            style={{ color: "var(--c-muted)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >{theme === "dark" ? "◑ light" : "◐ dark"}</button>
        </div>
      </header>

      {/* ── News Ticker ──────────────────────────────────────────────── */}
      {news?.stories?.length > 0 && (
        <div className="mb-5 flex-shrink-0 dash-card overflow-hidden">
          <div className="flex items-center">
            <div className="bg-[#AE645520] px-4 py-2.5 flex-shrink-0 border-r border-[#AE645522]">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#EF9870]">News</span>
            </div>
            <div className="overflow-hidden flex-1 py-2 ticker-mask">
              <div className="animate-ticker-fast md:animate-ticker flex whitespace-nowrap">
                {[...news.stories, ...news.stories].map((s: { title: string; url: string; source: string }, i: number) => (
                  <DashLink
                    key={i}
                    href={s.url}
                    title={s.title}
                    source={s.source}
                    className="inline-flex items-center mx-6 text-xs hover:opacity-70 transition-opacity"
                  >
                    <span className={`font-mono text-[10px] mr-2 px-1.5 py-0.5 rounded ${
                      s.source === "HN" ? "bg-[#FF660022] text-[#FF6600]" : s.source === "MKT" ? "bg-[#6CBE4522] text-[#6CBE45]" : "bg-[#AE645522] text-[#EF9870]"
                    }`}>{shared.has(s.url) ? "✓" : s.source}</span>
                    <span className="text-[#F4C9AC]">{s.title}</span>
                  </DashLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-grid flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:portrait:grid-cols-2 lg:grid-rows-2 gap-5">
        {/* ── Weather ────────────────────────────────────────────────── */}
        <section className="dash-card p-5 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">Weather</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(weather?.updatedAt)}</span>
          </div>
          {weatherErr && !weather ? (
            <StaleData label="Weather" />
          ) : weather?.current ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <WeatherIcon code={weather.current.weatherCode} size={40} />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light font-mono text-[#F4C9AC] tabular-nums">{weather.current.temp}°</span>
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
            <Skeleton />
          )}
        </section>

        {/* ── Calendar ───────────────────────────────────────────────── */}
        <section className="dash-card p-6 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-baseline mb-4 flex-shrink-0">
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">Today</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(calendar?.updatedAt)}</span>
          </div>
          {calendarErr && !calendar ? (
            <StaleData label="Calendar" />
          ) : calendar?.events ? (
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
              const rows: { type: "event" | "free" | "free-now"; summary?: string; start?: string; end?: string; location?: string; duration?: number }[] = [];

              // Check if we're currently free (no active event) and there's an upcoming one
              if (mounted) {
                const hasCurrentEvent = timed.some((e) => new Date(e.start).getTime() <= nowMs && new Date(e.end).getTime() > nowMs);
                if (!hasCurrentEvent) {
                  const nextEvent = timed.find((e) => new Date(e.start).getTime() > nowMs);
                  if (nextEvent) {
                    const gap = Math.round((new Date(nextEvent.start).getTime() - nowMs) / 60000);
                    if (gap >= 5) {
                      rows.push({ type: "free-now", duration: gap });
                    }
                  }
                }
              }

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
                      if (row.type === "free-now") {
                        return (
                          <div key={i} className="flex items-center gap-2.5 py-2 px-3 bg-[#6CBE4508] rounded-lg border border-[#6CBE4520]">
                            <span className="w-2 h-2 rounded-full bg-[#6CBE45] animate-pulse flex-shrink-0 shadow-[0_0_6px_rgba(108,190,69,0.5)]" />
                            <span className="text-xs font-mono text-[#6CBE45]">Free for {formatDuration(row.duration!)}</span>
                          </div>
                        );
                      }
                      if (row.type === "free") {
                        return (
                          <div key={i} className="flex items-center gap-2 py-1 px-2">
                            <div className="flex-1 border-t border-dashed border-[#AE645533]" />
                            <span className="text-[10px] font-mono text-[#6CBE45] whitespace-nowrap">{formatDuration(row.duration!)} free</span>
                            <div className="flex-1 border-t border-dashed border-[#AE645533]" />
                          </div>
                        );
                      }
                      const isPast = mounted && new Date(row.end!).getTime() < nowMs;
                      const isCurrent = mounted && new Date(row.start!).getTime() <= nowMs && new Date(row.end!).getTime() > nowMs;
                      return (
                        <div key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                          isCurrent ? "bg-[#AE645515] border border-[#AE645522]" : "border border-transparent"
                        } ${isPast ? "opacity-30" : ""}`}>
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
            <Skeleton />
          )}
        </section>

        {/* ── Transit ────────────────────────────────────────────────── */}
        <section className="dash-card p-6 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">Transit</h2>
              {subway?.lines?.map((l: string) => (
                <TransitIcon key={l} line={l} size={16} lineStyles={subway.lineStyles} />
              ))}
            </div>
            <div className="flex items-baseline gap-2">
              {subway?.station && <span className="text-[10px] text-[#AE6455] font-mono">{subway.station}</span>}
              <span className="text-xs text-[#AE6455]">{timeAgo(subway?.updatedAt)}</span>
            </div>
          </div>
          {subwayErr && !subway ? (
            <StaleData label="Transit" />
          ) : subway ? (
            <>
              {subway.arrivals?.length > 0 ? (
                <>
                  {/* Uptown / Downtown */}
                  {(subway.directions as string[])?.length > 0 && (
                    <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(174,100,85,0.15), rgba(174,100,85,0.06))" }}>
                      {(subway.directions as string[]).map((dir: string, di: number) => {
                        const ctSet = new Set(subway.crosstownLines ?? []);
                        const trains = subway.arrivals.filter((a: { line: string; direction: string }) => a.direction === dir && !ctSet.has(a.line));
                        return (
                          <div key={dir} className="p-3" style={{ background: "var(--c-bg-inner-2)" }}>
                            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#AE645588] mb-3">{di === 0 ? "↑" : "↓"} {dir}</div>
                            <div className="space-y-2">
                              {trains.length > 0 ? trains.map((a: { line: string; minutes: number }, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                  <TransitIcon line={a.line} size={18} lineStyles={subway.lineStyles} />
                                  <span className={`font-mono text-sm ${a.minutes === 0 ? "text-[#F4C9AC] font-bold glow-pulse rounded px-1.5 py-0.5" : "text-[#EF9870]"}`}>
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
                  )}
                  {/* Crosstown */}
                  {(subway.crosstownLines as string[])?.length > 0 && (() => {
                    const ctSet = new Set(subway.crosstownLines as string[]);
                    const ctTrains = subway.arrivals.filter((a: { line: string }) => ctSet.has(a.line));
                    if (ctTrains.length === 0) return null;
                    const ctDirs = (subway.crosstownDirections as string[]) ?? [];
                    return (
                      <div className={`grid gap-px rounded-lg overflow-hidden ${ctDirs.length >= 2 ? "grid-cols-2" : "grid-cols-1"} mt-px`} style={{ background: "linear-gradient(180deg, rgba(174,100,85,0.15), rgba(174,100,85,0.06))" }}>
                        {ctDirs.map((dir: string) => {
                          const trains = ctTrains.filter((a: { direction: string }) => a.direction === dir);
                          return (
                            <div key={dir} className="p-3" style={{ background: "var(--c-bg-inner-2)" }}>
                              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#AE645588] mb-3">→ {dir}</div>
                              <div className="space-y-2">
                                {trains.length > 0 ? trains.map((a: { line: string; minutes: number }, i: number) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <TransitIcon line={a.line} size={18} lineStyles={subway.lineStyles} />
                                    <span className={`font-mono text-sm ${a.minutes === 0 ? "text-[#F4C9AC] font-bold glow-pulse rounded px-1.5 py-0.5" : "text-[#EF9870]"}`}>
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
                    );
                  })()}
                </>
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
                            <TransitIcon key={l} line={l} size={14} lineStyles={subway.lineStyles} />
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
            <Skeleton />
          )}
        </section>

        {/* ── Movies (cycles: Now Showing ↔ This Year) ────────────── */}
        <section className="dash-card p-5 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-baseline mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">Now Showing</h2>
              <button onClick={() => setQuietOnly((p) => !p)} className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all duration-200 ${
                quietOnly ? "border-[#EF9870] bg-[#EF987015] text-[#EF9870] shadow-[0_0_8px_rgba(239,152,112,0.15)]" : "border-[#AE645533] text-[#AE6455] hover:border-[#AE645566]"
              }`}>Quiet Only</button>
            </div>
            <span className="text-xs text-[#AE6455]">{timeAgo(movies?.updatedAt)}</span>
          </div>
          {moviesErr && !movies ? (
            <StaleData label="Movies" />
          ) : (() => {
            const filtered = movies?.movies?.filter((m: { genre: string | null }) => !quietOnly || !m.genre || !["Action", "Horror", "Thriller"].includes(m.genre)).slice(0, 8) ?? [];
            return filtered.length > 0 ? (
              <CreditsCycle movies={filtered} renderLink={DashLink} />
            ) : (
              <Skeleton />
            );
          })()}
        </section>

        {/* ── To-Do ──────────────────────────────────────────────────── */}
        <Confetti active={showConfetti} />
        <section className="dash-card p-5 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">To-Do</h2>
              {goalStats.streak > 0 && (
                <span className="text-[10px] font-mono text-[#AE645588]">
                  {goalStats.streak}{Array.from({ length: Math.min(goalStats.streak, 7) }, (_, i) => i < goalStats.streak ? "│" : "┊").join("")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {pomo.running ? (() => {
                const totalSec = pomo.mode === "work" ? 25 * 60 : pomo.mode === "long" ? 15 * 60 : 5 * 60;
                const pct = Math.max(0, Math.min(100, ((totalSec - pomoRemaining) / totalSec) * 100));
                return (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" style={{ stroke: "var(--c-bg-inner)" }} />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={pomo.mode === "work" ? "#EF9870" : "#6CBE45"}
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${pct * 0.942} 100`}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <span className={`text-xs font-mono tabular-nums ${pomo.mode === "work" ? "text-[#F4C9AC]" : "text-[#6CBE45]"}`}>
                      {String(Math.floor(pomoRemaining / 60)).padStart(2, "0")}:{String(pomoRemaining % 60).padStart(2, "0")}
                    </span>
                    <button onClick={stopPomo} className="text-[10px] font-mono text-[#AE6455] hover:text-[#EF9870] transition-colors">✕</button>
                  </div>
                );
              })() : (
                <button onClick={startPomo} className="text-[10px] font-mono text-[#AE6455] hover:text-[#EF9870] transition-colors">Focus</button>
              )}
              <span className="text-xs text-[#AE6455]">{timeAgo(todos?.updatedAt)}</span>
            </div>
          </div>
          {todosErr && !todos ? (
            <StaleData label="To-Do" />
          ) : todos ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(174,100,85,0.12), rgba(174,100,85,0.06))" }}>
              {(["personal", "work"] as const).map((list) => (
                <TodoColumn
                  key={list}
                  label={list === "personal" ? "Personal" : "Work"}
                  list={list}
                  items={todos[list]}
                  pending={pendingTodos}
                  goalStart={goalStats[list].start}
                  goalDone={goalStats[list].done}
                  dismissed={dismissed}
                  completing={completing}
                  addingTo={addingTo}
                  newTodoText={newTodoText}
                  onComplete={completeTodo}
                  onSetAdding={setAddingTo}
                  onSetText={setNewTodoText}
                  onAdd={addTodo}
                />
              ))}
            </div>
            </div>
          ) : (
            <Skeleton />
          )}
        </section>

        {/* ── Books ────────────────────────────────────────────────────── */}
        <section className="dash-card p-5 h-full flex flex-col overflow-hidden">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#EF9870]">New Texts &amp; Watchlist</h2>
            <span className="text-xs text-[#AE6455]">{timeAgo(booksRead?.updatedAt)}</span>
          </div>
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Books column */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-light font-mono text-[#F4C9AC]">{booksRead?.count ?? 0}</span>
                <span className="text-[9px] text-[#AE6455]">read &apos;26</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {trending?.books?.slice(0, 4).map((b: { title: string; author: string; cover: string; rank: number; weeks: number }, i: number) => (
                  <DashLink key={i} href={`https://www.google.com/search?q=${encodeURIComponent(b.title + " " + b.author + " book")}`} title={`${b.title} by ${b.author}`} source="BOOK" className="hover:opacity-80 transition-opacity">
                    <img src={b.cover} alt="" className="w-full h-[56px] object-cover rounded ring-1 ring-[#AE645533]" />
                  </DashLink>
                ))}
              </div>
              {booksRead?.books?.[0] && (
                <div className="mt-1.5 text-[10px] text-[#AE6455] truncate">
                  {booksRead.books[0].link
                    ? <DashLink href={booksRead.books[0].link} title={booksRead.books[0].title} source="BOOK" className="text-[#EF9870] hover:underline">{booksRead.books[0].title}</DashLink>
                    : <span className="text-[#EF9870]">{booksRead.books[0].title}</span>}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px bg-[#AE645522] flex-shrink-0" />

            {/* Films column */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-light font-mono text-[#F4C9AC]">{diary?.filmCount ?? 0}</span>
                <span className="text-[9px] text-[#AE6455]">seen &apos;26</span>
                {diary?.totalMinutes && (
                  <span className="text-[9px] text-[#AE6455] ml-1">· {Math.round(diary.totalMinutes / 60)} hrs</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {watchlist?.watchlist?.filter((w: { poster: string | null }) => w.poster).slice(0, 4).map((w: { title: string; year: string; link: string; poster: string | null; available?: boolean }, i: number) => (
                  <DashLink key={i} href={w.link} title={w.title} source="FILM" className="hover:opacity-80 transition-opacity">
                    <img src={w.poster!} alt={w.title} className={`w-full h-[56px] object-cover rounded ${
                      w.available ? "ring-2 ring-[#EF9870] shadow-[0_0_8px_rgba(239,152,112,0.4)]" : "ring-1 ring-[#AE645533]"
                    }`} />
                  </DashLink>
                ))}
              </div>
              {diary?.diary?.[0] && (
                <div className="mt-1.5 text-[10px] text-[#AE6455] truncate">
                  {diary.diary[0].link
                    ? <DashLink href={diary.diary[0].link} title={diary.diary[0].title} source="FILM" className="text-[#EF9870] hover:underline">{diary.diary[0].title}</DashLink>
                    : <span className="text-[#EF9870]">{diary.diary[0].title}</span>}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>


    </div>
  );
}
