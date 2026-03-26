import { NextResponse } from "next/server";
import { getConfig } from "../../../lib/config";

export const revalidate = 1800; // 30 min ISR

interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

const WMO_CODES: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Light Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ Hail",
  99: "Heavy Thunderstorm",
};

let geoCache: { lat: number; lon: number } | null = null;

async function geocode(address: string): Promise<{ lat: number; lon: number }> {
  if (geoCache) return geoCache;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "DashboardApp/1.0" },
  });
  const data: GeoResult[] = await res.json();
  if (!data.length) throw new Error("Geocoding failed for: " + address);
  geoCache = { lat: data[0].lat, lon: data[0].lon };
  return geoCache;
}

export async function GET() {
  try {
    const config = getConfig();
    const { lat, lon } = await geocode(config.address);

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
    const data: OpenMeteoResponse = await res.json();

    return NextResponse.json({
      current: {
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        condition: WMO_CODES[data.current.weather_code] ?? "Unknown",
        windSpeed: Math.round(data.current.wind_speed_10m),
        humidity: data.current.relative_humidity_2m,
      },
      forecast: data.daily.temperature_2m_max.map((max, i) => ({
        high: Math.round(max),
        low: Math.round(data.daily.temperature_2m_min[i]),
        condition: WMO_CODES[data.daily.weather_code[i]] ?? "Unknown",
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
