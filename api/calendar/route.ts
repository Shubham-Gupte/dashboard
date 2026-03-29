import { NextResponse } from "next/server";
import { readFileSync } from "fs";

export const revalidate = 300; // 5 min ISR

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export async function GET() {
  const calendarIds = (process.env.GOOGLE_CALENDAR_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GCS_KEY_FILE;

  if (calendarIds.length === 0 || (!serviceAccountJson && !keyFile)) {
    return NextResponse.json({ error: "Google Calendar not configured" }, { status: 500 });
  }

  try {
    // Parse service account credentials from env var or key file
    const creds = serviceAccountJson
      ? JSON.parse(serviceAccountJson)
      : JSON.parse(readFileSync(keyFile!, "utf-8"));

    // Build JWT for Google API auth
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    );

    // Sign JWT with the service account private key
    const encoder = new TextEncoder();
    const keyData = creds.private_key.replace(/-----BEGIN PRIVATE KEY-----\n?/g, "").replace(/\n?-----END PRIVATE KEY-----\n?/g, "").replace(/\n/g, "");
    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(`${header}.${payload}`));
    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwt = `${header}.${payload}.${sig}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Failed to get access token");

    // Compute today's time bounds in Eastern time
    const tz = "America/New_York";
    const nowET = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
    const etNow = new Date();
    const utcStr = etNow.toLocaleString("en-US", { timeZone: "UTC" });
    const etStr = etNow.toLocaleString("en-US", { timeZone: tz });
    const offsetMs = new Date(utcStr).getTime() - new Date(etStr).getTime();
    const offsetH = Math.floor(Math.abs(offsetMs) / 3600000);
    const offsetM = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);
    const sign = offsetMs >= 0 ? "-" : "+";
    const tzOffset = `${sign}${String(offsetH).padStart(2, "0")}:${String(offsetM).padStart(2, "0")}`;
    const todayStart = `${nowET}T00:00:00${tzOffset}`;
    const todayEnd = `${nowET}T23:59:59${tzOffset}`;

    // Fetch events from all calendars in parallel
    const allEvents = await Promise.all(
      calendarIds.map(async (calId) => {
        const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
        eventsUrl.searchParams.set("timeMin", todayStart);
        eventsUrl.searchParams.set("timeMax", todayEnd);
        eventsUrl.searchParams.set("timeZone", tz);
        eventsUrl.searchParams.set("singleEvents", "true");
        eventsUrl.searchParams.set("orderBy", "startTime");

        const res = await fetch(eventsUrl.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          console.error(`Calendar ${calId}: ${res.status}`);
          return [];
        }
        const data = await res.json();
        return (data.items ?? []).map(
          (e: { summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; location?: string }) => ({
            summary: e.summary ?? "(No title)",
            start: e.start?.dateTime ?? e.start?.date ?? "",
            end: e.end?.dateTime ?? e.end?.date ?? "",
            location: e.location,
          })
        ) as CalendarEvent[];
      })
    );

    // Merge and dedupe by summary+start, sort by start time
    const seen = new Set<string>();
    const events = allEvents.flat().filter((e) => {
      const key = `${e.summary}|${e.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.start.localeCompare(b.start));

    return NextResponse.json({ events, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}
