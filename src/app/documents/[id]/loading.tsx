function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  );
}

export default function DocumentLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />

      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 md:p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
        <div className="card p-5 md:p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 md:p-6 space-y-3">
        <Skeleton className="h-5 w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-24 w-56 rounded-2xl" />
      </div>
    </div>
  );
}
