/**
 * Dashboard search: pages plus the signed-in user's own sessions, vault files
 * and conversations. Pure and in-memory; the data is already scoped to the
 * user by row-level security before it gets here.
 */

import type { ChatThreadSummary, Session, VaultFile } from "./types";

export type SearchGroup = "Pages" | "Sessions" | "Files" | "Conversations";

export interface SearchHit {
  id: string;
  group: SearchGroup;
  title: string;
  detail: string;
  href: string;
}

export interface SearchCorpus {
  role: "client" | "expert";
  pages: { name: string; href: string }[];
  sessions: Session[];
  files: VaultFile[];
  threads: ChatThreadSummary[];
}

const PER_GROUP = 5;
const GROUP_ORDER: SearchGroup[] = ["Pages", "Sessions", "Files", "Conversations"];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** 0 = no match; higher is a better match. Every word of the query must appear. */
function score(query: string, title: string, detail: string): number {
  const q = norm(query).trim();
  if (!q) return 0;
  const t = norm(title);
  const d = norm(detail);
  const words = q.split(/\s+/);
  if (!words.every((w) => t.includes(w) || d.includes(w))) return 0;
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  if (words.every((w) => t.includes(w))) return 2;
  return 1;
}

/** An empty query lists the pages as suggestions; otherwise matches across everything, best first within each group. */
export function searchDashboard(query: string, corpus: SearchCorpus): SearchHit[] {
  const { role, pages, sessions, files, threads } = corpus;
  const base = `/dashboard/${role}`;

  if (!query.trim()) {
    return pages.map((p) => ({ id: `page-${p.href}`, group: "Pages", title: p.name, detail: "", href: p.href }));
  }

  const hits: (SearchHit & { score: number })[] = [];
  const add = (hit: SearchHit, title: string, detail: string) => {
    const s = score(query, title, detail);
    if (s > 0) hits.push({ ...hit, score: s });
  };

  for (const p of pages) {
    add({ id: `page-${p.href}`, group: "Pages", title: p.name, detail: "", href: p.href }, p.name, "");
  }
  for (const s of sessions) {
    const who = role === "client" ? s.expertName : s.clientName;
    const detail = `${who} • ${s.date} ${s.time} • ${s.status}`;
    add({ id: `session-${s.id}`, group: "Sessions", title: s.title, detail, href: `${base}/sessions` }, s.title, `${who} ${s.date} ${s.status}`);
  }
  for (const f of files) {
    add({ id: `file-${f.id}`, group: "Files", title: f.name, detail: `Shared by ${f.uploaderName}`, href: `${base}/vault` }, f.name, f.uploaderName);
  }
  for (const t of threads) {
    add(
      { id: `thread-${t.id}`, group: "Conversations", title: t.counterpartName, detail: t.lastMessage ?? "No messages yet", href: `${base}/chat` },
      t.counterpartName,
      t.lastMessage ?? ""
    );
  }

  const byGroup = new Map<SearchGroup, (SearchHit & { score: number })[]>();
  for (const h of hits) byGroup.set(h.group, [...(byGroup.get(h.group) ?? []), h]);

  return GROUP_ORDER.flatMap((g) =>
    (byGroup.get(g) ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, PER_GROUP)
      .map((h) => {
        const { score: s, ...rest } = h;
        void s;
        return rest;
      })
  );
}
