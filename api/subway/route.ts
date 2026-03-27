import { NextResponse } from "next/server";
import { getConfig } from "../../lib/config";
import protobuf from "protobufjs";

export const dynamic = "force-dynamic";

// MTA GTFS-RT feed URLs grouped by line
const FEED_URL: Record<string, string> = {
  "1": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "2": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "3": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "4": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "5": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "6": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "7": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  S: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  A: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  C: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  E: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  B: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  D: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  F: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  M: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  N: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  Q: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  R: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  W: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  G: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  J: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  Z: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  L: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
};

// GTFS stop IDs for 23 St stations (N = uptown, S = downtown)
const STOP_IDS: Record<string, string[]> = {
  C: ["A30N", "A30S"],
  E: ["A30N", "A30S"],
  "1": ["130N", "130S"],
  F: ["D18N", "D18S"],
  M: ["D18N", "D18S"],
};

const ALERTS_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts";

// Inline GTFS-RT proto definition (avoids shipping .proto files)
const GTFS_RT_PROTO = `
syntax = "proto2";
package transit_realtime;

message FeedMessage {
  required FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}
message FeedHeader {
  required string gtfs_realtime_version = 1;
  optional uint64 timestamp = 2;
}
message FeedEntity {
  required string id = 1;
  optional TripUpdate trip_update = 3;
  optional Alert alert = 5;
}
message TripUpdate {
  required TripDescriptor trip = 1;
  repeated StopTimeUpdate stop_time_update = 2;
  message StopTimeUpdate {
    optional string stop_id = 4;
    optional StopTimeEvent arrival = 2;
    optional StopTimeEvent departure = 3;
  }
}
message StopTimeEvent {
  optional int64 time = 2;
}
message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
}
message Alert {
  repeated TimeRange active_period = 1;
  repeated EntitySelector informed_entity = 5;
  optional TranslatedString header_text = 10;
  optional TranslatedString description_text = 11;
}
message TimeRange {
  optional uint64 start = 1;
  optional uint64 end = 2;
}
message EntitySelector {
  optional string route_id = 5;
  optional string stop_id = 6;
}
message TranslatedString {
  repeated Translation translation = 1;
  message Translation {
    required string text = 1;
    optional string language = 2;
  }
}
`;

let cachedRoot: protobuf.Root | null = null;

function getProtoRoot(): protobuf.Root {
  if (cachedRoot) return cachedRoot;
  cachedRoot = protobuf.parse(GTFS_RT_PROTO).root;
  return cachedRoot;
}

export async function GET() {
  try {
    const config = getConfig();
    const lines = config.subwayLines;
    const nowSec = Math.floor(Date.now() / 1000);

    // Dedupe feed URLs
    const feedUrls = [...new Set(lines.map((l) => FEED_URL[l]).filter(Boolean))];

    const root = getProtoRoot();
    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

    const arrivals: { line: string; minutes: number; direction: string }[] = [];

    // Fetch all feeds in parallel
    const feedResults = await Promise.allSettled(
      feedUrls.map(async (url) => {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const buf = await res.arrayBuffer();
        return FeedMessage.decode(new Uint8Array(buf)) as unknown as {
          entity: {
            tripUpdate?: {
              trip: { routeId: string };
              stopTimeUpdate: { stopId: string; arrival?: { time: { low: number } | number } }[];
            };
          }[];
        };
      })
    );

    // Build a set of stop IDs we care about
    const targetStops = new Set<string>();
    for (const line of lines) {
      for (const sid of STOP_IDS[line] ?? []) {
        targetStops.add(sid);
      }
    }

    for (const result of feedResults) {
      if (result.status !== "fulfilled") continue;
      const feed = result.value;

      for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu?.stopTimeUpdate) continue;

        const routeId = tu.trip.routeId;
        if (!lines.includes(routeId)) continue;

        for (const stu of tu.stopTimeUpdate) {
          if (!stu.stopId || !targetStops.has(stu.stopId)) continue;
          if (!stu.arrival?.time) continue;

          // protobufjs decodes int64 as { low, high } or number depending on config
          const arrivalTime =
            typeof stu.arrival.time === "object"
              ? (stu.arrival.time as { low: number }).low
              : Number(stu.arrival.time);

          const mins = Math.floor((arrivalTime - nowSec) / 60);
          if (mins < 0 || mins > 60) continue;

          const direction = stu.stopId.endsWith("N") ? "Uptown" : "Downtown";
          arrivals.push({ line: routeId, minutes: mins, direction });
        }
      }
    }

    // Sort by arrival time, then keep only the next train per line+direction
    arrivals.sort((a, b) => a.minutes - b.minutes);
    const seen = new Set<string>();
    const deduped = arrivals.filter((a) => {
      const key = `${a.line}-${a.direction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Fetch service alerts
    const alerts: { lines: string[]; header: string; description: string }[] = [];
    try {
      const alertRes = await fetch(ALERTS_URL, { cache: "no-store" });
      if (alertRes.ok) {
        const alertBuf = await alertRes.arrayBuffer();
        const alertFeed = FeedMessage.decode(new Uint8Array(alertBuf)) as unknown as {
          entity: {
            alert?: {
              informedEntity: { routeId?: string; stopId?: string }[];
              headerText?: { translation: { text: string; language?: string }[] };
              descriptionText?: { translation: { text: string; language?: string }[] };
            };
          }[];
        };

        const lineSet = new Set(lines);
        for (const entity of alertFeed.entity) {
          const a = entity.alert;
          if (!a?.informedEntity || !a.headerText?.translation?.length) continue;

          const affectedLines = a.informedEntity
            .map((e) => e.routeId)
            .filter((r): r is string => r != null && lineSet.has(r));
          if (affectedLines.length === 0) continue;

          const header = a.headerText.translation.find((t) => t.language === "en")?.text
            ?? a.headerText.translation[0]?.text ?? "";
          const description = a.descriptionText?.translation?.find((t) => t.language === "en")?.text
            ?? a.descriptionText?.translation?.[0]?.text ?? "";

          if (header) {
            alerts.push({ lines: [...new Set(affectedLines)], header, description });
          }
        }
      }
    } catch (alertErr) {
      console.error("Subway alerts fetch error:", alertErr);
    }

return NextResponse.json({
      station: config.subwayStation,
      lines,
      arrivals: deduped,
      alerts,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Subway API error:", err);
    return NextResponse.json({ error: "Failed to fetch subway data" }, { status: 500 });
  }
}
