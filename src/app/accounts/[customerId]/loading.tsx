function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  );
}

export default function CustomerLedgerLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-4 w-32 mb-6" />

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-3 min-w-[100px] space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-6 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-16 w-full mt-6 mb-6" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-6 w-24 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="card p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
