import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Discord webhook not configured" }, { status: 500 });
  }

  const { title, url, source } = await req.json();
  if (!title || !url) {
    return NextResponse.json({ error: "Missing title or url" }, { status: 400 });
  }

  const TAG_MAP: Record<string, string> = { HN: "Hacker News", MKT: "Market", NYT: "NYT", MOVIE: "Movie", BOOK: "Book", FILM: "Film" };
  const tag = TAG_MAP[source] ?? source ?? "Link";

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**[${tag}]** ${title}\n${url}`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Discord webhook error:", err);
      return NextResponse.json({ error: "Failed to send" }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Discord webhook error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
