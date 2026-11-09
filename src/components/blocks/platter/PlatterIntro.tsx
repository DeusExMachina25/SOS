import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";

/** P2: "The Platter" title and intro line. */
export default function PlatterIntro() {
  return (
    <BlockFrame>
      <Reveal as="header" className="flex flex-col items-center w-full">
        <h1 className="font-editorial text-7xl md:text-9xl text-[var(--text-primary)] mb-8 tracking-tighter drop-shadow-lg">The Platter</h1>
        <p className="font-inter text-xl text-[var(--text-muted)] max-w-2xl font-light leading-relaxed">
          Please go through our heavily curated menu of experts from a variety of fields. We are always looking for experts and professionals in other fields to add to our repertoire, although we expect a certain level of... Aura.
        </p>
      </Reveal>
    </BlockFrame>
  );
}
