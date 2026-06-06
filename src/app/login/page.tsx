"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "expert">("client");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (!supabase) {
        // Mock success for development if Supabase not configured
        setTimeout(() => {
          setOtpSent(true);
          setLoading(false);
        }, 1000);
        return;
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
      });
      if (error) throw error;
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!supabase) {
        // Mock success
        setTimeout(() => {
          router.push("/dashboard/client");
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
      router.push("/dashboard/client");
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleExpertLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!supabase) {
        setTimeout(() => {
          router.push("/dashboard/expert");
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Determine role from profile (mocked here, should fetch from profiles table)
      // For now we assume if they login this way they are expert or admin
      router.push("/dashboard/expert");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--border)] shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[var(--color-primary-pale)] rounded-full blur-3xl pointer-events-none"></div>

        <h1 className="font-script text-4xl text-[var(--color-primary)] mb-8 text-center">
          Secure Login
        </h1>

        <div className="flex gap-2 mb-8 bg-[var(--bg-base)] p-1 rounded-xl">
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${role === "client" ? "bg-[var(--color-primary)] text-white" : "text-[var(--text-muted)] hover:text-white"}`}
            onClick={() => setRole("client")}
          >
            Client
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${role === "expert" ? "bg-[var(--color-primary)] text-white" : "text-[var(--text-muted)] hover:text-white"}`}
            onClick={() => setRole("expert")}
          >
            Expert / Admin
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-[var(--color-pink)] text-center">{error}</div>}

        {role === "client" ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--text-faint)]">Mobile Number (India)</label>
                <div className="flex bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-[var(--color-primary)] transition-colors">
                  <span className="flex items-center justify-center px-4 font-mono-sos text-[var(--text-faint)] border-r border-[var(--border)]">
                    +91
                  </span>
                  <input 
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-transparent p-4 outline-none font-mono-sos text-lg"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || phone.length !== 10}
                className="btn-sos-filled w-full justify-center py-4 text-[13px] disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Secure OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--text-faint)]">Enter 6-digit OTP</label>
                <div className="flex justify-center gap-2">
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[1rem] text-center bg-[var(--bg-base)] border border-[var(--border)] p-4 rounded-xl outline-none font-mono-sos text-2xl focus:border-[var(--color-primary)] transition-colors"
                    placeholder="------"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || otp.length !== 6}
                className="btn-sos-filled w-full justify-center py-4 text-[13px] disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Enter"}
              </button>
              <button 
                type="button" 
                onClick={() => setOtpSent(false)}
                className="w-full text-center text-xs text-[var(--text-faint)] hover:text-white mt-4 block"
              >
                &larr; Change number
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleExpertLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--text-faint)]">Email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] p-4 rounded-xl outline-none text-md focus:border-[var(--color-primary)] transition-colors"
                placeholder="expert@sos.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--text-faint)]">Password</label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] p-4 rounded-xl outline-none text-md focus:border-[var(--color-primary)] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-sos-filled w-full justify-center py-4 text-[13px] disabled:opacity-50 mt-2"
            >
              {loading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
