// Remotion entry for server-side MP4 renders (`npx remotion render video/index.tsx CompanyVideo`).
import { Composition, registerRoot } from "remotion";
import { CompanyVideo, durationFor, type VideoProps } from "./CompanyVideo";

const sample: VideoProps = { company: "Example Oy", headline: "Your next 12 months, charted", points: ["One", "Two", "Three"], note: "A note." };

registerRoot(() => (
  <Composition
    id="CompanyVideo"
    component={CompanyVideo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={durationFor(sample)}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({ durationInFrames: durationFor(props) })}
  />
));
