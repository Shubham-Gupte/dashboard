import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const apiKey = process.env.FUN_FACT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      fact: "Did you know? The shortest war in history lasted 38 minutes — between Britain and Zanzibar in 1896.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const res = await fetch("https://api.api-ninjas.com/v1/facts", {
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Fun fact API: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({
      fact: data[0]?.fact ?? "The human brain contains approximately 86 billion neurons.",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      fact: "Did you know? Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.",
      updatedAt: new Date().toISOString(),
    });
  }
}
