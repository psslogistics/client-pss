"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";
import { downloadWorkbook } from "@/lib/xlsx";
import { publicCourierName } from "@/lib/client-pricing-data";
import { localDateInput, shiftLocalDays } from "@/lib/date-format";

type Shipment = Record<string, unknown>;
type Pickup = Record<string, unknown>;
type ShipmentPage = { data: Shipment[]; pagination?: { next_offset?: number; has_more?: boolean } };
type PreferenceResponse = { data?: { preferences?: { reportRange?: string } } };
const cell = (value: unknown) => value == null ? "" : String(value);
const date = (value: unknown) => typeof value === "string" ? value.slice(0, 10) : "";
const shipmentReference = (row: Shipment) => cell(row.pss_reference) || cell(row.lr_number) || cell(row.master_awb) || cell(row.tracking_number) || "Pending reference";
const pickupReference = (row: Pickup) => cell(row.reference) || cell(row.provider_reference) || cell(row.shipment_reference) || "Pending reference";
const today = () => localDateInput();
const generatedAt = () => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZoneName: "short" }).format(new Date());
const rangeFor = (value: string) => {
  const now = new Date();
  if (value === "Previous month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: localDateInput(first), end: localDateInput(last) };
  }
  if (value === "Last 30 days") return { start: shiftLocalDays(now, -29), end: today() };
  return { start: localDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), end: today() };
};
const delayDays = (row: Shipment) => {
  const edd = date(row.edd);
  if (!edd) return 0;
  const delivered = date(row.delivered_at) || today();
  return Math.max(0, Math.floor((Date.parse(`${delivered}T00:00:00Z`) - Date.parse(`${edd}T00:00:00Z`)) / 86400000));
};

async function loadAllShipments() {
  const rows: Shipment[] = [];
  let offset = 0;
  for (;;) {
    const page = await pssApi<ShipmentPage>(`/v1/shipments?limit=50&offset=${offset}`);
    rows.push(...(page.data ?? []));
    if (!page.pagination?.has_more) return rows;
    const next = Number(page.pagination.next_offset);
    if (!Number.isFinite(next) || next <= offset) throw new Error("The shipment report pagination did not advance safely.");
    offset = next;
  }
}

