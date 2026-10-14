"use client";

import { useCallback, useEffect, useState } from "react";
import { getUnreadThreads, subscribeToMyMessages } from "@/lib/data/queries";
import { onUnreadChanged } from "@/lib/data/unreadEvents";
import type { UnreadThread } from "@/lib/data/unread";

const REFRESH_MS = 60_000;

/**
 * The signed-in user's unread conversations, kept fresh: on mount, on every
 * route change, every minute, when a conversation is read elsewhere on the
 * page, and the moment a new message arrives. If counting fails (for example
 * the database hasn't been updated yet) it quietly shows none, because a
 * missing badge is better than a broken dashboard.
 */
export function useUnreadThreads(enabled: boolean, refreshKey: string): UnreadThread[] {
  const [threads, setThreads] = useState<UnreadThread[]>([]);

  const load = useCallback(() => {
    if (!enabled) return;
    getUnreadThreads()
      .then(setThreads)
      .catch((err) => console.error("Could not load unread counts", err));
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(load, REFRESH_MS);
    const off = onUnreadChanged(load);
    const unsubscribe = subscribeToMyMessages(() => load());
    return () => {
      clearInterval(id);
      off();
      unsubscribe();
    };
  }, [enabled, load]);

  return enabled ? threads : [];
}
