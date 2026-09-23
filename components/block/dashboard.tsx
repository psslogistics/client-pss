"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  TriangleAlert,
  Clock,
  ArrowRight,
  Bell,
  Truck,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  X,
  Check,
  PieChart,
  BarChart3,
  WalletCards,
  Receipt,
} from "lucide-react";
import {
  DashboardAlert,
  ActivityItem,
  KpiMetric,
} from "./dashboard-data";
import type { ClientFinancialSnapshot } from "@/lib/client-dashboard-data";
import { formatINR } from "@/lib/client-finance-data";
import { pssApi } from "@/lib/pss-api";
import ClientReportPreview from "./client-report-preview";

function relativeTime(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function activityIconType(action: string): ActivityItem["iconType"] {
  const normalized = action.toLowerCase();
  if (normalized.includes("exception") || normalized.includes("ndr") || normalized.includes("failed")) return "warning";
  if (normalized.includes("created") || normalized.includes("booked")) return "primary";
  if (normalized.includes("delivered") || normalized.includes("completed")) return "info";
  return "muted";
}

function activityIconName(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("exception") || normalized.includes("ndr") || normalized.includes("failed")) return "TriangleAlert";
  if (normalized.includes("pickup")) return "Truck";
  if (normalized.includes("setting")) return "Settings";
  return "Package";
}

