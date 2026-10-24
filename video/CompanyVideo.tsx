import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CUTS } from "./cuts";

export type VideoProps = {
  company: string;
  domain: string;
  oneLiner: string;
  shot: string; // homepage screenshot (data URL)
  accent: string; // brand colour picked from the screenshot
  sources: number;
  signals: { date: string; type: string; text: string; source: string }[];
  quote: { text: string; speaker: string };
  findings: { title: string; fact: string }[];
  question: string;
};

const { fontFamily: SANS } = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin", "latin-ext"] });
const { fontFamily: SERIF } = loadSerif("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["500"], subsets: ["latin", "latin-ext"] });

const BG = "#07090c";
const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const SMOOTH = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number, from = 0, to = 1, easing = EXPO) => interpolate(f, [a, b], [from, to], { ...clamp, easing });

export const DURATION = CUTS.end;

// Words rise out of a mask one after another.
function Words({ text, start = 0, stagger = 3, style, blur = false }: { text: string; start?: number; stagger?: number; style: React.CSSProperties; blur?: boolean }) {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.26em", ...style }}>
      {text.split(/\s+/).map((w, i) => {
        const p = ramp(f, start + i * stagger, start + i * stagger + 18);
        return (
          <span key={i} style={{ display: "inline-block", overflow: blur ? "visible" : "hidden", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", translate: `0 ${(1 - p) * (blur ? 30 : 110)}%`, opacity: blur ? p : 1, filter: blur ? `blur(${(1 - p) * 10}px)` : undefined }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
}

function Kicker({ children, color, f, at = 0 }: { children: React.ReactNode; color: string; f: number; at?: number }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color, opacity: ramp(f, at, at + 12), display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
      <span style={{ width: ramp(f, at, at + 20, 0, 56), height: 2, background: color }} />
      {children}
    </div>
  );
}

// 1. Hook: a drifting wall of their real news, and the count of sources we read.
function Hook(p: VideoProps) {
  const f = useCurrentFrame();
  const n = Math.round(ramp(f, 8, 55, 0, p.sources, SMOOTH));
  const cards = [...p.signals, ...p.signals, ...p.signals].slice(0, 9);
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 1400 }}>
        <div style={{ position: "absolute", left: -300, top: -200, width: 2600, display: "flex", flexWrap: "wrap", gap: 40, transform: `rotateX(28deg) rotateZ(-10deg) translateY(${-f * 3}px) translateX(${-f * 1.5}px) scale(${1 + f * 0.002})`, transformOrigin: "50% 30%" }}>
          {cards.map((s, i) => (
            <div key={i} style={{ width: 780, height: 260, borderRadius: 24, padding: 36, background: "#11151b", border: "1px solid #ffffff14", opacity: 0.32 + (i % 3) * 0.12, filter: i % 4 === 0 ? "blur(3px)" : undefined }}>
              <div style={{ fontFamily: MONO, color: p.accent, fontSize: 26 }}>
                {s.date} · {s.type}
              </div>
              <div style={{ fontFamily: SANS, color: "#e8ecf1", fontSize: 34, marginTop: 18, lineHeight: 1.25 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${BG}ee 0%, ${BG}aa 45%, transparent 80%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", scale: String(ramp(f, 0, 90, 0.96, 1.06, SMOOTH)) }}>
        <Kicker color="#9aa4b2" f={f}>
          {`Before we ever call ${p.company}`}
        </Kicker>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 300, color: "white", lineHeight: 1, letterSpacing: -12, marginTop: 20, fontVariantNumeric: "tabular-nums" }}>{n}</div>
        <Words text="public sources, read." start={30} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 64, color: p.accent, justifyContent: "center" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// 2. Their own homepage, flying in on a 3D tilt while an accent scan line reads it.
function Site(p: VideoProps) {
  const f = useCurrentFrame();
  const settle = ramp(f, 0, 55);
  const scan = ramp(f, 30, 120, -5, 105, SMOOTH);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 40%, ${p.accent}33, ${BG} 60%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div
          style={{
            position: "absolute",
            left: 760,
            top: 130,
            width: 1080,
            borderRadius: 18,
            overflow: "hidden",
            background: "white",
            boxShadow: `0 60px 160px #000c, 0 0 0 1px #ffffff22`,
            transform: `translateZ(${(1 - settle) * -900}px) rotateX(${32 - settle * 26 + f * 0.02}deg) rotateY(${-34 + settle * 28 + f * 0.03}deg) rotateZ(${(1 - settle) * 6}deg)`,
          }}
        >
          <div style={{ height: 52, background: "#eef0f3", display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
            ))}
            <span style={{ marginLeft: 24, flex: 1, height: 32, borderRadius: 8, background: "white", fontFamily: MONO, fontSize: 18, color: "#555", display: "flex", alignItems: "center", paddingLeft: 16 }}>{p.domain}</span>
          </div>
          <div style={{ height: 780, overflow: "hidden", position: "relative" }}>
            {p.shot ? (
              // cover-fit plus slow push-in: works for any screenshot height
              <Img src={p.shot} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", scale: String(ramp(f, 10, 150, 1, 1.14, SMOOTH)), transformOrigin: "40% 25%" }} />
            ) : (
              <div style={{ fontFamily: SANS, fontSize: 80, padding: 80 }}>{p.domain}</div>
            )}
            <div style={{ position: "absolute", left: 0, right: 0, top: `${scan}%`, height: 4, background: p.accent, boxShadow: `0 0 40px 12px ${p.accent}88` }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${Math.max(0, scan)}%`, background: `${p.accent}14` }} />
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 290, width: 560 }}>
        <Kicker color={p.accent} f={f} at={20}>
          Step 1 · their own words
        </Kicker>
        <Words text={p.company} start={26} style={{ fontFamily: SANS, fontWeight: 800, fontSize: 110, color: "white", marginTop: 24, letterSpacing: -3 }} />
        <div style={{ fontFamily: SANS, fontSize: 32, lineHeight: 1.4, color: "#b8c0cc", marginTop: 24, opacity: ramp(f, 50, 70), translate: `0 ${ramp(f, 50, 70, 20, 0)}px` }}>{p.oneLiner}</div>
      </div>
    </AbsoluteFill>
  );
}

// 3. What changed: their dated news on a timeline the camera travels along.
function Timeline(p: VideoProps) {
  const f = useCurrentFrame();
  const gap = 760;
  const width = 400 + gap * Math.max(1, p.signals.length);
  const cam = ramp(f, 10, 200, 0, Math.max(0, width - 1700), SMOOTH);
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 110, top: 70, zIndex: 2 }}>
        <Kicker color={p.accent} f={f}>
          Step 2 · what changed
        </Kicker>
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width, height: 1080, translate: `${-cam}px 0` }}>
        <div style={{ position: "absolute", left: 120, top: 540, height: 3, width: width - 120, background: `linear-gradient(90deg, ${p.accent}, ${p.accent}55)`, transformOrigin: "left", scale: `${ramp(f, 0, 60, 0, 1, SMOOTH)} 1` }} />
        {p.signals.map((s, i) => {
          const at = 25 + i * 42;
          const pop = spring({ frame: f - at, fps: 30, config: { damping: 14, stiffness: 160 } });
          const up = i % 2 === 0;
          const x = 300 + i * gap;
          return (
            <div key={i}>
              <div style={{ position: "absolute", left: x - 14, top: 527, width: 28, height: 28, borderRadius: 14, background: p.accent, scale: String(pop), boxShadow: `0 0 30px ${p.accent}` }} />
              <div style={{ position: "absolute", left: x - 1, top: up ? 380 : 556, width: 2, height: 144 * pop, background: "#ffffff33", transformOrigin: up ? "bottom" : "top" }} />
              <div style={{ position: "absolute", left: x - 40, top: up ? 170 : 760, width: 660, opacity: pop, translate: `0 ${(1 - pop) * (up ? 40 : -40)}px` }}>
                <div style={{ fontFamily: MONO, fontSize: 30, color: p.accent }}>
                  {s.date} <span style={{ color: "#7d8794" }}>· {s.type}</span>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 38, lineHeight: 1.25, color: "white", marginTop: 12 }}>{s.text}</div>
                <div style={{ fontFamily: MONO, fontSize: 20, color: "#7d8794", marginTop: 10 }}>{s.source}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// 4. Their leader's own priority, almost still.
function Quote(p: VideoProps) {
  const f = useCurrentFrame();
  const words = p.quote.text.split(/\s+/).length;
  const done = 10 + words * 3;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 20% 20%, ${p.accent}22, ${BG} 55%)`, padding: "0 180px", justifyContent: "center", scale: String(ramp(f, 0, 150, 1, 1.05, SMOOTH)) }}>
      <div style={{ position: "absolute", left: 120, top: 40, fontFamily: SERIF, fontSize: 420, color: p.accent, opacity: 0.25 * ramp(f, 0, 20) }}>“</div>
      <Kicker color={p.accent} f={f}>
        Step 3 · what they said
      </Kicker>
      <Words text={p.quote.text} start={10} stagger={3} blur style={{ fontFamily: SERIF, fontSize: 86, lineHeight: 1.12, color: "white", marginTop: 40 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 50, opacity: ramp(f, done, done + 15) }}>
        <span style={{ width: ramp(f, done, done + 25, 0, 90), height: 3, background: p.accent }} />
        <span style={{ fontFamily: SANS, fontSize: 34, color: "#c9d0da" }}>{p.quote.speaker}</span>
      </div>
    </AbsoluteFill>
  );
}

// 5. Three findings, hard cuts, one on the brand colour.
function Finding({ n, text, fact, accent }: { n: number; text: string; fact: string; accent: string }) {
  const f = useCurrentFrame();
  const loud = n === 2;
  const ink = loud ? BG : "white";
  return (
    <AbsoluteFill style={{ background: loud ? accent : n === 1 ? BG : "#0d1117", justifyContent: "center", padding: "0 150px", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -40 + f * 2.5, top: 60, fontFamily: SANS, fontWeight: 800, fontSize: 720, lineHeight: 1, color: "transparent", WebkitTextStroke: `3px ${loud ? "#0006" : accent + "66"}`, letterSpacing: -30 }}>0{n}</div>
      <Kicker color={loud ? BG : accent} f={f}>
        {`Finding ${n} of 3`}
      </Kicker>
      <Words text={text} start={4} stagger={2} style={{ fontFamily: SANS, fontWeight: 800, fontSize: 104, lineHeight: 1.05, color: ink, marginTop: 30, maxWidth: 1450, letterSpacing: -3 }} />
      {fact && (
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginTop: 44, maxWidth: 1250, opacity: ramp(f, 22, 34), translate: `${ramp(f, 22, 40, -30, 0)}px 0` }}>
          <span style={{ fontFamily: MONO, fontSize: 22, padding: "6px 12px", borderRadius: 6, background: loud ? BG : accent, color: loud ? accent : BG, whiteSpace: "nowrap" }}>EVIDENCE</span>
          <span style={{ fontFamily: SANS, fontSize: 34, lineHeight: 1.35, color: loud ? "#000c" : "#c9d0da" }}>{fact}</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

// 6. The one question, then who is asking.
function Close(p: VideoProps) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG, padding: "0 180px", justifyContent: "center", overflow: "hidden" }}>
      {p.shot && <Img src={p.shot} style={{ position: "absolute", right: -200, top: -100, width: 1100, opacity: 0.08, rotate: `${-8 + f * 0.02}deg`, filter: "grayscale(1)" }} />}
      <Kicker color={p.accent} f={f}>
        {`The question for ${p.company}`}
      </Kicker>
      <Words text={p.question} start={6} stagger={3} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 76, lineHeight: 1.15, color: "white", marginTop: 36, maxWidth: 1500 }} />
      <div style={{ marginTop: 70, opacity: ramp(f, 62, 78), translate: `0 ${ramp(f, 62, 78, 20, 0)}px` }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: "white", letterSpacing: -2 }}>
          Velho<span style={{ color: p.accent }}>.</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: "#7d8794", marginTop: 12 }}>Made from public sources · hackathon prototype · draft, not sent</div>
      </div>
    </AbsoluteFill>
  );
}

