import { nycProvider } from "./nyc/provider";
import { detectProvider } from "./geo";
import type { TransitProvider } from "./types";

const providers: TransitProvider[] = [nycProvider];

export function getProviderForLocation(lat: number, lon: number): TransitProvider | null {
  return detectProvider(lat, lon, providers);
}

export function getProviderBySystem(system: string): TransitProvider | null {
  return providers.find((p) => p.system === system) ?? null;
}
