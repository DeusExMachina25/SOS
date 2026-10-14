import { formatInr } from "@/lib/data/format";

export default function LiquidWaveGauge({ percentage, balance }: { percentage: number, balance: number }) {
  const pct = Math.max(0, Math.min(100, percentage));
  const yLevel = 100 - pct;

  let color = "var(--color-green)";
  if (pct < 30) {
    color = "var(--color-orange)";
  } else if (pct < 60) {
    color = "var(--color-primary)";
  }

  return (
    <div className="relative w-44 h-44 flex items-center justify-center select-none mx-auto">
      {/* Outer Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full border flex items-center justify-center p-2 shadow-2xl transition-all duration-500"
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}1A` }}
      >
        {/* Inner Circle Frame */}
        <div className="w-full h-full rounded-full bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden relative">
          
          {/* Animated SVG Wave */}
          <svg 
            viewBox="0 0 100 100" 
            className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
            style={{ transform: `translateY(${yLevel}%)` }}
          >
            {/* Background Wave */}
            <path 
              d="M0 20 C 30 15, 70 25, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.15"
              className="animate-wave-slow"
              style={{ transformOrigin: "50% 50%" }}
            />
            {/* Foreground Wave */}
            <path 
              d="M0 20 C 30 25, 70 15, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.4"
              className="animate-wave-fast"
              style={{ transformOrigin: "50% 50%" }}
            />
          </svg>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 font-inter">
            <span className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Paid</span>
            <span className="text-2xl font-bold text-[var(--text-primary)]">{formatInr(balance)}</span>
            <span className="text-[9px] font-mono-sos text-[var(--text-muted)] tracking-wider mt-1">{pct.toFixed(0)}% Settled</span>
          </div>

        </div>
      </div>
      
    </div>
  );
}
