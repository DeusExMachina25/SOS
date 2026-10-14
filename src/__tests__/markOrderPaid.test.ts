import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { markOrderPaid } from "@/lib/payments/razorpay";

type Result = { data: unknown; error: { message: string } | null };

/**
 * Minimal chainable stand-in for the supabase-js query builder. Each
 * from(table) call consumes the next scripted result for that table; every
 * chained method returns the builder and awaiting/maybeSingle resolves it.
 */
function fakeAdmin(script: Record<string, Result[]>) {
  const upserts: { rows: unknown; opts: unknown }[] = [];
  const from = vi.fn((table: string) => {
    const result = (script[table] ?? []).shift() ?? { data: null, error: null };
    const b: Record<string, unknown> = {};
    for (const m of ["update", "select", "eq", "neq"]) b[m] = () => b;
    b.maybeSingle = () => Promise.resolve(result);
    b.upsert = (rows: unknown, opts: unknown) => {
      upserts.push({ rows, opts });
      return Promise.resolve(result);
    };
    return b;
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ from } as never);
  return { upserts };
}

describe("markOrderPaid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a fresh payment paid and writes a 60/40 payout split", async () => {
    const { upserts } = fakeAdmin({
      payments: [{ data: { id: "p1", amount_inr: 5000 }, error: null }],
      payment_transfers: [{ data: null, error: null }],
    });
    expect(await markOrderPaid("order_1", "pay_1")).toBe(true);
    const rows = upserts[0].rows as { transfer_type: string; amount_inr: number }[];
    expect(rows.map((r) => [r.transfer_type, r.amount_inr])).toEqual([
      ["booking_release", 3000],
      ["completion_release", 2000],
    ]);
  });

  it("splits odd amounts without losing a rupee", async () => {
    const { upserts } = fakeAdmin({
      payments: [{ data: { id: "p1", amount_inr: 5001 }, error: null }],
      payment_transfers: [{ data: null, error: null }],
    });
    await markOrderPaid("order_1", "pay_1");
    const rows = upserts[0].rows as { amount_inr: number }[];
    expect(rows[0].amount_inr + rows[1].amount_inr).toBe(5001);
  });

  it("repairs missing payout rows when the payment was already marked paid", async () => {
    // First call updated the payment then died before writing transfers; the
    // retry finds nothing to update but must still create them.
    const { upserts } = fakeAdmin({
      payments: [
        { data: null, error: null },
        { data: { id: "p1", amount_inr: 5000 }, error: null },
      ],
      payment_transfers: [{ data: null, error: null }],
    });
    expect(await markOrderPaid("order_1", "pay_1")).toBe(false);
    expect(upserts).toHaveLength(1);
  });

  it("never overwrites payout rows that already moved past pending", async () => {
    const { upserts } = fakeAdmin({
      payments: [{ data: { id: "p1", amount_inr: 5000 }, error: null }],
      payment_transfers: [{ data: null, error: null }],
    });
    await markOrderPaid("order_1", "pay_1");
    expect(upserts[0].opts).toMatchObject({ ignoreDuplicates: true });
  });

  it("returns false and writes nothing for an unknown order", async () => {
    const { upserts } = fakeAdmin({
      payments: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });
    expect(await markOrderPaid("order_missing", "pay_1")).toBe(false);
    expect(upserts).toHaveLength(0);
  });

  it("surfaces a transfer write failure so the caller can retry", async () => {
    fakeAdmin({
      payments: [{ data: { id: "p1", amount_inr: 5000 }, error: null }],
      payment_transfers: [{ data: null, error: { message: "db down" } }],
    });
    await expect(markOrderPaid("order_1", "pay_1")).rejects.toThrow("db down");
  });
});
