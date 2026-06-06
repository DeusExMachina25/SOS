export default function UsPage() {
  return (
    <div className="container mx-auto px-6 py-20 max-w-4xl">
      <header className="mb-20 text-center">
        <h1 className="font-script text-6xl text-[var(--color-gold)] mb-6">About Us</h1>
        <p className="font-display text-xl text-[var(--text-muted)]">
          We believe that seeking counsel is not a surrender of your vision, but its calibration.
        </p>
      </header>

      <div className="prose prose-invert prose-lg max-w-none font-display text-[var(--text-faint)]">
        <p className="mb-8 leading-relaxed">
          The genesis of SOS was born out of a simple observation: founders and creators often hit a wall not because they lack passion or skill, but because they are simply too close to the canvas. In the pursuit of building something meaningful, blind spots are inevitable.
        </p>
        
        <p className="mb-8 leading-relaxed">
          We established this platform as a sanctuary for ideas. A place where the art of the second opinion is revered. Our collective of experts spans strategy, architecture, design, and execution — all dedicated to helping you find your true north in a chaotic market.
        </p>
        
        <div className="my-16 p-10 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] border-organic">
          <h2 className="font-script text-4xl text-[var(--color-cyan)] mb-4">Our Manifesto</h2>
          <ul className="list-disc pl-6 space-y-4">
            <li>Clarity over complexity.</li>
            <li>Organic execution over rigid frameworks.</li>
            <li>Calibration without compromise.</li>
            <li>Secure and private collaboration.</li>
          </ul>
        </div>
        
        <p className="leading-relaxed">
          Join us in redefining how modern businesses scale sustainably. Your next big leap begins with a conversation.
        </p>
      </div>
    </div>
  );
}