export default function ReportsAnalytics() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [staleData, setStaleData] = useState(false);
  const [loading, setLoading] = useState(true);
  const rangeInitializedRef = useRef(false);

  const load = () => {
    setLoading(true); setLoadError(""); setNotice(""); setStaleData(false);
    void Promise.allSettled([loadAllShipments(), pssApi<{ data: Pickup[] }>("/v1/pickups"), pssApi<PreferenceResponse>("/v1/preferences")]).then(([shipmentResult, pickupResult, preferencesResult]) => {
      const errors: string[] = [];
      if (shipmentResult.status === "fulfilled") setShipments(shipmentResult.value); else errors.push(`Shipments: ${getPssErrorDetails(shipmentResult.reason, "Shipment report data is unavailable.").message}`);
      if (pickupResult.status === "fulfilled") setPickups(pickupResult.value.data ?? []); else errors.push(`Pickups: ${getPssErrorDetails(pickupResult.reason, "Pickup report data is unavailable.").message}`);
      if (preferencesResult.status === "fulfilled" && !rangeInitializedRef.current) {
        const range = rangeFor(preferencesResult.value.data?.preferences?.reportRange ?? "Current month");
        setStart(range.start); setEnd(range.end); rangeInitializedRef.current = true;
      }
      if (errors.length) { setLoadError(errors.join(" ")); setStaleData(shipments.length > 0 || pickups.length > 0); setNotice("Some report data could not be refreshed."); }
    }).finally(() => setLoading(false));
  };

  // The initial report load intentionally resets the request state before fetching.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const filteredShipments = useMemo(() => shipments.filter((row) => { const value = date(row.created_at); return (!start || value >= start) && (!end || value <= end); }), [shipments, start, end]);
  const filteredPickups = useMemo(() => pickups.filter((row) => { const value = date(row.requested_date ?? row.created_at); return (!start || value >= start) && (!end || value <= end); }), [pickups, start, end]);
  const validateRange = () => {
    if (start && end && start > end) { setRangeError("The start date must be on or before the end date."); return false; }
    setRangeError(""); return true;
  };
  const download = () => {
    if (!validateRange()) return;
    if (staleData || loadError) { setNotice("Refresh the report successfully before exporting so the file is complete and current."); return; }
    const from = start || "all"; const to = end || "time";
    downloadWorkbook(`PSS-shipment-report-${from}-to-${to}.xlsx`, [
      { name: "Report summary", headers: ["Field", "Value"], rows: [["Report title", "PSS Logistics shipment and pickup report"], ["Report period", `${start || "All dates"} to ${end || "Today"}`], ["Generated at", generatedAt()], ["Timezone", "Asia/Kolkata"], ["Shipments", filteredShipments.length], ["Pickups", filteredPickups.length]], columnWidths: [24, 48], autoFilter: false },
      { name: "Shipments", headers: ["Shipment reference", "Status", "Provider", "Origin", "Destination", "EDD", "Delivered", "Delay days", "Created"], rows: filteredShipments.map((row) => [shipmentReference(row), cell(row.status), publicCourierName(row.provider, row.account_name), cell(row.origin), cell(row.destination), cell(row.edd), cell(row.delivered_at), delayDays(row), cell(row.created_at)]), columnWidths: [24, 16, 16, 24, 24, 14, 14, 12, 22], numericColumns: [7], dateColumns: [5, 6, 8] },
      { name: "Pickups", headers: ["Pickup reference", "Shipment reference", "Requested date", "Status", "Address"], rows: filteredPickups.map((row) => [pickupReference(row), cell(row.shipment_reference) || "Pending reference", cell(row.requested_date), cell(row.status), cell(row.pickup_address)]), columnWidths: [24, 24, 16, 16, 48], dateColumns: [2] },
    ]);
    setNotice(`Report downloaded: ${filteredShipments.length} shipments and ${filteredPickups.length} pickups.`);
  };

  return <div className="w-full space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reports</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Shipment reports</h1><p className="mt-1 text-sm text-muted-foreground">Reports are generated from complete shipment and pickup records.</p></div><div className="flex gap-2"><button type="button" disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-60" onClick={load}><RefreshCw className="size-3.5" />Refresh</button><button type="button" disabled={loading || Boolean(loadError) || staleData} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60" onClick={download}><Download className="size-3.5" />Export</button></div></header><div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From<input aria-label="Report start date" type="date" value={start} onChange={(event) => { setStart(event.target.value); setRangeError(""); }} className="mt-1 block h-9 rounded-lg border border-input bg-background px-2 text-xs" /></label><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To<input aria-label="Report end date" type="date" value={end} onChange={(event) => { setEnd(event.target.value); setRangeError(""); }} className="mt-1 block h-9 rounded-lg border border-input bg-background px-2 text-xs" /></label><span className="inline-flex h-9 items-center gap-2 px-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{loading ? "Loading complete report data…" : `${filteredShipments.length} shipments · ${filteredPickups.length} pickups${staleData ? " · refresh required" : ""}`}</span></div>{rangeError && <p role="alert" className="text-xs text-destructive">{rangeError}</p>}{loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"><span>{loadError} Export is disabled until the complete data set loads.</span><button type="button" className="font-semibold underline" onClick={load}>Retry report data</button></div>}<section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /><h2 className="text-sm font-semibold">Report scope</h2></div><p className="mt-2 text-sm text-muted-foreground">The export includes typed dates and numbers, filters, print layout, shipment status, delivery dates, delay information, courier, and pickup records.</p></section>{notice && !loadError && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}</div>;
}
