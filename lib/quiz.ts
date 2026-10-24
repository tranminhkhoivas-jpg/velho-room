// Shared by the public check page and the lead API.
export const QUIZ = [
  { q: "Your role?", a: ["CEO / founder", "CFO / finance", "COO / operations", "Sales / marketing", "Other"] },
  { q: "How many people work at your company?", a: ["1-49", "50-249", "250-999", "1000+"] },
  { q: "Where does your team lose the most hours each week?", a: ["Copying data between systems", "Reporting & spreadsheets", "Order / customer request handling", "Invoicing & reconciliation", "Scheduling & coordination", "Answering the same questions"] },
  { q: "How many of those hours, per person, per week?", a: ["< 2 h", "2-5 h", "5-10 h", "10 h+"] },
  { q: "What happened to your last automation or AI idea?", a: ["Nobody had time to build it", "We built it, nobody uses it", "IT backlog ate it", "It worked, we want more", "We haven't tried yet"] },
  { q: "If you got one day a week back, what would your team do?", a: ["Sell more", "Serve customers better", "Launch something new", "Fix the backlog", "Breathe"] },
] as const;

export function readiness(answers: number[]): number {
  // ponytail: transparent rule-of-thumb score, shown to the visitor as such
  const hours = [10, 30, 60, 90][answers[3]] ?? 30;
  const size = [20, 50, 70, 90][answers[1]] ?? 50;
  const history = [70, 60, 60, 90, 50][answers[4]] ?? 60;
  return Math.round(hours * 0.5 + size * 0.2 + history * 0.3);
}
