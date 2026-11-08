import PageBlocks from "@/components/blocks/PageBlocks";

export const metadata = {
  title: "About Us | SOS",
  description: "Why we started SOS and how we choose the experts you meet.",
};

/** Blocks and their order are set in src/config/pageLayout.ts. */
export default function UsPage() {
  return (
    <div className="relative w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-inter selection:bg-[var(--text-primary)] selection:text-[var(--bg-base)] overflow-hidden">
      <PageBlocks page="us" />
    </div>
  );
}
