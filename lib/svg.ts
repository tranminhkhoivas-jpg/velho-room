import { esc } from "./types";

// Deterministic pseudo-random from a string so the same company always gets the same chart.
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

// Wrap text into lines of ~n chars for SVG <text>.
function wrap(s: string, n: number, max = 3): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of String(s).split(/\s+/)) {
    if ((line + " " + w).trim().length > n) {
      out.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) out.push(line.trim());
  if (out.length > max) out.splice(max, out.length, out[max - 1].replace(/.{0,2}$/, "…"));
  return out;
}

const tspans = (lines: string[], x: number, dy: number) => lines.map((l, i) => `<tspan x="${x}" dy="${i ? dy : 0}">${esc(l)}</tspan>`).join("");

export function ghostCard(
  company: string,
  g: { ghostName: string; title: string; tagline: string; tasks: { task: string; hoursPerWeek: number }[]; fte: number; eurPerYear: number },
): string {
  const tasks = g.tasks.slice(0, 6);
  const eur = Math.round(g.eurPerYear / 1000);
  const rows = tasks
    .map(
      (t, i) =>
        `<g transform="translate(36 ${318 + i * 40})"><rect width="408" height="32" rx="6" fill="#ffffff10"/><text x="12" y="21" font-size="13" fill="#e8eefc">${esc(wrap(t.task, 44, 1)[0])}</text><text x="396" y="21" font-size="13" fill="#9fc0ff" text-anchor="end">${esc(t.hoursPerWeek)} h/wk</text></g>`,
    )
    .join("");
  return `<svg viewBox="0 0 480 640" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, sans-serif" role="img" aria-label="Ghost employee card">
<defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a33"/><stop offset="1" stop-color="#1e3a6b"/></linearGradient></defs>
<rect width="480" height="640" rx="28" fill="url(#gb)"/><rect x="12" y="12" width="456" height="616" rx="20" fill="none" stroke="#9fc0ff55" stroke-width="2"/>
<text x="36" y="56" font-size="12" letter-spacing="3" fill="#9fc0ff">INVISIBLE HIRE · ${esc(company.toUpperCase().slice(0, 34))}</text>
<g transform="translate(240 150)" fill="#e8eefc"><path d="M-46 40 V-10 a46 46 0 0 1 92 0 V40 l-15 -12 -16 12 -15 -12 -15 12 -16 -12z" fill="#e8eefc" opacity=".92"/><circle cx="-16" cy="-6" r="7" fill="#0b1a33"/><circle cx="16" cy="-6" r="7" fill="#0b1a33"/><rect x="-14" y="10" width="28" height="6" rx="3" fill="#0b1a33"/></g>
<text x="240" y="232" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${esc(g.ghostName)}</text>
<text x="240" y="258" font-size="15" fill="#9fc0ff" text-anchor="middle">${esc(g.title)}</text>
<text x="240" y="286" font-size="13" fill="#c9d6f2" text-anchor="middle" font-style="italic">${tspans(wrap(`“${g.tagline}”`, 56, 1), 240, 16)}</text>
${rows}
<g transform="translate(36 ${330 + tasks.length * 40})"><text font-size="12" fill="#9fc0ff" letter-spacing="2">COSTS YOU (ESTIMATE)</text><text y="34" font-size="30" font-weight="700" fill="#fff">≈ ${esc(g.fte.toFixed(1))} FTE · €${esc(eur)}k / yr</text></g>
<text x="240" y="616" font-size="11" fill="#9fc0ff99" text-anchor="middle">Estimated from public evidence · Velho Room prototype</text>
</svg>`;
}

