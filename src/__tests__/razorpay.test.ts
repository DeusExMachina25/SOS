import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));

import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";

const hmac = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest("hex");

describe("verifyCheckoutSignature", () => {
  const secret = "test_secret";

  it("accepts a correctly signed order|payment pair", () => {
    const sig = hmac(secret, "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, secret)).toBe(true);
  });

  it("rejects a signature for a different payment id", () => {
    const sig = hmac(secret, "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, secret)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const sig = hmac("other", "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, secret)).toBe(false);
  });

  it("rejects malformed or empty signatures without throwing", () => {
    expect(verifyCheckoutSignature("order_1", "pay_1", "", secret)).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "zz", secret)).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("verifies the raw body, byte for byte", () => {
    const body = '{"event":"payment.captured"}';
    const sig = hmac("whsec", body);
    expect(verifyWebhookSignature(body, sig, "whsec")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "whsec")).toBe(false);
  });
});
