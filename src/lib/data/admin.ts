/**
 * Admin console data access. Everything runs as the signed-in admin through
 * row-level security: nothing here can do anything a non-admin could not be
 * stopped from doing by the database, which is the real authority. Money
 * actions go through single database functions so they are all-or-nothing.
 */

import { supabase } from "@/utils/supabase/client";
import type { ExpertStatus, SessionStatus } from "./types";
import type { TransferStatus, TransferType } from "./adminRules";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and the publishable key in .env.local.");
  }
  return supabase;
}

export interface AdminExpert {
  id: string;
  fullName: string;
  status: ExpertStatus;
  professionalTitle: string;
  location: string | null;
  firm: string | null;
  coaRegistration: string | null;
  credentials: string | null;
  bio: string | null;
  yearsExperience: number | null;
  sessionRateInr: number;
  upiId: string | null;
  createdAt: string;
}

type ExpertRow = {
  profile_id: string;
  status: ExpertStatus;
  professional_title: string;
  location: string | null;
  firm: string | null;
  coa_registration: string | null;
  credentials: string | null;
  bio: string | null;
  years_experience: number | null;
  session_rate_inr: number;
  upi_id: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export async function listExpertsForReview(): Promise<AdminExpert[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("expert_profiles")
    .select(
      "profile_id, status, professional_title, location, firm, coa_registration, credentials, bio, years_experience, session_rate_inr, upi_id, created_at, profiles!profile_id ( full_name )"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load experts: ${error.message}`);

  return ((data ?? []) as unknown as ExpertRow[]).map((r) => ({
    id: r.profile_id,
    fullName: r.profiles?.full_name ?? "Unnamed expert",
    status: r.status,
    professionalTitle: r.professional_title,
    location: r.location,
    firm: r.firm,
    coaRegistration: r.coa_registration,
    credentials: r.credentials,
    bio: r.bio,
    yearsExperience: r.years_experience,
    sessionRateInr: r.session_rate_inr,
    upiId: r.upi_id,
    createdAt: r.created_at,
  }));
}

export async function setExpertStatus(expertId: string, status: ExpertStatus): Promise<void> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("expert_profiles")
    .update({ status })
    .eq("profile_id", expertId)
    .select("profile_id");
  if (error) throw new Error(`Failed to update expert: ${error.message}`);
  if (!data?.length) throw new Error("That expert could not be updated (is your account an admin?).");
}

export interface AdminPayout {
  id: string;
  type: TransferType;
  status: TransferStatus;
  amountInr: number;
  reference: string | null;
  transferredAt: string | null;
  createdAt: string;
  sessionId: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  expertId: string;
  expertName: string;
  expertUpiId: string | null;
  clientName: string;
}

type PayoutRow = {
  id: string;
  transfer_type: TransferType;
  status: TransferStatus;
  amount_inr: number;
  payout_reference: string | null;
  transferred_at: string | null;
  created_at: string;
  payments?: {
    session_id: string;
    sessions?: {
      id: string;
      title: string | null;
      status: SessionStatus;
      expert_id: string;
      client?: { full_name: string | null } | null;
      expert?: { full_name: string | null } | null;
    } | null;
  } | null;
};

export async function listPayouts(): Promise<AdminPayout[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("payment_transfers")
    .select(
      "id, transfer_type, status, amount_inr, payout_reference, transferred_at, created_at, payments ( session_id, sessions ( id, title, status, expert_id, client:profiles!client_id ( full_name ), expert:profiles!expert_id ( full_name ) ) )"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load payouts: ${error.message}`);

  const rows = (data ?? []) as unknown as PayoutRow[];
  const expertIds = [...new Set(rows.map((r) => r.payments?.sessions?.expert_id).filter((x): x is string => Boolean(x)))];

  // The expert's UPI ID is where the money is sent.
  const upiByExpert = new Map<string, string | null>();
  if (expertIds.length) {
    const { data: upis, error: upiError } = await sb.from("expert_profiles").select("profile_id, upi_id").in("profile_id", expertIds);
    if (upiError) throw new Error(`Failed to load payout details: ${upiError.message}`);
    for (const u of upis ?? []) upiByExpert.set(u.profile_id as string, (u.upi_id as string | null) ?? null);
  }

  return rows.map((r) => {
    const s = r.payments?.sessions;
    return {
      id: r.id,
      type: r.transfer_type,
      status: r.status,
      amountInr: r.amount_inr,
      reference: r.payout_reference,
      transferredAt: r.transferred_at,
      createdAt: r.created_at,
      sessionId: s?.id ?? r.payments?.session_id ?? "",
      sessionTitle: s?.title ?? "Consultation",
      sessionStatus: s?.status ?? "scheduled",
      expertId: s?.expert_id ?? "",
      expertName: s?.expert?.full_name ?? "Expert",
      expertUpiId: s?.expert_id ? upiByExpert.get(s.expert_id) ?? null : null,
      clientName: s?.client?.full_name ?? "Client",
    };
  });
}

export async function markPayoutSent(transferId: string, reference: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("admin_mark_transfer_paid", {
    p_transfer_id: transferId,
    p_reference: reference.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function recordRefund(sessionId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("admin_refund_session", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Expert invitations (server route: only the Auth admin API can create users)
// ---------------------------------------------------------------------------

async function inviteApi(body: Record<string, unknown>): Promise<{ link: string | null; emailed: boolean }> {
  const res = await fetch("/api/admin/experts/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: { error?: string; link?: string | null; emailed?: boolean } = {};
  try {
    json = await res.json();
  } catch {
    /* a gateway error page is not JSON */
  }
  if (!res.ok) throw new Error(json.error ?? `The request failed (${res.status}).`);
  return { link: json.link ?? null, emailed: json.emailed === true };
}

/** Invite someone as an expert: by email, or as a link to send yourself. */
export function inviteExpert(input: { email: string; fullName: string; deliver: "email" | "link" }) {
  return inviteApi({ action: "invite", ...input });
}

/** A fresh sign-in link for an invitation that hasn't been completed. */
export async function newInviteLink(expertId: string): Promise<string> {
  const { link } = await inviteApi({ action: "relink", expertId });
  if (!link) throw new Error("No link was returned. Try again.");
  return link;
}

/** Cancel an invitation nobody has signed in to. */
export async function cancelInvite(expertId: string): Promise<void> {
  await inviteApi({ action: "revoke", expertId });
}
