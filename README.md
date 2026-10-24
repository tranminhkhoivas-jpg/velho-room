# Velho Room

Hackathon prototype (Prompt Operations Hackathon, Oct 2026) for the Velho challenge: type any company, get live, source-backed tools that get Velho seen by — or into the room with — its leadership. Not published by Velho. Every outbound message is a draft; nothing is sent.

One shared research core (`lib/dossier.ts`: web search via OpenRouter, Finnish trade register PRH/YTJ, EU tenders TED, the company's own site) feeds 15 tools:

| # | Tool | What it makes |
|---|------|---------------|
| 1 | Automation check + Finnish AI index | 2-minute quiz with a personal result; live industry AI-adoption index |
| 2 | Viral campaign engine | 24 angles, pre-scored by a simulated CFO/COO/CEO panel, re-ranked by real thumbs |
| 3 | Proof before pitch | demo built on the prospect's own public data + "ask their website" assistant |
| 4 | Signals in public data | register changes, tenders, hiring, leadership news, "why now" score with citations |
| 5 | Trade fair companion | photo of a booth → 30-second brief + follow-up draft |
| 6 | Talk-to-pipeline | QR on a slide → audience result, Velho gets leads with meeting drafts |
| 7 | Buyer simulator | AI CFO from the real annual report; text or voice; pitch scored |
| 8 | Dead deal resurrector | stalled deals (synthetic CRM) + a real, current reason to reconnect |
| 9 | One-of-one media | per-company mini-report + printable postcard |
| 10 | Case-study machine | project notes (synthetic) → story, LinkedIn draft, one-pager |
| new | Ghost Employee | the manual work a company pays for, as a forwardable trading card |
| new | Hackathon-in-a-box | a 48-hour build-sprint brief written for that company |
| new | In Their Own Words | the exec's public quotes, linked, and an opener that answers them |
| new | Room Radar | where the execs will physically be, and how to get in that room |
| new | Luotsi Chart | the company's growth waters as a nautical chart |

## Run

Node 24+. Put `OPENROUTER_API_KEY` in `../../.env` (or the environment). Optional: `MODEL_FAST`, `MODEL_WRITE`, `VELHO_DB`.

```bash
npm install
npm run build && npm start
npm run smoke -- "Kesko"   # live test of every tool
```
