import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";
import ParallaxBoxes from "@/components/ParallaxBoxes";

/** P7: the colour-changing boxes. Its heading moved into Let's Talk (P8). */
export default function TalkAbout() {
  return (
    <BlockFrame>
      <Reveal className="w-full flex flex-col items-center overflow-visible">
        <ParallaxBoxes />
      </Reveal>
    </BlockFrame>
  );
}
