import { Skeleton, SkeletonChart, SkeletonHeading, SkeletonKpi, SkeletonText } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading client workspace" aria-busy="true">
    <section><SkeletonText className="w-32" /><SkeletonHeading className="mt-2" /><SkeletonText className="mt-2 w-72" /></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <SkeletonKpi key={index} />)}</section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]"><SkeletonChart className="min-h-[320px]" /><SkeletonChart className="min-h-[320px]" /></section>
    <section className="grid gap-5 lg:grid-cols-3"><SkeletonChart className="lg:col-span-2" /><Skeleton className="min-h-[288px] rounded-xl border border-border/70 bg-card/70" /></section>
  </div>;
}
