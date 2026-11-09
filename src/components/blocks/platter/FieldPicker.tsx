"use client";

import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";
import FieldPie from "@/components/platter/FieldPie";
import { useExperts } from "../experts/useExperts";

/**
 * P3: "The Collective" 3D field pie. Picking a slice picks the expert shown
 * by the profile card (P4), wherever that card sits.
 */
export default function FieldPicker() {
  const { experts, loading, selectedId, select } = useExperts();

  return (
    <BlockFrame>
      <Reveal className="w-full flex flex-col items-center">
        <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} The Collective</h2>
        {loading ? (
          <div className="w-full max-w-[520px] flex flex-col items-center gap-4 animate-pulse">
            <div className="w-full aspect-[460/320] bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl" />
            <div className="h-3 w-40 bg-[var(--bg-surface-2)] rounded" />
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <FieldPie
              experts={experts}
              selectedExpertId={selectedId}
              onSelect={(id) => {
                select(id);
                // bring the profile into view, otherwise picking an expert looks like it did nothing
                requestAnimationFrame(() =>
                  document.getElementById("expert-profile")?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start",
                  })
                );
              }}
            />
          </div>
        )}
      </Reveal>
    </BlockFrame>
  );
}
