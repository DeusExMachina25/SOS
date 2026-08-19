"use client";

/**
 * Client-side data access for the SOS marketplace.
 *
 * Every call goes through the browser Supabase client, so Postgres RLS
 * decides what the signed-in user can actually see or write — the queries
 * below never assume authorization on their own.
 */

import { supabase } from "@/utils/supabase/client";
import {
  formatDuration,
  formatSessionDate,
  formatSessionTime,
} from "./format";
import type {
  AvailabilityRule,
  BusyRange,
  ChatThreadSummary,
  Expert,
  Message,
  MyProfile,
  Payment,
  Session,
  VaultFile,
} from "./types";

function requireClient() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and the publishable key in .env.local."
    );
  }
  return supabase;
}

/** The signed-in user's id, or null when signed out. */
export async function getCurrentUserId(): Promise<string | null> {
  const sb = requireClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id ?? null;
}

/** The signed-in user's role, used for dashboard routing. */
export async function getCurrentRole(): Promise<
  "client" | "expert" | "admin" | null
> {
  const sb = requireClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return (data?.role as "client" | "expert" | "admin") ?? null;
}

/** The signed-in user's own profile row (id, name, role). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id as string,
    fullName: (data.full_name as string) ?? "User",
    role: data.role as MyProfile["role"],
  };
}

// ---------------------------------------------------------------------------
// Experts
// ---------------------------------------------------------------------------

type ExpertRow = {
  profile_id: string;
  professional_title: string;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  years_experience: number | null;
  session_rate_inr: number;
  avatar_url: string | null;
  specialties: string[] | null;
  firm: string | null;
  coa_registration: string | null;
  credentials: string | null;
  languages: string[] | null;
  portfolio_paths: string[] | null;
  status: Expert["status"];
  upi_id: string | null;
  profiles?: { full_name: string | null } | null;
};

function mapExpert(row: ExpertRow): Expert {
  return {
    id: row.profile_id,
    fullName: row.profiles?.full_name ?? "SOS Expert",
    professionalTitle: row.professional_title,
    bio: row.bio,
    location: row.location,
    timezone: row.timezone,
    yearsExperience: row.years_experience,
    sessionRateInr: row.session_rate_inr,
    avatarUrl: row.avatar_url,
    specialties: row.specialties ?? [],
    firm: row.firm,
    coaRegistration: row.coa_registration,
    credentials: row.credentials,
    languages: row.languages ?? [],
    portfolioPaths: row.portfolio_paths ?? [],
    status: row.status,
    upiId: row.upi_id,
  };
}

// `profiles!profile_id` disambiguates: expert_profiles has two FKs to profiles
// (profile_id and invited_by), so an unhinted embed is ambiguous.
const EXPERT_COLUMNS =
  "profile_id, professional_title, bio, location, timezone, years_experience, session_rate_inr, avatar_url, specialties, firm, coa_registration, credentials, languages, portfolio_paths, status, upi_id, profiles!profile_id ( full_name )";

/** Approved experts — powers the dashboard carousel and booking dropdown. */
export async function getApprovedExperts(): Promise<Expert[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("expert_profiles")
    .select(EXPERT_COLUMNS)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load experts: ${error.message}`);
  return ((data ?? []) as unknown as ExpertRow[]).map(mapExpert);
}

/** A single expert, for the popup info page. */
export async function getExpertById(id: string): Promise<Expert | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("expert_profiles")
    .select(EXPERT_COLUMNS)
    .eq("profile_id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load expert: ${error.message}`);
  return data ? mapExpert(data as unknown as ExpertRow) : null;
}

/** The signed-in expert's own profile (any status), for the intake form. */
export async function getMyExpertProfile(): Promise<Expert | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return getExpertById(userId);
}

/**
 * Creates or updates the signed-in expert's profile from the intake form.
 * `status` is intentionally omitted — a database trigger blocks non-admins
 * from changing approval status.
 */
