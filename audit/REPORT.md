# Velho Room: employee audit and repair report

Audit date: 24 October 2026. Auditor: gpt-6.1-sol via Codex. Scope: Velho only.

All 15 methods were exercised. This is evidence that the workflows can run, not proof that all 15 will win customers. The remaining gaps concern source quality, real device use and measured buyer response. Every outbound item remains a draft for a Velho employee to review.

## What was tested

The employee journey was: sign in, research Kesko, select each tool, generate an artifact, inspect the evidence and draft, change company without accidentally reusing the previous result, and retry failures. Separate tasks covered a Finnish CFO exchange, a deliberately implausible English sales promise, scoring an improved pitch, real slide-photo recognition, a nonexistent company, all six synthetic project-note records, the public quiz through to the private staff lead list, duplicate quiz retries, narrow layouts and a full film export. Original cached examples were inspected separately from fresh Haiku responses.

Only `anthropic/claude-haiku-5.5` was allowed for both AI roles in the audit server. No expensive fallback was used. The provider-reported additional cost is **USD 0.6090 across 99 calls**, with no unconfirmed cost entries; details are in [spend-summary.json](spend-summary.json). The normal app defaults remain Haiku for research and Sonnet for writing; `npm run audit:serve` overrides both with Haiku for the user's chosen test configuration.

## Fifteen-method result matrix

“Functional pass” means the observed task completed and its relevant recovery checks passed. “Partial evidence” identifies a useful output whose business or factual claims still require review. Browser records are under [browser/](browser/); fresh outputs are `haiku-<tool>.json`.

| Method | Employee simulation and observed result | Fix and present limit |
|---|---|---|
| 1. Interactive site: quiz + industry index | Public visitor answered six questions and received a result; Finnish `rakentaminen` returned no examples. | Quiz functional pass. Invalid choices and missing acknowledgement are refused. Empty research now shows **Unknown**, not zero adoption. Index usefulness remains partial: the registry counts all TOL 41 companies, including inactive ones, and is not a measured national AI-adoption statistic. |
| 2. Viral campaign engine | Generated 24 angles; employee inspected simulated scores and thumbs. Initial runs truncated or produced only 22. | Four validated batches of six fix the count. Content-based identities stop new drafts inheriting unrelated old votes. AI panel scores are simulations, not observed engagement; marketing effectiveness is unmeasured. |
| 3. Proof before pitch | Extracted a public-data table; website assistant answered from the same selected pages and admitted absent internal information. | Shared page context fixes disagreement between the demo and chat. Functional pass; extracted rows and suggested automation still need review. It does not demonstrate access to internal systems. |
| 4. Signals in public data | Ranked dated public signals and produced an opener. Research refresh and nonexistent-company rejection exercised. | Current-name resolution, source-outage notices and stricter TED legal-name matching reduce wrong-company claims. Latest official dates take precedence. Functional pass with partial factual coverage: every generated inference is not independently verified. |
| 5. Trade fair companion | Haiku identified the supplied real Velho slide as Velho at 0.9 confidence; invalid images rejected; manual company entry available. | Recognition now prefills a name for employee confirmation before research; decode errors are caught. Functional file-upload path passes. Live phone-camera capture remains untested. Confidence is model output, not measured recognition accuracy. |
| 6. Talk-to-pipeline | Fictional visitor result appeared in staff leads; same submission retried without an extra lead; staff-only meeting draft absent from visitor response. | Password protection, transactional deduplication, contact email display, polling errors and talk-change reset. Functional pass. No calendar booking or real customer meeting was created. |
| 7. Buyer simulator | English CFO challenged a guaranteed 50% saving, responded to a measured pilot pitch and gave feedback; Finnish exchange passed. | Conversation resets on company changes, failed messages can be retried, scoring clears when the pitch changes, coaching rejects invented guarantees. Text path passes. Real microphone and speech recognition hardware remain untested; the persona's willingness to meet is fictional. |
| 8. Dead deal resurrector | Selected synthetic D01, compared current signals with last contact and generated reconnection draft. | Score defaults corrected; synthetic label retained in copied drafts. Functional pass. Only fictional CRM history was used; actual relationship context is not established. |
| 9. One-of-one media | Report and postcard generated; final export has H.264 1920×1080 plus AAC, 30.016 seconds. Three simultaneous identical renders shared one job. | Asynchronous status polling avoids long tunnel requests; atomic final files and queue avoid partial downloads/port clashes. Incomplete JSON examples corrected after a final-pass failure, then two fresh retries passed. Reading holds increased and harsh flashes removed. Visual comfort still benefits from a human viewing the film. |
| 10. Case-study machine | All P1–P6 synthetic note records generated stories and drafts. P3 contains inconsistent sample counts. | No invented zero baseline or copied baseline volume in “After”; P3 extraction accuracy is withheld as unverified. Functional pass. Source notes are synthetic and results cannot be presented as Velho client proof. The inconsistency detector covers the supplied pattern, not all possible contradictory notes. |
| 11. Ghost Employee | Initial hours were returned as strings; final card renders estimated staffing and annual cost. | Normalize purely numeric hours, compute totals in code using 37.5 hours/week and EUR 55,000/FTE/year. Math is verified; task hours are hypotheses and cannot be claimed as measured savings. |
| 12. Hackathon-in-a-box | Produced a company-specific sprint brief and invitation draft. | Validation, source caveats and company reset apply. Functional pass. Feasibility, scope, staff availability and internal data access need a discovery conversation. |
| 13. In Their Own Words | Found original-language quotations, fetched original pages and kept only exact normalized text matches. | Unmatched quotations are omitted; no quote opener if none can be verified. Drafting receives only matched quotations. Functional pass with partial attribution/date evidence: text matching alone cannot prove who spoke or when. |
| 14. Room Radar | Produced dated events and a pre-event approach. | Estimated/undated events moved to an unconfirmed watchlist; drafts ask whether the buyer attends. Functional pass. An industry event is not evidence that Kesko will attend. Check dates and actual attendees before planning travel. |
| 15. Luotsi Chart | Nautical SVG chart rendered at desktop and narrow width, with sourced goals and suggested obstacles. | SVG text wrapping fixed; safe code-built SVG only. Functional pass. Rocks and recommended routes are conversation hypotheses, not a diagnosis of the business. |

