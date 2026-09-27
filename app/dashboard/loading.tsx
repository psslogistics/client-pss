export default function DashboardLoading() {
  return <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading client dashboard">
    <section><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Client workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Loading live shipment and account data…</p></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card" />)}</section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]"><div className="h-72 animate-pulse rounded-xl border border-border bg-card" /><div className="h-72 animate-pulse rounded-xl border border-border bg-card" /></section>
  </div>;
}
