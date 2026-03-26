import configData from "./config.json";

export interface DashboardConfig {
  address: string;
  subwayLines: string[];
  subwayStation: string;
  letterboxd: string;
  goodreads: string;
  timezones: { label: string; tz: string }[];
}

export function getConfig(): DashboardConfig {
  return configData as DashboardConfig;
}