## Highest-impact findings and chosen remedies

1. **Private employee material was accessible publicly.** Added signed, expiring staff sessions and route protection, same-origin mutation checks, sign-out and basic login throttling. Public quiz visitors cannot read the lead list or staff meeting drafts. This is one shared-password prototype, not a multi-user enterprise identity system.
2. **A retry could create duplicate leads or expose the staff draft.** Added a persistent idempotency record plus transaction and in-flight deduplication. Validated answers, consent acknowledgement and bounded fields before AI calls. Visitor processing notice explains what reaches OpenRouter and what stays locally.
3. **Bad AI output could break a screen or enter the cache.** Validate blocks and URLs, remove provider citation markup, reject truncated or malformed output and retain helpful regenerate errors. No silent paid retry or model upgrade. A final media failure exposed incomplete JSON examples in prompts; these were corrected and repeated successfully.
4. **A previous company's result could remain visible.** Clear artifacts, chat and film state when the employee changes the company or selected record; guard late responses. Refresh research invalidates dependent company artifacts. Cached generators now use `review-v3` and dossiers require TED matching version 2, preventing reuse of affected old claims.
5. **Numbers looked more certain than evidence allowed.** Compute ghost arithmetic in code, show missing AI-index evidence as unknown, flag the supplied contradictory case statistic and distinguish source outages from an empty result. Simulated panel scores, estimated hours and fictional CRM/project notes are explicitly labelled.
6. **Public evidence was being overinterpreted.** Prefer current official leadership appointments and newer dated announcements; use full legal names for TED parties, show the actual matched party and require legal-identity/lot review. An award to “Kesko AB” is not proof of one to “Kesko Oyj”; a substring hit is insufficient. Outreach prompts forbid invented Velho past experience and ask about unconfirmed workload.
7. **Large campaigns and video renders were unreliable under real conditions.** Batch the 24 angles; serialize media jobs, return progress immediately and serve only finished files. Render timing and source/hypothesis labels are clearer. The same existing stack handles this without new paid services.
8. **An employee could lose time on unclear errors.** Bounded inputs, image validation before decoding, useful session/timeout messages, explicit clipboard fallback, poll failure notices, and stable retry behavior replace silent failures.

## Source spot checks

These are sampled verification, not an audit of every generated statement.

