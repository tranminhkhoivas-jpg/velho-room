export type WorkTask = { task: string; hours: number; recoverable: number; basis: "hypothesis" | "employee estimate" | "measured sample"; evidence: string };
export function workload(tasks: WorkTask[], hourlyCost: number, annualRunningCost: number) {
  if (!Number.isFinite(hourlyCost) || hourlyCost < 0 || hourlyCost > 10000 || !Number.isFinite(annualRunningCost) || annualRunningCost < 0 || annualRunningCost > 1e9) throw new Error("Enter valid non-negative costs.");
  if (!tasks.length || tasks.length > 50) throw new Error("Enter 1–50 tasks.");
  for (const t of tasks) {
    if (!t.task.trim() || !Number.isFinite(t.hours) || t.hours < 0 || t.hours > 168 || !Number.isFinite(t.recoverable) || t.recoverable < 0 || t.recoverable > 100 || !["hypothesis","employee estimate","measured sample"].includes(t.basis)) throw new Error("Each task needs a name, 0–168 weekly hours and 0–100% recoverable time.");
    if (t.basis === "measured sample" && !t.evidence.trim()) throw new Error("Describe the measurement sample before marking a task measured.");
  }
  const baselineHours = tasks.reduce((s,t)=>s+t.hours,0);
  const recoveredHours = tasks.reduce((s,t)=>s+t.hours*t.recoverable/100,0);
  const annualCapacity = recoveredHours * 52 * hourlyCost;
  return {baselineHours,recoveredHours,annualCapacity,annualRunningCost,netCapacity:annualCapacity-annualRunningCost,fteEquivalent:recoveredHours/37.5};
}
