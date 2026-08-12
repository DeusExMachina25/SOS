import Link from "next/link";

export default function BlogPage() {
  const posts = [
    { title: "The Art of the Second Opinion", date: "May 28, 2026", category: "Strategy" },
    { title: "Finding True North in Chaotic Markets", date: "May 15, 2026", category: "Growth" },
    { title: "Why Minimalist Architecture Scales Better", date: "April 30, 2026", category: "Tech" },
  ];

  return (
    <div className="container mx-auto px-6 py-20 max-w-5xl">
      <header className="mb-20 text-center">
        <h1 className="font-script text-6xl text-[var(--color-pink)] mb-6">Editorial</h1>
        <p className="font-display text-xl text-[var(--text-muted)]">
          Insights, strategies, and thoughts from our expert collective.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {posts.map((post, i) => (
          <div key={i} className="group flex flex-col bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--color-pink)] transition-colors cursor-pointer">
            <div className="h-48 bg-[var(--bg-surface-2)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(0,0,0,0.5)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-pink)]">{post.category}</span>
                <span className="text-xs font-mono-sos text-[var(--text-faint)]">{post.date}</span>
              </div>
              <h2 className="font-display text-2xl font-bold mb-4 group-hover:text-[var(--color-pink)] transition-colors">
                {post.title}
              </h2>
              <p className="text-[var(--text-faint)] text-sm mb-6 leading-relaxed">
                A brief excerpt from the article discussing the nuances of the topic and offering a glimpse into the expert insights shared within.
              </p>
              <Link href="#" className="text-sm font-bold text-[var(--color-primary)]">Read Article &rarr;</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
