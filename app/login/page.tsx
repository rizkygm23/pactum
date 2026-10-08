import Link from "next/link";
import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  "Meter every API call off-chain at sub-ms latency",
  "Settle in batches on Arc with a verifiable tx hash",
  "Spend policies enforce daily and monthly limits",
];

export default async function LoginPage() {
  const userId = await getSessionCookie();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh">
      {/* ── Left panel (dark brand) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[44%] shrink-0 flex-col justify-between bg-[#0f1117] px-12 py-12">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
          <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain opacity-80" />
          pactum
        </Link>

        <div>
          <blockquote className="text-3xl xl:text-4xl font-normal leading-[1.1] tracking-[-0.02em] text-white">
            &ldquo;A bill your customer can verify without asking you.&rdquo;
          </blockquote>
          <ul className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                <span className="text-sm text-white/60 leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-xs text-white/25">
          Arc Testnet · Metered billing in USDC
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile back */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="text-xs text-[#676f7b] hover:text-[#030303] transition-colors">
              ← Back to pactum
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#030303]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[#676f7b]">
              Sign in to your merchant dashboard
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-[#676f7b]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#030303] underline underline-offset-2 hover:opacity-70 transition-opacity">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
