/**
 * Application-facing data shapes for the SOS marketplace.
 *
 * These mirror the Supabase schema but stay UI-friendly (formatted date/time
 * strings, expert display names) for the dashboard components that consume
 * them.
 */

export type UserRole = "client" | "expert" | "admin";

export type ExpertStatus =
  | "invited"
  | "profile_submitted"
  | "approved"
  | "rejected"
  | "suspended";

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "escrow_held" | "released" | "refunded";

/** A public-facing expert card (carousel, booking dropdown, popup info page). */
export interface Expert {
  id: string;
  fullName: string;
  professionalTitle: string;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  yearsExperience: number | null;
  /** Flat per-session price in whole INR rupees. */
  sessionRateInr: number;
  avatarUrl: string | null;
  specialties: string[];
  firm: string | null;
  coaRegistration: string | null;
  credentials: string | null;
  languages: string[];
  portfolioPaths: string[];
  status: ExpertStatus;
  upiId: string | null;
}

/** A booking. `date`/`time` are pre-formatted for display. */
export interface Session {
  id: string;
  title: string;
  clientId: string;
  expertId: string;
  clientName: string;
  expertName: string;
  /** e.g. "Oct 24, 2026" */
  date: string;
  /** e.g. "10:00 AM" */
  time: string;
  /** Raw range timestamps for sorting/logic. */
  startsAt: string | null;
  endsAt: string | null;
  status: SessionStatus;
  durationMinutes: number;
  /** e.g. "60 min" */
  duration: string;
  amountInr: number | null;
  paymentStatus: PaymentStatus;
}

export interface VaultFile {
  id: string;
  sessionId: string;
  uploadedBy: string;
  uploaderName: string;
  name: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** A conversation row for a chat sidebar (client- or expert-side). */
export interface ChatThreadSummary {
  id: string;
  counterpartId: string;
  counterpartName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface MyProfile {
  id: string;
  fullName: string;
  role: UserRole;
}

/** A weekly recurring availability rule (e.g. "Mondays 09:00–17:00"). */
export interface AvailabilityRule {
  id: string;
  expertId: string;
  /** 0 = Sunday .. 6 = Saturday, matching JS Date#getDay(). */
  weekday: number;
  /** "HH:MM" 24-hour, local to the expert's stored timezone. */
  startTime: string;
  endTime: string;
}

/** A busy window (from a real booking) an expert is unavailable during. */
export interface BusyRange {
  startsAt: string;
  endsAt: string;
}

export type PaymentMethod = "razorpay_mock" | "upi_direct";
export type PaymentTxnStatus = "created" | "processing" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  sessionId: string;
  method: PaymentMethod;
  status: PaymentTxnStatus;
  amountInr: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
}
