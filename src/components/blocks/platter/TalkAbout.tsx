import Link from "next/link";
import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";
import ParallaxBoxes from "@/components/ParallaxBoxes";

/** P7: "We've got a lot to talk about." with the colour-changing boxes. Links to log in. */
export default function TalkAbout() {
  return (
    <BlockFrame>
      <Reveal className="w-full flex flex-col items-center overflow-visible">
        <ParallaxBoxes />
        <Link href="/login" className="w-full max-w-[100vw] px-4 py-24 relative group cursor-pointer overflow-hidden block">
          <div className="relative w-full text-center flex flex-col items-center">
            <h2 className="font-editorial text-[6vw] md:text-[80px] leading-none text-[var(--text-primary)] tracking-tight whitespace-nowrap overflow-visible relative z-10 transition-all duration-1000 transform group-hover:scale-[1.02] group-hover:text-[var(--color-primary)] opacity-100">
              We&apos;ve got a lot to talk about.
            </h2>
            <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[var(--color-primary)] group-hover:w-[100%] max-w-[800px] transition-all duration-1000 ease-in-out"></div>
          </div>
        </Link>
      </Reveal>
    </BlockFrame>
  );
}