export async function upsertMyExpertProfile(input: {
  professionalTitle: string;
  bio?: string | null;
  location?: string | null;
  timezone?: string | null;
  yearsExperience?: number | null;
  sessionRateInr: number;
  avatarUrl?: string | null;
  specialties?: string[];
  firm?: string | null;
  coaRegistration?: string | null;
  credentials?: string | null;
  languages?: string[];
  portfolioPaths?: string[];
}): Promise<void> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in.");

  const { error } = await sb.from("expert_profiles").upsert({
    profile_id: userId,
    professional_title: input.professionalTitle,
    bio: input.bio ?? null,
    location: input.location ?? null,
    timezone: input.timezone ?? null,
    years_experience: input.yearsExperience ?? null,
    session_rate_inr: input.sessionRateInr,
    avatar_url: input.avatarUrl ?? null,
    specialties: input.specialties ?? [],
    firm: input.firm ?? null,
    coa_registration: input.coaRegistration ?? null,
    credentials: input.credentials ?? null,
    languages: input.languages ?? [],
    portfolio_paths: input.portfolioPaths ?? [],
  });

  if (error) throw new Error(`Failed to save profile: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

type AvailabilityRow = {
  id: string;
  expert_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

function mapAvailabilityRule(row: AvailabilityRow): AvailabilityRule {
  return {
    id: row.id,
    expertId: row.expert_id,
    weekday: row.weekday,
    // Postgres `time` comes back as "09:00:00" — trim to "HH:MM".
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
  };
}

/** Any expert's weekly availability rules — used when a client is booking. */
export async function getExpertAvailabilityRules(
  expertId: string
): Promise<AvailabilityRule[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("expert_availability")
    .select("id, expert_id, weekday, start_time, end_time")
    .eq("expert_id", expertId)
    .order("weekday", { ascending: true });

  if (error) throw new Error(`Failed to load availability: ${error.message}`);
  return ((data ?? []) as AvailabilityRow[]).map(mapAvailabilityRule);
}

/** The signed-in expert's own weekly availability rules, for the editor. */
export async function getMyAvailabilityRules(): Promise<AvailabilityRule[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return getExpertAvailabilityRules(userId);
}

export async function addAvailabilityRule(input: {
  weekday: number;
  startTime: string;
  endTime: string;
}): Promise<AvailabilityRule> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in.");

  const { data, error } = await sb
    .from("expert_availability")
    .insert({
      expert_id: userId,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .select("id, expert_id, weekday, start_time, end_time")
    .single();

  if (error) throw new Error(`Failed to add availability: ${error.message}`);
  return mapAvailabilityRule(data as AvailabilityRow);
}

export async function deleteAvailabilityRule(ruleId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from("expert_availability").delete().eq("id", ruleId);
  if (error) throw new Error(`Failed to remove availability: ${error.message}`);
}

/**
 * Busy time ranges for an expert in a window, from real bookings — used to
 * exclude already-taken slots. Goes through a SECURITY DEFINER RPC (see
 * migration 0007) so the client never touches other people's session rows.
 */
export async function getExpertBusyRanges(
  expertId: string,
  fromIso: string,
  toIso: string
): Promise<BusyRange[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("get_expert_busy_ranges", {
    p_expert_id: expertId,
    p_from: fromIso,
    p_to: toIso,
  });

  if (error) throw new Error(`Failed to load busy times: ${error.message}`);
  return ((data ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }));
}

// ---------------------------------------------------------------------------
// Payments (Phase 2 — mocked Razorpay escrow + a real, functional direct-UPI
// interim path). See supabase/migrations/0009_payments_phase2.sql for why
// the Razorpay side is mocked: Route requires RBI compliance approval this
// account does not yet have.
// ---------------------------------------------------------------------------

type PaymentRow = {
  id: string;
  session_id: string;
  method: Payment["method"];
  status: Payment["status"];
  amount_inr: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
};

const PAYMENT_COLUMNS =
  "id, session_id, method, status, amount_inr, razorpay_order_id, razorpay_payment_id";

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    sessionId: row.session_id,
    method: row.method,
    status: row.status,
    amountInr: row.amount_inr,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
  };
}

/** All payments for the signed-in user's sessions (RLS-scoped) — avoids N+1 fetches in session lists. */
export async function getMyPayments(): Promise<Payment[]> {
  const sb = requireClient();
  const { data, error } = await sb.from("payments").select(PAYMENT_COLUMNS);
  if (error) throw new Error(`Failed to load payments: ${error.message}`);
  return ((data ?? []) as PaymentRow[]).map(mapPayment);
}

export async function getPaymentForSession(sessionId: string): Promise<Payment | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load payment: ${error.message}`);
  return data ? mapPayment(data as PaymentRow) : null;
}

