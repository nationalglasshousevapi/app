function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-44" />
        </div>
        <Skeleton className="h-12 w-44" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 md:p-6 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-24 mb-4" />
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="card p-5 md:p-6">
          <Skeleton className="h-5 w-44 mb-1" />
          <Skeleton className="h-3 w-36 mb-4" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>

      {/* Recent invoices */}
      <div className="card p-5 md:p-6">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-3 w-20 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-20 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="card p-5 md:p-6">
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-3 w-20 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
