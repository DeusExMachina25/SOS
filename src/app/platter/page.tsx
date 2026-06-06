import Link from "next/link";

export default function PlatterPage() {
  return (
    <div className="container mx-auto px-6 py-20 max-w-6xl">
      <header className="mb-24 text-center">
        <h1 className="font-script text-6xl text-[var(--color-primary)] mb-6">The Platter</h1>
        <p className="font-display text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
          A curated selection of expert consultations designed to elevate your brand, strategy, and execution.
        </p>
      </header>

      {/* Services Overview */}
      <section className="mb-32">
        <h2 className="font-display font-bold text-3xl mb-12 border-b border-[var(--border)] pb-4">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Brand Strategy", desc: "Defining your true north and narrative." },
            { title: "Technical Architecture", desc: "Building scalable and robust foundations." },
            { title: "Design Systems", desc: "Crafting beautiful and cohesive user experiences." },
          ].map((service, i) => (
            <div key={i} className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-surface-2)] transition-colors">
              <h3 className="font-display font-bold text-xl mb-4 text-[var(--color-gold)]">{service.title}</h3>
              <p className="text-sm text-[var(--text-faint)] leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Model */}
      <section className="mb-32 bg-[var(--bg-surface)] rounded-3xl p-10 border border-[var(--border-strong)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <span className="font-script text-9xl">₹</span>
        </div>
        <h2 className="font-display font-bold text-3xl mb-8">Consultation Pricing</h2>
        
        <div className="flex flex-col md:flex-row gap-12">
          {/* Base Plan */}
          <div className="flex-1 bg-[var(--bg-base)] p-8 rounded-2xl border border-[var(--border)] relative">
            <h3 className="text-xl font-bold mb-2">Standard Session (1 Hour)</h3>
            <p className="text-[var(--text-faint)] text-sm mb-6">Connect with our top-tier experts for an in-depth 60-minute strategy session.</p>
            <div className="text-4xl font-display font-bold text-[var(--color-primary)] mb-6">Base Rate</div>
            <Link href="/login" className="btn-sos-filled w-full text-center py-3">Book Now</Link>
          </div>

          {/* Add-ons */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <h3 className="text-xl font-bold border-b border-[var(--border)] pb-2">Additional Time (+30 mins)</h3>
            
            <div className="flex justify-between items-center p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--color-teal)]">
              <div>
                <div className="font-bold text-[var(--color-teal)] mb-1">Advance Booking</div>
                <div className="text-xs text-[var(--text-faint)]">Add to your initial booking</div>
              </div>
              <div className="font-bold font-mono-sos">40% of base</div>
            </div>

            <div className="flex justify-between items-center p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--border)] opacity-60">
              <div>
                <div className="font-bold mb-1">On-Spot Extension</div>
                <div className="text-xs">Requested during active meeting</div>
              </div>
              <div className="font-bold font-mono-sos">60% of base</div>
            </div>
            <p className="text-xs text-[var(--text-faint)] italic mt-2">
              * On-spot extensions are subject to expert availability and cannot be pre-booked here.
            </p>
          </div>
        </div>
      </section>

      {/* Expert Grid */}
      <section>
        <h2 className="font-display font-bold text-3xl mb-12 border-b border-[var(--border)] pb-4">Our Experts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((expert) => (
            <div key={expert} className="flex gap-6 items-center p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">
              <div className="w-24 h-24 rounded-full bg-[var(--bg-surface-2)] border-2 border-[var(--color-primary)] flex-shrink-0"></div>
              <div>
                <h3 className="font-bold text-lg mb-1">Expert Name</h3>
                <div className="text-xs font-semibold text-[var(--color-pink)] mb-3">Specialization {expert}</div>
                <p className="text-sm text-[var(--text-faint)] mb-4">Brief bio highlighting their expertise and past successes.</p>
                <Link href="/login" className="text-[var(--color-cyan)] text-sm font-semibold hover:underline">View Profile &rarr;</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
