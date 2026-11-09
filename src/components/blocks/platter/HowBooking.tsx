import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";

/** The three booking steps. Also shown inside "How a Session Works" on the home page. */
export const BOOKING_STEPS = [
  { id: "01", title: "Choose", desc: "Pick an expert whose work matches your project or field of interest." },
  { id: "02", title: "Brief", desc: "Upload drawings and references to a private vault before the session." },
  { id: "03", title: "Meet", desc: "Secure video, one hour, with payment held in escrow until it's done." },
];

/** P5: How booking works, three plain steps. */
export default function HowBooking() {
  return (
    <BlockFrame>
      <Reveal className="w-full flex flex-col items-center">
        <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} How Booking Works</h2>
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 text-left">
          {BOOKING_STEPS.map((step) => (
            <div key={step.id} className="flex flex-col border-t-2 border-[var(--border-strong)] pt-6">
              <span className="font-mono-sos text-[10px] tracking-[0.3em] text-[var(--color-orange)] mb-4">{step.id}</span>
              <h3 className="font-editorial text-3xl text-[var(--text-primary)] tracking-tight mb-3">{step.title}</h3>
              <p className="font-inter text-sm text-[var(--text-muted)] leading-relaxed font-light">{step.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </BlockFrame>
  );
}
