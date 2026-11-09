import PageBlocks from "@/components/blocks/PageBlocks";

/** Blocks and their order are set in src/config/pageLayout.ts. */
export default function PlatterPage() {
  return (
    <div className="w-full pt-20 md:pt-32 pb-32 flex flex-col items-center relative">
      <div className="aurora-bg"></div>
      <PageBlocks page="platter" />
    </div>
  );
}
