import PlanEditor from "@/components/plan/PlanEditor";

export const metadata = {
  title: "Sketch Your Space | SOS",
  description: "Draw a quick floorplan of your home, garden or plot in metres, then share it with an expert for a second opinion. Feel free to experiment with the Sketch tab and play with it before sharing it with our experts.",
};

/** The floorplan sketcher. Free to use; signing in saves plans and lifts the limits. */
export default function SketchPage() {
  return (
    <div className="md:h-[calc(100svh-6rem)] md:min-h-[560px] bg-[var(--bg-base)]">
      <h1 className="sr-only">Sketch your space</h1>
      <PlanEditor />
    </div>
  );
}
