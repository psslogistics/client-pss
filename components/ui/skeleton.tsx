import { cn } from "@/lib/utils"
import styles from "./skeleton.module.css"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-ghost rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonProvider({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn(styles.provider, "rounded-md", className)} {...props} />
}

function SkeletonText({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-3", className)} {...props} />
}

function SkeletonHeading({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-6 w-56", className)} {...props} />
}

function SkeletonButton({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-9 w-24 rounded-lg", className)} {...props} />
}

function SkeletonInput({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-10 w-full rounded-lg", className)} {...props} />
}

function SkeletonBadge({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-6 w-20 rounded-full", className)} {...props} />
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("rounded-xl border border-border/70 bg-card/70", className)} {...props} />
}

function SkeletonKpi({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <SkeletonCard className={cn("h-[104px] p-5", className)} {...props}>
      <Skeleton className="h-5 w-5 rounded-md" />
      <Skeleton className="mt-4 h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-16" />
    </SkeletonCard>
  )
}

function SkeletonTable({ rows = 6, columns = 6, className, ...props }: React.ComponentProps<"div"> & { rows?: number; columns?: number }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)} {...props}>
      <div className="flex h-11 items-center gap-4 border-b border-border bg-muted/30 px-4">
        {Array.from({ length: columns }, (_, index) => <Skeleton key={index} className={cn("h-3", index === 0 ? "w-28" : "w-20")} />)}
      </div>
      <div className="divide-y divide-border/70">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex min-h-14 items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, column) => <Skeleton key={column} className={cn("h-3", column === 0 ? "w-28" : column === 1 ? "w-36" : "w-20")} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonTimeline({ items = 5, className, ...props }: React.ComponentProps<"div"> & { items?: number }) {
  return (
    <div className={cn("space-y-5", className)} {...props}>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex w-7 flex-col items-center"><Skeleton className="size-7 rounded-full" />{index < items - 1 && <Skeleton className="mt-2 h-8 w-0.5" />}</div>
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-40" /><SkeletonText className="w-64 max-w-full" /><SkeletonText className="w-28" /></div>
        </div>
      ))}
    </div>
  )
}

function SkeletonSplitPane({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid min-h-[520px] gap-0 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.4fr)]", className)} {...props}><div className="border-b border-border p-4 lg:border-b-0 lg:border-r"><SkeletonInput className="mb-4" />{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} className="mb-2 h-16" />)}</div><div className="space-y-4 p-5"><SkeletonHeading /><SkeletonText className="w-72" /><div className="space-y-3 pt-4"><SkeletonText className="w-full" /><SkeletonText className="w-5/6" /><SkeletonText className="w-2/3" /></div><SkeletonInput className="mt-8" /></div></div>
}

function SkeletonChart({ className, ...props }: React.ComponentProps<"div">) {
  return <SkeletonCard className={cn("min-h-[288px] p-5", className)} {...props}><Skeleton className="h-4 w-32" /><SkeletonText className="mt-2 w-48" /><div className="mt-8 flex h-40 items-end justify-around gap-3"><Skeleton className="h-16 w-8 rounded-t-lg" /><Skeleton className="h-28 w-8 rounded-t-lg" /><Skeleton className="h-24 w-8 rounded-t-lg" /><Skeleton className="h-36 w-8 rounded-t-lg" /><Skeleton className="h-20 w-8 rounded-t-lg" /></div></SkeletonCard>
}

function SkeletonFormSection({ fields = 6, className, ...props }: React.ComponentProps<"div"> & { fields?: number }) {
  return <SkeletonCard className={cn("p-4", className)} {...props}><div className="flex items-center justify-between"><Skeleton className="h-5 w-32" /><SkeletonButton className="w-36" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Array.from({ length: fields }, (_, index) => <SkeletonInput key={index} className={index === 2 ? "sm:col-span-2" : ""} />)}</div></SkeletonCard>
}

export { Skeleton, SkeletonProvider, SkeletonText, SkeletonHeading, SkeletonButton, SkeletonInput, SkeletonBadge, SkeletonCard, SkeletonKpi, SkeletonTable, SkeletonTimeline, SkeletonSplitPane, SkeletonChart, SkeletonFormSection }
