export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="h-6 w-40 rounded bg-hairline animate-pulse" />
        <div className="h-4 w-64 rounded bg-hairline animate-pulse mt-2" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-3 w-20 rounded bg-hairline animate-pulse" />
            <div className="h-7 w-24 rounded bg-hairline animate-pulse mt-3" />
          </div>
        ))}
      </div>

      {/* Recent list */}
      <div className="card">
        <div className="h-3 w-32 rounded bg-hairline animate-pulse mb-5" />
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ledger-row flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-hairline animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3 w-36 rounded bg-hairline animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-hairline animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-hairline animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