// Short accent flash on every hard cut.
function Flash({ accent }: { accent: string }) {
  const f = useCurrentFrame();
  return (
    <>
      {[CUTS.site, CUTS.timeline, CUTS.quote, CUTS.f1, CUTS.f2, CUTS.f3, CUTS.close].map((c) => (
        <AbsoluteFill key={c} style={{ background: c === CUTS.quote ? "white" : accent, opacity: interpolate(f, [c, c + 5], [0.55, 0], clamp) * (f >= c ? 1 : 0), pointerEvents: "none" }} />
      ))}
    </>
  );
}

// Film grain and vignette over everything so flat colours read as footage.
function Grain() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, #000a 100%)" }} />
    </AbsoluteFill>
  );
}

export function CompanyVideo(p: VideoProps) {
  const { fps } = useVideoConfig();
  const seq = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={from} durationInFrames={to - from} premountFor={fps}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: SANS }}>
      {seq(CUTS.hook, CUTS.site, <Hook {...p} />)}
      {seq(CUTS.site, CUTS.timeline, <Site {...p} />)}
      {seq(CUTS.timeline, CUTS.quote, <Timeline {...p} />)}
      {seq(CUTS.quote, CUTS.f1, <Quote {...p} />)}
      {[CUTS.f1, CUTS.f2, CUTS.f3].map((c, i) => (
        <Sequence key={c} from={c} durationInFrames={60}>
          <Finding n={i + 1} text={p.findings[i]?.title || ""} fact={p.findings[i]?.fact || ""} accent={p.accent} />
        </Sequence>
      ))}
      {seq(CUTS.close, CUTS.end, <Close {...p} />)}
      <Flash accent={p.accent} />
      <Grain />
      <Audio src={staticFile("velho-score.wav")} volume={0.8} />
    </AbsoluteFill>
  );
}
