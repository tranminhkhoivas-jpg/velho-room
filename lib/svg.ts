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
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/.{0,2}$/, "…"); }
  return out;
}

const tspans = (lines: string[], x: number, dy: number) => lines.map((l, i) => `<tspan x="${x}" dy="${i ? dy : 0}">${esc(l)}</tspan>`).join("");

const tspans2 = (lines: string[], x: number, y: number, dy: number) => lines.map((l, i) => `<tspan x="${x}" y="${y + i * dy}">${esc(l)}</tspan>`).join("");
const tspansAt2 = (lines: string[], x: number) => (lines.length > 1 ? tspans2(lines, x, 14, 13) : tspans2(lines, x, 21, 0));

export function ghostCard(
  company: string,
  g: { ghostName: string; title: string; tagline: string; tasks: { task: string; hoursPerWeek: number }[]; fte: number; eurPerYear: number; basisLabel?:string; costLabel?:string },
): string {
  const tasks = g.tasks.slice(0, 6);
  const eur = Math.round(g.eurPerYear / 1000);
  const rows = tasks
    .map(
      (t, i) =>
        `<g transform="translate(36 ${318 + i * 40})"><rect width="408" height="32" rx="6" fill="#ffffff10"/><text font-size="${wrap(t.task, 46, 2).length>1?11.5:13}" fill="#e8eefc">${tspansAt2(wrap(t.task, 46, 2), 12)}</text><text x="396" y="21" font-size="13" fill="#9fc0ff" text-anchor="end">${esc(t.hoursPerWeek)} h/wk</text></g>`,
    )
    .join("");
  return `<svg viewBox="0 0 480 640" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, sans-serif" role="img" aria-label="Ghost employee card">
<defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a33"/><stop offset="1" stop-color="#1e3a6b"/></linearGradient></defs>
<rect width="480" height="640" rx="28" fill="url(#gb)"/><rect x="12" y="12" width="456" height="616" rx="20" fill="none" stroke="#9fc0ff55" stroke-width="2"/>
<text x="36" y="56" font-size="12" letter-spacing="3" fill="#9fc0ff">INVISIBLE HIRE · ${esc(company.toUpperCase().slice(0, 34))}</text>
<g transform="translate(240 150)" fill="#e8eefc"><path d="M-46 40 V-10 a46 46 0 0 1 92 0 V40 l-15 -12 -16 12 -15 -12 -15 12 -16 -12z" fill="#e8eefc" opacity=".92"/><circle cx="-16" cy="-6" r="7" fill="#0b1a33"/><circle cx="16" cy="-6" r="7" fill="#0b1a33"/><rect x="-14" y="10" width="28" height="6" rx="3" fill="#0b1a33"/></g>
<text x="240" y="232" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${esc(g.ghostName)}</text>
<text font-size="14" fill="#9fc0ff" text-anchor="middle">${tspans2(wrap(g.title, 50, 2), 240, 254, 16)}</text>
<text x="240" y="298" font-size="13" fill="#c9d6f2" text-anchor="middle" font-style="italic">${tspans(wrap(`“${g.tagline}”`, 56, 1), 240, 16)}</text>
${rows}
<g transform="translate(36 ${330 + tasks.length * 40})"><text font-size="12" fill="#9fc0ff" letter-spacing="2">${esc(g.costLabel||"ILLUSTRATIVE COST (ESTIMATE)")}</text><text y="34" font-size="30" font-weight="700" fill="#fff">≈ ${esc(g.fte.toFixed(1))} FTE · €${esc(eur)}k / yr</text></g>
<text x="240" y="616" font-size="11" fill="#9fc0ff99" text-anchor="middle">${esc(g.basisLabel||"Estimated from public evidence · Velho Room prototype")}</text>
</svg>`;
}

// Collision-aware layout: each label is put in the nearest free spot, so text never sits on text, the course line, islands,
// the compass or the frame. Decoration (islands, soundings) is added last and only where nothing else is. Widths are estimated per character.
type Box = { x: number; y: number; w: number; h: number };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const tw = (lines: string[], px: number) => Math.max(1, ...lines.map((l) => l.length)) * px * 0.6;
const tspansAt = (lines: string[], x: number, y: number, dy: number) => lines.map((l, i) => `<tspan x="${x.toFixed(0)}" y="${(y + i * dy).toFixed(0)}">${esc(l)}</tspan>`).join("");

