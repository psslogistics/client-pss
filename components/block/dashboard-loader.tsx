"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { pssApi } from "@/lib/pss-api";

const dashboardSummaryPath = "/v1/dashboard/summary?collections=shipments,pickups,billing,wallet,exceptions,ndr,activity";

const Dashboard = dynamic(() => import("@/components/block/dashboard"), {
  ssr: false,
  loading: () => (
    <section className="w-full space-y-4" role="status" aria-live="polite">
      <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card" />)}
      </div>
      <div className="min-h-[420px] animate-pulse rounded-xl border border-border bg-card" />
    </section>
  ),
});

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
