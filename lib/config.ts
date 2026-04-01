import configData from "./config.json";

export interface DashboardConfig {
  address: string;
  transitSystem?: string;
  subwayLines: string[];
  subwayStation: string;
  letterboxd: string;
  goodreads: string;
  timezones: { label: string; tz: string }[];
  streamingProviders?: Record<string, boolean>;
}

export function getConfig(): DashboardConfig {
  return configData as DashboardConfig;
}
