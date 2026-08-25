"use client";

import Link from "next/link";
import { ArrowRight, PackageSearch, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import companyData from "@/data/company-demo/company-data.json";
import { readWorkflowShipments, WORKFLOW_EVENT, type WorkflowShipment } from "@/lib/client-workflow-store";
import { cn } from "@/lib/utils";

type ShipmentStatus = "All" | "Active" | "Booked" | "Picked Up" | "In Transit" | "Out for Delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
type ShipmentRow = { id: string; pssTracking: string; courierTracking: string; client: string; origin: string; destination: string; courier: string; status: Exclude<ShipmentStatus, "All" | "Active">; pieces: number; weight: string; eta: string; booked: string };

const statuses: ShipmentStatus[] = ["All", "Active", "Booked", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Delayed", "Exception", "Returned", "Cancelled"];
const activeStatuses = new Set(["Booked", "Picked Up", "In Transit", "Out for Delivery", "Delayed", "Exception"]);
const displayStatus = (status: string): ShipmentRow["status"] => status === "Picked up" ? "Picked Up" : status as ShipmentRow["status"];
const workflowRow = (item: WorkflowShipment): ShipmentRow => ({ id: item.id, pssTracking: item.pssTracking, courierTracking: item.courierTracking, client: item.client, origin: item.origin, destination: item.destination, courier: item.courier, status: displayStatus(item.status || item.shipmentStatus), pieces: item.pieces, weight: item.weight, eta: item.eta, booked: item.bookingDate });

const seededRows: ShipmentRow[] = companyData.deliveries.map((item) => ({ id: item.id, pssTracking: item.id, courierTracking: item.courierTracking, client: item.client, origin: item.origin, destination: item.destination, courier: item.courier, status: displayStatus(item.status), pieces: item.pieces, weight: item.weight, eta: item.eta, booked: item.booked }));
const searchable = (row: ShipmentRow) => [row.pssTracking, row.courierTracking, row.client, row.origin, row.destination, row.courier].join(" ").toLowerCase();

const statusStyles: Record<ShipmentRow["status"], string> = {
  Booked: "bg-blue-500/10 text-blue-700 dark:text-blue-300", "Picked Up": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "In Transit": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "Out for Delivery": "bg-amber-500/10 text-amber-700 dark:text-amber-300", Delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Delayed: "bg-amber-500/10 text-amber-700 dark:text-amber-300", Exception: "bg-destructive/10 text-destructive", Returned: "bg-violet-500/10 text-violet-700 dark:text-violet-300", Cancelled: "bg-muted text-muted-foreground",
};

export default function AllShipments() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("All");
  const [workflowRows, setWorkflowRows] = useState<ShipmentRow[]>([]);
  useEffect(() => { const sync = () => setWorkflowRows(readWorkflowShipments().map(workflowRow)); sync(); window.addEventListener(WORKFLOW_EVENT, sync); return () => window.removeEventListener(WORKFLOW_EVENT, sync); }, []);
  const rows = useMemo(() => [...workflowRows, ...seededRows], [workflowRows]);
  const counts = useMemo(() => statuses.reduce<Record<ShipmentStatus, number>>((result, item) => { result[item] = item === "All" ? rows.length : item === "Active" ? rows.filter((row) => activeStatuses.has(row.status)).length : rows.filter((row) => row.status === item).length; return result; }, {} as Record<ShipmentStatus, number>), [rows]);
  const filtered = useMemo(() => rows.filter((row) => (!query.trim() || searchable(row).includes(query.trim().toLowerCase())) && (status === "All" || status === "Active" ? status === "All" || activeStatuses.has(row.status) : row.status === status)), [query, rows, status]);

  return <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 w-full flex-col gap-3 overflow-hidden">
    <div className="relative flex min-w-0 items-center rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><Search className="ml-3 size-4 shrink-0 text-muted-foreground" /><input aria-label="Search all shipments" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments, references, customers, or cities…" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/70" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="mr-2 rounded p-1 text-muted-foreground hover:bg-accent"><X className="size-3.5" /></button>}</div>
    <div className="flex min-h-0 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Shipment status filters">{statuses.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition", status === item ? "bg-background text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-background/70 hover:text-foreground")}><span>{item}</span><span className={cn("text-[11px] tabular-nums", status === item ? "text-primary" : "text-muted-foreground/80")}>{counts[item]}</span></button>)}</div>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs"><div className="flex shrink-0 items-center justify-end border-b border-border px-4 py-3 text-xs text-muted-foreground"><span className="hidden sm:inline">Select a shipment to open tracking</span></div>{filtered.length ? <div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur"><tr>{["PSS tracking", "Courier reference", "Client / route", "Courier", "Status", "Pieces", "Weight", "ETA", "Booked"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{filtered.map((row) => <tr key={`${row.id}-${row.courierTracking}`} className="transition hover:bg-accent/30"><td className="px-4 py-3 font-mono font-semibold"><Link href={`/dashboard/shipmentTracking?id=${encodeURIComponent(row.pssTracking)}`} className="inline-flex items-center gap-1.5 hover:text-primary">{row.pssTracking}<PackageSearch className="size-3.5" /></Link></td><td className="px-4 py-3 font-mono text-muted-foreground">{row.courierTracking}</td><td className="px-4 py-3"><p className="font-medium">{row.client}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">{row.origin}<ArrowRight className="size-3" />{row.destination}</p></td><td className="px-4 py-3">{row.courier}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", statusStyles[row.status])}>{row.status}</span></td><td className="px-4 py-3">{row.pieces}</td><td className="px-4 py-3">{row.weight}</td><td className="px-4 py-3">{row.eta}</td><td className="px-4 py-3 text-muted-foreground">{row.booked}</td></tr>)}</tbody></table></div> : <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center"><Search className="mb-2 size-5 text-muted-foreground/60" /><p className="text-sm font-semibold">No shipments found</p><p className="mt-1 text-xs text-muted-foreground">Try another search or status.</p></div>}</div>
  </div>;
}
