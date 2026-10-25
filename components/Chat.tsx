"use client";
import { useEffect, useRef, useState } from "react";
import { post } from "./api";

type M = { role: "user" | "assistant"; content: string };
type Score = { score: number; strengths: string[]; fixes: string[]; bestLine: string;rubric?:{id:string;label:string;points:number;quote:string;reason:string}[];notice?:string;sourceContext?:{reportAvailable:boolean;reportUrl:string|null;researched:string;note?:string} };

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
  const [listening, setListening] = useState(false);
  useEffect(() => () => { rec.current?.abort(); speechSynthesis?.cancel(); }, []);

  async function send(content: string, speak = voice) {
    if (!content.trim() || busy) return;
    setScore(null);
    const next: M[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setErr("");
    try {
      const { reply } = await post<{ reply: string }>("/api/chat", { mode, company, messages: next });
      setMsgs([...next, { role: "assistant", content: reply }]);
      if (speak && "speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
    } catch (e) {
      setMsgs(msgs); setText(content);
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function listen() {
    const W = window as AnyRec;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return setErr("Voice input needs Chrome or Edge.");
    if (listening) { rec.current?.stop(); return; }
    setErr(""); setVoice(true);
    const r = new SR();
    r.lang = navigator.language.startsWith("fi") ? "fi-FI" : "en-US";
    // pass speak=true: this closure still sees the old voice=false
    r.onresult = (e: AnyRec) => send(e.results[0][0].transcript, true);
    r.onerror = (e: AnyRec) => setErr("Voice input failed: " + e.error + (e.error === "not-allowed" ? " (allow the microphone)" : ""));
    r.onend = () => setListening(false);
    try { r.start(); setListening(true); } catch { setErr("Microphone could not start. Type your pitch below."); }
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
      {err && <p role="alert" className="err">{err}</p>}
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
              {listening ? "Stop listening" : "🎤 Speak"}
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
          <p className="note">{score.notice||"Subjective practice feedback, not a real buyer's decision."}</p>
          {score.sourceContext&&<p>Report context: {score.sourceContext.reportAvailable?"readable excerpt available":"unavailable — dossier only"}. {score.sourceContext.reportUrl&&<a href={score.sourceContext.reportUrl} target="_blank" rel="noreferrer">Inspect report source</a>}</p>}
          {score.sourceContext?.note&&<p className="note">{score.sourceContext.note}</p>}
          {score.rubric&&<ul>{score.rubric.map(c=><li key={c.id}><b>{c.label}: {c.points}/4</b><br/>{c.quote&&<q>{c.quote}</q>} {c.reason}</li>)}</ul>}
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