- A saved leadership claim used an older partner article. Kesko's [3 March 2026 appointment notice](https://www.kesko.fi/en/media/news-and-releases/press-releases/2026/jan-erik-fredriksson-appointed-keskos-chief-information-officer-cio/) names Jan-Erik Fredriksson as CIO by August, reporting to CFO Anu Hämäläinen. Research instructions now prefer current official appointment evidence.
- The [15 June Dahl announcement](https://www.kesko.fi/en/media/news-and-releases/stock-exchange-releases/2026/inside-information-kesko-to-strengthen-its-technical-trade-by-acquiring-dahls-operations-in-sweden-norway-and-denmark/) originally expected closing in early 2027. The newer [8 October EGM notice](https://www.kesko.fi/en/media/news-and-releases/stock-exchange-releases/2026/notice-of-kesko-corporations-extraordinary-general-meeting/) updated the expectation to end-2026. The apparent discrepancy is a dated update, not grounds to overwrite the newer date with the older one.
- [Slush](https://slush.org/) lists 18–19 November 2026. This does not confirm Kesko attendance. Event pages can mix current dates and older speaker lists.
- Kesko's [Q1 CEO discussion](https://www.kesko.fi/en/media/blogs/investor-blogs-and-podcasts/2026/president-and-ceo-rauhala-q1/) supports the sampled sales/profit direction. A strategic paraphrase in the film is labelled as a paraphrase.
- The official TED response contained separate legal entities and multiple winners. Matching was tightened and the matched name is now included in each retained item; the notice still needs manual lot/identity review.

## Evidence and repeatable commands

Run from `velho/app` after installing dependencies and setting root `.env` `OPENROUTER_API_KEY` and ignored app `.env.local` `VELHO_STAFF_PASSWORD`. Never paste values into reports.

```powershell
npm run audit:regression
npm run typecheck
npm run build
npm run audit:serve
# Separate terminal; live flag spends provider credit:
node node_modules/tsx/dist/cli.mjs scripts/audit-http.ts --live --fresh-only
node node_modules/tsx/dist/cli.mjs scripts/audit-extra.ts photo cfo edge notes index
node node_modules/tsx/dist/cli.mjs scripts/audit-render.ts
# Use the current approved tunnel URL, not a stale saved URL:
$env:AUDIT_URL='https://dpi-left-procedures-coordination.trycloudflare.com'
node node_modules/tsx/dist/cli.mjs scripts/audit-http.ts
```

- Offline regression: **23/23 pass**. Controlled provider responses test failure handling and database effects; these are not live-model results.
- Final fresh Haiku suite: **21/21 pass**, see [http-live-results.json](http-live-results.json). The previous pass was 20/21 due to media JSON; preserved in [pre-final-http-live-results.json](pre-final-http-live-results.json). Its two repaired media retries passed in [extra-media-results.json](extra-media-results.json).
- Public internet suite: **18/18 pass**, see [http-public-results.json](http-public-results.json); checks include all 13 generators, sign-in/access checks, invalid input and staff leads.
- Earlier varied notes and empty-index checks: [extra-results.json](extra-results.json). Real-photo/CFO/identity examples: [first-extra-results.json](first-extra-results.json); it intentionally retains the earlier failed 22-angle campaign evidence.
- Film: [employee-film.mp4](employee-film.mp4), [contact sheet](film-contact-sheet.jpg), [render-results.json](render-results.json). Final composition v6, three submissions shared one job, export ready in about 79 seconds. Codec/duration inspected with ffprobe.
- Browser: every tool's output inspected, plus public quiz and staff pipeline. Thirteen generator layouts measured **469 CSS pixels**, no horizontal overflow (`mobile-checks.json`). A later desktop view measured 1265 CSS pixels. The requested 390-pixel setting did not produce a verified 390-pixel viewport; exact 390 behavior is not certified.
- Type checking and production build pass. A Windows build-directory permission failure while a server was active was resolved by stopping the server and building with the existing host permissions; it was not a passing build.

## What is still open

Real microphone capture, a live phone-camera capture, exact 390-pixel behavior and cross-application clipboard transfer need manual device checks. The Copy button resolved successfully, but the automation tool's virtual clipboard stayed empty, so clipboard transfer is not certified. Browser screenshots were captured through the in-app browser, not a separate Playwright process.

Company source accuracy is sampled; no claim of universally correct research is made. Finnish conversational coverage passed, but the whole interface and every artifact are not fully localized. Empty Finnish index evidence remains unknown, rather than being made up. No real posts, email, outreach, calendar booking, conversion or meetings were produced. Permission and a real pilot are necessary to establish those outcomes.

## Handoff and data boundaries

The approved temporary link is https://dpi-left-procedures-coordination.trycloudflare.com. Staff password is stored only in ignored `velho/app/.env.local`. Laptop and tunnel must remain running; the address changes if the tunnel restarts. Only the sign-in page and audience quiz are public.

The audit launcher backs up the existing SQLite file into `audit/audit.db` once; subsequent runs reuse the audit copy. Original business records/cache were preserved. An early build may have initialized an empty audit-ledger table in the original database; it is not claimed byte-for-byte untouched. Lazy database setup now prevents build workers opening it. New audit leads are fictional contacts.

Changes are local and uncommitted; the existing public repository has not been updated by this audit. Databases, secrets, response logs and generated MP4s are ignored by Git. Do not publish audit records or real company/contact data without review.

F-007 recommends Promptfoo for repeatable cases and Langfuse for traces. The concrete Velho job here is comparing expected employee behavior with model output, cost and database effects. The existing TypeScript runner and local SQLite ledger already provide the needed checks and are the simpler alternative for this audit; neither extra service was installed.
