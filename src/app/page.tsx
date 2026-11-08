import HomeChoreography from "@/components/home/HomeChoreography";
import PageBlocks from "@/components/blocks/PageBlocks";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">SOS: the art of second opinions from vetted architecture, sustainability and travel experts</h1>
      <HomeChoreography />
      {/* Extra blocks under the scroll story: set in src/config/pageLayout.ts */}
      <div className="relative z-10 bg-[var(--bg-base)]">
        <PageBlocks page="home" />
      </div>
    </>
  );
}
