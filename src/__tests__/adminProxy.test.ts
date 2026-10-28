// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const session = vi.hoisted(() => ({ current: { user: null as { id: string } | null, role: null as string | null } }));

vi.mock("@/utils/supabase/middleware", () => ({
  updateSession: async () => ({
    response: NextResponse.next(),
    user: session.current.user,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: session.current.role ? { role: session.current.role } : null }) }),
        }),
      }),
    },
  }),
}));

import { proxy } from "@/proxy";

async function visit(path: string, as: { role: string | null } | "anonymous") {
  session.current = as === "anonymous" ? { user: null, role: null } : { user: { id: "u1" }, role: as.role };
  const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
  const location = res.headers.get("location");
  return { redirected: res.status >= 300 && res.status < 400, to: location ? new URL(location).pathname : null };
}

describe("route guard: /dashboard/admin", () => {
  beforeEach(() => {
    session.current = { user: null, role: null };
  });

  it("sends signed-out visitors to the login page", async () => {
    expect(await visit("/dashboard/admin", "anonymous")).toEqual({ redirected: true, to: "/login" });
    expect(await visit("/dashboard/admin/payouts", "anonymous")).toEqual({ redirected: true, to: "/login" });
  });

  it("keeps clients and experts out of every admin page, sending each to their own dashboard", async () => {
    for (const path of ["/dashboard/admin", "/dashboard/admin/experts", "/dashboard/admin/payouts", "/dashboard/admin/sessions"]) {
      expect(await visit(path, { role: "client" }), `client ${path}`).toEqual({ redirected: true, to: "/dashboard/client" });
      expect(await visit(path, { role: "expert" }), `expert ${path}`).toEqual({ redirected: true, to: "/dashboard/expert" });
    }
  });

  it("keeps out a signed-in user whose profile row is missing", async () => {
    expect((await visit("/dashboard/admin", { role: null })).redirected).toBe(true);
  });

  it("lets admins in", async () => {
    for (const path of ["/dashboard/admin", "/dashboard/admin/experts", "/dashboard/admin/payouts", "/dashboard/admin/sessions"]) {
      expect((await visit(path, { role: "admin" })).redirected, path).toBe(false);
    }
  });

  it("is not fooled by look-alike paths", async () => {
    // "/dashboard/administrator" is not the admin section, and must not be treated as one either way.
    expect((await visit("/dashboard/administrator", { role: "client" })).to).not.toBe("/dashboard/admin");
  });

  it("sends an admin who lands on /dashboard to the admin console, and leaves everyone else alone", async () => {
    expect(await visit("/dashboard", { role: "admin" })).toEqual({ redirected: true, to: "/dashboard/admin" });
    expect((await visit("/dashboard", { role: "client" })).redirected).toBe(false);
    expect((await visit("/dashboard", { role: "expert" })).redirected).toBe(false);
  });

  it("still keeps the client and expert sections apart", async () => {
    expect(await visit("/dashboard/expert/availability", { role: "client" })).toEqual({ redirected: true, to: "/dashboard/client" });
    expect(await visit("/dashboard/client/chat", { role: "expert" })).toEqual({ redirected: true, to: "/dashboard/expert/chat" });
  });

  it("leaves admins free to open the other dashboards", async () => {
    expect((await visit("/dashboard/client", { role: "admin" })).redirected).toBe(false);
    expect((await visit("/dashboard/expert", { role: "admin" })).redirected).toBe(false);
  });
});
