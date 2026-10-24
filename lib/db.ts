import { DatabaseSync } from "node:sqlite";

// ponytail: one local sqlite file, fine for a laptop-hosted demo; move to Postgres if hosted serverless.
const g = globalThis as unknown as { __db?: DatabaseSync };
export const db =
  g.__db ||
  (g.__db = (() => {
    const d = new DatabaseSync(process.env.VELHO_DB || "velho-room.db");
    d.exec(`
      CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, json TEXT, created INTEGER);
      CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, talk TEXT, name TEXT, company TEXT, role TEXT, email TEXT, answers TEXT, result TEXT, created INTEGER);
      CREATE TABLE IF NOT EXISTS feedback (angle TEXT PRIMARY KEY, up INTEGER DEFAULT 0, down INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v REAL);
    `);
    return d;
  })());

export function cacheGet<T>(key: string, maxAgeMs = 1000 * 60 * 60 * 24): T | null {
  const row = db.prepare("SELECT json, created FROM cache WHERE key = ?").get(key) as { json: string; created: number } | undefined;
  if (!row || Date.now() - row.created > maxAgeMs) return null;
  return JSON.parse(row.json) as T;
}

export function cacheSet(key: string, value: unknown) {
  db.prepare("INSERT OR REPLACE INTO cache (key, json, created) VALUES (?, ?, ?)").run(key, JSON.stringify(value), Date.now());
}

export function addSpend(usd: number) {
  db.prepare("INSERT INTO kv (k, v) VALUES ('spend', ?) ON CONFLICT(k) DO UPDATE SET v = v + excluded.v").run(usd);
}

export function getSpend(): number {
  const row = db.prepare("SELECT v FROM kv WHERE k = 'spend'").get() as { v: number } | undefined;
  return row?.v || 0;
}
