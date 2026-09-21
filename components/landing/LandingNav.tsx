import Link from "next/link";

/**
 * nav-bar — canvas background, 64px height, wordmark hard-left, action
 * hard-right. Divided from the page by spacing, not a hairline.
 */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="bg-canvas">
      <nav className="flex h-16 items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="focus-ring no-wrap flex items-center gap-2 text-lg font-semibold tracking-tight text-ink"
        >
          <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain" />
          pactum
        </Link>

        {signedIn ? (
          <Link
            href="/dashboard"
            className="focus-ring no-wrap btn-text-link"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="focus-ring no-wrap btn-text-link"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
