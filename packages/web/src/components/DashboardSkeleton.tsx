import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0" />
      </div>

      <div className="mb-4">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>

      <div className="mt-6">
        <Skeleton className="h-64" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}
