export interface TransitArrival {
  line: string;
  minutes: number;
  direction: string;   // human-readable: "Uptown", "Downtown", etc.
  directionId: string; // raw suffix: "N", "S" — for grouping
}

export interface TransitAlert {
  lines: string[];
  header: string;
  description: string;
}

export interface LineStyle {
  color: string;     // hex background
  textColor: string; // hex foreground (for contrast)
}

export interface TransitResponse {
  station: string;
  system: string;
  lines: string[];
  lineStyles: Record<string, LineStyle>;
  directions: string[];
  crosstownLines: string[];       // lines that run east-west (separate UI section)
  crosstownDirections: string[];  // e.g. ["Westbound", "Eastbound"]
  arrivals: TransitArrival[];
  alerts: TransitAlert[];
  updatedAt: string;
}

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: string[];
  stopIds: string[];
}

export interface TransitProvider {
  system: string;
  bounds: [number, number, number, number]; // [south, west, north, east]
  getArrivals(lat: number, lon: number): Promise<TransitResponse>;
  getArrivalsByConfig(stationName: string, lines: string[]): Promise<TransitResponse>;
}
