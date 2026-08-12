/**
 * Creates the private `vault` Storage bucket used by the Secure Vault.
 * Idempotent — safe to re-run.
 *
 * Run: node scripts/setup-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "vault";

const { data: buckets } = await admin.storage.listBuckets();
if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`= bucket "${BUCKET}" already exists`);
} else {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false, // private: downloads go through short-lived signed URLs
    fileSizeLimit: 52428800, // 50 MB
  });
  if (error) throw new Error(`createBucket: ${error.message}`);
  console.log(`+ created private bucket "${BUCKET}" (50MB limit)`);
}

console.log(
  "\nNote: Storage RLS policies for this bucket still need to be applied\n" +
    "(see supabase/migrations/0003_vault_storage_policies.sql)."
);
