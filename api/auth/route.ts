import { NextResponse } from "next/server";

const COOKIE = "dash-auth";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const { passphrase } = await request.json();
  const secret = process.env.DASHBOARD_SECRET;

  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if (passphrase !== secret) return NextResponse.json({ error: "Wrong passphrase" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
