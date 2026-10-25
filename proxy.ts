import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession } from "./lib/auth";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const publicPath = path === "/login" || path === "/check" || path === "/api/session" || (path === "/api/lead" && req.method === "POST");
  // Mutations come from our own forms, not a cross-site form or script.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: "Open this form on the Velho Room site and try again." }, { status: 403 });
  }
  if (!publicPath && !validSession(req.cookies.get(SESSION_COOKIE)?.value)) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|velho-score.wav).*)"] };
