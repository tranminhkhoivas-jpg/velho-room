"use client";
import { useRef, useState } from "react";
import { post } from "./api";

type M = { role: "user" | "assistant"; content: string };
type Score = { score: number; strengths: string[]; fixes: string[]; bestLine: string };

// Browser Web Speech API typings are not in lib.dom; keep it loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

export function Chat({ mode, company, opener }: { mode: "website" | "cfo"; company: string; opener: string }) {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const [err, setErr] = useState("");
  const rec = useRef<AnyRec>(null);

  async function send(content: string) {
    if (!content.trim()) return;
    const next: M[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setErr("");
    try {
      const { reply } = await post<{ reply: string }>("/api/chat", { mode, company, messages: next });
      setMsgs([...next, { role: "assistant", content: reply }]);
      if (voice && "speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function listen() {
    const W = window as AnyRec;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return setErr("Voice input needs Chrome or Edge.");
    setVoice(true);
    const r = new SR();
    r.lang = "en-US";
    r.onresult = (e: AnyRec) => send(e.results[0][0].transcript);
    r.start();
    rec.current = r;
  }

  async function grade() {
    setBusy(true);
    try {
      setScore((await post<{ score: Score }>("/api/chat", { mode: "score", company, messages: msgs })).score);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <p className="muted">{opener}</p>
      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            {m.content}
          </div>
        ))}
        {busy && <div className="loading">…</div>}
      </div>
      {err && <p className="err">{err}</p>}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "cfo" ? "Pitch the CFO…" : "Ask their website anything…"} />
        <button disabled={busy}>Send</button>
        {mode === "cfo" && (
          <>
            <button type="button" className="ghost" disabled={busy} onClick={listen}>
              🎤 Speak
            </button>
            <button type="button" className="ghost" disabled={busy || msgs.length < 4} onClick={grade}>
              Score my pitch
            </button>
          </>
        )}
      </form>
      {score && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Pitch score: {score.score}/100</h2>
          <b>Worked</b>
          <ul>{score.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          <b>Fix next time</b>
          <ul>{score.fixes.map((s) => <li key={s}>{s}</li>)}</ul>
          <p>
            <b>Line to steal:</b> “{score.bestLine}”
          </p>
        </div>
      )}
    </div>
  );
}
