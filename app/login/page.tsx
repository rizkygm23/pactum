import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const userId = await getSessionCookie();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        {/* Way back — every page keeps an exit */}
        <div className="mb-6">
          <Link
            href="/"
            className="focus-ring text-xs text-slate transition-colors hover:text-ink"
          >
            ← Back to pactum
          </Link>
        </div>

        {/* Brand mark */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="display-face text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl">
            pactum
          </h1>
          <p className="mt-2 text-sm text-slate">
            Billing infrastructure for AI SaaS on Arc
          </p>
        </div>

        {/* Login card */}
        <div className="card">
          <h2 className="mb-5 text-base font-medium text-ink sm:mb-6">Sign in</h2>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="focus-ring font-semibold text-ink underline-offset-2 hover:underline"
            >
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
