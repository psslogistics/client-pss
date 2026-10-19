"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { pssApi } from "@/lib/pss-api";
import { Skeleton, SkeletonButton, SkeletonChart, SkeletonHeading, SkeletonKpi, SkeletonText } from "@/components/ui/skeleton";

const Dashboard = dynamic(() => import("@/components/block/dashboard"), {
  ssr: false,
  loading: () => (
    <div className="w-full space-y-5" role="status" aria-label="Loading dashboard" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><SkeletonText className="w-32" /><SkeletonHeading className="mt-2 w-56" /><SkeletonText className="mt-2 w-72" /></div><div className="flex gap-2"><SkeletonButton /><SkeletonButton className="w-28" /></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <SkeletonKpi key={index} />)}</div>
      <div className="grid min-h-[20rem] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]"><SkeletonChart className="min-h-[320px]" /><SkeletonChart className="min-h-[320px]" /></div>
      <div className="grid min-h-[18rem] grid-cols-1 gap-5 lg:grid-cols-3"><SkeletonChart className="lg:col-span-2 min-h-[288px]" /><Skeleton className="min-h-[288px] rounded-xl border border-border/70 bg-card/70" />
      </div>
    </div>
  ),
});

const dashboardSummaryPath = "/v1/dashboard/summary?collections=shipments,pickups,exceptions,ndr,activity";

export default function DashboardLoader() {
  // Start the authenticated summary request from the small route loader while
  // the heavier dashboard module is still being downloaded and evaluated.
  // pssApi deduplicates this request with Dashboard's own load, so the data
  // round-trip is moved earlier without creating a second request.
  useEffect(() => {
    void pssApi(dashboardSummaryPath).catch(() => undefined);
  }, []);
  return <Dashboard />;
}
