import { NextResponse } from "next/server";
import { getConfig } from "../../lib/config";
import { getProviderForLocation, getProviderBySystem } from "../../lib/transit/registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lon = parseFloat(searchParams.get("lon") ?? "");

    // If coordinates provided, find nearest station via location-aware provider
    if (!isNaN(lat) && !isNaN(lon)) {
      const provider = getProviderForLocation(lat, lon);
      if (provider) {
        return NextResponse.json(await provider.getArrivals(lat, lon));
      }
      // No provider for this location — fall through to config
    }

    // Fallback: use config.json defaults
    const config = getConfig();
    const system = config.transitSystem ?? "mta";
    const provider = getProviderBySystem(system);
    if (provider) {
      return NextResponse.json(
        await provider.getArrivalsByConfig(config.subwayStation, config.subwayLines)
      );
    }

    return NextResponse.json({ error: "No transit provider available" }, { status: 404 });
  } catch (err) {
    console.error("Transit API error:", err);
    return NextResponse.json({ error: "Failed to fetch transit data" }, { status: 500 });
  }
}
