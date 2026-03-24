import { readFileSync } from "fs";
import { join } from "path";

export interface DashboardConfig {
  address: string;
  subwayLines: string[];
  subwayStation: string;
  letterboxd: string;
  goodreads: string;
  timezones: { label: string; tz: string }[];
}

let cachedConfig: DashboardConfig | null = null;

export function getConfig(): DashboardConfig {
  if (cachedConfig) return cachedConfig;
  const root = process.env.DASHBOARD_ROOT ?? join(process.cwd(), "lib", "dashboard");
  const raw = readFileSync(join(root, "config.json"), "utf-8");
  cachedConfig = JSON.parse(raw) as DashboardConfig;
  return cachedConfig;
}
