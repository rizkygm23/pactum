"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9!@#$%^&*]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_BAR   = ["", "bg-red-500", "bg-amber-500", "bg-amber-400", "bg-green-500"];
const STRENGTH_TEXT  = ["", "text-red-600", "text-amber-600", "text-amber-500", "text-green-600"];

export function SignupForm() {
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [agreed,      setAgreed]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const router = useRouter();

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError("Please acknowledge the terms to continue."); return; }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, company_name: companyName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); setLoading(false); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[#e7eaf0] bg-white px-4 py-3 text-[15px] text-[#030303] placeholder-[#939393] outline-none transition-all focus:border-[#030303] focus:ring-2 focus:ring-black/8";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-sm font-medium text-[#030303]">Email</label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className={inputCls} placeholder="you@company.com" required autoComplete="email" />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="signup-password" className="block text-sm font-medium text-[#030303]">Password</label>
        <div className="relative">
          <input id="signup-password" type={showPw ? "text" : "password"} value={password}
            onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`}
            placeholder="Min. 8 characters" required minLength={6} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[#939393] hover:text-[#030303] transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_BAR[strength] : "bg-[#e7eaf0]"}`} />
              ))}
            </div>
            <p className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>{STRENGTH_LABEL[strength]}</p>
          </div>
        )}
      </div>

      {/* Company name */}
      <div className="space-y-1.5">
        <label htmlFor="signup-company" className="block text-sm font-medium text-[#030303]">
          Company name <span className="text-[#939393] font-normal">(optional)</span>
        </label>
        <input id="signup-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          className={inputCls} placeholder="e.g. Acme AI Labs" autoComplete="organization" />
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded shrink-0 accent-black" />
        <span className="text-sm text-[#676f7b] leading-relaxed">
          I understand that Pactum is on <strong className="text-[#030303] font-medium">Arc Testnet</strong> — no real funds are at stake.
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" disabled={loading || !agreed}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#030303] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a1a1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
