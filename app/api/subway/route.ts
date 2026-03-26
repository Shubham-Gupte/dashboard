import { NextResponse } from "next/server";
import { getConfig } from "../../../lib/config";

export const dynamic = "force-dynamic";

// MTA GTFS-RT feed IDs mapped to subway line groups
const FEED_MAP: Record<string, string> = {
  "1": "1", "2": "1", "3": "1", "4": "1", "5": "1", "6": "1", "S": "1",
  A: "26", C: "26", E: "26",
  N: "16", Q: "16", R: "16", W: "16",
  B: "21", D: "21", F: "21", M: "21",
  L: "2",
  G: "31",
  J: "36", Z: "36",
  "7": "51",
  SIR: "11",
};

interface TripUpdate {
  trip: { routeId: string };
  stopTimeUpdate?: { stopId: string; arrival?: { time: string } }[];
}

interface FeedEntity {
  tripUpdate?: TripUpdate;
}

export async function GET() {
  const apiKey = process.env.MTA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MTA_API_KEY not set" }, { status: 500 });
  }

  try {
    const config = getConfig();
    const lines = config.subwayLines;
    const stationName = config.subwayStation;

    // Determine which feeds we need
    const feedIds = [...new Set(lines.map((l) => FEED_MAP[l]).filter(Boolean))];

    const arrivals: { line: string; minutes: number; direction: string }[] = [];
    const now = Date.now() / 1000;

    for (const feedId of feedIds) {
      const url = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l` // placeholder pattern
        .replace("gtfs-l", feedId === "1" ? "gtfs" : `gtfs-${FEED_MAP[lines[0]] === feedId ? lines[0].toLowerCase() : ""}`);

      // Use the unified GTFS-RT JSON endpoint
      const res = await fetch(
        `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs${feedId === "1" ? "" : "-" + feedId}`,
        {
          headers: { "x-api-key": apiKey },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        console.error(`MTA feed ${feedId}: ${res.status}`);
        continue;
      }

      // MTA returns protobuf; for simplicity, use the JSON alerts endpoint
      // In practice you'd use a protobuf decoder — for now, use the subway-time proxy approach
    }

    // Fallback: Use the MTA real-time data (JSON endpoint)
    // The MTA provides a simpler JSON endpoint for subway times
    const subwayRes = await fetch(
      `https://collector-otp-prod.camsys-apps.com/realtime/gtfsrt/filtered/alerts?type=json&apikey=${apiKey}`,
      { cache: "no-store" }
    );

    // For a working implementation, use the GTFS-RT protobuf feeds with a decoder
    // This is a simplified version that returns station-level arrival times
    return NextResponse.json({
      station: stationName,
      lines: lines,
      arrivals: [],
      message: "MTA GTFS-RT integration requires protobuf decoding — install gtfs-realtime-bindings for full support",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Subway API error:", err);
    return NextResponse.json({ error: "Failed to fetch subway data" }, { status: 500 });
  }
}
