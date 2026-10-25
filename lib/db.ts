import { DatabaseSync } from "node:sqlite";

// ponytail: one local sqlite file, fine for a laptop-hosted demo; move to Postgres if hosted serverless.
const g = globalThis as unknown as { __db?: DatabaseSync };
function openDb(): DatabaseSync {
  if (g.__db) return g.__db;
  const d = new DatabaseSync(process.env.VELHO_DB || "velho-room.db");
  d.exec("PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL;");
  d.exec(`
    CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, json TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, talk TEXT, name TEXT, company TEXT, role TEXT, email TEXT, answers TEXT, result TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS feedback (angle TEXT PRIMARY KEY, up INTEGER DEFAULT 0, down INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS campaign_experiments (id TEXT PRIMARY KEY, angle TEXT NOT NULL, json TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS fastino_calls (id INTEGER PRIMARY KEY, audit TEXT, model TEXT, purpose TEXT, status TEXT, reported_cost REAL, estimated_cost REAL, input_tokens INTEGER, created INTEGER);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v REAL);
    CREATE TABLE IF NOT EXISTS lead_requests (key TEXT PRIMARY KEY, response TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS lead_work (lead_id INTEGER PRIMARY KEY, json TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_calls (id INTEGER PRIMARY KEY, audit TEXT, model TEXT, purpose TEXT, cost REAL, status TEXT, created INTEGER, output TEXT, request_id TEXT);
  `);
  for (const column of ["output", "request_id"]) {
    if (!(d.prepare("PRAGMA table_info(ai_calls)").all() as {name:string}[]).some(c=>c.name===column)) {
      try { d.exec(`ALTER TABLE ai_calls ADD COLUMN ${column} TEXT`); }
      catch (e) { if (!(e instanceof Error) || !e.message.includes("duplicate column")) throw e; }
    }
  }
  g.__db=d;
  return d;
}
// Open on first actual query. A production build can import routes without touching a live database.
export const db = new Proxy({} as DatabaseSync, {get(_target,key) {
  const d=openDb(); const value=Reflect.get(d,key,d);
  return typeof value === "function" ? value.bind(d) : value;
}});

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
export function getAuditSpend(): number | null {
  if (!process.env.VELHO_AUDIT_ID) return null;
  return (db.prepare("SELECT COALESCE(SUM(cost),0) AS total FROM ai_calls WHERE audit = ?").get(process.env.VELHO_AUDIT_ID) as {total:number}).total;
}
