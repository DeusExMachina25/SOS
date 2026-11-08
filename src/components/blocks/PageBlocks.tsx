import { BLOCKS } from "./registry";
import { PAGE_LAYOUT } from "@/config/pageLayout";

/** Renders a page's blocks in the order set in src/config/pageLayout.ts. */
export default function PageBlocks({ page }: { page: keyof typeof PAGE_LAYOUT }) {
  return (
    <>
      {PAGE_LAYOUT[page].map((id) => {
        const { Component } = BLOCKS[id];
        return <Component key={id} />;
      })}
    </>
  );
}
