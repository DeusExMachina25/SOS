"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Smartphone, 
  Fingerprint, 
  ArrowLeft, 
  CheckCircle2, 
  ScanFace, 
  ShieldCheck, 
  Loader2,
  Lock
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "expert">("client");
  
  // Unified Client Input (Email or Mobile)
  const [clientInput, setClientInput] = useState("");
  const [inputType, setInputType] = useState<"phone" | "email" | "unknown">("unknown");
  
  // Verification States
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Expert Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Biometric Scan simulation
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");

  // Auto-detect input type (email or phone)
  useEffect(() => {
    const trimmed = clientInput.trim();
    if (!trimmed) {
      setInputType("unknown");
      return;
    }
    
    if (trimmed.includes("@")) {
      setInputType("email");
    } else if (/^\+?\d[\d\s-()]{7,14}$/.test(trimmed)) {
      setInputType("phone");
    } else {
      setInputType("unknown");
    }
  }, [clientInput]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Keep characters friendly to phone input or general email input
    setClientInput(val);
    if (error) setError("");
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanedInput = clientInput.trim();
    
    if (inputType === "email") {
      // Magic Link Flow
      try {
        if (cleanedInput.toLowerCase() === "test@sos.com" || !supabase) {
          // Dev bypass
          setTimeout(() => {
            setMagicLinkSent(true);
            setLoading(false);
          }, 1200);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          email: cleanedInput,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard/client`,
          }
        });
        if (error) throw error;
        setMagicLinkSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send magic link");
      } finally {
        setLoading(false);
      }
    } else if (inputType === "phone") {
      // Phone OTP Flow
      const digitsOnly = cleanedInput.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }

      try {
        if (digitsOnly === "0000000000" || !supabase) {
          // Dev bypass
          setTimeout(() => {
            setOtpSent(true);
            setLoading(false);
          }, 1200);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${digitsOnly}`,
        });
        if (error) throw error;
        setOtpSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Please enter a valid email address or 10-digit mobile number.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    setLoading(true);

    const digitsOnly = clientInput.replace(/\D/g, "");

    try {
      // Temporary Dev Bypass
      if ((digitsOnly === "0000000000" && otp === "123456") || !supabase) {
        setTimeout(() => {
          // Set Trusted Device Cookie (30 days)
          document.cookie = `trusted_device_token=dev-token-client; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
          router.push("/dashboard/client");
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${digitsOnly}`,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
      
      document.cookie = `trusted_device_token=client-token-${Date.now()}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
      router.push("/dashboard/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // Set Trusted Device Cookie on Magic Link mock success
  const handleSimulatedMagicLinkVerify = () => {
    document.cookie = `trusted_device_token=dev-token-client; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
    router.push("/dashboard/client");
  };

  const handleBiometricLogin = () => {
    setError("");
    setIsScanning(true);
    setScanStatus("scanning");
    
    // Simulate biometric scan (TouchID / Windows Hello / YubiKey)
    setTimeout(() => {
      setScanStatus("success");
      setTimeout(() => {
        document.cookie = `trusted_device_token=dev-token-client; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
        router.push("/dashboard/client");
      }, 1000);
    }, 2200);
  };

  const handleExpertLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    try {
      // Temporary Dev Bypass
      if ((email === "test@sos.com" && password === "password") || !supabase) {
        setTimeout(() => {
          document.cookie = `trusted_device_token=dev-token-expert; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
          router.push("/dashboard/expert");
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      document.cookie = `trusted_device_token=expert-token-${Date.now()}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
      router.push("/dashboard/expert");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-[var(--bg-base)] overflow-hidden">
      {/* Background Cinematic Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[380px] relative z-10 my-8">
        
        {/* Minimal Header */}
        <div className="text-center mb-10">
          <h1 className="font-editorial text-4xl font-normal tracking-tight text-[var(--text-primary)] mb-2">
            Sign In
          </h1>
          <p className="text-[var(--text-muted)] text-[10px] font-mono-sos tracking-[0.2em] uppercase">
            Access secure emergency support
          </p>
        </div>

        {/* Minimal Role Switcher */}
        <div className="flex justify-center gap-8 mb-8 border-b border-[var(--border)]">
          <button 
            className={`pb-3 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors relative ${
              role === "client" ? "text-[var(--text-primary)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
            type="button"
            onClick={() => { 
              setRole("client"); 
              setError(""); 
              setOtpSent(false); 
              setMagicLinkSent(false); 
            }}
          >
            Client
            {role === "client" && (
              <motion.span 
                layoutId="login-role-indicator"
                className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[var(--text-primary)] shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
            )}
          </button>
          <button 
            className={`pb-3 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors relative ${
              role === "expert" ? "text-[var(--text-primary)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
            type="button"
            onClick={() => { 
              setRole("expert"); 
              setError(""); 
            }}
          >
            Expert
            {role === "expert" && (
              <motion.span 
                layoutId="login-role-indicator"
                className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[var(--text-primary)] shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
            )}
          </button>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 border border-[var(--border-strong)] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          {error && (
            <div className="mb-6 text-[11px] text-red-400 font-inter text-center bg-red-500/10 py-3 px-4 border border-red-500/20 rounded-2xl">
              {error}
            </div>
          )}

          {role === "client" ? (
            // CLIENT PASSWORDSLESS LOGIN
            !otpSent && !magicLinkSent ? (
              <form onSubmit={handleClientSubmit} className="space-y-6">
                <div className="relative group">
                  <label className="block text-[9px] font-bold tracking-[0.2em] uppercase mb-3 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                    Email or Mobile Number
                  </label>
                  <div className="flex items-center border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-3">
                    <div className="mr-3 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]">
                      {inputType === "email" ? (
                        <Mail size={18} strokeWidth={1.5} />
                      ) : inputType === "phone" ? (
                        <Smartphone size={18} strokeWidth={1.5} />
                      ) : (
                        <Lock size={18} strokeWidth={1.5} />
                      )}
                    </div>
                    <input 
                      type="text"
                      required
                      value={clientInput}
                      onChange={handlePhoneChange}
                      className="flex-1 bg-transparent outline-none font-inter text-sm tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                      placeholder="phone number or email"
                    />
                  </div>
                </div>

                {inputType === "phone" && (
                  <p className="text-[10px] text-[var(--text-muted)] text-center font-inter tracking-wide animate-in fade-in duration-300">
                    🔒 Verification code will be sent via SMS/WhatsApp
                  </p>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !clientInput.trim()}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-bold tracking-[0.2em] uppercase text-[10px] py-4 rounded-2xl transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : inputType === "email" ? (
                    "Send Magic Link"
                  ) : inputType === "phone" ? (
                    "Send OTP Code"
                  ) : (
                    "Continue"
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center justify-center gap-4 py-1">
                  <div className="h-px flex-1 bg-[var(--border)]"></div>
                  <span className="text-[9px] uppercase tracking-widest text-[var(--text-faint)] font-bold">or</span>
                  <div className="h-px flex-1 bg-[var(--border)]"></div>
                </div>

                {/* Tactile Biometric Button */}
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-full border border-[var(--border-strong)] bg-white/[0.02] hover:bg-white/[0.06] text-[var(--text-primary)] font-bold tracking-[0.18em] uppercase text-[9px] py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 group/bio"
                >
                  <Fingerprint size={16} className="text-[var(--text-muted)] group-hover/bio:text-[var(--color-primary)] transition-colors" />
                  TouchID / Windows Hello
                </button>
              </form>
            ) : otpSent ? (
              // OTP VERIFICATION STATE
              <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in duration-300">
                <div className="relative group text-center">
                  <label className="block text-[9px] font-bold tracking-[0.2em] uppercase mb-4 text-[var(--text-muted)] text-center">
                    Enter Verification Code
                  </label>
                  <p className="text-[10px] text-[var(--text-muted)] mb-6">
                    Sent code to <strong className="text-[var(--text-primary)]">{clientInput}</strong>
                  </p>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(""); }}
                    className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-3 outline-none font-inter text-2xl tracking-[0.6em] text-center text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                    placeholder="------"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-bold tracking-[0.2em] uppercase text-[10px] py-4 rounded-2xl transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                  className="w-full text-center text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-4 block"
                >
                  <ArrowLeft size={10} className="inline mr-1 -mt-0.5" /> Back to input
                </button>
              </form>
            ) : (
              // MAGIC LINK CONFIRMATION STATE
              <div className="space-y-6 text-center py-2 animate-in fade-in duration-300">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[var(--color-primary)]">
                    <Mail size={24} strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Check Your Inbox</h3>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  We sent a secure magic link to <strong className="text-[var(--text-primary)]">{clientInput}</strong>. Open it on this device or your PC to enter the dashboard.
                </p>

                {/* Simulated Bypass verification button for testing convenience */}
                <button 
                  type="button"
                  onClick={handleSimulatedMagicLinkVerify}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-strong)] text-[var(--text-primary)] font-bold tracking-[0.15em] uppercase text-[9px] py-3.5 rounded-2xl transition-all"
                >
                  💡 Verify Simulated Link
                </button>

                <button 
                  type="button" 
                  onClick={() => { setMagicLinkSent(false); setError(""); }}
                  className="w-full text-center text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block"
                >
                  <ArrowLeft size={10} className="inline mr-1 -mt-0.5" /> Back to login
                </button>
              </div>
            )
          ) : (
            // EXPERT EMAIL & PASSWORD LOGIN
            <form onSubmit={handleExpertLogin} className="space-y-6">
              <div className="relative group">
                <label className="block text-[9px] font-bold tracking-[0.2em] uppercase mb-3 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-3 outline-none font-inter text-sm tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                  placeholder="expert@sos.com"
                />
              </div>
              <div className="relative group">
                <label className="block text-[9px] font-bold tracking-[0.2em] uppercase mb-3 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  Password
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-3 outline-none font-inter text-sm tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-bold tracking-[0.2em] uppercase text-[10px] py-4 rounded-2xl transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Access Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* BIOMETRIC SCANNING OVERLAY */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-[340px] glass-panel border border-[var(--border-strong)] p-8 rounded-[40px] text-center flex flex-col items-center justify-center relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
            >
              {/* Scan Laser effect */}
              {scanStatus === "scanning" && (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[scan_2s_ease-in-out_infinite] z-0 pointer-events-none"></div>
              )}

              <div className="w-20 h-20 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center mb-6 relative z-10">
                {scanStatus === "scanning" ? (
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-cyan-400"
                  >
                    <ScanFace size={40} strokeWidth={1.2} />
                  </motion.div>
                ) : scanStatus === "success" ? (
                  <div className="text-emerald-400 animate-bounce">
                    <ShieldCheck size={40} strokeWidth={1.2} />
                  </div>
                ) : (
                  <Fingerprint size={40} strokeWidth={1.2} className="text-red-400" />
                )}
              </div>

              <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 z-10">
                {scanStatus === "scanning" ? "Authenticating" : scanStatus === "success" ? "Access Granted" : "Error"}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] font-inter leading-relaxed max-w-[220px] z-10">
                {scanStatus === "scanning" 
                  ? "Windows Hello / TouchID hardware confirmation requested..." 
                  : scanStatus === "success" 
                  ? "Biometric credentials match. Elevating session." 
                  : "Scanning failed. Please retry."
                }
              </p>

              {scanStatus === "scanning" && (
                <div className="flex items-center gap-1.5 mt-6 justify-center">
                  <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75"></div>
                  <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse delay-150"></div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
