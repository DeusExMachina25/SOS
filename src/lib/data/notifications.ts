/**
 * What needs the signed-in user's attention, worked out from their sessions
 * and payments. There is no notifications table: every item here is true
 * right now and disappears as soon as the underlying thing is dealt with, so
 * nothing can go stale or need marking as read.
 */

import type { Payment, Session } from "./types";
import type { UnreadThread } from "./unread";

export interface Notice {
  id: string;
  title: string;
  detail: string;
  href: string;
  /** "action" needs something from the user and is counted on the bell; "info" is just status. */
  tone: "action" | "info";
}

const HOUR = 3600_000;
const SOON_WINDOW = 24 * HOUR;

const roleBase = (role: "client" | "expert") => `/dashboard/${role}`;

function callHref(s: Session) {
  return `/dashboard/video-call?sessionId=${s.id}&sessionName=${encodeURIComponent(s.title)}`;
}

function when(s: Session) {
  return `${s.date} • ${s.time}`;
}

export function buildNotices(input: {
  role: "client" | "expert";
  sessions: Session[];
  payments: Payment[];
  now: number;
  /** Conversations with unread messages. Optional: the bell still works without them. */
  unread?: UnreadThread[];
}): Notice[] {
  const { role, sessions, payments, now, unread = [] } = input;
  const base = roleBase(role);
  const paymentOf = new Map(payments.map((p) => [p.sessionId, p]));
  const out: (Notice & { sortKey: number })[] = [];

  for (const t of unread) {
    if (t.unread <= 0) continue;
    out.push({
      id: `msg-${t.threadId}`,
      tone: "action",
      title: t.unread === 1 ? `New message from ${t.counterpartName}` : `${t.unread} new messages from ${t.counterpartName}`,
      detail: "Open your conversation",
      href: `${base}/chat`,
      sortKey: 0, // messages first: someone is waiting
    });
  }

  for (const s of sessions) {
    if (s.status !== "scheduled") continue;
    const start = s.startsAt ? new Date(s.startsAt).getTime() : null;
    const end = s.endsAt ? new Date(s.endsAt).getTime() : null;
    const payment = paymentOf.get(s.id);
    const unpaid = s.paymentStatus === "unpaid";
    const awaitingUpi = payment?.method === "upi_direct" && payment.status === "processing";
    const paid = s.paymentStatus === "escrow_held" || s.paymentStatus === "released";
    const startsSoon = start !== null && start > now && start - now <= SOON_WINDOW;
    const startedAlready = start !== null && start <= now;
    const sortKey = start ?? Number.MAX_SAFE_INTEGER;

    if (role === "client") {
      if (unpaid && !awaitingUpi) {
        out.push({
          id: `pay-${s.id}`,
          tone: "action",
          title: `Payment due: ${s.title}`,
          detail: `${s.expertName} • ${when(s)}`,
          href: `${base}/sessions`,
          sortKey,
        });
      } else if (awaitingUpi) {
        out.push({
          id: `upi-wait-${s.id}`,
          tone: "info",
          title: `Waiting for ${s.expertName} to confirm your UPI payment`,
          detail: `${s.title} • ${when(s)}`,
          href: `${base}/sessions`,
          sortKey,
        });
      }
      if (paid && (startsSoon || (startedAlready && (end === null || end > now)))) {
        out.push({
          id: `soon-${s.id}`,
          tone: "action",
          title: startedAlready ? `Live now: ${s.title}` : `Starting soon: ${s.title}`,
          detail: `${s.expertName} • ${when(s)}`,
          href: callHref(s),
          sortKey: sortKey - 1,
        });
      }
    } else {
      if (awaitingUpi) {
        out.push({
          id: `upi-${s.id}`,
          tone: "action",
          title: `Confirm payment received from ${s.clientName}`,
          detail: `${s.title} • ${when(s)}`,
          href: `${base}/sessions`,
          sortKey: sortKey - 2,
        });
      }
      if (paid && startedAlready && (end === null || end <= now)) {
        out.push({
          id: `complete-${s.id}`,
          tone: "action",
          title: `Mark as completed: ${s.title}`,
          detail: `${s.clientName} • ${when(s)}`,
          href: `${base}/sessions`,
          sortKey,
        });
      }
      if (paid && (startsSoon || (startedAlready && end !== null && end > now))) {
        out.push({
          id: `soon-${s.id}`,
          tone: "action",
          title: startedAlready ? `Live now: ${s.title}` : `Starting soon: ${s.title}`,
          detail: `${s.clientName} • ${when(s)}`,
          href: callHref(s),
          sortKey: sortKey - 1,
        });
      }
      if (unpaid && !awaitingUpi && startsSoon) {
        out.push({
          id: `unpaid-${s.id}`,
          tone: "info",
          title: `${s.clientName} hasn't paid yet for ${s.title}`,
          detail: when(s),
          href: `${base}/sessions`,
          sortKey,
        });
      }
    }
  }

  return out
    .sort((a, b) => (a.tone === b.tone ? a.sortKey - b.sortKey : a.tone === "action" ? -1 : 1))
    .map((item) => {
      const { sortKey, ...rest } = item;
      void sortKey;
      return rest;
    });
}

export function actionCount(notices: Notice[]): number {
  return notices.filter((n) => n.tone === "action").length;
}
