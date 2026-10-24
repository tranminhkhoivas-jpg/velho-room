"use client";
import { useState } from "react";
import { QUIZ } from "@/lib/quiz";
import { post } from "./api";

type Result = { score: number; headline: string; ideas: { title: string; how: string; hoursBack: string }[]; firstStep: string };

// Public "What could we automate?" check (seed 1; seed 6 adds a talk tag)
export function Quiz({ talk = "" }: { talk?: string }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [who, setWho] = useState({ name: "", company: "", email: "" });
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const done = QUIZ.every((_, i) => answers[i] !== undefined);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      setRes(await post<Result>("/api/lead", { talk, ...who, answers }));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  if (res)
    return (
      <div className="card">
        <p className="muted">Your automation readiness (rule-of-thumb estimate)</p>
        <h2 style={{ marginTop: 0 }}>
          {res.score}/100 — {res.headline}
        </h2>
        {res.ideas.map((i) => (
          <div key={i.title} className="card">
            <b>{i.title}</b> <span className="tag">{i.hoursBack} (estimate)</span>
            <p style={{ margin: "4px 0 0" }}>{i.how}</p>
          </div>
        ))}
        <p>
          <b>Try this week:</b> {res.firstStep}
        </p>
      </div>
    );

  return (
    <div>
      {QUIZ.map((q, i) => (
        <div key={q.q} className="card">
          <b>
            {i + 1}. {q.q}
          </b>
          <div className="row" style={{ marginTop: 8 }}>
            {q.a.map((a, j) => (
              <button key={a} type="button" className={answers[i] === j ? "" : "ghost"} onClick={() => setAnswers((p) => Object.assign([...p], { [i]: j }))}>
                {a}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="card">
        <b>Optional: where should the result go?</b>
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="Name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
          <input placeholder="Company" value={who.company} onChange={(e) => setWho({ ...who, company: e.target.value })} />
          <input placeholder="Email" type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Hackathon prototype: answers are stored on the demo laptop only, never sent anywhere.</p>
      </div>
      {err && <p className="err">{err}</p>}
      <button disabled={!done || busy} onClick={submit}>
        {busy ? "Thinking…" : "Show my result"}
      </button>
    </div>
  );
}
