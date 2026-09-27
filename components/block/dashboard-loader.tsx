"use client";

import dynamic from "next/dynamic";

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
  return <Dashboard />;
}
