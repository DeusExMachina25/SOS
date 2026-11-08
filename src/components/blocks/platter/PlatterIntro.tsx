import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";

/** P2: "The Platter" title and intro line. */
export default function PlatterIntro() {
  return (
    <BlockFrame>
      <Reveal as="header" className="flex flex-col items-center w-full">
        <h1 className="font-editorial text-7xl md:text-9xl text-[var(--text-primary)] mb-8 tracking-tighter drop-shadow-lg">The Platter</h1>
        <p className="font-inter text-xl text-[var(--text-muted)] max-w-2xl font-light leading-relaxed">
          Experts in three fields, each checked on work they&apos;ve delivered. Book one for an hour on your project.
        </p>
      </Reveal>
    </BlockFrame>
  );
}