export function luotsiChart(
  company: string,
  c: { destination: string; rocks: { label: string }[]; lighthouses: { label: string }[]; currents: string[] },
): string {
  const r = rng(company);
  const W = 900,
    H = 560;
  // islands
  const islands = Array.from({ length: 9 }, () => {
    const x = 60 + r() * 780,
      y = 60 + r() * 440,
      s = 18 + r() * 40;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2,
        rr = s * (0.6 + r() * 0.6);
      return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr * 0.7).toFixed(1)}`;
    });
    return `<polygon points="${pts.join(" ")}" fill="#f1e3b5" stroke="#b9a46a" stroke-width="1.5"/>`;
  }).join("");
  // depth soundings
  const soundings = Array.from({ length: 40 }, () => `<text x="${(r() * W).toFixed(0)}" y="${(r() * H).toFixed(0)}" font-size="10" fill="#5d86b5">${(2 + r() * 30).toFixed(1)}</text>`).join("");
  // course from harbour (bottom-left) to destination (top-right)
  const start = { x: 90, y: 480 },
    end = { x: 790, y: 90 };
  const wps = [start, { x: 300, y: 380 + r() * 40 }, { x: 520, y: 250 + r() * 50 }, end];
  const course = `<polyline points="${wps.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#c0392b" stroke-width="3" stroke-dasharray="10 8"/>`;
  const rocks = c.rocks
    .slice(0, 5)
    .map((k, i) => {
      const t = (i + 1) / (Math.min(c.rocks.length, 5) + 1);
      const x = start.x + (end.x - start.x) * t + (i % 2 ? 60 : -70),
        y = start.y + (end.y - start.y) * t + (i % 2 ? 40 : -30);
      return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><text font-size="22" text-anchor="middle" fill="#1b2a41">✳</text><text y="22" font-size="13" text-anchor="middle" fill="#1b2a41" font-weight="600">${tspans(wrap(k.label, 20, 2), 0, 14)}</text></g>`;
    })
    .join("");
  const lights = c.lighthouses
    .slice(0, 4)
    .map((l, i) => {
      const x = 170 + i * 190,
        y = i % 2 ? 160 : 520;
      return `<g transform="translate(${x} ${y})"><path d="M-7 0 L-4 -30 H4 L7 0Z" fill="#fff" stroke="#c0392b" stroke-width="2"/><rect x="-5" y="-38" width="10" height="8" fill="#f4d03f"/><path d="M5 -34 L60 -50 L60 -18Z" fill="#f4d03f55"/><text x="12" y="14" font-size="12" fill="#7a5c00" font-weight="600">${tspans(wrap(l.label, 22, 2), 12, 13)}</text></g>`;
    })
    .join("");
  const currents = c.currents
    .slice(0, 3)
    .map((cu, i) => `<g transform="translate(${560 + i * 20} ${380 + i * 50})"><path d="M0 0 q20 -10 40 0 t40 0 t40 0" fill="none" stroke="#2e86c1" stroke-width="2"/><path d="M118 -4 l8 4 -8 4" fill="#2e86c1"/><text y="-8" font-size="11" fill="#2e86c1" font-style="italic">${esc(cu)}</text></g>`)
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Georgia, serif" role="img" aria-label="Nautical growth chart">
<rect width="${W}" height="${H}" fill="#d9ecf7"/><rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#1b2a41" stroke-width="3"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#1b2a41" stroke-width="1"/>
${soundings}${islands}${course}${currents}${rocks}${lights}
<g transform="translate(${start.x} ${start.y})"><circle r="9" fill="#1b2a41"/><text x="14" y="26" font-size="13" fill="#1b2a41" font-weight="700">${esc(company)} today</text></g>
<g transform="translate(${end.x} ${end.y})"><path d="M0 0 V-34 L24 -26 L0 -18" fill="#c0392b" stroke="#1b2a41" stroke-width="2"/><text x="-10" y="22" font-size="15" fill="#1b2a41" font-weight="700" text-anchor="end">${tspans(wrap(c.destination, 26, 2), -10, 16)}</text></g>
<g transform="translate(820 470)"><circle r="42" fill="#fff8" stroke="#1b2a41"/><path d="M0 -38 L7 0 L0 38 L-7 0Z" fill="#1b2a41"/><path d="M-38 0 L0 -6 L38 0 L0 6Z" fill="#1b2a4188"/><text y="-46" font-size="12" text-anchor="middle" fill="#1b2a41">N</text></g>
<text x="30" y="44" font-size="22" fill="#1b2a41" font-weight="700">Growth chart · ${esc(company)}</text>
<text x="30" y="64" font-size="12" fill="#1b2a41" font-style="italic">✳ rocks: bottlenecks from public evidence · lighthouses: quick wins · drawn by Velho Room</text>
</svg>`;
}
