// Tiny client helper: POST JSON, throw the server's error message.
export async function post<T>(url: string, body: unknown, headers: Record<string,string> = {}): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(url === "/api/video" ? 300000 : 180000) });
  if (r.status === 401) throw new Error("Your staff session expired. Sign in again at /login, then retry.");
  const j = await r.json().catch(() => { throw new Error("The server did not return a result. Keep this page open and retry."); });
  if (!r.ok || j.error) throw new Error(j.error || r.statusText);
  return j as T;
}
