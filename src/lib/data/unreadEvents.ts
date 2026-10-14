const EVENT = "sos:unread-changed";

/** Tell the rest of the dashboard (sidebar badge, bell) to recount unread messages. */
export function notifyUnreadChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onUnreadChanged(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
