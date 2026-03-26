import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min ISR

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export async function GET() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!calendarId || !serviceAccountJson) {
    return NextResponse.json({ error: "Google Calendar not configured" }, { status: 500 });
  }

  try {
    // Parse service account credentials
    const creds = JSON.parse(serviceAccountJson);

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

    // Fetch today's events
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    eventsUrl.searchParams.set("timeMin", todayStart.toISOString());
    eventsUrl.searchParams.set("timeMax", todayEnd.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");

    const eventsRes = await fetch(eventsUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 300 },
    });
    if (!eventsRes.ok) throw new Error(`Calendar API: ${eventsRes.status}`);
    const eventsData = await eventsRes.json();

    const events: CalendarEvent[] = (eventsData.items ?? []).map(
      (e: { summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; location?: string }) => ({
        summary: e.summary ?? "(No title)",
        start: e.start?.dateTime ?? e.start?.date ?? "",
        end: e.end?.dateTime ?? e.end?.date ?? "",
        location: e.location,
      })
    );

    return NextResponse.json({ events, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}
