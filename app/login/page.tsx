import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const userId = await getSessionCookie();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-navy px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-8 sm:mb-10">
          <h1
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-parchment mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pactum
          </h1>
          <p className="text-foreground-dim text-sm">
            Billing infrastructure for AI SaaS on Arc
          </p>
        </div>

        {/* Login card */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-medium text-parchment mb-5 sm:mb-6">Sign in</h2>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-foreground-dim">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-brass hover:text-brass-glow transition-colors">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