/**
 * Runs the full MOCKED Razorpay escrow flow for a session via a Route
 * Handler (privileged: it also schedules the 60/40 transfer rows, which
 * only admin/service-role may write). No real Razorpay API is called and no
 * real money moves. This exists to demonstrate the intended escrow timeline
 * and gives a single swap point for real Route calls once approved.
 */
export async function payMockRazorpay(sessionId: string): Promise<Payment> {
  const res = await fetch("/api/payments/mock-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to process payment");
  return mapPayment(body.payment as PaymentRow);
}

/** Client records that they sent payment directly to the expert's UPI ID. */
export async function markUpiPaymentSent(
  sessionId: string,
  amountInr: number
): Promise<Payment> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("payments")
    .upsert(
      { session_id: sessionId, method: "upi_direct", status: "processing", amount_inr: amountInr },
      { onConflict: "session_id" }
    )
    .select(PAYMENT_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to record payment: ${error.message}`);
  return mapPayment(data as PaymentRow);
}

/**
 * Expert confirms a direct UPI payment actually arrived. RLS restricts the
 * underlying status change to the session's expert (or admin) — the one
 * attestation that matters, since we cannot verify a transfer that happens
 * outside Razorpay ourselves.
 */
export async function confirmUpiPaymentReceived(sessionId: string): Promise<void> {
  const sb = requireClient();

  const { error: paymentError } = await sb
    .from("payments")
    .update({ status: "paid" })
    .eq("session_id", sessionId)
    .eq("method", "upi_direct");
  if (paymentError) throw new Error(`Failed to confirm payment: ${paymentError.message}`);

  const { error: sessionError } = await sb
    .from("sessions")
    .update({ payment_status: "released" })
    .eq("id", sessionId);
  if (sessionError) throw new Error(`Failed to update session: ${sessionError.message}`);
}

/** Sets the signed-in expert's UPI payout ID, shown to clients at checkout. */
export async function setMyUpiId(upiId: string): Promise<void> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in.");

  const { error } = await sb
    .from("expert_profiles")
    .update({ upi_id: upiId })
    .eq("profile_id", userId);
  if (error) throw new Error(`Failed to save UPI ID: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Sessions (bookings)
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string;
  title: string | null;
  client_id: string;
  expert_id: string;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  amount_inr: number | null;
  payment_status: Session["paymentStatus"];
  client?: { full_name: string | null } | null;
  expert?: { full_name: string | null } | null;
};

// Bookings are stored as a time range (starts_at/ends_at). Joins are hinted by
// column because sessions has two FKs to profiles.
const SESSION_COLUMNS =
  "id, title, client_id, expert_id, status, starts_at, ends_at, amount_inr, payment_status, client:profiles!client_id ( full_name ), expert:profiles!expert_id ( full_name )";

/** Duration in whole minutes, derived from the stored time range. */
function durationMinutesOf(row: SessionRow): number {
  if (!row.starts_at || !row.ends_at) return 60;
  const ms =
    new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime();
  return ms > 0 ? Math.round(ms / 60000) : 60;
}

