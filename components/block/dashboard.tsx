"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Download,
  TriangleAlert,
  Clock,
  ArrowRight,
  Bell,
  Truck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Package,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  X,
  Check,
  Layers,
  PieChart,
  BarChart3,
} from "lucide-react";
import {
  ALL_KPI_METRICS,
  DEFAULT_SELECTED_KPI_IDS,
  ALL_VOLUME_METRICS,
  DEFAULT_SELECTED_VOLUME_KEYS,
  SHIPMENT_SUMMARY,
  TRANSPORT_MODES,
  DELAYED_SHIPMENTS,
  TODAY_PICKUPS,
  ACTION_ALERTS,
  RECENT_ACTIVITIES,
  VOLUME_DATA,
  DashboardAlert,
  KpiMetric,
  VolumeMetricDef,
} from "./dashboard-data";

// Monotone cubic Bézier curve calculation for silky-smooth Recharts-grade charts
function getSmoothSplinePath(points: { x: number; y: number }[]): { areaPath: string; linePath: string } {
  if (points.length === 0) return { areaPath: "", linePath: "" };
  if (points.length === 1) {
    return {
      areaPath: `M ${points[0].x},240 L ${points[0].x},${points[0].y} Z`,
      linePath: `M ${points[0].x},${points[0].y}`,
    };
  }

  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)},240 L ${firstPoint.x.toFixed(2)},240 Z`;

  return { areaPath, linePath };
}

// Mathematical uniform tick index sampling helper (prevents end-point crowding)
function getUniformTickIndices(totalPoints: number, targetCount: number): number[] {
  if (totalPoints <= targetCount) {
    return Array.from({ length: totalPoints }, (_, i) => i);
  }
  const indices: number[] = [];
  for (let k = 0; k < targetCount; k++) {
    const idx = Math.round((k * (totalPoints - 1)) / (targetCount - 1));
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  return indices;
}

export default function Dashboard() {
  const [volumeTimeframe, setVolumeTimeframe] = useState<"7D" | "14D" | "30D">("30D");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<DashboardAlert[]>(ACTION_ALERTS);
  const [selectedMonth, setSelectedMonth] = useState("August 2026");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Column 3 Segmented View Toggle ("summary" | "modes")
  const [column3View, setColumn3View] = useState<"summary" | "modes">("summary");

  // Interactive Schedule Calendar State
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(4);

  // KPI Customization State (initialized lazily from localStorage, if present)
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SELECTED_KPI_IDS;
    try {
      const saved = localStorage.getItem("pss_selected_kpis");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 5) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SELECTED_KPI_IDS;
  });
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(DEFAULT_SELECTED_KPI_IDS);

  // Volume Chart Multi-Series Customization State (Max 3 metrics, initialized lazily from localStorage)
  const [selectedVolumeKeys, setSelectedVolumeKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SELECTED_VOLUME_KEYS;
    try {
      const saved = localStorage.getItem("pss_selected_volume_keys");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 3) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SELECTED_VOLUME_KEYS;
  });
  const [isVolumeMetricsOpen, setIsVolumeMetricsOpen] = useState(false);

  // Pulsing Alerts Modal State
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Esc Key Listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAlertsModalOpen(false);
        setIsCustomizeOpen(false);
        setIsVolumeMetricsOpen(false);
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
    setTempSelectedIds(DEFAULT_SELECTED_KPI_IDS);
  };

  const handleToggleVolumeKey = (key: string) => {
    let nextKeys: string[];
    if (selectedVolumeKeys.includes(key)) {
      if (selectedVolumeKeys.length === 1) return; // Keep at least 1
      nextKeys = selectedVolumeKeys.filter((k) => k !== key);
    } else {
      if (selectedVolumeKeys.length >= 3) return; // Limit to max 3
      nextKeys = [...selectedVolumeKeys, key];
    }
    setSelectedVolumeKeys(nextKeys);
    try {
      localStorage.setItem("pss_selected_volume_keys", JSON.stringify(nextKeys));
    } catch {
      // Ignore
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleDismissAlerts = () => {
    setAlerts([]);
  };

  const handleDismissSingleAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  // Filtered active KPI objects (limit to max 5)
  const activeKpis = selectedKpiIds
    .map((id) => ALL_KPI_METRICS.find((m) => m.id === id))
    .filter((m): m is KpiMetric => m !== undefined)
    .slice(0, 5);

  // Active Volume Metric Objects (limit to max 3)
  const activeVolumeMetrics = selectedVolumeKeys
    .map((key) => ALL_VOLUME_METRICS.find((m) => m.key === key))
    .filter((m): m is VolumeMetricDef => m !== undefined)
    .slice(0, 3);


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

  const currentVolumeSeries = VOLUME_DATA[volumeTimeframe];

  // Dynamically calculate max value across all selected active metrics
  const maxVolume = Math.max(
    ...currentVolumeSeries.map((d) =>
      Math.max(...activeVolumeMetrics.map((m) => (d[m.key] as number) || 0))
    ),
    100
  );

  // Compute smooth points for each active metric
  const activeMetricsPoints = activeVolumeMetrics.map((m) => ({
    metric: m,
    points: currentVolumeSeries.map((d, i) => ({
      x: (i / (currentVolumeSeries.length - 1)) * 600,
      y: 240 - (((d[m.key] as number) || 0) / maxVolume) * 200,
      val: (d[m.key] as number) || 0,
    })),
  }));

  // Generate smooth curves for each active metric
  const activeMetricsCurves = activeMetricsPoints.map((item) => ({
    metric: item.metric,
    points: item.points,
    curves: getSmoothSplinePath(item.points),
  }));

  // Smart uniform tick sampling for X-axis date labels (1-day step for 7D, 2-day step for 14D, 5-day step for 30D)
  const sampledIndices = getUniformTickIndices(
    currentVolumeSeries.length,
    volumeTimeframe === "7D" ? 7 : volumeTimeframe === "14D" ? 8 : 7
  );

  // Delay Severity Days mapping for Delayed Shipments
  const delayDaysMap: Record<string, string> = {
    "SHP-00031": "+4d Late",
    "SHP-00041": "+2d Late",
    "SHP-00018": "+5d Late",
    "SHP-00021": "+3d Late",
    "SHP-00009": "+1d Late",
  };

  // Mock Calendar Events for Dynamic Drawer
  const calendarDayEvents: Record<number, { title: string; type: string; badge: string; color: string }[]> = {
    1: [{ title: "Customs Audit — Cargo PSS20260012", type: "Exception", badge: "High", color: "text-amber-500 bg-amber-500/10" }],
    4: [
      { title: "Today's Pickups Execution (11 PKUs)", type: "Pickup", badge: "Live", color: "text-primary bg-primary/10" },
      { title: "Rotterdam Express Arrival", type: "Delivery", badge: "On-Time", color: "text-emerald-500 bg-emerald-500/10" },
    ],
    8: [{ title: "Bulk Container Departure — MSC", type: "Dispatch", badge: "Ocean", color: "text-sky-500 bg-sky-500/10" }],
    9: [
      { title: "Customs Hold Review — 3 Cargoes", type: "Hold", badge: "Urgent", color: "text-destructive bg-destructive/10" },
      { title: "Air Freight Delivery — Frankfurt", type: "Delivery", badge: "Scheduled", color: "text-emerald-500 bg-emerald-500/10" },
    ],
    11: [{ title: "Monthly Carrier Performance Audit", type: "Audit", badge: "Internal", color: "text-muted-foreground bg-muted" }],
    12: [{ title: "Overdue Invoice Settlement", type: "Finance", badge: "Billing", color: "text-amber-500 bg-amber-500/10" }],
    13: [{ title: "Rotterdam Hub Capacity Expansion", type: "Facility", badge: "Planned", color: "text-sky-500 bg-sky-500/10" }],
  };
  const totalShipments = SHIPMENT_SUMMARY.reduce((total, item) => total + item.count, 0);
  const activeShipments = SHIPMENT_SUMMARY.filter((item) => ["Booked", "Picked Up", "In Transit", "Out for Delivery"].includes(item.status)).reduce((total, item) => total + item.count, 0);
  const delayedShipments = SHIPMENT_SUMMARY.find((item) => item.status === "Delayed")?.count ?? 0;
  const exceptionShipments = SHIPMENT_SUMMARY.find((item) => item.status === "Exception")?.count ?? 0;

  return (
    <div className="w-full space-y-4">
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

          <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3">
            <CalendarIcon className="mr-1.5 h-4 w-4 text-muted-foreground" />
            Jul 1 – Jul 26, 2026
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 shadow-sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export
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
        {/* Shipment Volume Chart (2 Parts / 50% Width) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Shipment Volume
              </h3>
              <p className="text-xs text-muted-foreground">
                Bookings and operational metrics over time
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* SELECT MULTI-SERIES METRICS BUTTON */}
              <div className="relative">
                <button
                  onClick={() => setIsVolumeMetricsOpen(!isVolumeMetricsOpen)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Metrics ({selectedVolumeKeys.length}/3)
                </button>

                {/* POPPER SELECTOR FOR 3 VOLUME METRICS */}
                {isVolumeMetricsOpen && (
                  <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-xl border border-border bg-popover p-3 shadow-xl space-y-2 text-popover-foreground animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-xs font-bold text-foreground">Select Any 3 Metrics</span>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {selectedVolumeKeys.length}/3
                      </span>
                    </div>
                    <div className="space-y-1">
                      {ALL_VOLUME_METRICS.map((vm) => {
                        const isSelected = selectedVolumeKeys.includes(vm.key);
                        const isDisabled = !isSelected && selectedVolumeKeys.length >= 3;

                        return (
                          <div
                            key={vm.key}
                            onClick={() => !isDisabled && handleToggleVolumeKey(vm.key)}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer select-none ${
                              isSelected
                                ? "bg-accent text-foreground font-semibold"
                                : isDisabled
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-accent/50 text-muted-foreground"
                            }`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: vm.color }} />
                            <span className="flex-1">{vm.label}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TIMEFRAME SELECTOR */}
              <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground h-8">
                {(["7D", "14D", "30D"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setVolumeTimeframe(tf);
                      setHoveredPointIndex(null);
                    }}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      volumeTimeframe === tf
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:text-foreground"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="h-72 w-full relative">
              {/* SVG Area & Smooth Monotone Cubic Line Chart */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 240" preserveAspectRatio="none">
                <defs>
                  {ALL_VOLUME_METRICS.map((m) => (
                    <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={m.color} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={m.color} stopOpacity="0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 60, 120, 180, 240].map((y, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={y}
                    x2="600"
                    y2={y}
                    stroke="var(--border)"
                    strokeOpacity="0.5"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Vertical Hover Tracking Guideline */}
                {hoveredPointIndex !== null && activeMetricsPoints[0] && activeMetricsPoints[0].points[hoveredPointIndex] && (
                  <line
                    x1={activeMetricsPoints[0].points[hoveredPointIndex].x}
                    y1="0"
                    x2={activeMetricsPoints[0].points[hoveredPointIndex].x}
                    y2="240"
                    stroke="var(--primary)"
                    strokeOpacity="0.5"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="transition-all duration-150"
                  />
                )}

                {/* Render Curves for all 3 Selected Metrics */}
                {activeMetricsCurves.map((item) => (
                  <g key={item.metric.key}>
                    <path
                      d={item.curves.areaPath}
                      fill={`url(#${item.metric.gradientId})`}
                      className="transition-[d,fill] duration-500 ease-in-out"
                    />
                    <path
                      d={item.curves.linePath}
                      fill="none"
                      stroke={item.metric.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-[d,stroke] duration-500 ease-in-out"
                    />
                  </g>
                ))}

                {/* Interactive Hover Hit Areas & Highlight Dots for Selected Metrics */}
                {currentVolumeSeries.map((d, i) => {
                  const isHovered = hoveredPointIndex === i;
                  const stepWidth = 600 / (currentVolumeSeries.length - 1);
                  const firstPt = activeMetricsPoints[0]?.points[i];

                  return (
                    <g key={i} onMouseEnter={() => setHoveredPointIndex(i)} onMouseLeave={() => setHoveredPointIndex(null)}>
                      {/* Invisible hover capture target */}
                      {firstPt && (
                        <rect
                          x={Math.max(firstPt.x - stepWidth / 2, 0)}
                          y={0}
                          width={stepWidth}
                          height={240}
                          fill="transparent"
                          className="cursor-pointer"
                        />
                      )}
                      {/* Active hover-only dots for each selected metric */}
                      {isHovered &&
                        activeMetricsPoints.map((item) => {
                          const pt = item.points[i];
                          if (!pt) return null;
                          return (
                            <circle
                              key={item.metric.key}
                              cx={pt.x}
                              cy={pt.y}
                              r={5}
                              fill={item.metric.color}
                              stroke="var(--background)"
                              strokeWidth="2"
                              className="transition-all duration-150 ease-in-out cursor-pointer"
                            />
                          );
                        })}
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Enhanced Hover Card Overlay for 3 Selected Metrics */}
              {hoveredPointIndex !== null && currentVolumeSeries[hoveredPointIndex] && (
                <div
                  className="absolute z-20 pointer-events-none bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-3 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    left: `${Math.min(Math.max((hoveredPointIndex / (currentVolumeSeries.length - 1)) * 82, 5), 72)}%`,
                    top: "15px",
                  }}
                >
                  <p className="font-bold text-foreground border-b border-border/50 pb-1">
                    {currentVolumeSeries[hoveredPointIndex].label}
                  </p>
                  {activeVolumeMetrics.map((m) => (
                    <div key={m.key} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                        <span className="font-medium text-foreground">{m.label}</span>
                      </div>
                      <span className="font-bold tabular-nums text-foreground">
                        {currentVolumeSeries[hoveredPointIndex][m.key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Sampled X-Axis Date Labels Spanned Across Graph Width */}
            <div className="relative w-full h-6 mt-2 border-t border-border/40 pt-1.5">
              {sampledIndices.map((i) => {
                const d = currentVolumeSeries[i];
                const pct = (i / (currentVolumeSeries.length - 1)) * 100;
                const isFirst = i === 0;
                const isLast = i === currentVolumeSeries.length - 1;

                return (
                  <span
                    key={i}
                    className={`absolute text-[11px] font-semibold text-muted-foreground font-mono whitespace-nowrap select-none ${
                      isFirst
                        ? "left-0 translate-x-0"
                        : isLast
                        ? "right-0 translate-x-0 text-right"
                        : "-translate-x-1/2"
                    }`}
                    style={!isLast ? { left: `${pct}%` } : { right: "0px" }}
                  >
                    {d.label}
                  </span>
                );
              })}
            </div>

            {/* Dynamic Chart Legend for 3 Selected Metrics */}
            <div className="mt-4 flex items-center justify-start gap-6 border-t border-border/30 pt-3 text-xs">
              {activeVolumeMetrics.map((m) => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-foreground font-semibold">{m.label}</span>
                </div>
              ))}
            </div>
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
                <span className="font-semibold text-foreground">48 Shipments</span>
              </div>
              {SHIPMENT_SUMMARY.map((item) => (
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
          ) : (
            /* VIEW B: Spacious Transport Modes Donut & Grid Legend */
            <div className="p-5 flex-1 flex flex-col justify-between items-center gap-5 animate-in fade-in duration-200">
              <div className="text-center space-y-0.5 pt-1">
                <p className="text-xs text-muted-foreground font-medium">Mode Distribution</p>
                <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">4,790</p>
              </div>

              {/* Large Centered Donut SVG */}
              <div className="relative h-44 w-44 shrink-0 grid place-items-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  {/* Ocean 38.5% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--primary)" strokeWidth="14" strokeDasharray="91.8 146.9" strokeDashoffset="0" />
                  {/* Air 20.2% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#06b6d4" strokeWidth="14" strokeDasharray="48.2 190.5" strokeDashoffset="-91.8" />
                  {/* Road 30.4% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray="72.5 166.2" strokeDashoffset="-140.0" />
                  {/* Rail 10.9% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" strokeWidth="14" strokeDasharray="26.0 212.7" strokeDashoffset="-212.5" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <PieChart className="h-5 w-5 text-primary mb-0.5" />
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Modes</span>
                </div>
              </div>

              {/* 2-Column Spacious Grid Legend */}
              <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-border/40 mt-auto">
                {TRANSPORT_MODES.map((mode, i) => {
                  const modeColors = ["bg-primary", "bg-sky-500", "bg-emerald-500", "bg-amber-500"];
                  return (
                    <div key={mode.name} className="flex flex-col rounded-lg bg-muted/40 p-2 border border-border/30">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-sm ${modeColors[i]}`} />
                        <span className="text-xs font-semibold text-foreground">{mode.name}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xs font-bold text-foreground tabular-nums">{mode.count}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{mode.percentage}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              {RECENT_ACTIVITIES.map((act, idx) => {
                const isLast = idx === RECENT_ACTIVITIES.length - 1;
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
            </ol>
          </div>
        </div>
      </div>

      {/* AWWWARDS-GRADE LOWER OPERATIONS GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Delayed Shipments (High-Priority Exception Radar Card) */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between overflow-hidden">
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
          <div className="divide-y divide-border/60 flex-1">
            {DELAYED_SHIPMENTS.map((shp) => (
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
                      {delayDaysMap[shp.id] || "+2d Late"}
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
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s Pickups</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                11 Active
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
          <div className="divide-y divide-border/60 flex-1">
            {TODAY_PICKUPS.map((pku) => (
              <Link
                key={pku.id}
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

        {/* 3. Schedule (Interactive Operations Heatmap & Event Calendar) */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Operational Schedule</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedMonth("July 2026")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-xs font-bold text-foreground min-w-[85px] text-center">
                {selectedMonth}
              </span>
              <button
                onClick={() => setSelectedMonth("September 2026")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] font-bold uppercase text-muted-foreground/70"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month padding days */}
                {[27, 28, 29, 30, 31].map((d) => (
                  <button
                    key={`prev-${d}`}
                    className="relative flex h-8 items-center justify-center rounded-md text-xs text-muted-foreground/30 cursor-default"
                  >
                    {d}
                  </button>
                ))}
                {/* Days of August */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isToday = day === 4;
                  const isSelected = selectedCalendarDay === day;
                  const hasAmberDots = [1, 6, 8, 12].includes(day);
                  const hasInfoDots = [9, 10, 13].includes(day);
                  const hasSuccessDots = [4, 9, 11].includes(day);

                  return (
                    <button
                      key={`aug-${day}`}
                      onClick={() => setSelectedCalendarDay(day)}
                      className={`relative flex h-8 items-center justify-center rounded-lg text-xs transition-all cursor-pointer font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 ring-2 ring-primary/40"
                          : isSelected
                          ? "bg-accent text-accent-foreground font-bold border border-primary/50"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {day}
                      {!isToday && (hasAmberDots || hasInfoDots || hasSuccessDots) && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {hasAmberDots && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                          {hasInfoDots && <span className="h-1 w-1 rounded-full bg-sky-500" />}
                          {hasSuccessDots && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Interactive Calendar Event Drawer */}
            <div className="mt-3 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground font-medium">
                  Events for Aug {selectedCalendarDay}, 2026:
                </span>
                <span className="font-bold text-foreground">
                  {calendarDayEvents[selectedCalendarDay]?.length || 0} Scheduled
                </span>
              </div>
              {calendarDayEvents[selectedCalendarDay] ? (
                <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                  {calendarDayEvents[selectedCalendarDay].map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1 text-xs border border-border/30"
                    >
                      <span className="truncate text-foreground font-medium">{ev.title}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold text-[10px] ${ev.color}`}>
                        {ev.badge}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic py-1 text-center">
                  No critical dispatches scheduled for Aug {selectedCalendarDay}.
                </p>
              )}
            </div>
          </div>
        </div>
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
              {ALL_KPI_METRICS.map((kpi) => {
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
    </div>
  );
}
