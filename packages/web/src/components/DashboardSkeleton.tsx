function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Block className="h-7 w-64" />
          <Block className="h-4 w-48" />
          <Block className="h-4 w-40" />
          <Block className="h-4 w-56" />
          <Block className="h-4 w-56" />
        </div>
        <Block className="h-8 w-24" />
      </div>

      {/* Freshness */}
      <div className="mb-4">
        <Block className="h-4 w-32" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
      </div>

      {/* Chart-sized blocks */}
      <div className="mt-6">
        <Block className="h-64" />
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Block className="h-48" />
        <Block className="h-48" />
      </div>
    </div>
  )
}
