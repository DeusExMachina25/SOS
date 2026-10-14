/**
 * Shared formatting helpers so booking display stays consistent between the
 * dashboards, and so we format dates in exactly one place.
 */

/** "Oct 24, 2026" */
export function formatSessionDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "10:00 AM" */
export function formatSessionTime(iso: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "60 min" */
export function formatDuration(minutes: number | null): string {
  return `${minutes ?? 60} min`;
}

/** "₹5,000" — INR, no decimals (rates are whole rupees). */
export function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2.4 MB" — human file size from raw bytes. */
export function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** "pdf" | "image" | "archive" | "file" — coarse kind for icon selection. */
export function fileKindOf(mimeType: string | null, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return "image";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  return "file";
}

/** "10:45 AM" (today) or "Oct 24" (older) — chat list / bubble timestamps. */
export function formatMessageTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Combines a date input ("2026-10-24") and a 12-hour time ("10:00 AM") into a
 * UTC ISO timestamp for storage. Returns null if either part is unusable.
 */
export function toScheduledAtIso(
  dateInput: string,
  timeLabel: string
): string | null {
  const match = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!dateInput || !match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const [year, month, day] = dateInput.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;

/**
 * Cleans a display name typed by a user: collapses runs of whitespace and
 * trims. Returns the cleaned name, or an error message when it can't be used
 * (too short/long, or contains control characters that would break layouts
 * and emails).
 */
export function normalizeDisplayName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  if (/[\u0000-\u001f\u007f]/.test(raw.replace(/\s/g, " "))) {
    return { ok: false, error: "Names can't contain control characters." };
  }
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < DISPLAY_NAME_MIN) return { ok: false, error: `Enter at least ${DISPLAY_NAME_MIN} characters.` };
  if (name.length > DISPLAY_NAME_MAX) return { ok: false, error: `Keep it under ${DISPLAY_NAME_MAX} characters.` };
  return { ok: true, name };
}
