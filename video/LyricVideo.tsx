import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";

export type LyricProps = {
  company: string;
  title: string;
  genre: string;
  accent: string;
  shot: string; // homepage screenshot (data URL) or ""
  audio: string; // song URL in the app, data URL for server renders
  duration: number; // seconds
  lines: { text: string; section: string; start: number; end: number }[];
  facts?: string[]; // sourced facts the lyrics use, shown as cards
};

const { fontFamily: SANS } = loadInter("normal", { weights: ["400", "800"], subsets: ["latin", "latin-ext"] });
const { fontFamily: SERIF } = loadSerif("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["500"], subsets: ["latin", "latin-ext"] });

const BG = "#07090c";
const INK = "#f4f1ea";
const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: EXPO });
const isChorus = (s: string) => /chorus|hook|refrain/i.test(s);
// Longest word of a line, for the giant drifting backdrop word.
const keyword = (s: string) => s.replace(/[^\p{L}\p{N}\s'-]/gu, "").split(/\s+/).sort((a, b) => b.length - a.length)[0] || "";

export const lyricMetadata: CalculateMetadataFunction<LyricProps> = ({ props }) => ({ durationInFrames: Math.max(90, Math.ceil(props.duration * 30)) });

export function LyricVideo(p: LyricProps) {
  return p.audio ? <WithAudio {...p} /> : <Scene p={p} level={0} bars={[]} />;
}

// Loudness drives the pulse; low frequencies are the beat.
function WithAudio(p: LyricProps) {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const data = useAudioData(p.audio);
  const bars = data ? visualizeAudio({ fps, frame: f, audioData: data, numberOfSamples: 64, smoothing: true }) : [];
  const level = bars.length ? Math.min(1, (bars[0] + bars[1] + bars[2]) * 2.2) : 0;
  return <><Audio src={p.audio} /><Scene p={p} level={level} bars={bars} /></>;
}

function Scene({ p, level, bars }: { p: LyricProps; level: number; bars: number[] }) {
  const f = useCurrentFrame(), { fps, durationInFrames, width, height } = useVideoConfig();
  const t = f / fps;
  const first = p.lines[0]?.start ?? 4;
  const i = p.lines.findLastIndex((l) => l.start - 0.25 <= t);
  const cur = i >= 0 ? p.lines[i] : null;
  const chorus = cur ? isChorus(cur.section) : false;
  const outro = durationInFrames - Math.round(2.5 * fps);
  // Chorus floods in smoothly instead of hard-cutting.
  const flood = cur ? interpolate(t, [cur.start - 0.4, cur.start], chorus ? [0, 1] : [1, 0], clamp) * (chorus || (p.lines[i - 1] && isChorus(p.lines[i - 1].section)) ? 1 : 0) : 0;
  const ink = flood > 0.5 ? BG : INK;
  const sections = p.lines.filter((l, k) => k === 0 || l.section !== p.lines[k - 1].section);
  const sectionNo = sections.findLastIndex((l) => l.start - 0.25 <= t);
  const facts = (p.facts || []).filter(Boolean);
  const fact = !chorus && cur && facts.length ? facts[Math.max(0, sectionNo) % facts.length] : "";
  const sectionStart = sectionNo >= 0 ? sections[sectionNo].start : 0;

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      {/* Drifting colour glows, swelling with the beat */}
      {[0, 1, 2].map((k) => {
        const a = t * (0.18 + k * 0.07) + k * 2.1;
        const size = 900 + k * 220 + level * 260;
        return <div key={k} style={{ position: "absolute", left: width / 2 + Math.cos(a) * (520 - k * 90) - size / 2, top: height / 2 + Math.sin(a * 1.3) * (300 - k * 50) - size / 2, width: size, height: size, background: `radial-gradient(circle, ${p.accent} 0%, transparent 65%)`, opacity: [0.45, 0.28, 0.2][k] }} />;
      })}
      <AbsoluteFill style={{ background: p.accent, opacity: flood * 0.92 }} />

      {/* Rings pulsing out from the centre on the beat */}
      {[0, 1, 2, 3].map((k) => {
        const phase = (t * 0.45 + k / 4) % 1;
        const r = 200 + phase * 1100;
        return <div key={k} style={{ position: "absolute", left: width / 2 - r, top: height / 2 - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${2 + level * 4}px solid ${flood > 0.5 ? BG : p.accent}`, opacity: (1 - phase) * (0.12 + level * 0.25) }} />;
      })}

      {/* Rising particles */}
      {Array.from({ length: 46 }, (_, k) => {
        const x = random("x" + k) * width, speed = 30 + random("s" + k) * 70, s = 3 + random("z" + k) * 7;
        const y = height + 40 - ((t * speed + random("y" + k) * height) % (height + 80));
        return <div key={k} style={{ position: "absolute", left: x + Math.sin(t + k) * 30, top: y, width: s, height: s, borderRadius: "50%", background: flood > 0.5 ? BG : INK, opacity: 0.12 + random("o" + k) * 0.3 + level * 0.2 }} />;
      })}

      {/* Their homepage as a floating, tilting card */}
      {p.shot && !chorus && f < outro && (
        <div style={{ position: "absolute", right: 70, top: 110, width: 440, perspective: 1400, opacity: ramp(t, 0.5, 2) * 0.55 }}>
          <Img src={p.shot} style={{ width: "100%", borderRadius: 18, boxShadow: "0 40px 120px rgba(0,0,0,.6)", transform: `rotateY(${-18 + Math.sin(t * 0.4) * 8}deg) rotateX(${6 + Math.cos(t * 0.3) * 4}deg) translateY(${Math.sin(t * 0.6) * 18}px)` }} />
        </div>
      )}

      {/* Giant keyword from the current line, drifting behind the lyrics */}
      {cur && f < outro && (
        <div style={{ position: "absolute", top: height / 2 - 260, left: 0, whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 800, fontSize: 420, letterSpacing: -12, color: "transparent", WebkitTextStroke: `3px ${flood > 0.5 ? BG : p.accent}`, opacity: 0.22 * ramp(t, cur.start - 0.25, cur.start + 0.5), translate: `${interpolate(t - cur.start, [0, 6], [200, -500], clamp)}px 0` }}>{keyword(cur.text).toUpperCase()}</div>
      )}

      {/* Spectrum along the bottom */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 160, display: "flex", alignItems: "flex-end", gap: 5, padding: "0 60px", opacity: 0.35 }}>
        {bars.map((x, k) => <div key={k} style={{ flex: 1, height: `${Math.min(100, 4 + Math.sqrt(x) * 150)}%`, background: flood > 0.5 ? BG : p.accent, borderRadius: "5px 5px 0 0" }} />)}
      </div>

      {/* Title card */}
      {t < first && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 28, opacity: ramp(t, 0, 0.8) * ramp(t, first - 0.6, first, 1, 0) }}>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: p.accent, textTransform: "uppercase" }}>A song for {p.company}</div>
          <div style={{ fontFamily: SERIF, fontSize: 150, color: INK, textAlign: "center", maxWidth: 1600, lineHeight: 1, scale: String(1 + level * 0.04) }}>{p.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: "#9aa3ad" }}>{p.genre} · by Velho</div>
        </AbsoluteFill>
      )}

      {/* Sourced fact behind this verse */}
      {fact && f < outro && (
        <div style={{ position: "absolute", left: 80, bottom: 200, maxWidth: 640, padding: "18px 24px", borderRadius: 14, background: "rgba(7,9,12,.72)", borderLeft: `4px solid ${p.accent}`, fontFamily: SANS, fontSize: 24, lineHeight: 1.35, color: INK, opacity: ramp(t, sectionStart + 0.5, sectionStart + 1.5) * 0.9, translate: `${ramp(t, sectionStart + 0.5, sectionStart + 1.5, -40, 0)}px 0` }}>
          <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: p.accent, marginBottom: 6 }}>FROM PUBLIC SOURCES</div>
          {fact}
        </div>
      )}

      {/* Lyrics: one whole line at a time */}
      {cur && f < outro && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "absolute", top: 70, left: 80, fontFamily: MONO, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: ink, padding: "8px 18px", border: `2px solid ${ink}`, borderRadius: 999, opacity: 0.8 }}>{cur.section}</div>
          {p.lines[i - 1] && t - cur.start < 0.5 && (
            <div style={{ position: "absolute", fontFamily: SANS, fontWeight: 800, fontSize: 92, color: ink, maxWidth: 1500, textAlign: "center", lineHeight: 1.05, opacity: ramp(t, cur.start - 0.3, cur.start - 0.05, 1, 0), translate: `0 ${ramp(t, cur.start - 0.3, cur.start - 0.05, 0, -120)}px` }}>{p.lines[i - 1].text}</div>
          )}
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, lineHeight: 1.05, letterSpacing: -2, color: ink, maxWidth: 1300, textAlign: "center", textShadow: flood > 0.5 ? "none" : "0 6px 40px rgba(0,0,0,.6)", opacity: ramp(t, cur.start - 0.25, cur.start + 0.3), translate: `0 ${ramp(t, cur.start - 0.25, cur.start + 0.3, 70, 0)}px`, scale: String(1 + level * 0.03) }}>{cur.text}</div>
          {p.lines[i + 1] && <div style={{ position: "absolute", top: height / 2 + 150, fontFamily: SANS, fontSize: 36, color: ink, opacity: 0.35, maxWidth: 1400, textAlign: "center" }}>{p.lines[i + 1].text}</div>}
        </AbsoluteFill>
      )}

      {f >= outro && (
        <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", gap: 30, opacity: ramp(f, outro, outro + 15) }}>
          <div style={{ fontFamily: SERIF, fontSize: 180, color: INK }}>Velho<span style={{ color: p.accent }}>.</span></div>
          <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: "#9aa3ad" }}>Made from public sources · AI music by Lyria · draft, not sent</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
