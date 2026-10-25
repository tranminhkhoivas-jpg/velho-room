import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "velho_staff";
export const SESSION_SECONDS = 12 * 60 * 60;
export function sameSecret(a: string, b: string): boolean {
  const hash = (s: string) => createHmac("sha256", "velho-login").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}
export function sessionToken(now = Date.now()): string {
  const expires = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return expires + "." + createHmac("sha256", process.env.VELHO_STAFF_PASSWORD || "").update(expires).digest("hex");
}
export function validSession(token = "", now = Date.now()): boolean {
  const password = process.env.VELHO_STAFF_PASSWORD;
  const [expires, sig] = token.split(".");
  if (!password || !/^\d{10}$/.test(expires || "") || !/^[a-f0-9]{64}$/.test(sig || "")) return false;
  const seconds = Math.floor(now / 1000);
  if (+expires <= seconds || +expires > seconds + SESSION_SECONDS) return false;
  return sameSecret(sig, createHmac("sha256", password).update(expires).digest("hex"));
}
