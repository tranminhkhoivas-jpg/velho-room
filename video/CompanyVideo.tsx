import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type VideoProps = { company: string; headline: string; points: string[]; note: string };

const INK = "#0b1d2a";
const SEA = "#0f3b57";
const GOLD = "#f2b544";
const FONT = "Georgia, 'Times New Roman', serif";

// Fade + rise in, fade out at the end of the scene.
function Enter({ children, len, delay = 0 }: { children: React.ReactNode; len: number; delay?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  const out = interpolate(f, [len - 15, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: s * out, translate: `0 ${(1 - s) * 40}px` }}>{children}</div>;
}

function Title({ company, headline, len }: { company: string; headline: string; len: number }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 140 }}>
      <Enter len={len}>
        <div style={{ color: GOLD, fontSize: 44, letterSpacing: 6, textTransform: "uppercase" }}>Made for {company}</div>
      </Enter>
      <Enter len={len} delay={12}>
        <div style={{ color: "white", fontSize: 96, lineHeight: 1.1, marginTop: 30, fontFamily: FONT }}>{headline}</div>
      </Enter>
    </AbsoluteFill>
  );
}

function Point({ n, text, len }: { n: number; text: string; len: number }) {
  const f = useCurrentFrame();
  const bar = interpolate(f, [0, len], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 140 }}>
      <Enter len={len}>
        <div style={{ color: GOLD, fontSize: 160, fontFamily: FONT, lineHeight: 1 }}>{n}</div>
      </Enter>
      <Enter len={len} delay={8}>
        <div style={{ color: "white", fontSize: 64, lineHeight: 1.25, marginTop: 20 }}>{text}</div>
      </Enter>
      <div style={{ position: "absolute", left: 140, right: 140, bottom: 110, height: 6, background: "#ffffff22" }}>
        <div style={{ width: `${bar}%`, height: "100%", background: GOLD }} />
      </div>
    </AbsoluteFill>
  );
}

function Close({ note, len }: { note: string; len: number }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 140 }}>
      <Enter len={len}>
        <div style={{ color: "white", fontSize: 52, lineHeight: 1.35, fontFamily: FONT, fontStyle: "italic" }}>“{note}”</div>
      </Enter>
      <Enter len={len} delay={20}>
        <div style={{ color: GOLD, fontSize: 40, marginTop: 50 }}>Velho</div>
        <div style={{ color: "#ffffff88", fontSize: 28, marginTop: 24 }}>Hackathon prototype · draft, not sent</div>
      </Enter>
    </AbsoluteFill>
  );
}

export const SCENE = 180; // 6 s at 30 fps; 5 scenes = 30 s
export const durationFor = (p: VideoProps) => SCENE * (2 + Math.min(3, p.points.length));

export function CompanyVideo(p: VideoProps) {
  const pts = p.points.slice(0, 3);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${INK}, ${SEA})`, fontFamily: "Helvetica, Arial, sans-serif" }}>
      <Sequence durationInFrames={SCENE}>
        <Title company={p.company} headline={p.headline} len={SCENE} />
      </Sequence>
      {pts.map((t, i) => (
        <Sequence key={i} from={SCENE * (i + 1)} durationInFrames={SCENE}>
          <Point n={i + 1} text={t} len={SCENE} />
        </Sequence>
      ))}
      <Sequence from={SCENE * (pts.length + 1)} durationInFrames={SCENE}>
        <Close note={p.note} len={SCENE} />
      </Sequence>
    </AbsoluteFill>
  );
}
