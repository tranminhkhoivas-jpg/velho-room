// Remotion entry for server-side MP4 renders (`npx remotion render video/index.tsx CompanyVideo`).
import { Composition, registerRoot } from "remotion";
import { CompanyVideo, DURATION, type VideoProps } from "./CompanyVideo";
import { LyricVideo, lyricMetadata, type LyricProps } from "./LyricVideo";

const sample: VideoProps = {
  company: "Example",
  domain: "example.com",
  oneLiner: "An example company.",
  shot: "",
  accent: "#f2b544",
  sources: 12,
  signals: [{ date: "2026-01-01", type: "news", text: "Example signal.", source: "example.com" }],
  quote: { text: "We want to grow.", speaker: "CEO" },
  findings: [{ title: "One", fact: "" }, { title: "Two", fact: "" }, { title: "Three", fact: "" }],
  question: "What would you automate first?",
};

const song: LyricProps = { company: "Example", title: "Example song", genre: "Synth pop", accent: "#f2b544", shot: "", audio: "", duration: 10, lines: [{ text: "Hello example", section: "Chorus", start: 2, end: 5 }] };

registerRoot(() => (
  <>
    <Composition id="CompanyVideo" component={CompanyVideo} width={1920} height={1080} fps={30} durationInFrames={DURATION} defaultProps={sample} />
    <Composition id="LyricVideo" component={LyricVideo} width={1920} height={1080} fps={30} durationInFrames={300} defaultProps={song} calculateMetadata={lyricMetadata} />
  </>
));