function mapSession(row: SessionRow): Session {
  const minutes = durationMinutesOf(row);
  return {
    id: row.id,
    title: row.title ?? "Consultation",
    clientId: row.client_id,
    expertId: row.expert_id,
    clientName: row.client?.full_name ?? "Client",
    expertName: row.expert?.full_name ?? "Expert",
    date: formatSessionDate(row.starts_at),
    time: formatSessionTime(row.starts_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: (row.status as Session["status"]) ?? "scheduled",
    durationMinutes: minutes,
    duration: formatDuration(minutes),
    amountInr: row.amount_inr,
    paymentStatus: row.payment_status ?? "unpaid",
  };
}

/**
 * All sessions visible to the signed-in user. RLS scopes this automatically:
 * clients see their own, experts see assigned ones, admins see all.
 */
export async function getMySessions(): Promise<Session[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("sessions")
    .select(SESSION_COLUMNS)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Failed to load sessions: ${error.message}`);
  return ((data ?? []) as unknown as SessionRow[]).map(mapSession);
}

/** Books a session. The client is always the signed-in user (enforced by RLS). */
export async function bookSession(input: {
  expertId: string;
  title: string;
  /** ISO timestamp for the start of the booking. */
  startsAt: string;
  durationMinutes?: number;
  amountInr?: number | null;
}): Promise<Session> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to book a session.");

  const minutes = input.durationMinutes ?? 60;
  const endsAt = new Date(
    new Date(input.startsAt).getTime() + minutes * 60000
  ).toISOString();

  const { data, error } = await sb
    .from("sessions")
    .insert({
      client_id: userId,
      expert_id: input.expertId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: endsAt,
      amount_inr: input.amountInr ?? null,
      status: "scheduled",
    })
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to book session: ${error.message}`);
  return mapSession(data as unknown as SessionRow);
}

/** Updates a session's lifecycle status (e.g. mark completed / cancel). */
export async function updateSessionStatus(
  sessionId: string,
  status: Session["status"]
): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from("sessions")
    .update({ status })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Vault
// ---------------------------------------------------------------------------

const VAULT_BUCKET = "vault";

type VaultRow = {
  id: string;
  session_id: string;
  uploaded_by: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  uploader?: { full_name: string | null } | null;
};

const VAULT_COLUMNS =
  "id, session_id, uploaded_by, name, storage_path, mime_type, size_bytes, created_at, uploader:profiles!uploaded_by ( full_name )";

