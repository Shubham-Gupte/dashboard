import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hour ISR

export async function GET() {
  try {
    // Proxy to chintu's fun-fact endpoint (same process, localhost)
    const res = await fetch("http://localhost:3000/api/fun-fact", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Fun-fact proxy: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ...data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Fun fact proxy error:", err);
    return NextResponse.json({
      fact: "Did you know? The shortest war in history lasted 38 minutes — between Britain and Zanzibar in 1896.",
      updatedAt: new Date().toISOString(),
    });
  }
}
