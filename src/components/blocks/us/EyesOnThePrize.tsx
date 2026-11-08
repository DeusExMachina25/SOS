"use client";

import PantoneEyesCard from "@/components/home/PantoneEyesCard";

/** U6: "Keep your eyes on the prize." with the Pantone card whose eyes follow you. */
export default function EyesOnThePrize() {
  return (
    <section className="w-full h-[150vh] bg-[var(--bg-base)] z-10 relative border-t border-[var(--border)] flex flex-col items-center justify-center overflow-hidden">

      {/* Text Above */}
      <h3 className="font-display text-2xl md:text-3xl text-[var(--text-primary)] opacity-80 uppercase tracking-tight mb-4 z-10 relative text-center">
        Keep your eyes on the prize.
      </h3>

      {/* The Pantone Eyes Card */}
      <div className="flex justify-center w-full py-8 z-10 relative">
        <PantoneEyesCard />
      </div>

      {/* Text Below */}
      <p className="font-inter text-lg md:text-xl text-[var(--text-muted)] max-w-md mt-8 z-10 relative text-center">
        Seeking counsel is never a surrender of your vision.
      </p>

    </section>
  );
}
