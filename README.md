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

Staff access requires `VELHO_STAFF_PASSWORD` in ignored `.env.local`; never commit passwords. The audience questionnaire is public; company tools and lead reads require staff sign-in. Set `FASTINO_API_KEY` in the root `.env` for extraction/source/constraint checks. Missing or uncertain source checks are labelled; they never approve outreach. Keep fictional fixtures clearly labelled. Velho's representative endorsed the supplied fictional sales-history and project-note data for the demo.

Optional annual-report fallback: Python with `pypdf` (`pip install pypdf`), and `VELHO_PDF_PYTHON` set to that Python executable if it is not `python` on PATH. The app first tries its existing web reader, then locally extracts the first 60 pages of an observed publisher-hosted PDF (25 MB maximum). If neither reader works, the buyer simulation explicitly uses dossier-only context. No OCR or scanned-PDF guarantee is claimed.

Current improvement evaluation covers 14 methods; personalised media/video is deferred by the user. Nothing is published or sent. For the isolated Haiku test instance use `npm run audit:serve`; do not expose it publicly without authorization. Tests and current limits are recorded in `audit/IMPROVEMENT_PLAN.md` and the project master doc.

```bash
npm install
npm run build && npm start
npm run smoke -- "Kesko"   # live test of every tool
```
