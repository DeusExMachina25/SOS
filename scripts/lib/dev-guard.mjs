/**
 * Refuses to run a script that creates test accounts or writes test data
 * unless this exact Supabase project has been marked as a dev project.
 *
 * Opt in by adding to .env.local:
 *   DEV_SEED_PROJECT_REF=<project ref>
 * where <project ref> is the first label of NEXT_PUBLIC_SUPABASE_URL
 * (https://<ref>.supabase.co). It must match exactly, so pointing .env.local
 * at a different project turns the guard back on until you opt in again.
 *
 * Why: the seeded accounts share the password "password" (one is an admin).
 * Supabase password sign-in works through its API in any environment, so
 * seeding a project that real users can reach hands out an admin account.
 */
export function assertDevProject(env, scriptName) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  let ref;
  try {
    ref = new URL(url).hostname.split(".")[0];
  } catch {
    fail(`${scriptName}: NEXT_PUBLIC_SUPABASE_URL is missing or not a URL in .env.local.`);
  }

  if (env.DEV_SEED_PROJECT_REF !== ref) {
    fail(
      [
        `${scriptName} refused to run: Supabase project "${ref}" is not marked as a dev project.`,
        "",
        "This script creates accounts with the password \"password\" (including an admin) and writes test data.",
        "Only run it against a throwaway project that no real user can reach.",
        "",
        "If that is what this project is, opt in explicitly by adding this line to .env.local:",
        `  DEV_SEED_PROJECT_REF=${ref}`,
        env.DEV_SEED_PROJECT_REF
          ? `(.env.local currently has DEV_SEED_PROJECT_REF=${env.DEV_SEED_PROJECT_REF}, which is a different project.)`
          : "",
      ]
        .filter((l) => l !== "")
        .join("\n")
    );
  }
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(2);
}
