import Link from "next/link";

/**
 * N9 — edge-aligned minimal.
 * Wordmark hard-left, one CTA hard-right, nothing in between.
 * No pill, no blur backdrop, no centred link cluster.
 */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-border">
      <nav className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="focus-ring display-face text-lg font-semibold text-parchment no-wrap"
        >
          Pactum
        </Link>

        {signedIn ? (
          <Link
            href="/dashboard"
            className="focus-ring text-sm font-medium text-parchment no-wrap border-b border-brass pb-0.5 transition-colors hover:text-brass"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="focus-ring text-sm font-medium text-parchment no-wrap border-b border-brass pb-0.5 transition-colors hover:text-brass"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
