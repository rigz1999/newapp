// ============================================
// Skeleton Loading Components
// Path: src/components/Skeleton.tsx
// ============================================

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <Skeleton className="h-6 w-2/3 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-6 w-28 mb-1.5" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <Skeleton className="h-5 w-48 mb-3" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
