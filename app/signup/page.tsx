import Link from "next/link";
import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";
import { Zap, ShieldCheck, BarChart3 } from "lucide-react";

const BENEFITS = [
  { icon: Zap,          text: "Meter every API call in under 1ms — no performance hit" },
  { icon: ShieldCheck,  text: "SHA-256 key hashing, HMAC sessions, RLS-secured database" },
  { icon: BarChart3,    text: "Live usage dashboard, spend limits, and settlement history" },
];

export default async function SignupPage() {
  const userId = await getSessionCookie();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[44%] shrink-0 flex-col justify-between bg-[#0f1117] px-12 py-12">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
          <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain opacity-80" />
          pactum
        </Link>

        <div>
          <h2 className="text-3xl xl:text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-white">
            Start billing your users in minutes.
          </h2>
          <p className="mt-4 text-sm text-white/50 leading-relaxed">
            No credit card required. Arc Testnet. No real funds at stake.
          </p>
          <ul className="mt-10 space-y-5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 shrink-0">
                  <Icon className="w-4 h-4 text-white/80" />
                </span>
                <span className="text-sm text-white/60 leading-relaxed pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-xs text-white/25">
          Arc Testnet · Metered billing in USDC
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="text-xs text-[#676f7b] hover:text-[#030303] transition-colors">
              ← Back to pactum
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#030303]">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-[#676f7b]">
              Free on Arc Testnet — no real funds involved.
            </p>
          </div>

          <SignupForm />

          <p className="mt-6 text-center text-sm text-[#676f7b]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#030303] underline underline-offset-2 hover:opacity-70 transition-opacity">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