function mapVaultFile(row: VaultRow): VaultFile {
  return {
    id: row.id,
    sessionId: row.session_id,
    uploadedBy: row.uploaded_by,
    uploaderName: row.uploader?.full_name ?? "Unknown",
    name: row.name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

/** Vault files for the signed-in user's sessions (RLS-scoped). */
export async function getMyVaultFiles(sessionId?: string): Promise<VaultFile[]> {
  const sb = requireClient();
  let query = sb
    .from("vault_files")
    .select(VAULT_COLUMNS)
    .order("created_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load vault files: ${error.message}`);
  return ((data ?? []) as unknown as VaultRow[]).map(mapVaultFile);
}

/** Uploads a file to Storage and records its metadata row. */
export async function uploadVaultFile(
  sessionId: string,
  file: File
): Promise<VaultFile> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to upload.");

  // Path is session-scoped so Storage policies can mirror the table's RLS.
  const storagePath = `${sessionId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await sb.storage
    .from(VAULT_BUCKET)
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error } = await sb
    .from("vault_files")
    .insert({
      session_id: sessionId,
      uploaded_by: userId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select(VAULT_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to record file: ${error.message}`);
  return mapVaultFile(data as unknown as VaultRow);
}

/** Deletes a vault file's row and its underlying Storage object. */
export async function deleteVaultFile(
  fileId: string,
  storagePath: string
): Promise<void> {
  const sb = requireClient();

  const { error } = await sb.from("vault_files").delete().eq("id", fileId);
  if (error) throw new Error(`Failed to delete file: ${error.message}`);

  // Best-effort: the metadata row is already gone, so a failure here just
  // leaves an orphaned blob rather than a dangling reference.
  await sb.storage.from(VAULT_BUCKET).remove([storagePath]);
}

/** Short-lived signed URL for downloading a private vault file. */
export async function getVaultFileUrl(
  storagePath: string,
  expiresInSeconds = 60
): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(`Failed to create download link: ${error.message}`);
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

type ThreadRow = {
  id: string;
  client_id: string;
  expert_id: string;
  client?: { full_name: string | null } | null;
  expert?: { full_name: string | null } | null;
};

/**
 * Every conversation the signed-in user is part of, with the counterpart's
 * name and a preview of the most recent message. RLS scopes the thread list;
 * the last-message lookup is a single follow-up query across all thread ids.
 */
export async function getMyChatThreads(): Promise<ChatThreadSummary[]> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: threads, error } = await sb
    .from("chat_threads")
    .select(
      "id, client_id, expert_id, client:profiles!client_id ( full_name ), expert:profiles!expert_id ( full_name )"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load conversations: ${error.message}`);
  const rows = (threads ?? []) as unknown as ThreadRow[];
  if (rows.length === 0) return [];

  const { data: recentMessages } = await sb
    .from("messages")
    .select("thread_id, body, created_at")
    .in(
      "thread_id",
      rows.map((r) => r.id)
    )
    .order("created_at", { ascending: false });

  const lastByThread = new Map<string, { body: string; created_at: string }>();
  for (const m of recentMessages ?? []) {
    const threadId = m.thread_id as string;
    if (!lastByThread.has(threadId)) {
      lastByThread.set(threadId, {
        body: m.body as string,
        created_at: m.created_at as string,
      });
    }
  }

  return rows.map((row) => {
    const isClient = row.client_id === userId;
    const last = lastByThread.get(row.id);
    return {
      id: row.id,
      counterpartId: isClient ? row.expert_id : row.client_id,
      counterpartName: isClient
        ? row.expert?.full_name ?? "Expert"
        : row.client?.full_name ?? "Client",
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
    };
  });
}

/** Finds or creates the thread between the signed-in client and an expert. */
export async function getOrCreateThread(
  clientId: string,
  expertId: string
): Promise<string> {
  const sb = requireClient();

  const { data: existing } = await sb
    .from("chat_threads")
    .select("id")
    .eq("client_id", clientId)
    .eq("expert_id", expertId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await sb
    .from("chat_threads")
    .insert({ client_id: clientId, expert_id: expertId })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to open chat: ${error.message}`);
  return data.id as string;
}

export async function getMessages(threadId: string): Promise<Message[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("messages")
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    threadId: m.thread_id as string,
    senderId: m.sender_id as string,
    body: m.body as string,
    createdAt: m.created_at as string,
  }));
}

export async function sendMessage(
  threadId: string,
  body: string
): Promise<void> {
  const sb = requireClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to send messages.");

  const { error } = await sb
    .from("messages")
    .insert({ thread_id: threadId, sender_id: userId, body });

  if (error) throw new Error(`Failed to send message: ${error.message}`);
}

/**
 * Subscribes to new messages in a thread via Supabase Realtime.
 * Returns an unsubscribe function for cleanup in a useEffect.
 */
export function subscribeToMessages(
  threadId: string,
  onMessage: (message: Message) => void
): () => void {
  const sb = requireClient();

  const channel = sb
    .channel(`messages:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const m = payload.new as Record<string, unknown>;
        onMessage({
          id: m.id as string,
          threadId: m.thread_id as string,
          senderId: m.sender_id as string,
          body: m.body as string,
          createdAt: m.created_at as string,
        });
      }
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
