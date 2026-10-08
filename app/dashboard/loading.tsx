const sk = "rounded bg-[#e7eaf0] animate-pulse";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 sm:mb-8">
        <div className={`h-6 w-40 ${sk}`} />
        <div className={`h-4 w-64 ${sk} mt-2`} />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#e7eaf0] bg-white p-4">
            <div className={`h-3 w-20 ${sk}`} />
            <div className={`h-7 w-24 ${sk} mt-3`} />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#e7eaf0] bg-white p-5">
        <div className={`h-3 w-32 ${sk} mb-5`} />
        <div className="divide-y divide-[#e7eaf0]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full ${sk} shrink-0`} />
                <div className="space-y-1.5">
                  <div className={`h-3 w-36 ${sk}`} />
                  <div className={`h-2.5 w-24 ${sk}`} />
                </div>
              </div>
              <div className={`h-4 w-20 ${sk}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
