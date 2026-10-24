// Live smoke test: every generator seed on a few companies. Usage: npm run smoke -- "Kesko" "Normet"
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
process.loadEnvFile("../../.env");
const { SEEDS, runSeed } = await import("../lib/seeds");
const { getSpend } = await import("../lib/db");

const companies = process.argv.slice(2).length ? process.argv.slice(2) : ["Kesko", "Normet", "Lumon"];
const start = getSpend();
let fail = 0;

// no code path may send anything: outbound is drafts only
const src = ["lib", "app", "components"].flatMap(function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
});
const sendy = src.filter((f) => /sendMail|nodemailer|smtp|api\.linkedin|slack\.com\/api/i.test(readFileSync(f, "utf8")));
if (sendy.length) (fail++, console.log("FAIL send code in", sendy));

async function one(id: string, input: Record<string, string>) {
  const t = Date.now();
  try {
    const a = await runSeed(id, input);
    const sources = a.blocks.filter((b) => b.t === "sources").flatMap((b) => (b.t === "sources" ? b.items : []));
    const ok = a.blocks.length > 1 && (sources.length > 0 || id === "caseStudy");
    if (!ok) fail++;
    console.log(`${ok ? "ok  " : "FAIL"} ${id.padEnd(10)} ${(input.company || input.dealId || input.noteId).padEnd(12)} ${a.blocks.length} blocks, ${sources.length} sources, ${((Date.now() - t) / 1000).toFixed(0)} s`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${id.padEnd(10)} ${input.company || ""} ${(e as Error).message}`);
  }
}

const ids = SEEDS.filter((s) => s.needsCompany).map((s) => s.id);
for (const company of companies) {
  console.log(`\n== ${company}`);
  await runSeed("signals", { company }).catch(() => null); // warm the shared dossier once
  await Promise.all(ids.map((id) => one(id, { company })));
}
console.log("\n== synthetic-data seeds");
await Promise.all([one("deadDeal", { dealId: "D01" }), one("caseStudy", { noteId: "P1" })]);
console.log(`\nspend this run: $${(getSpend() - start).toFixed(2)}, total: $${getSpend().toFixed(2)}, failures: ${fail}`);
process.exit(fail ? 1 : 0);
