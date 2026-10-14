import { BADGE_CLASS, type PaymentBadge } from "@/lib/data/paymentBadge";

export default function PaymentBadgeChip({ badge, className = "" }: { badge: PaymentBadge; className?: string }) {
  return (
    <div
      title={badge.hint}
      className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest border ${BADGE_CLASS[badge.tone]} ${className}`}
    >
      {badge.label}
    </div>
  );
}
