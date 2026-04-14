import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Search bar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-56 rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="bg-card h-8 border-b border-border" />
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex h-10 items-center px-4 gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton 
                  key={j} 
                  className="h-4" 
                  style={{ 
                    width: `${Math.floor(Math.random() * 40) + 40}%`,
                    flex: 1
                  }} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
