// Synthesises the video's 30 s score (public/velho-score.wav): a pad that changes chord with the scenes,
// a sub hit on every hard cut, noise risers into the big cuts and ticks as timeline cards land.
// No samples or licensed music; rerun after changing video/cuts.ts.
import { writeFileSync } from "node:fs";
import { CUTS } from "../video/cuts";

const SR = 44100;
const LEN = CUTS.end / 30;
const out = new Float32Array(Math.ceil(SR * LEN));
const t2s = (frame: number) => frame / 30;
const add = (start: number, dur: number, fn: (t: number) => number) => {
  for (let i = Math.floor(start * SR); i < Math.min(out.length, (start + dur) * SR); i++) out[i] += fn(i / SR - start);
};

// Pad: A minor, F major under the quote, C major to resolve on the question.
const chords: [number, number, number[]][] = [
  [0, t2s(CUTS.quote), [110, 164.81, 261.63, 329.63]],
  [t2s(CUTS.quote), t2s(CUTS.f1), [87.31, 130.81, 220, 349.23]],
  [t2s(CUTS.f1), t2s(CUTS.close), [110, 164.81, 246.94, 329.63]],
  [t2s(CUTS.close), LEN, [130.81, 196, 261.63, 392]],
];
for (const [a, b, notes] of chords)
  add(a, b - a + 0.6, (t) => {
    const env = Math.min(1, t / 0.4) * Math.min(1, (b - a + 0.6 - t) / 0.6);
    const swell = a >= t2s(CUTS.f1) && a < t2s(CUTS.close) ? 1.4 : 1;
    let s = 0;
    for (const n of notes) for (const d of [-0.6, 0.6]) s += Math.sin(2 * Math.PI * (n + d) * t) + 0.25 * Math.sin(4 * Math.PI * (n + d) * t);
    return (0.035 * env * swell * s * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.25 * t))) / notes.length;
  });

// Sub hit with a falling pitch on each cut.
for (const c of [CUTS.site, CUTS.timeline, CUTS.quote, CUTS.f1, CUTS.f2, CUTS.f3, CUTS.close])
  add(t2s(c), 1.2, (t) => {
    const ph = 2 * Math.PI * (55 * t - 12 * t * t);
    return 0.55 * Math.exp(-t * 4) * Math.sin(ph) + 0.15 * Math.exp(-t * 40) * (Math.random() * 2 - 1);
  });

// Filtered-noise risers into the timeline, the findings and the close.
for (const c of [CUTS.timeline, CUTS.f1, CUTS.close]) {
  let lp = 0;
  add(t2s(c) - 1.2, 1.2, (t) => {
    const k = 0.02 + 0.3 * (t / 1.2) ** 2;
    lp += k * (Math.random() * 2 - 1 - lp);
    return 0.35 * (t / 1.2) ** 2 * lp;
  });
}

// Ticks as each timeline card pops (matches Timeline: 25 + i * 42 frames).
for (let i = 0; i < 4; i++) add(t2s(CUTS.timeline + 25 + i * 42), 0.08, (t) => 0.25 * Math.exp(-t * 60) * Math.sin(2 * Math.PI * 1800 * t));

// Soft limit, fade out, 16-bit mono WAV.
const pcm = Buffer.alloc(44 + out.length * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + out.length * 2, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(out.length * 2, 40);
let peak = 0;
out.forEach((v, i) => {
  const fade = Math.min(1, (out.length - i) / (SR * 1.5));
  const s = Math.tanh(v * 1.5) * fade;
  peak = Math.max(peak, Math.abs(s));
  pcm.writeInt16LE(Math.round(s * 32000), 44 + i * 2);
});
writeFileSync("public/velho-score.wav", pcm);
console.log(`wrote public/velho-score.wav, ${LEN} s, peak ${peak.toFixed(2)}`);
