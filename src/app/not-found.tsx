import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <p className="font-mono-sos text-xs tracking-[0.25em] uppercase text-[var(--text-muted)] mb-6">Error 404</p>
      <h1 className="font-editorial text-5xl md:text-7xl text-[var(--text-primary)] tracking-tight mb-6">
        Off the drawing.
      </h1>
      <p className="font-inter text-lg text-[var(--text-muted)] font-light max-w-md mb-10">
        That page doesn&rsquo;t exist, or it has moved. Let&rsquo;s get you back on the plan.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/" className="btn-sos btn-sos-filled">Home</Link>
        <Link href="/platter" className="btn-sos">Meet the experts</Link>
      </div>
    </div>
  );
}