export default function Dashboard() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now] = useState(() => Date.now());
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [productionError, setProductionError] = useState("");
  const [production, setProduction] = useState<{ shipments: Array<Record<string, unknown>>; pickups: Array<Record<string, unknown>>; billing: Array<Record<string, unknown>>; wallet: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>>; ndr: Array<Record<string, unknown>> }>({ shipments: [], pickups: [], billing: [], wallet: [], exceptions: [], ndr: [] });

  const loadProduction = (signal?: AbortSignal) => {
    return pssApi<{ data: { shipments: Array<Record<string, unknown>>; pickups: Array<Record<string, unknown>>; billing: Array<Record<string, unknown>>; wallet: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>>; ndr: Array<Record<string, unknown>>; activity: Array<Record<string, unknown>> } }>("/v1/dashboard/summary", { signal }).then(({ data }) => {
      if (signal?.aborted) return;
      setProductionError("");
      setProduction({ shipments: data.shipments, pickups: data.pickups, billing: data.billing, wallet: data.wallet, exceptions: data.exceptions, ndr: data.ndr });
      setActivities(data.activity.slice(0, 12).map((row) => ({ id: String(row.id), title: String(row.action ?? "Activity"), description: `${String(row.entity_type ?? "Record")}${row.entity_id ? ` · ${String(row.entity_id)}` : ""}`, timeAgo: relativeTime(String(row.created_at ?? "")), iconType: activityIconType(String(row.action ?? "")), iconName: activityIconName(String(row.action ?? "")) })));
      setAlerts([...data.exceptions, ...data.ndr].filter((row) => !["resolved", "closed", "delivered", "cancelled"].includes(String(row.status ?? "").toLowerCase())).slice(0, 8).map((row) => ({ id: String(row.id), title: String(row.title ?? row.reason ?? "Operational exception"), description: String(row.details ?? row.notes ?? "Requires operational review"), timeAgo: relativeTime(String(row.created_at ?? "")), refId: String(row.shipment_id ?? row.id), type: "warning", dotColor: "bg-amber-500" })));
    }).catch((error) => {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      setProductionError(error instanceof Error ? error.message : "Unable to load production dashboard data.");
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadProduction(controller.signal);
    return () => controller.abort();
  }, []);

  // Column 3 Segmented View Toggle ("summary" | "modes")
  const [column3View, setColumn3View] = useState<"summary" | "modes">("summary");

  // Keep the first render identical on the server and client.
  const defaultKpiIds = ["shipments", "active", "delayed", "exceptions", "pickups"];
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>(defaultKpiIds);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(defaultKpiIds);

  // Load browser-only preferences after hydration.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const kpis = JSON.parse(localStorage.getItem("pss_selected_kpis") || "null");
        if (Array.isArray(kpis) && kpis.length > 0 && kpis.length <= 5) setSelectedKpiIds(kpis);
      } catch { /* Ignore invalid saved preferences. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  // Pulsing Alerts Modal State
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Esc Key Listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAlertsModalOpen(false);
        setIsCustomizeOpen(false);
        setIsReportOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handleOpenCustomize = () => {
    setTempSelectedIds([...selectedKpiIds]);
    setIsCustomizeOpen(true);
  };

  const handleToggleKpi = (id: string) => {
    if (tempSelectedIds.includes(id)) {
      setTempSelectedIds(tempSelectedIds.filter((item) => item !== id));
    } else {
      if (tempSelectedIds.length < 5) {
        setTempSelectedIds([...tempSelectedIds, id]);
      }
    }
  };

  const handleSaveKpis = () => {
    if (tempSelectedIds.length === 0) return;
    setSelectedKpiIds(tempSelectedIds);
    try {
      localStorage.setItem("pss_selected_kpis", JSON.stringify(tempSelectedIds));
    } catch {
      // Ignore
    }
    setIsCustomizeOpen(false);
  };

  const handleResetKpis = () => {
    setTempSelectedIds(defaultKpiIds);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadProduction().finally(() => setIsRefreshing(false));
  };

  const handleDismissAlerts = () => {
    setAlerts([]);
  };

  const handleDismissSingleAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const liveKpiMetrics: KpiMetric[] = [
    { id: "shipments", title: "Total shipments", value: String(production.shipments.length), change: "Live", isPositive: true, sparklinePoints: "0,20 15,18 30,22 45,14 60,16 75,8", category: "Operations", description: "Production shipment records" },
    { id: "active", title: "Active shipments", value: String(production.shipments.filter((shipment) => !["delivered", "cancelled", "Delivered", "Cancelled"].includes(String(shipment.status ?? ""))).length), change: "Live", isPositive: true, sparklinePoints: "0,22 15,20 30,18 45,20 60,12 75,10", category: "Operations", description: "Shipments not delivered or cancelled" },
    { id: "delayed", title: "Delayed shipments", value: String(production.shipments.filter((shipment) => { const edd = shipment.edd ? Date.parse(String(shipment.edd)) : NaN; return Number.isFinite(edd) && edd < now && !["delivered", "Delivered"].includes(String(shipment.status ?? "")); }).length), change: "Live", isPositive: false, sparklinePoints: "0,10 15,12 30,9 45,16 60,14 75,20", category: "Exceptions", description: "Based on EDD and delivery status" },
    { id: "exceptions", title: "Open exceptions", value: String(production.exceptions.length + production.ndr.length), change: "Live", isPositive: false, sparklinePoints: "0,20 15,17 30,18 45,12 60,14 75,10", category: "Exceptions", description: "NDR and exception records" },
    { id: "pickups", title: "Open pickups", value: String(production.pickups.filter((pickup) => !["completed", "cancelled", "Completed", "Cancelled"].includes(String(pickup.status ?? ""))).length), change: "Live", isPositive: true, sparklinePoints: "0,22 15,18 30,20 45,15 60,13 75,8", category: "Operations", description: "Open production pickup requests" },
    { id: "billing", title: "Pending billing", value: String(production.billing.filter((item) => String(item.status ?? "").toLowerCase() === "pending").length), change: "Live", isPositive: false, sparklinePoints: "0,18 15,18 30,16 45,13 60,15 75,11", category: "Finance", description: "Pending production billing records" },
  ];

  // Filtered active KPI objects (limit to max 5)
  const activeKpis = selectedKpiIds
    .map((id) => liveKpiMetrics.find((m) => m.id === id))
    .filter((m): m is KpiMetric => m !== undefined)
    .slice(0, 5);


  const renderActivityIcon = (iconName: string) => {
    switch (iconName) {
      case "TriangleAlert":
        return <TriangleAlert className="h-4 w-4" />;
      case "Package":
        return <Package className="h-4 w-4" />;
      case "Truck":
        return <Truck className="h-4 w-4" />;
      case "RotateCcw":
        return <RotateCcw className="h-4 w-4" />;
      case "Settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const statusCounts = new Map<string, number>(); production.shipments.forEach((shipment) => { const status = String(shipment.status ?? "Booked"); statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1); });
  const totalShipments = production.shipments.length;
  const activeShipments = production.shipments.filter((shipment) => ["booked", "picked_up", "in_transit", "out_for_delivery", "Booked", "Picked Up", "In Transit", "Out for Delivery"].includes(String(shipment.status ?? ""))).length;
  const delayedRows = production.shipments.filter((shipment) => { const edd = shipment.edd ? Date.parse(String(shipment.edd)) : NaN; const delivered = shipment.delivered_at ? Date.parse(String(shipment.delivered_at)) : NaN; return Number.isFinite(edd) && ((Number.isFinite(delivered) && delivered > edd) || (!Number.isFinite(delivered) && edd < now)); }).map((shipment) => ({ id: String(shipment.id), trackingId: String(shipment.tracking_number ?? shipment.id), origin: String(shipment.origin ?? "Origin pending"), destination: String(shipment.destination ?? "Destination pending"), carrier: String(shipment.provider ?? "Courier pending"), mode: String(shipment.provider ?? "—"), date: String(shipment.edd ?? "—") }));
  const delayedShipments = delayedRows.length;
  const exceptionShipments = production.exceptions.length + production.ndr.length;
  const shipmentStatusData = [...statusCounts.entries()].map(([status, count]) => ({ status, count, percentage: totalShipments ? Math.round((count / totalShipments) * 100) : 0, badgeClass: "border-primary/20 bg-primary/10 text-primary", dotClass: "bg-primary", barClass: "bg-primary" }));
  const transportCounts = new Map<string, number>(); production.shipments.forEach((shipment) => { const mode = String(shipment.provider ?? "Unassigned"); transportCounts.set(mode, (transportCounts.get(mode) ?? 0) + 1); });
  const transportModes = [...transportCounts.entries()].map(([name, shipments]) => ({ name, shipments, percentage: totalShipments ? Math.round((shipments / totalShipments) * 100) : 0, color: "var(--primary)" }));
  const financialSnapshot: ClientFinancialSnapshot = { balance: production.wallet.length ? Number(production.wallet[0].balance_after ?? 0) : null, pendingCharges: production.billing.filter((item) => String(item.status).toLowerCase() === "pending").reduce((sum, item) => sum + Number(item.amount ?? 0), 0) || null, codExposure: null, recentTransactions: [] };
  const todayIso = new Date().toISOString().slice(0, 10);
  const closedPickupStatuses = new Set(["completed", "cancelled", "failed"]);
  const todayPickupRows = production.pickups
    .filter((pickup) => {
      const status = String(pickup.status ?? "requested").trim().toLowerCase();
      const date = String(pickup.requested_date ?? pickup.scheduled_date ?? "").slice(0, 10);
      return date === todayIso && !closedPickupStatuses.has(status);
    })
    .map((pickup) => {
      const status = String(pickup.status ?? "requested").trim().toLowerCase();
      const label = status.replace(/(^|_)(\w)/g, (_, __, letter: string) => ` ${letter.toUpperCase()}`).trim();
      return { pickupId: String(pickup.id), timeSlot: String(pickup.requested_time_slot ?? pickup.window ?? "—"), status: label, company: String(pickup.client_id ?? "Client"), location: String(pickup.pickup_address ?? pickup.location ?? "Location pending"), pcs: "—", kg: "—", badgeClass: "border-primary/20 bg-primary/10 text-primary", dotClass: "bg-primary" };
    });

  return (
    <div className="w-full space-y-4">
      {productionError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{productionError}</div>}
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{totalShipments} shipments</span><span>·</span><span>{activeShipments} active</span><span className="text-amber-600 dark:text-amber-300">· {delayedShipments} delayed</span><span className="text-destructive">· {exceptionShipments} exception{exceptionShipments === 1 ? "" : "s"}</span></div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {/* URGENT POLICE EMERGENCY SIREN ALERTS BUTTON */}
          <button
            onClick={() => setIsAlertsModalOpen(true)}
            className="relative overflow-hidden inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-all h-9 rounded-md px-3.5 gap-2 cursor-pointer shadow-lg animate-police-siren"
          >
            {/* 360-degree beacon sweep reflection overlay */}
            <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent animate-siren-sweep pointer-events-none" />
            <Bell className="h-4 w-4 stroke-[2.5] relative z-10" />
            <span className="relative z-10">Alerts</span>
            {alerts.length > 0 && (
              <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-slate-900 font-extrabold text-[11px] px-1 shadow-md">
                {alerts.length}
              </span>
            )}
          </button>

          {/* CUSTOMIZE KPIS BUTTON */}
          <button
            onClick={handleOpenCustomize}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-1.5 cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Customize KPIs
          </button>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
           <button onClick={() => setIsReportOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 shadow-sm">
             <FileText className="mr-1.5 h-4 w-4" />
             Prepare Report
          </button>
          <button 
            onClick={()=>{router.push("/dashboard/shipmentBooking");}}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 shadow-sm">
            <Package className="mr-1.5 h-4 w-4" />
            Booking
          </button>
          <button 
            onClick={()=>{router.push("/dashboard/pickupRequests");}}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 shadow-sm">
            <Truck className="mr-1.5 h-4 w-4" />
            Pickup
          </button>
          
          <button 
            onClick={()=>{router.push("/dashboard/walletManagement");}}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 shadow-sm">
            {/* <Truck className="mr-1.5 h-4 w-4" /> */}
            Wallet
          </button>
        </div>
      </div>

      {/* Customizable KPI Cards Grid (5-Column Layout) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {activeKpis.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-xl border border-border bg-card text-card-foreground shadow-xs relative overflow-hidden p-4 transition-all hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground truncate">{kpi.title}</p>
                <p className="text-xl font-bold tracking-tight tabular-nums text-foreground truncate">
                  {kpi.value}
                </p>
              </div>
              <div className="text-primary/70 shrink-0">
                <svg width="68" height="24" viewBox="0 0 80 28" preserveAspectRatio="none">
                  <polyline
                    points={kpi.sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                  kpi.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {kpi.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {kpi.change}
              </span>
              <span className="text-[11px] text-muted-foreground">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* SPACIOUS & ELEGANT 4-PART HORIZONTAL ROW */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-stretch">
          {/* Shipment Status Chart (2 Parts / 50% Width) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Shipment Status
              </h3>
              <p className="text-xs text-muted-foreground">
                Your current shipment distribution
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-5 sm:flex-row">
            {shipmentStatusData.length > 0 ? (() => {
              const total = shipmentStatusData.reduce((sum, item) => sum + item.count, 0);
              let offset = 0;
              return <>
                <div className="relative grid size-52 shrink-0 place-items-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Shipment status distribution">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--muted)" strokeWidth="14" />
                    {shipmentStatusData.map((item, index) => {
                      const circumference = 2 * Math.PI * 38;
                      const length = (item.count / total) * circumference;
                      const dashOffset = -offset;
                      offset += length;
                      const isActive = selectedStatus === null || selectedStatus === item.status;
                      const colors = ["var(--primary)", "#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"];
                      return <circle key={item.status} cx="50" cy="50" r="38" fill="none" stroke={colors[index % colors.length]} strokeWidth={selectedStatus === item.status ? 17 : 14} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} className={`cursor-pointer transition-all duration-300 ${isActive ? "opacity-100" : "opacity-25"}`} tabIndex={0} role="button" aria-label={`${item.status}: ${item.count} shipments`} onMouseEnter={() => setSelectedStatus(item.status)} onMouseLeave={() => setSelectedStatus(null)} onFocus={() => setSelectedStatus(item.status)} onBlur={() => setSelectedStatus(null)} onClick={() => setSelectedStatus(selectedStatus === item.status ? null : item.status)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedStatus(selectedStatus === item.status ? null : item.status); } }} />;
                    })}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <PieChart className="mb-1 size-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums text-foreground">{selectedStatus ? shipmentStatusData.find((item) => item.status === selectedStatus)?.count : total}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{selectedStatus || "Total shipments"}</span>
                  </div>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  {shipmentStatusData.map((item) => <button type="button" key={item.status} onClick={() => setSelectedStatus(selectedStatus === item.status ? null : item.status)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${selectedStatus === item.status ? "bg-primary/10" : "hover:bg-muted/60"}`}><span className="flex items-center gap-2 font-semibold text-foreground"><span className="size-2.5 rounded-full bg-primary" />{item.status}</span><span className="tabular-nums text-muted-foreground">{item.count} <span className="ml-1 text-[10px]">({item.percentage}%)</span></span></button>)}
                </div>
              </>;
            })() : <div className="py-16 text-center"><PieChart className="mx-auto size-9 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold text-foreground">No shipment data available</p><p className="mt-1 text-xs text-muted-foreground">Your shipment status distribution will appear here.</p></div>}
          </div>
        </div>

        {/* UNIFIED & SPACIOUS COLUMN 3 (25% Width) WITH SEGMENTED HEADER SWITCHER */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between overflow-hidden">
          {/* Header with Segmented View Switcher */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {column3View === "summary" ? "Shipment Summary" : "Transport Modes"}
              </h3>
            </div>
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-muted-foreground text-[11px]">
              <button
                onClick={() => setColumn3View("summary")}
                className={`rounded-md px-2 py-1 transition-all cursor-pointer ${
                  column3View === "summary"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setColumn3View("modes")}
                className={`rounded-md px-2 py-1 transition-all cursor-pointer ${
                  column3View === "modes"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Modes
              </button>
            </div>
          </div>

          {/* VIEW A: Full-Height Spacious Shipment Summary */}
          {column3View === "summary" ? (
            <div className="p-4 flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-200">
              <div className="text-[11px] text-muted-foreground font-medium pb-1 border-b border-border/30 mb-1 flex items-center justify-between">
                <span>Status Breakdown</span>
                <span className="font-semibold text-foreground">{totalShipments} Shipments</span>
              </div>
              {shipmentStatusData.map((item) => (
                <div key={item.status} className="flex items-center gap-2 py-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap w-28 justify-start shrink-0 ${item.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
                    {item.status}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${item.barClass}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-xs font-semibold tabular-nums text-foreground shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : transportModes.length > 0 ? (
            <TransportModesView modes={transportModes} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <PieChart className="size-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold text-foreground">No transport data available</p>
              <p className="mt-1 text-xs text-muted-foreground">Transport mode distribution will appear when shipment records are available.</p>
            </div>
          )}
        </div>

        {/* SPACIOUS RECENT ACTIVITY CARD (1 Part / 25% Width) */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <span className="text-xs text-muted-foreground">Last 72 hours</span>
          </div>
          <div className="px-4 pt-2 pb-4 flex-1 overflow-y-auto custom-scrollbar">
            <ol className="relative space-y-1">
              {activities.map((act, idx) => {
                const isLast = idx === activities.length - 1;
                const iconBgMap = {
                  destructive: "text-destructive bg-destructive/10",
                  primary: "text-primary bg-primary/10",
                  info: "text-sky-500 bg-sky-500/10",
                  warning: "text-amber-500 bg-amber-500/10",
                  muted: "text-muted-foreground bg-muted",
                };

                return (
                  <li key={act.id}>
                    <div className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/40">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBgMap[act.iconType]}`}
                      >
                        {renderActivityIcon(act.iconName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {act.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                            {act.timeAgo}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                          {act.description}
                        </p>
                      </div>
                    </div>
                    {!isLast && <div className="ml-[25px] h-2 border-l border-border/60" />}
                  </li>
                );
              })}
              {!activities.length && <li className="px-2.5 py-8 text-center text-xs text-muted-foreground">No production activity recorded yet.</li>}
            </ol>
          </div>
        </div>
      </div>

      {/* AWWWARDS-GRADE LOWER OPERATIONS GRID */}
      <div className="grid grid-cols-1 gap-6 lg:h-[32rem] lg:grid-cols-3">
        {/* 1. Delayed Shipments (High-Priority Exception Radar Card) */}
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Delayed Shipments</h3>
            </div>
            <Link
              href="/dashboard/shipmentTracking"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View radar
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto custom-scrollbar">
            {delayedRows.map((shp) => (
              <Link
                key={shp.id}
                href={`/dashboard/shipmentTracking?id=${shp.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-amber-500/5 hover:-translate-y-0.5 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {shp.trackingId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20">
                      <Clock className="h-2.5 w-2.5" />
                      Delayed
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground font-medium">
                    {shp.origin} → {shp.destination} · <span className="text-foreground/80">{shp.carrier}</span>
                  </p>
                </div>
                <div className="hidden text-right sm:block shrink-0">
                  <span className="inline-block rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    {shp.mode}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{shp.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. Today's Pickups (Live Operational Dispatch Tracker Card) */}
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s Pickups</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                {todayPickupRows.length} Active
              </span>
            </div>
            <Link
              href="/dashboard/pickupRequests"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All pickups
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto custom-scrollbar">
            {!todayPickupRows.length && <div className="grid min-h-28 place-items-center px-5 py-8 text-center text-xs text-muted-foreground">No active pickups scheduled for today.</div>}
            {todayPickupRows.map((pku) => (
              <Link
                key={pku.pickupId}
                href="/dashboard/pickupRequests"
                className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/40 group"
              >
                {/* Time slot gradient badge */}
                <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-linear-to-b from-primary/15 to-primary/5 border border-primary/20 py-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Time</span>
                  <span className="text-xs font-extrabold tabular-nums text-foreground">{pku.timeSlot}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {pku.pickupId}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pku.badgeClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pku.dotClass}`} />
                      {pku.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{pku.company}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                    {pku.location}
                  </p>
                </div>
                <div className="hidden text-right sm:block shrink-0">
                  <span className="inline-block rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    {pku.pcs} pcs · {pku.kg} kg
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <FinancialSnapshotCard snapshot={financialSnapshot} />

      </div>

      {/* PERSISTENT ALERTS OVERLAY MODAL */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className="relative w-full max-w-lg rounded-xl border border-destructive/30 bg-popover p-6 shadow-2xl text-popover-foreground space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-destructive flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 stroke-[2.5]" />
                  Action Required Alerts
                </h2>
                <p className="text-xs text-muted-foreground">
                  High priority items requiring operational attention. Press <strong>Esc</strong> or click <strong>X</strong> to close.
                </p>
              </div>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close alerts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selection Counter Badge */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Active Notifications</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                {alerts.length} Pending
              </span>
            </div>

            {/* Alerts List Feed */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border pr-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-foreground">All clear!</p>
                  <p>No pending alerts require action at this time.</p>
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-muted/40 rounded-lg px-2"
                  >
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${alt.dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{alt.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground font-mono">
                          {alt.timeAgo}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{alt.description}</p>
                      {alt.refId && (
                        <span className="mt-1.5 inline-block font-mono text-[11px] text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded border border-border/60">
                          Ref: {alt.refId}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismissSingleAlert(alt.id)}
                      className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer"
                      title="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              {alerts.length > 0 ? (
                <button
                  onClick={handleDismissAlerts}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-2 py-1"
                >
                  Dismiss All
                </button>
              ) : <div />}
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="rounded-md bg-destructive text-destructive-foreground px-4 py-1.5 text-xs font-semibold hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI CUSTOMIZATION MODAL OVERLAY */}
      {isCustomizeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setIsCustomizeOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-popover p-6 shadow-2xl text-popover-foreground space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Customize Dashboard KPI Cards
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select up to <strong>5 metrics</strong> to feature on your top metric bar.
                </p>
              </div>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selection Counter Badge */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Available Metrics Catalog</span>
              <span
                className={`font-semibold px-2.5 py-0.5 rounded-full border text-xs ${
                  tempSelectedIds.length === 5
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                Selected: {tempSelectedIds.length} / 5
              </span>
            </div>

            {/* Metrics List Grid */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {liveKpiMetrics.map((kpi) => {
                const isSelected = tempSelectedIds.includes(kpi.id);
                const isDisabled = !isSelected && tempSelectedIds.length >= 5;

                return (
                  <div
                    key={kpi.id}
                    onClick={() => !isDisabled && handleToggleKpi(kpi.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : isDisabled
                        ? "border-border/50 opacity-50 cursor-not-allowed bg-muted/20"
                        : "border-border bg-background hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-3" />}
                    </div>
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{kpi.title}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {kpi.value}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                        {kpi.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={handleResetKpis}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1"
              >
                Reset Defaults
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCustomizeOpen(false)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKpis}
                  disabled={tempSelectedIds.length === 0}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Save Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isReportOpen && <ClientReportPreview onClose={() => setIsReportOpen(false)} />}
    </div>
  );
}

function TransportModesView({ modes }: { modes: { name: string; shipments: number; percentage: number; color: string }[] }) {
  const colors = ["var(--primary)", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];
  const total = modes.reduce((sum, mode) => sum + mode.shipments, 0);
  const circumference = 2 * Math.PI * 38;
  return <div className="flex flex-1 flex-col items-center justify-between gap-5 p-5 animate-in fade-in duration-200">
    <div className="text-center space-y-0.5 pt-1"><p className="text-xs text-muted-foreground font-medium">Mode Distribution</p><p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{total}</p></div>
    <div className="relative size-44 shrink-0 grid place-items-center"><svg className="size-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Transport mode distribution"><circle cx="50" cy="50" r="38" fill="none" stroke="var(--muted)" strokeWidth="14" />{modes.map((mode, index) => { const length = (mode.shipments / total) * circumference; const dashOffset = -modes.slice(0, index).reduce((sum, item) => sum + (item.shipments / total) * circumference, 0); return <circle key={mode.name} cx="50" cy="50" r="38" fill="none" stroke={colors[index % colors.length]} strokeWidth="14" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} />; })}</svg><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><PieChart className="mb-0.5 size-5 text-primary" /><span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Modes</span></div></div>
    <div className="w-full grid grid-cols-2 gap-2 border-t border-border/40 pt-3">{modes.map((mode, index) => <div key={mode.name} className="flex flex-col rounded-lg border border-border/30 bg-muted/40 p-2"><div className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: colors[index % colors.length] }} /><span className="text-xs font-semibold text-foreground">{mode.name}</span></div><div className="mt-1 flex items-baseline justify-between"><span className="text-xs font-bold tabular-nums text-foreground">{mode.shipments}</span><span className="font-mono text-[10px] text-muted-foreground">{mode.percentage}%</span></div></div>)}</div>
  </div>;
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