export function luotsiChart(
  company: string,
  c: { destination: string; rocks: { label: string }[]; lighthouses: { label: string }[]; currents: string[] },
): string {
  const r = rng(company);
  const W = 900,
    H = 560,
    M = 24;
  const occ: Box[] = [];
  const free = (b: Box) => b.x >= M && b.y >= M && b.x + b.w <= W - M && b.y + b.h <= H - M && !occ.some((o) => hit(o, b));
  // Nearest free top-left corner to the preferred one, searching outwards in rings; reserves it.
  const place = (w: number, h: number, px: number, py: number): Box => {
    for (let rad = 0; rad <= 520; rad += 10)
      for (let k = 0; k < (rad ? 32 : 1); k++) {
        const a = (k / 32) * Math.PI * 2;
        const b = { x: Math.round(px + Math.cos(a) * rad), y: Math.round(py + Math.sin(a) * rad * 0.8), w, h };
        if (free(b)) return (occ.push(b), b);
      }
    const b = { x: Math.max(M, Math.min(W - M - w, px)), y: Math.max(M, Math.min(H - M - h, py)), w, h };
    return (occ.push(b), b);
  };

  const start = { x: 90, y: 470 },
    end = { x: 790, y: 100 };
  const wps = [start, { x: 300, y: 370 + r() * 40 }, { x: 520, y: 250 + r() * 50 }, end];
  // Reserved first: title block, compass, harbour and flag symbols, and the course line (sampled).
  occ.push({ x: 0, y: 0, w: 640, h: 80 }, { x: 765, y: 410, w: 110, h: 110 }, { x: start.x - 14, y: start.y - 14, w: 28, h: 28 }, { x: end.x - 6, y: end.y - 40, w: 38, h: 46 });
  for (let k = 0; k < wps.length - 1; k++) {
    const a = wps[k],
      b = wps[k + 1],
      n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
    for (let j = 0; j <= n; j++) occ.push({ x: a.x + ((b.x - a.x) * j) / n - 14, y: a.y + ((b.y - a.y) * j) / n - 14, w: 28, h: 28 });
  }
  const course = `<polyline points="${wps.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#c0392b" stroke-width="3" stroke-dasharray="10 8"/>`;

  const sl = `${company} today`;
  const sb = place(tw([sl], 13) + 6, 18, start.x + 14, start.y + 6);
  const startLabel = `<text x="${sb.x}" y="${sb.y + 13}" font-size="13" fill="#1b2a41" font-weight="700">${esc(sl)}</text>`;

  const dl = wrap(c.destination, 30, 5);
  const dw = tw(dl, 15) + 6;
  const db = place(dw, dl.length * 17 + 4, end.x - 14 - dw, end.y + 10);
  const destLabel = `<text font-size="15" fill="#1b2a41" font-weight="700">${tspansAt(dl, db.x, db.y + 14, 17)}</text>`;

  const rocks = c.rocks
    .slice(0, 5)
    .map((k, i, all) => {
      const t = (i + 1) / (all.length + 1);
      const lines = wrap(k.label, 26, 4);
      const w = Math.max(30, tw(lines, 13) + 4),
        h = 24 + 14 * lines.length;
      const b = place(w, h, start.x + (end.x - start.x) * t + (i % 2 ? 50 : -60) - w / 2, start.y + (end.y - start.y) * t + (i % 2 ? 30 : -30) - h / 2);
      const cx = b.x + w / 2;
      return `<text x="${cx.toFixed(0)}" y="${b.y + 18}" font-size="20" text-anchor="middle" fill="#1b2a41">✳</text><text font-size="13" text-anchor="middle" fill="#1b2a41" font-weight="600">${tspansAt(lines, cx, b.y + 34, 14)}</text>`;
    })
    .join("");
  const lights = c.lighthouses
    .slice(0, 4)
    .map((l, i) => {
      const lines = wrap(l.label, 28, 4);
      const w = Math.max(80, tw(lines, 12) + 6),
        h = 50 + 14 * lines.length;
      const b = place(w, h, 150 + i * 190, i % 2 ? 130 : 400);
      const ox = b.x + 10,
        oy = b.y + 40; // tower base
      return `<g><path d="M${ox - 7} ${oy} L${ox - 4} ${oy - 30} H${ox + 4} L${ox + 7} ${oy}Z" fill="#fff" stroke="#c0392b" stroke-width="2"/><rect x="${ox - 5}" y="${oy - 38}" width="10" height="8" fill="#f4d03f"/><path d="M${ox + 5} ${oy - 34} L${ox + 40} ${oy - 44} L${ox + 40} ${oy - 22}Z" fill="#f4d03f88"/><text font-size="12" fill="#7a5c00" font-weight="600">${tspansAt(lines, b.x, oy + 16, 13)}</text></g>`;
    })
    .join("");
  const currents = c.currents
    .slice(0, 3)
    .map((cu, i) => {
      const lines = wrap(cu, 34, 3);
      const w = Math.max(130, tw(lines, 11) + 4),
        h = 13 * lines.length + 16;
      const b = place(w, h, 540 + i * 10, 300 + i * 52);
      const wy = b.y + 13 * lines.length + 8;
      return `<g><text font-size="11" fill="#2e86c1" font-style="italic">${tspansAt(lines, b.x, b.y + 11, 13)}</text><g transform="translate(${b.x} ${wy})"><path d="M0 0 q20 -8 40 0 t40 0 t40 0" fill="none" stroke="#2e86c1" stroke-width="2"/><path d="M118 -4 l8 4 -8 4" fill="#2e86c1"/></g></g>`;
    })
    .join("");

  const islands: string[] = [];
  for (let tries = 0; tries < 90 && islands.length < 9; tries++) {
    const x = 60 + r() * 780,
      y = 60 + r() * 440,
      s = 18 + r() * 40;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2,
        rr = s * (0.6 + r() * 0.6);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7];
    });
    const xs = pts.map((q) => q[0]),
      ys = pts.map((q) => q[1]);
    const box = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, h: Math.max(...ys) - Math.min(...ys) + 8 };
    if (!free(box)) continue;
    occ.push(box);
    islands.push(`<polygon points="${pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}" fill="#f1e3b5" stroke="#b9a46a" stroke-width="1.5"/>`);
  }
  const soundings: string[] = [];
  for (let tries = 0; tries < 200 && soundings.length < 34; tries++) {
    const x = r() * W,
      y = r() * H;
    const box = { x: x - 2, y: y - 11, w: 28, h: 14 };
    if (!free(box)) continue;
    occ.push(box);
    soundings.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-size="10" fill="#5d86b5">${(2 + r() * 30).toFixed(1)}</text>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Georgia, serif" role="img" aria-label="Nautical growth chart">
<rect width="${W}" height="${H}" fill="#d9ecf7"/><rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#1b2a41" stroke-width="3"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#1b2a41" stroke-width="1"/>
${soundings.join("")}${islands.join("")}${course}${currents}${rocks}${lights}
<circle cx="${start.x}" cy="${start.y}" r="9" fill="#1b2a41"/>${startLabel}
<g transform="translate(${end.x} ${end.y})"><path d="M0 0 V-34 L24 -26 L0 -18" fill="#c0392b" stroke="#1b2a41" stroke-width="2"/></g>${destLabel}
<g transform="translate(820 470)"><circle r="42" fill="#fff8" stroke="#1b2a41"/><path d="M0 -38 L7 0 L0 38 L-7 0Z" fill="#1b2a41"/><path d="M-38 0 L0 -6 L38 0 L0 6Z" fill="#1b2a4188"/><text y="-46" font-size="12" text-anchor="middle" fill="#1b2a41">N</text></g>
<text x="30" y="44" font-size="22" fill="#1b2a41" font-weight="700">Growth chart · ${esc(company)}</text>
<text x="30" y="64" font-size="12" fill="#1b2a41" font-style="italic">✳ rocks: questions to test · lighthouses: quick wins · drawn by Velho Room</text>
</svg>`;
}
