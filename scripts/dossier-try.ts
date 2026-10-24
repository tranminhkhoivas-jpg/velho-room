process.loadEnvFile("../../.env");
const { getDossier, dossierBrief } = await import("../lib/dossier");
const { getSpend } = await import("../lib/db");
for (const q of process.argv.slice(2)) {
  const t = Date.now();
  const d = await getDossier(q, true);
  console.log(dossierBrief(d).slice(0, 2500), `\n[${((Date.now() - t) / 1000).toFixed(1)}s]\n=====`);
}
console.log("spend $", getSpend().toFixed(3));
export {};
