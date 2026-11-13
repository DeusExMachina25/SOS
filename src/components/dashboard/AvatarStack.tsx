interface AvatarStackProps {
  names: string[];
  /** How many initials to draw before collapsing the rest into "+N" */
  max?: number;
}

function initials(name: string): string {
  const parts = name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Overlapping initials for the people on a card. Square tiles, like the rest of the chips. */
export default function AvatarStack({ names, max = 4 }: AvatarStackProps) {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return null;
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;

  return (
    <div className="flex items-center" aria-label={unique.join(", ")}>
      {shown.map((name, i) => (
        <span
          key={name}
          title={name}
          className={`flex h-8 w-8 items-center justify-center border-2 border-[var(--bg-base)] bg-[var(--color-primary-deep)] font-mono-sos text-[9px] tracking-normal text-[#FFDAB9] ${i > 0 ? "-ml-2" : ""}`}
        >
          {initials(name)}
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-2 flex h-8 w-8 items-center justify-center border-2 border-[var(--bg-base)] bg-[var(--bg-base)] font-mono-sos text-[9px] tracking-normal text-[var(--text-primary)]">
          +{extra}
        </span>
      )}
    </div>
  );
}
