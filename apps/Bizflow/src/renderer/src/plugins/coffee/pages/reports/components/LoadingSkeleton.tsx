export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(7)].map((_, j) => (
                <div key={j} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
