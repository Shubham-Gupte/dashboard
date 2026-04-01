import protobuf from "protobufjs";
import type { TransitProvider, TransitResponse, TransitArrival, StationData } from "../types";
import { findNearest } from "../geo";
import stationsData from "./stations.json";

const stations: StationData[] = stationsData.stations;
const lineStyles: Record<string, { color: string; textColor: string }> = stationsData.lines;
const directionLabels: Record<string, string> = stationsData.directions;

// MTA GTFS-RT feed URLs grouped by line
const FEED_URL: Record<string, string> = {
  "1": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "2": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "3": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "4": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "5": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "6": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "6X": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "7": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "7X": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  S: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  GS: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  A: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  C: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  E: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  H: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  B: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  D: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  F: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  FX: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  M: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  N: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  Q: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  R: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  W: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  G: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  J: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  Z: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  L: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  SI: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si",
  FS: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
};

const ALERTS_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts";

// Inline GTFS-RT proto definition
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

type FeedEntity = {
  tripUpdate?: {
    trip: { routeId: string };
    stopTimeUpdate: { stopId: string; arrival?: { time: { low: number } | number } }[];
  };
};

type AlertEntity = {
  alert?: {
    informedEntity: { routeId?: string; stopId?: string }[];
    headerText?: { translation: { text: string; language?: string }[] };
    descriptionText?: { translation: { text: string; language?: string }[] };
  };
};

async function fetchArrivals(station: StationData, lines: string[]): Promise<{ arrivals: TransitArrival[]; alerts: { lines: string[]; header: string; description: string }[] }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const feedUrls = [...new Set(lines.map((l) => FEED_URL[l]).filter(Boolean))];

  const root = getProtoRoot();
  const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

  const targetStops = new Set(station.stopIds);
  const lineSet = new Set(lines);
  const arrivals: TransitArrival[] = [];

  const feedResults = await Promise.allSettled(
    feedUrls.map(async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = await res.arrayBuffer();
      return FeedMessage.decode(new Uint8Array(buf)) as unknown as { entity: FeedEntity[] };
    })
  );

  for (const result of feedResults) {
    if (result.status !== "fulfilled") continue;
    for (const entity of result.value.entity) {
      const tu = entity.tripUpdate;
      if (!tu?.stopTimeUpdate) continue;
      if (!lineSet.has(tu.trip.routeId)) continue;

      for (const stu of tu.stopTimeUpdate) {
        if (!stu.stopId || !targetStops.has(stu.stopId)) continue;
        if (!stu.arrival?.time) continue;

        const arrivalTime =
          typeof stu.arrival.time === "object"
            ? (stu.arrival.time as { low: number }).low
            : Number(stu.arrival.time);

        const mins = Math.floor((arrivalTime - nowSec) / 60);
        if (mins < 0 || mins > 60) continue;

        const dirSuffix = stu.stopId.slice(-1);
        arrivals.push({
          line: tu.trip.routeId,
          minutes: mins,
          direction: directionLabels[dirSuffix] ?? dirSuffix,
          directionId: dirSuffix,
        });
      }
    }
  }

  // Dedup: keep only the next train per line+direction
  arrivals.sort((a, b) => a.minutes - b.minutes);
  const seen = new Set<string>();
  const deduped = arrivals.filter((a) => {
    const key = `${a.line}-${a.directionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Fetch alerts
  const alerts: { lines: string[]; header: string; description: string }[] = [];
  try {
    const alertRes = await fetch(ALERTS_URL, { cache: "no-store" });
    if (alertRes.ok) {
      const alertBuf = await alertRes.arrayBuffer();
      const alertFeed = FeedMessage.decode(new Uint8Array(alertBuf)) as unknown as { entity: AlertEntity[] };

      for (const entity of alertFeed.entity) {
        const a = entity.alert;
        if (!a?.informedEntity || !a.headerText?.translation?.length) continue;

        const affected = a.informedEntity
          .map((e) => e.routeId)
          .filter((r): r is string => r != null && lineSet.has(r));
        if (affected.length === 0) continue;

        const header = a.headerText.translation.find((t) => t.language === "en")?.text
          ?? a.headerText.translation[0]?.text ?? "";
        const description = a.descriptionText?.translation?.find((t) => t.language === "en")?.text
          ?? a.descriptionText?.translation?.[0]?.text ?? "";

        if (header) alerts.push({ lines: [...new Set(affected)], header, description });
      }
    }
  } catch (e) {
    console.error("MTA alerts error:", e);
  }

  return { arrivals: deduped, alerts };
}

function buildResponse(station: StationData, lines: string[], arrivals: TransitArrival[], alerts: { lines: string[]; header: string; description: string }[]): TransitResponse {
  // Only include lineStyles for lines at this station
  const stationLineStyles: Record<string, { color: string; textColor: string }> = {};
  for (const l of lines) {
    if (lineStyles[l]) stationLineStyles[l] = lineStyles[l];
  }

  // Derive direction labels from the arrivals present
  const dirSet = new Set(arrivals.map((a) => a.direction));
  const directions = Object.values(directionLabels).filter((d) => dirSet.has(d));
  if (directions.length === 0) directions.push(...Object.values(directionLabels));

  return {
    station: station.name,
    system: "mta",
    lines,
    lineStyles: stationLineStyles,
    directions,
    arrivals,
    alerts,
    updatedAt: new Date().toISOString(),
  };
}

async function getArrivals(lat: number, lon: number): Promise<TransitResponse> {
  const station = findNearest(lat, lon, stations);
  if (!station) throw new Error("No NYC station found");
  const { arrivals, alerts } = await fetchArrivals(station, station.lines);
  return buildResponse(station, station.lines, arrivals, alerts);
}

async function getArrivalsByConfig(stationName: string, lines: string[]): Promise<TransitResponse> {
  // Find station by name, prefer one that serves the requested lines
  const matches = stations.filter((s) => s.name === stationName);
  if (matches.length === 0) throw new Error(`Station "${stationName}" not found`);

  // Collect all stop IDs and lines across matching station complexes
  const allStopIds = new Set<string>();
  const allLines = new Set<string>();
  for (const m of matches) {
    for (const sid of m.stopIds) allStopIds.add(sid);
    for (const l of m.lines) {
      if (lines.includes(l)) allLines.add(l);
    }
  }

  const merged: StationData = {
    id: matches[0].id,
    name: stationName,
    lat: matches[0].lat,
    lon: matches[0].lon,
    lines: [...allLines],
    stopIds: [...allStopIds],
  };

  const { arrivals, alerts } = await fetchArrivals(merged, merged.lines);
  return buildResponse(merged, merged.lines, arrivals, alerts);
}

export const nycProvider: TransitProvider = {
  system: "mta",
  bounds: [40.49, -74.26, 40.92, -73.68],
  getArrivals,
  getArrivalsByConfig,
};
