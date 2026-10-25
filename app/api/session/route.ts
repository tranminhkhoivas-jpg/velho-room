import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_SECONDS, sessionToken, sameSecret, validSession } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.count >= 5) return NextResponse.json({ error: "Too many attempts. Try again in 10 minutes." }, { status: 429 });
  if (!process.env.VELHO_STAFF_PASSWORD) return NextResponse.json({ error: "Staff password is not configured on this server." }, { status: 503 });
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length > 512 || !sameSecret(password, process.env.VELHO_STAFF_PASSWORD)) {
    attempts.set(ip, { count: a && a.until > Date.now() ? a.count + 1 : 1, until: Date.now() + 600000 });
    return NextResponse.json({ error: "Incorrect staff password." }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(), { httpOnly: true, sameSite: "strict", secure: req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:", maxAge: SESSION_SECONDS, path: "/" });
  return res;
}
export async function GET(req: NextRequest) {
  return NextResponse.json({ staff: validSession(req.cookies.get(SESSION_COOKIE)?.value) });
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
