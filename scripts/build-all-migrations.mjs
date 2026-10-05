// Regenerates supabase/deploy/all_migrations.sql from supabase/migrations/*.sql.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const body = files.map((f) => `\n-- ===== ${f} =====\n${readFileSync(new URL(f, dir), "utf8")}`).join("");
writeFileSync(
  new URL("../supabase/deploy/all_migrations.sql", import.meta.url),
  `-- GENERATED: all migrations concatenated in order. Safe to paste into the Supabase SQL editor and run once.\n-- Regenerate with: node scripts/build-all-migrations.mjs\n${body}`
);
console.log(`wrote ${files.length} migrations`);
