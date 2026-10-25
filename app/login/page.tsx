"use client";
import { useState } from "react";
import { post } from "@/components/api";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return <main><h1>Velho staff sign-in</h1><p>Employee tools and audience leads are private. Audience members can still take the <a href="/check">automation check</a>.</p>
    <form className="card" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr("");
      try {
        await post("/api/session", { password });
        const next = new URLSearchParams(location.search).get("next") || "/";
        location.assign(next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/");
      } catch (e) { setErr((e as Error).message); setBusy(false); }
    }}><label htmlFor="password">Staff password</label><div className="row"><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></div>{err && <p role="alert" className="err">{err}</p>}</form>
  </main>;
}
