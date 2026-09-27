"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin, Receipt, WalletCards } from "lucide-react";
import type { ClientFinancialSnapshot } from "@/lib/client-dashboard-data";
import { formatINR } from "@/lib/client-finance-data";

type DelayedRow = {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  carrier: string;
  mode: string;
  date: string;
};

type PickupRow = {
  pickupId: string;
  timeSlot: string;
  status: string;
  company: string;
  location: string;
  pcs: string;
  kg: string;
  badgeClass: string;
  dotClass: string;
};

export default function ClientDashboardOperations({
  delayedRows,
  todayPickupRows,
  financialSnapshot,
}: {
  delayedRows: DelayedRow[];
  todayPickupRows: PickupRow[];
  financialSnapshot: ClientFinancialSnapshot;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:h-[32rem] lg:grid-cols-3 animate-in fade-in duration-200">
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">Delayed Shipments</h3>
          </div>
          <Link href="/dashboard/shipmentTracking" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View radar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto custom-scrollbar">
          {delayedRows.map((shp) => (
            <Link key={shp.id} href={`/dashboard/shipmentTracking?id=${shp.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-amber-500/5 hover:-translate-y-0.5 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">{shp.trackingId}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20">
                    <Clock className="h-2.5 w-2.5" /> Delayed
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground font-medium">{shp.origin} → {shp.destination} · <span className="text-foreground/80">{shp.carrier}</span></p>
              </div>
              <div className="hidden text-right sm:block shrink-0">
                <span className="inline-block rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">{shp.mode}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{shp.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Today&apos;s Pickups</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">{todayPickupRows.length} Active</span>
          </div>
          <Link href="/dashboard/pickupRequests" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">All pickups <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto custom-scrollbar">
          {!todayPickupRows.length && <div className="grid min-h-28 place-items-center px-5 py-8 text-center text-xs text-muted-foreground">No active pickups scheduled for today.</div>}
          {todayPickupRows.map((pku) => (
            <Link key={pku.pickupId} href="/dashboard/pickupRequests" className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/40 group">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-linear-to-b from-primary/15 to-primary/5 border border-primary/20 py-1.5 shadow-2xs"><span className="text-[9px] font-bold uppercase tracking-wider text-primary">Time</span><span className="text-xs font-extrabold tabular-nums text-foreground">{pku.timeSlot}</span></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">{pku.pickupId}</span><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pku.badgeClass}`}><span className={`h-1.5 w-1.5 rounded-full ${pku.dotClass}`} />{pku.status}</span></div>
                <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{pku.company}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0 text-primary/70" />{pku.location}</p>
              </div>
              <div className="hidden text-right sm:block shrink-0"><span className="inline-block rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">{pku.pcs} pcs · {pku.kg} kg</span></div>
            </Link>
          ))}
        </div>
      </div>

      <FinancialSnapshotCard snapshot={financialSnapshot} />
    </div>
  );
}

function FinancialSnapshotCard({ snapshot }: { snapshot: ClientFinancialSnapshot }) {
  const hasData = snapshot.balance !== null || snapshot.pendingCharges !== null || snapshot.codExposure !== null || snapshot.recentTransactions.length > 0;
  return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Financial Snapshot</h3></div><Link href="/dashboard/walletManagement" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Wallet <ArrowRight className="size-3" /></Link></div>
    {hasData ? <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available balance</p><p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{snapshot.balance === null ? "Not available" : formatINR(snapshot.balance)}</p></div><div className="grid grid-cols-2 gap-2"><FinanceMetric label="Pending charges" value={snapshot.pendingCharges === null ? "Not available" : formatINR(snapshot.pendingCharges)} /><FinanceMetric label="COD exposure" value={snapshot.codExposure === null ? "Not available" : formatINR(snapshot.codExposure)} /></div><div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-foreground">Recent activity</p><Link href="/dashboard/billingInvoiceManagement" className="text-[11px] font-medium text-primary hover:underline">Billing</Link></div>{snapshot.recentTransactions.length ? <div className="space-y-1.5">{snapshot.recentTransactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-2 text-[11px]"><span className="min-w-0 truncate font-medium text-foreground">{transaction.reference}</span><span className={transaction.direction === "credit" ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-foreground"}>{transaction.direction === "credit" ? "+" : "-"}{formatINR(transaction.amount)}</span></div>)}</div> : <p className="text-xs text-muted-foreground">No recent wallet transactions.</p>}</div></div> : <div className="flex flex-1 flex-col items-center justify-center p-6 text-center"><Receipt className="size-9 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold text-foreground">No financial data available</p><p className="mt-1 text-xs text-muted-foreground">Balance, charges, and COD exposure will appear when client finance records are available.</p><Link href="/dashboard/walletManagement" className="mt-4 text-xs font-medium text-primary hover:underline">Open Wallet</Link></div>}
  </div>;
}

function FinanceMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-semibold tabular-nums text-foreground">{value}</p></div>;
}
