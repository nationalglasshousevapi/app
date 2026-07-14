function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  );
}

export default function CustomerDetailLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-7">
      <Skeleton className="h-4 w-32" />

      <div className="card p-6 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 text-center space-y-2">
            <Skeleton className="h-3 w-20 mx-auto" />
            <Skeleton className="h-6 w-24 mx-auto" />
          </div>
        ))}
      </div>

      <div className="card p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="card overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </main>
  );
}
