"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { 
  Mail, 
  Smartphone, 
  ArrowLeft, 
  Loader2,
  Lock
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "expert">("client");
  
  // Unified Client Input (Email or Mobile)
  const [clientInput, setClientInput] = useState("");
  
  // Derive input type directly during render
  const trimmedInput = clientInput.trim();
  const cleanDigits = trimmedInput.replace(/[\s-()]/g, "");
  const startsWithNumbers = /^\d{6,}/.test(cleanDigits);

  const inputType = startsWithNumbers ? "phone" : "email";
  
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const cleanedVal = val.trim();
    
    // Automatically strip leading +91 or 91 if it starts with it, so it aligns with the visual +91 prefix!
    if (cleanedVal.startsWith("+91")) {
      val = cleanedVal.substring(3).trim();
    } else if (cleanedVal.startsWith("91") && cleanedVal.replace(/\D/g, "").length === 12) {
      val = cleanedVal.substring(2).trim();
    }

    // If it's a phone number sequence, keep only digits and cap at 10
    const testDigits = val.replace(/[\s-()]/g, "");
    if (/^\d{6,}/.test(testDigits)) {
      val = val.replace(/\D/g, "").slice(0, 10);
    }
    
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
      let phoneNum = cleanedInput.replace(/\D/g, "");
      if (phoneNum.length === 12 && phoneNum.startsWith("91")) {
        phoneNum = phoneNum.slice(2);
      }

      if (phoneNum.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }

      try {
        if (phoneNum === "0000000000" || !supabase) {
          // Dev bypass
          setTimeout(() => {
            setOtpSent(true);
            setLoading(false);
          }, 1200);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${phoneNum}`,
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

    let phoneNum = clientInput.replace(/\D/g, "");
    if (phoneNum.length === 12 && phoneNum.startsWith("91")) {
      phoneNum = phoneNum.slice(2);
    }

    try {
      // Temporary Dev Bypass
      if ((phoneNum === "0000000000" && otp === "123456") || !supabase) {
        setTimeout(() => {
          // Set Trusted Device Cookie (30 days)
          document.cookie = `trusted_device_token=dev-token-client; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax; Secure`;
          router.push("/dashboard/client");
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phoneNum}`,
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-950/3 rounded-full blur-[200px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[500px] relative z-10 my-24 md:my-32">
        
        {/* Minimal Header */}
        <div className="text-center mb-20">
          <h1 className="font-inter text-4xl md:text-5xl font-light tracking-[0.15em] text-[var(--text-primary)] uppercase">
            Sign In
          </h1>
        </div>

        {/* Minimal Role Switcher */}
        <div className="flex justify-center gap-20 mb-16 border-b border-[var(--border)]">
          <button 
            className={`pb-5 text-[12px] font-mono-sos font-bold tracking-[0.3em] uppercase transition-colors relative ${
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
            className={`pb-5 text-[12px] font-mono-sos font-bold tracking-[0.3em] uppercase transition-colors relative ${
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

        {/* Form Container (Extremely Minimalistic & Borderless) */}
        <div className="p-0 border-none bg-transparent shadow-none">
          {error && (
            <div className="mb-12 text-[11px] text-red-400 font-mono-sos text-center bg-red-500/10 py-5 px-6 border border-red-500/25 rounded-none">
              {error}
            </div>
          )}

          {role === "client" ? (
            // CLIENT PASSWORDSLESS LOGIN
            !otpSent && !magicLinkSent ? (
              <form onSubmit={handleClientSubmit} className="space-y-14">
                <div className="relative group">
                  <label className="block text-[10px] font-mono-sos font-bold tracking-[0.3em] uppercase mb-6 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                    Email or Mobile Number
                  </label>
                  <div className="flex items-center border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-6">
                    {inputType === "phone" && (
                      <span className="font-inter text-lg font-light text-[var(--text-primary)] mr-2 tracking-wide select-none animate-in fade-in slide-in-from-left-2 duration-300">
                        +91
                      </span>
                    )}
                    <input 
                      type="text"
                      required
                      value={clientInput}
                      onChange={handlePhoneChange}
                      maxLength={inputType === "phone" ? 10 : undefined}
                      className="flex-1 bg-transparent outline-none font-inter text-lg font-light tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                      placeholder="phone number or email"
                    />
                  </div>
                </div>

                {inputType === "phone" && (
                  <p className="text-[10px] text-[var(--text-muted)] text-center font-mono-sos tracking-wide leading-relaxed animate-in fade-in duration-300">
                    Verification code will be sent via SMS/WhatsApp
                  </p>
                )}

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={loading || !clientInput.trim()}
                    className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos font-bold tracking-[0.3em] uppercase text-[12px] py-6 rounded-none transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                </div>
              </form>
            ) : otpSent ? (
              // OTP VERIFICATION STATE
              <form onSubmit={handleVerifyOtp} className="space-y-14 animate-in fade-in duration-300">
                <div className="relative group text-center">
                  <label className="block text-[10px] font-mono-sos font-bold tracking-[0.3em] uppercase mb-6 text-[var(--text-muted)] text-center">
                    Enter Verification Code
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] mb-10 font-mono-sos">
                    Sent to <strong className="text-[var(--text-primary)]">{clientInput}</strong>
                  </p>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(""); }}
                    className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-6 outline-none font-inter text-4xl font-light tracking-[0.8em] text-center text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                    placeholder="------"
                  />
                </div>
                
                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos font-bold tracking-[0.3em] uppercase text-[12px] py-6 rounded-none transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                  className="w-full text-center text-[10px] uppercase tracking-[0.25em] font-mono-sos font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-8 block"
                >
                  <ArrowLeft size={12} className="inline mr-1.5 -mt-0.5" /> Back to input
                </button>
              </form>
            ) : (
              // MAGIC LINK CONFIRMATION STATE
              <div className="space-y-10 text-center py-6 animate-in fade-in duration-300">
                <h3 className="text-base font-mono-sos tracking-[0.2em] text-[var(--text-primary)] uppercase">Check Your Inbox</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed font-inter font-light">
                  We sent a secure magic link to <strong className="text-[var(--text-primary)]">{clientInput}</strong>. Open it on this device or your PC to enter the dashboard.
                </p>

                {/* Simulated Bypass verification button for testing convenience */}
                <div className="pt-4">
                  <button 
                    type="button"
                    onClick={handleSimulatedMagicLinkVerify}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-strong)] text-[var(--text-primary)] font-mono-sos font-bold tracking-[0.25em] uppercase text-[10px] py-5 rounded-none transition-all"
                  >
                    💡 Verify Simulated Link
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setMagicLinkSent(false); setError(""); }}
                  className="w-full text-center text-[10px] uppercase tracking-[0.25em] font-mono-sos font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block"
                >
                  <ArrowLeft size={12} className="inline mr-1.5 -mt-0.5" /> Back to login
                </button>
              </div>
            )
          ) : (
            // EXPERT EMAIL & PASSWORD LOGIN
            <form onSubmit={handleExpertLogin} className="space-y-14">
              <div className="relative group">
                <label className="block text-[10px] font-mono-sos font-bold tracking-[0.3em] uppercase mb-6 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-6 outline-none font-inter text-lg font-light tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                  placeholder="expert@sos.com"
                />
              </div>
              <div className="relative group">
                <label className="block text-[10px] font-mono-sos font-bold tracking-[0.3em] uppercase mb-6 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  Password
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-transparent border-b border-[var(--border)] group-focus-within:border-[var(--text-primary)] transition-colors pb-6 outline-none font-inter text-lg font-light tracking-wide text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos font-bold tracking-[0.3em] uppercase text-[12px] py-6 rounded-none transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? "Authenticating..." : "Access Dashboard"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
