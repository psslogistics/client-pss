"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { pssApi } from "@/lib/pss-api";

const Dashboard = dynamic(() => import("@/components/block/dashboard"), {
  ssr: false,
  loading: () => (
    <div className="w-full space-y-4" role="status" aria-label="Loading dashboard">
      <div className="h-5 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-card/70" />)}
      </div>
      <div className="grid min-h-[20rem] grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-xl border border-border bg-card/70 animate-pulse" />)}
      </div>
    </div>
  ),
});

const dashboardSummaryPath = "/v1/dashboard/summary?collections=shipments,pickups,billing,wallet,exceptions,ndr,activity";

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
