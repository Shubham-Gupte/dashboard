#!/usr/bin/env node
/**
 * Builds lib/transit/nyc/stations.json from MTA GTFS static data.
 *
 * Usage:
 *   node scripts/build-stations.mjs
 *
 * Expects extracted GTFS CSVs in /tmp/mta_gtfs/ (or pass --gtfs-dir=PATH).
 * Download first:
 *   curl -sL http://web.mta.info/developers/data/nyct/subway/google_transit.zip -o /tmp/mta_gtfs.zip
 *   unzip -o /tmp/mta_gtfs.zip -d /tmp/mta_gtfs/ stops.txt trips.txt stop_times.txt routes.txt
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gtfsDir = process.argv.find((a) => a.startsWith("--gtfs-dir="))?.split("=")[1] ?? "/tmp/mta_gtfs";

function parseCSV(file) {
  const lines = readFileSync(join(gtfsDir, file), "utf8").split("\n");
  const header = lines[0].split(",");
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = line.split(",");
      const row = {};
      for (let i = 0; i < header.length; i++) row[header[i].trim()] = vals[i]?.trim() ?? "";
      return row;
    });
}

// ── Parse stops ───────────────────────────────────────────────────────
console.log("Parsing stops.txt...");
const stops = parseCSV("stops.txt");
const parentStations = new Map();
for (const s of stops) {
  if (s.location_type === "1") {
    parentStations.set(s.stop_id, {
      id: s.stop_id,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lon: parseFloat(s.stop_lon),
      lines: new Set(),
      stopIds: new Set(),
    });
  }
}

// Map child stops to their parent
const childToParent = new Map();
for (const s of stops) {
  if (s.parent_station && parentStations.has(s.parent_station)) {
    childToParent.set(s.stop_id, s.parent_station);
  }
}

// ── Parse routes for colors ───────────────────────────────────────────
console.log("Parsing routes.txt...");
const routes = parseCSV("routes.txt");
const lineStyles = {};
for (const r of routes) {
  lineStyles[r.route_id] = {
    color: `#${r.route_color || "555555"}`,
    textColor: `#${r.route_text_color || "FFFFFF"}`,
  };
}

// ── Parse trips → route mapping ───────────────────────────────────────
console.log("Parsing trips.txt...");
const trips = parseCSV("trips.txt");
const tripToRoute = new Map();
for (const t of trips) {
  tripToRoute.set(t.trip_id, t.route_id);
}

// ── Parse stop_times → route-to-station mapping ──────────────────────
console.log("Parsing stop_times.txt (this may take a moment)...");
const stopTimesRaw = readFileSync(join(gtfsDir, "stop_times.txt"), "utf8");
const stLines = stopTimesRaw.split("\n");
const stHeader = stLines[0].split(",");
const tripIdx = stHeader.indexOf("trip_id");
const stopIdx = stHeader.indexOf("stop_id");

for (let i = 1; i < stLines.length; i++) {
  const line = stLines[i];
  if (!line) continue;
  const parts = line.split(",");
  const tripId = parts[tripIdx]?.trim();
  const stopId = parts[stopIdx]?.trim();
  if (!tripId || !stopId) continue;

  const routeId = tripToRoute.get(tripId);
  if (!routeId) continue;

  // Find parent station
  const parentId = childToParent.get(stopId) ?? (parentStations.has(stopId) ? stopId : null);
  if (!parentId) continue;

  const station = parentStations.get(parentId);
  if (station) {
    station.lines.add(routeId);
    station.stopIds.add(stopId);
  }
}

// ── Build output ──────────────────────────────────────────────────────
const stations = [...parentStations.values()]
  .filter((s) => s.lines.size > 0)
  .map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    lines: [...s.lines].sort(),
    stopIds: [...s.stopIds].sort(),
  }));

const output = {
  stations,
  lines: lineStyles,
  directions: { N: "Uptown", S: "Downtown" },
};

const outPath = join(__dirname, "..", "lib", "transit", "nyc", "stations.json");
writeFileSync(outPath, JSON.stringify(output));

console.log(`Wrote ${stations.length} stations to ${outPath}`);
console.log(`Lines: ${Object.keys(lineStyles).join(", ")}`);

// Quick sanity check: find 23 St stations
const twentyThree = stations.filter((s) => s.name.includes("23 St"));
console.log(`\n23 St stations: ${twentyThree.length}`);
for (const s of twentyThree) {
  console.log(`  ${s.id}: ${s.name} — lines: ${s.lines.join(",")} — stops: ${s.stopIds.join(",")}`);
}
