"use client";

import {
  Check,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import type { DashboardAlert, KpiMetric } from "./dashboard-data";

type Props = {
  alerts: DashboardAlert[];
  isAlertsModalOpen: boolean;
  onCloseAlerts: () => void;
  onDismissAlerts: () => void;
  onDismissAlert: (id: string) => void;
  isCustomizeOpen: boolean;
  onCloseCustomize: () => void;
  liveKpiMetrics: KpiMetric[];
  tempSelectedIds: string[];
  onToggleKpi: (id: string) => void;
  onResetKpis: () => void;
  onSaveKpis: () => void;
};

export default function ClientDashboardModals({
  alerts,
  isAlertsModalOpen,
  onCloseAlerts,
  onDismissAlerts,
  onDismissAlert,
  isCustomizeOpen,
  onCloseCustomize,
  liveKpiMetrics,
  tempSelectedIds,
  onToggleKpi,
  onResetKpis,
  onSaveKpis,
}: Props) {
  return (
    <>
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className="relative w-full max-w-lg rounded-xl border border-destructive/30 bg-popover p-6 shadow-2xl text-popover-foreground space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
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
              <button onClick={onCloseAlerts} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer" aria-label="Close alerts">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Active Notifications</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                {alerts.length} Pending
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border pr-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-foreground">All clear!</p>
                  <p>No pending alerts require action at this time.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 py-3 transition-colors hover:bg-muted/40 rounded-lg px-2">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${alert.dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{alert.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground font-mono">{alert.timeAgo}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                      {alert.refId && <span className="mt-1.5 inline-block font-mono text-[11px] text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded border border-border/60">Ref: {alert.refId}</span>}
                    </div>
                    <button onClick={() => onDismissAlert(alert.id)} className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer" title="Dismiss alert">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              {alerts.length > 0 ? <button onClick={onDismissAlerts} className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-2 py-1">Dismiss All</button> : <div />}
              <button onClick={onCloseAlerts} className="rounded-md bg-destructive text-destructive-foreground px-4 py-1.5 text-xs font-semibold hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer">Close (Esc)</button>
            </div>
          </div>
        </div>
      )}

      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={onCloseCustomize}>
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-popover p-6 shadow-2xl text-popover-foreground space-y-5 animate-in fade-in zoom-in-95 duration-150" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />Customize Dashboard KPI Cards</h2>
                <p className="text-xs text-muted-foreground">Select up to <strong>5 metrics</strong> to feature on your top metric bar.</p>
              </div>
              <button onClick={onCloseCustomize} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer" aria-label="Close KPI customization"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Available Metrics Catalog</span>
              <span className={`font-semibold px-2.5 py-0.5 rounded-full border text-xs ${tempSelectedIds.length === 5 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>Selected: {tempSelectedIds.length} / 5</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {liveKpiMetrics.map((kpi) => {
                const isSelected = tempSelectedIds.includes(kpi.id);
                const isDisabled = !isSelected && tempSelectedIds.length >= 5;
                return (
                  <div key={kpi.id} onClick={() => !isDisabled && onToggleKpi(kpi.id)} className={`flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer select-none ${isSelected ? "border-primary bg-primary/5 shadow-xs" : isDisabled ? "border-border/50 opacity-50 cursor-not-allowed bg-muted/20" : "border-border bg-background hover:bg-accent/50"}`}>
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{isSelected && <Check className="h-3 w-3 stroke-3" />}</div>
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-foreground">{kpi.title}</span><span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{kpi.value}</span></div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{kpi.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button onClick={onResetKpis} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1">Reset Defaults</button>
              <div className="flex items-center gap-2"><button onClick={onCloseCustomize} className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">Cancel</button><button onClick={onSaveKpis} disabled={tempSelectedIds.length === 0} className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50">Save Selection</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
