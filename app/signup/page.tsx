import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const userId = await getSessionCookie();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-navy px-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-semibold tracking-tight text-parchment mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pactum
          </h1>
          <p className="text-foreground-dim text-sm">
            Create your account
          </p>
        </div>

        {/* Signup card */}
        <div className="card">
          <h2 className="text-lg font-medium text-parchment mb-6">Sign up</h2>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-foreground-dim">
            Already have an account?{" "}
            <a href="/login" className="text-brass hover:text-brass-glow transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
