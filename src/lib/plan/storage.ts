import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyPlan, type Plan, type PlanKind } from "./types";

/**
 * Where plans are kept.
 *   - Everyone: the plan being drawn is kept in this browser, so a refresh
 *     doesn't lose it.
 *   - Signed in: plans can also be saved to the account (table `plans`,
 *     supabase/migrations/0022_plans.sql), where only their owner can see them.
 */

const DRAFT_KEY = "sos.plan.draft";
const KINDS: PlanKind[] = ["interior", "garden", "plot"];

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const pt = (v: unknown) => !!v && typeof v === "object" && num((v as { x: unknown }).x) && num((v as { y: unknown }).y);
const str = (v: unknown): v is string => typeof v === "string";

/** Checks data read back from storage, dropping anything malformed. */
export function parsePlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  const kind = KINDS.includes(r.kind as PlanKind) ? (r.kind as PlanKind) : "interior";
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const walls = list(r.walls).filter((w) => str(w?.id) && pt(w.a) && pt(w.b));
  const wallIds = new Set(walls.map((w) => w.id));
  return {
    ...emptyPlan(kind, str(r.name) ? r.name.slice(0, 80) : "My plan"),
    walls: walls.map((w) => ({ id: w.id, a: { x: w.a.x, y: w.a.y }, b: { x: w.b.x, y: w.b.y }, style: w.style === "boundary" ? "boundary" : "wall" })),
    openings: list(r.openings)
      .filter((o) => str(o?.id) && wallIds.has(o.wallId) && num(o.t) && num(o.width) && (o.kind === "door" || o.kind === "window"))
      .map((o) => ({ id: o.id, kind: o.kind, wallId: o.wallId, t: o.t, width: o.width })),
    rooms: list(r.rooms)
      .filter((m) => str(m?.id) && str(m.name) && num(m.x) && num(m.y) && num(m.w) && num(m.h))
      .map((m) => ({ id: m.id, name: m.name.slice(0, 40), x: m.x, y: m.y, w: m.w, h: m.h, wallIds: list(m.wallIds).filter((id) => wallIds.has(id)) })),
    items: list(r.items)
      .filter((i) => str(i?.id) && str(i.type) && num(i.x) && num(i.y))
      .map((i) => ({ id: i.id, type: i.type, x: i.x, y: i.y, rotation: num(i.rotation) ? i.rotation : 0 })),
  };
}

export function loadDraft(): Plan | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? parsePlan(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(plan: Plan): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(plan));
  } catch {
    /* storage full or blocked: the plan still works, it just won't survive a refresh */
  }
}

// ---------------------------------------------------------------------------
// Account storage

export interface SavedPlan {
  id: string;
  name: string;
  kind: PlanKind;
  updatedAt: string;
}

/** A missing table (migration not yet applied) reads as a friendly message. */
function friendly(message: string): string {
  if (/relation .*plans.* does not exist|could not find the table/i.test(message)) {
    return "Saving to your account isn't switched on yet. Your plan is still kept in this browser.";
  }
  return message;
}

export async function listPlans(sb: SupabaseClient): Promise<SavedPlan[]> {
  const { data, error } = await sb.from("plans").select("id, name, kind, updated_at").order("updated_at", { ascending: false });
  if (error) throw new Error(friendly(error.message));
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, kind: r.kind, updatedAt: r.updated_at }));
}

export async function loadPlan(sb: SupabaseClient, id: string): Promise<Plan> {
  const { data, error } = await sb.from("plans").select("data").eq("id", id).single();
  if (error) throw new Error(friendly(error.message));
  const plan = parsePlan(data?.data);
  if (!plan) throw new Error("That plan couldn't be read.");
  return plan;
}

/** Saves a plan: updates it when `id` is given, otherwise creates it. Returns its id. */
export async function savePlan(sb: SupabaseClient, plan: Plan, id?: string): Promise<string> {
  const row = { name: plan.name.trim() || "My plan", kind: plan.kind, data: plan };
  const query = id
    ? sb.from("plans").update(row).eq("id", id).select("id").single()
    : sb.from("plans").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) throw new Error(friendly(error.message));
  return data.id as string;
}

export async function deletePlan(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("plans").delete().eq("id", id);
  if (error) throw new Error(friendly(error.message));
}
