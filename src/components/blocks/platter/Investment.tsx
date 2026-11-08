"use client";

import { useRouter } from "next/navigation";
import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";
import { useExperts } from "../experts/useExperts";
import { formatInr } from "@/lib/data/format";

/**
 * P6: one flat rate per expert, taken from the same record the checkout
 * charges, so the price shown is always the price paid.
 */
export default function Investment() {
  const router = useRouter();
  const { experts } = useExperts();

  return (
    <BlockFrame>
      <Reveal className="w-full flex flex-col items-center">
        <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} Investment</h2>

        <div className="w-full max-w-3xl text-left">
          <p className="font-inter text-sm font-light text-[var(--text-muted)] mb-7">
            One flat rate per 60-minute session, set by each expert. The price you see here is the price you pay.
          </p>

          <ul className="border border-[var(--border-strong)] rounded-[10px] overflow-hidden bg-[var(--bg-surface-2)]">
            {experts.map((e) => (
              <li
                key={e.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 md:p-6 border-b border-[var(--border-strong)] last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-editorial text-[22px] font-light text-[var(--text-primary)] leading-tight">
                    {e.full_name}
                  </div>
                  <div className="font-mono-sos text-[10px] tracking-[0.14em] uppercase text-[var(--text-muted)] mt-1">
                    {e.expert_role}
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="font-editorial text-[30px] font-normal text-[var(--text-primary)] leading-none tracking-tight">
                    {e.session_rate_inr ? formatInr(e.session_rate_inr) : "On request"}
                  </div>
                  {e.session_rate_inr ? (
                    <div className="font-mono-sos text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] mt-1">
                      per 60 min
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("platter_selected_expert", e.id);
                    router.push("/login");
                  }}
                  className="btn-sos shrink-0 sm:min-w-[9rem]"
                >
                  Book session
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-[var(--border)] w-full text-left">
            <div className="font-inter text-xs text-[var(--text-muted)] font-light">
              A written summary is delivered within 48 hours of every session.
            </div>
          </div>
        </div>
      </Reveal>
    </BlockFrame>
  );
}
