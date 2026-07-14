function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  );
}

export default function AccountsLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-4 w-32 mb-6" />
      <Skeleton className="h-8 w-36 mb-6" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-full mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
