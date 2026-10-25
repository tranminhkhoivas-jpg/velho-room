"use client";

import { useRef, useState } from "react";

import { QUIZ } from "@/lib/quiz";

import { post } from "./api";

import type {QuizContext} from "@/lib/lead-work";

type Result = { pending?:boolean; score: number; headline: string; ideas: { title: string; how: string; hoursBack: string }[]; firstStep: string;explanation?:string;proposalReview?:string };

// Public "What could we automate?" check (seed 1; seed 6 adds a talk tag)

export function Quiz({ talk = "" }: { talk?: string }) {

  const [answers, setAnswers] = useState<number[]>([]);

  const [who, setWho] = useState({ name: "", company: "", email: "" });

  const [res, setRes] = useState<Result | null>(null);

  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState("");

  const [consent, setConsent] = useState(false);

  const [context,setContext]=useState<QuizContext>({task:"",constraints:"",people:null,weeklyHours:null,intent:"result-only",contactPermission:false});

  const requestId = useRef("");

  const done = QUIZ.every((_, i) => answers[i] !== undefined);

  async function submit() {

    setBusy(true);

    setErr("");

    try {

      if (!requestId.current) requestId.current = crypto.randomUUID();

      setRes(await post<Result>("/api/lead", { talk, ...who, answers, consent,context }, { "Idempotency-Key": requestId.current }));

    } catch (e) {

      setErr((e as Error).message);

    }

    setBusy(false);

  }

  if (res)

    return (

      <div className="card">

        <p className="muted">Answer-based opportunity indicator (rule of thumb)</p>

        <h2 style={{ marginTop: 0 }}>

          {res.score}/100 — {res.headline}

        </h2>

        {err&&<p role="alert" className="err">{err}</p>}
        {res.pending&&<button disabled={busy} onClick={submit}>{busy?"Retrying…":"Retry personalised result"}</button>}

        {res.ideas.map((i) => (

          <div key={i.title} className="card">

            <b>{i.title}</b> <span className="tag">{i.hoursBack}</span>

            <p style={{ margin: "4px 0 0" }}>{i.how}</p>

          </div>

        ))}

        <p>

          <b>Try this week:</b> {res.firstStep}

        </p>

        {res.explanation&&<p className="note">{res.explanation}</p>}

        {res.proposalReview&&<p className="note">{res.proposalReview}</p>}

        <p>No message was sent. This score does not establish purchase intent, budget or feasibility.</p>

        <button className="ghost" onClick={() => { setRes(null); requestId.current = ""; }}>Change my answers</button>

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

        <h3>Make the suggestions useful (optional)</h3>

        <label>One repetitive task, including where the information starts and ends <textarea maxLength={1000} value={context.task} onChange={e=>setContext({...context,task:e.target.value})} style={{width:"100%"}}/></label>

        <label>Constraints: data access, privacy, systems or things that must stay manual <textarea maxLength={1000} value={context.constraints} onChange={e=>setContext({...context,constraints:e.target.value})} style={{width:"100%"}}/></label>

        <div className="row"><label>People doing this task <input type="number" min={1} max={100000} value={context.people??""} onChange={e=>setContext({...context,people:e.target.value===""?null:Number(e.target.value)})}/></label><label>Hours per person per week (self-reported) <input type="number" min={0} max={168} step="any" value={context.weeklyHours??""} onChange={e=>setContext({...context,weeklyHours:e.target.value===""?null:Number(e.target.value)})}/></label></div>

        <p>Leave unknown values empty. These inputs are workload estimates, not measured savings.</p>

      </div>

      <div className="card">

        <b>Optional: contact details for a possible follow-up</b>

        <div className="row" style={{ marginTop: 8 }}>

          <input aria-label="Name (optional)" placeholder="Name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />

          <input aria-label="Company (optional)" placeholder="Company" value={who.company} onChange={(e) => setWho({ ...who, company: e.target.value })} />

          <input aria-label="Email (optional)" placeholder="Email" type="email" value={who.email} onChange={(e) => {setWho({ ...who, email: e.target.value });setContext({...context,contactPermission:false});}} />

        </div>

        <label>What would you like next? <select value={context.intent} onChange={e=>setContext({...context,intent:e.target.value as QuizContext["intent"],contactPermission:false})}><option value="result-only">Just my result</option><option value="explore">Explore an idea</option><option value="meeting">Discuss a meeting</option></select></label>

        <label style={{display:"block"}}><input type="checkbox" disabled={!who.email||context.intent==="result-only"} checked={context.contactPermission} onChange={e=>setContext({...context,contactPermission:e.target.checked})}/> Velho may use the email above to follow up about this request (optional).</label>

        <p className="muted" style={{ fontSize: 13 }}>Your answers, task, constraints and company name go to an AI provider through OpenRouter to create this result. Your task context and generated suggestions may also go to Fastino to check whether suggestions respect your stated limits. Answers and optional contact details are stored on the demo laptop for Velho staff to review. No email is sent. Use fictional contact details and approved sample tasks in this prototype.</p>

        <label><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I understand how this prototype processes my answers.</label>

      </div>

      {err && <p role="alert" className="err">{err}</p>}

      <button disabled={!done || !consent || busy} onClick={submit}>

        {busy ? "Thinking…" : "Show my result"}

      </button>

    </div>

  );

}

