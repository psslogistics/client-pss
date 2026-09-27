"use client";

import { useEffect } from "react";
import { pssApi } from "@/lib/pss-api";
import Dashboard from "@/components/block/dashboard";

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
