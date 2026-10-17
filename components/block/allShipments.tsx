"use client";

import { Download, FileText, LifeBuoy, MoreVertical, PackageSearch, Search, Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi, pssApiFile } from "@/lib/pss-api";
import { publicCourierName } from "@/lib/client-pricing-data";

type ShipmentStatus = "All" | "Active" | "Booked" | "Picked Up" | "In Transit" | "Out for Delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
type ShipmentRow = { id: string; pssTracking: string; courierTracking: string; courierReferenceLabel: string; pur?: string; lr?: string; masterAwb?: string; boxAwbs: string[]; providerBookingId?: string; providerPickupId?: string; providerSyncStatus?: string; providerFailureReason?: string; consignor: string; consignorAddress?: string; consignee: string; consigneeAddress?: string; courier: string; status: Exclude<ShipmentStatus, "All" | "Active">; nextAction: string; pieces: number; weight: string; eta: string; booked: string; podDocumentId?: string; invoiceDocumentId?: string };

const statuses: ShipmentStatus[] = ["All", "Active", "Booked", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Delayed", "Exception", "Returned", "Cancelled"];
const activeStatuses = new Set(["Booked", "Picked Up", "In Transit", "Out for Delivery", "Delayed", "Exception"]);
const searchable = (row: ShipmentRow) => [row.pssTracking, row.courierTracking, row.pur, row.lr, row.masterAwb, ...row.boxAwbs, row.providerBookingId, row.providerPickupId, row.consignor, row.consignee, row.courier].filter(Boolean).join(" ").toLowerCase();
const mapStatus = (value: unknown): ShipmentRow["status"] => { const status = String(value ?? "booked").toLowerCase().replaceAll("_", " "); if (status === "picked up") return "Picked Up"; if (status === "in transit") return "In Transit"; if (status === "out for delivery") return "Out for Delivery"; if (status === "delivered") return "Delivered"; if (status === "exception") return "Exception"; if (status === "rto" || status === "returned") return "Returned"; if (status === "cancelled" || status === "canceled") return "Cancelled"; return "Booked"; };
const textValue = (value: unknown) => String(value ?? "").trim();
const artifactBase64s = (value: unknown): string[] => { if (!value) return []; if (Array.isArray(value)) return value.flatMap(artifactBase64s); if (typeof value !== "object") return []; const record = value as Record<string, unknown>; const direct = ["content_base64", "base64", "data"].flatMap((key) => typeof record[key] === "string" ? [record[key] as string] : []); return direct.length ? direct : Object.values(record).flatMap(artifactBase64s); };
const artifactField = (value: unknown, keys: string[]): string | undefined => { if (!value || typeof value !== "object") return undefined; if (Array.isArray(value)) { for (const item of value) { const found = artifactField(item, keys); if (found) return found; } return undefined; } const record = value as Record<string, unknown>; for (const key of keys) if (typeof record[key] === "string" && record[key]) return record[key] as string; for (const child of Object.values(record)) { const found = artifactField(child, keys); if (found) return found; } return undefined; };
const artifactUrl = (value: unknown): string | undefined => { if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined; if (Array.isArray(value)) { for (const item of value) { const found = artifactUrl(item); if (found) return found; } return undefined; } if (!value || typeof value !== "object") return undefined; const record = value as Record<string, unknown>; for (const key of ["download_url", "downloadUrl", "file_url", "fileUrl", "url", "link"]) { const found = artifactUrl(record[key]); if (found) return found; } for (const child of Object.values(record)) { const found = artifactUrl(child); if (found) return found; } return undefined; };
const downloadBase64 = (name: string, base64: string, type: string) => { const normalized = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64; const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500); };
const base64Bytes = (value: string) => { const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value; return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)); };
const crc32 = (bytes: Uint8Array) => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
const zipUint32 = (value: number) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
const zipUint16 = (value: number) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
const zipBytes = (parts: Uint8Array[]) => { const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; };
const buildZip = (files: Array<{ name: string; blob: Blob }>) => {
  const encoder = new TextEncoder();
  return Promise.all(files.map(async (file) => ({ name: encoder.encode(file.name), data: new Uint8Array(await file.blob.arrayBuffer()) }))).then((entries) => {
    const localParts: Uint8Array[] = []; const centralParts: Uint8Array[] = []; let localOffset = 0;
    for (const entry of entries) { const crc = crc32(entry.data); const header = zipBytes([new Uint8Array([0x50, 0x4b, 0x03, 0x04]), zipUint16(20), zipUint16(0), zipUint16(0), zipUint16(0), zipUint16(0), zipUint32(crc), zipUint32(entry.data.length), zipUint32(entry.data.length), zipUint16(entry.name.length), zipUint16(0), entry.name, entry.data]); localParts.push(header); centralParts.push(zipBytes([new Uint8Array([0x50, 0x4b, 0x01, 0x02]), zipUint16(20), zipUint16(20), zipUint16(0), zipUint16(0), zipUint16(0), zipUint16(0), zipUint32(crc), zipUint32(entry.data.length), zipUint32(entry.data.length), zipUint16(entry.name.length), zipUint16(0), zipUint16(0), zipUint16(0), zipUint16(0), zipUint32(0), zipUint32(localOffset), entry.name])); localOffset += header.length; }
    const centralDirectory = zipBytes(centralParts); return new Blob([zipBytes([...localParts, centralDirectory, new Uint8Array([0x50, 0x4b, 0x05, 0x06]), new Uint8Array(8), zipUint16(entries.length), zipUint16(entries.length), zipUint32(centralDirectory.length), zipUint32(localOffset)])], { type: "application/zip" });
  });
};
const parseBoxAwbs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(textValue).filter(Boolean) : [];
  } catch {
    return [];
  }
};
const addressDetails = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !value.trim()) return { name: fallback, address: "" };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const name = String(parsed.name ?? parsed.company ?? fallback).trim() || fallback;
    const address = [parsed.line, parsed.address, parsed.city, parsed.state, parsed.pincode, parsed.country].map((part) => String(part ?? "").trim()).filter(Boolean).join(", ");
    return { name, address };
  } catch {
    return { name: fallback, address: "" };
  }
};
const shipmentReferences = (row: Record<string, unknown>) => {
  const lr = textValue(row.lr_number);
  const masterAwb = textValue(row.master_awb);
  const pur = textValue(row.pickup_reference);
  const legacy = textValue(row.tracking_number || row.provider_reference);
  return { lr, masterAwb, pur, legacy, value: lr || masterAwb || pur || legacy || "Provider reference unavailable", label: lr ? "LR" : masterAwb ? "Master AWB" : pur ? "PUR" : legacy ? "Provider reference" : "Provider reference" };
};
const nextActionFor = (status: ShipmentRow["status"], providerSyncStatus: string | undefined, hasProviderReference: boolean) => {
  const sync = providerSyncStatus?.toLowerCase();
  if (sync === "failed" || sync === "error") return "Retry provider sync";
  if (sync === "pending" || sync === "provider_pending") return "Provider confirmation pending";
  if (status === "Exception") return "Review exception";
  if (status === "Delayed") return "Review delivery delay";
  if (status === "Booked" && !hasProviderReference) return "Awaiting provider reference";
  if (status === "Booked") return "Schedule pickup";
  if (status === "Picked Up") return "Monitor transit";
  if (status === "In Transit" || status === "Out for Delivery") return "Monitor tracking";
  if (status === "Returned") return "Review return movement";
  return status === "Delivered" ? "No action required" : "Review shipment";
};
const hasProviderReference = (row: ShipmentRow) => Boolean(row.lr || row.masterAwb || row.pur || (row.courierTracking && row.courierTracking !== "Provider reference unavailable"));
const canDeleteShipment = (row: ShipmentRow) => (row.status === "Cancelled" || row.status === "Exception") && !hasProviderReference(row);

const statusStyles: Record<ShipmentRow["status"], string> = {
  Booked: "bg-blue-500/10 text-blue-700 dark:text-blue-300", "Picked Up": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "In Transit": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "Out for Delivery": "bg-amber-500/10 text-amber-700 dark:text-amber-300", Delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Delayed: "bg-amber-500/10 text-amber-700 dark:text-amber-300", Exception: "bg-destructive/10 text-destructive", Returned: "bg-violet-500/10 text-violet-700 dark:text-violet-300", Cancelled: "bg-muted text-muted-foreground",
};
const mapShipmentRow = (row: Record<string, unknown>): ShipmentRow => { const reference = shipmentReferences(row); const status = mapStatus(row.status); const providerSyncStatus = textValue(row.provider_sync_status) || undefined; const origin = String(row.origin ?? "Not provided"); const destination = String(row.destination ?? row.consignee ?? "Not provided"); const consignor = addressDetails(row.origin_address_json, origin); const consignee = addressDetails(row.destination_address_json, destination); return { id: String(row.id), pssTracking: String(row.pss_reference ?? row.id), courierTracking: reference.value, courierReferenceLabel: reference.label, pur: reference.pur || undefined, lr: reference.lr || undefined, masterAwb: reference.masterAwb || undefined, boxAwbs: parseBoxAwbs(row.box_awbs_json), providerBookingId: textValue(row.provider_booking_id) || undefined, providerPickupId: textValue(row.provider_pickup_id) || undefined, providerSyncStatus, providerFailureReason: textValue(row.provider_failure_reason) || undefined, consignor: consignor.name, consignorAddress: consignor.address || undefined, consignee: consignee.name, consigneeAddress: consignee.address || undefined, courier: publicCourierName(row.provider, row.account_name), status, nextAction: nextActionFor(status, providerSyncStatus, Boolean(reference.lr || reference.masterAwb || reference.pur || reference.legacy)), pieces: Number(row.pieces ?? 1), weight: `${Number(row.total_weight_kg ?? 0)} kg`, eta: String(row.edd ?? "Not provided"), booked: String(row.created_at ?? "Not provided").slice(0, 10), podDocumentId: textValue(row.pod_document_id) || undefined, invoiceDocumentId: textValue(row.invoice_document_id) || undefined }; };

export default function AllShipments() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("All");
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staleData, setStaleData] = useState(false);
  const [offset, setOffset] = useState(0); const [hasMore, setHasMore] = useState(false); const [loadingMore, setLoadingMore] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null); const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const hadRowsRef = useRef(false);
  // This effect owns the remote shipment fetch and its loading lifecycle.
  useEffect(() => {
    let cancelled = false;
    // The fetch lifecycle intentionally resets these flags before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError("");
    const statusQuery = status === "All" ? "" : `&status=${encodeURIComponent(status)}`;
    void pssApi<{ data: Array<Record<string, unknown>>; stale_data?: boolean; pagination?: { next_offset?: number; has_more?: boolean; total?: number; status_counts?: Record<string, number> } }>(`/v1/shipments?limit=50&offset=0&include_tracking=1${statusQuery}`)
      .then((result) => {
        if (cancelled) return;
        hadRowsRef.current = (result.data ?? []).length > 0;
        setRows((result.data ?? []).map(mapShipmentRow)); setOffset(Number(result.pagination?.next_offset ?? (result.data ?? []).length)); setHasMore(Boolean(result.pagination?.has_more)); setServerTotal(typeof result.pagination?.total === "number" ? result.pagination.total : null); setServerStatusCounts(result.pagination?.status_counts ?? {});
        setStaleData(result.stale_data === true);
        setNotice(result.stale_data ? "Showing the last successful shipment list. Refresh when production data is available." : "");
      })
      .catch((error) => {
        if (cancelled) return;
        const details = getPssErrorDetails(error, "Shipment list is temporarily unavailable. Existing records are unchanged.");
        setLoadError(details.message);
        setStaleData(hadRowsRef.current);
        setNotice(hadRowsRef.current ? `Shipment refresh failed: ${details.message}` : details.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey, status]);
  const loadMore = async () => { if (loadingMore || !hasMore) return; setLoadingMore(true); try { const statusQuery = status === "All" ? "" : `&status=${encodeURIComponent(status)}`; const result = await pssApi<{ data: Array<Record<string, unknown>>; pagination?: { next_offset?: number; has_more?: boolean } }>(`/v1/shipments?limit=50&offset=${offset}&include_tracking=1${statusQuery}`); const nextRows = (result.data ?? []).map(mapShipmentRow); setRows((current) => [...current, ...nextRows.filter((next) => !current.some((existing) => existing.id === next.id))]); setOffset(Number(result.pagination?.next_offset ?? offset + nextRows.length)); setHasMore(Boolean(result.pagination?.has_more)); } catch (error) { setNotice(getPssErrorDetails(error, "More shipments could not be loaded.").message); } finally { setLoadingMore(false); } };
  const statusCount = (statusName: ShipmentStatus) => { if (!Object.keys(serverStatusCounts).length) return statusName === "All" ? rows.length : statusName === "Active" ? rows.filter((row) => activeStatuses.has(row.status)).length : rows.filter((row) => row.status === statusName).length; const key = statusName.toLowerCase().replaceAll(" ", "_"); if (statusName === "All") return serverTotal ?? rows.length; if (statusName === "Active") return ["booked", "picked_up", "in_transit", "out_for_delivery", "delayed", "exception"].reduce((sum, keyName) => sum + Number(serverStatusCounts[keyName] ?? 0), 0); if (statusName === "Returned") return Number(serverStatusCounts.rto ?? 0) + Number(serverStatusCounts.returned ?? 0); return Number(serverStatusCounts[key] ?? 0); };
  const counts = statuses.reduce<Record<ShipmentStatus, number>>((result, item) => { result[item] = statusCount(item); return result; }, {} as Record<ShipmentStatus, number>);
  const matchesCurrentFilter = (row: ShipmentRow) => (!query.trim() || searchable(row).includes(query.trim().toLowerCase())) && (status === "All" || status === "Active" ? status === "All" || activeStatuses.has(row.status) : row.status === status);
  const filtered = rows.filter(matchesCurrentFilter);
  const selectedRows = filtered.filter((row) => selectedIds.has(row.id));
  const deletableRows = selectedRows.filter(canDeleteShipment);
  const allVisibleSelected = filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id));
  const toggleSelected = (id: string) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllVisible = () => setSelectedIds((current) => { const next = new Set(current); if (allVisibleSelected) filtered.forEach((row) => next.delete(row.id)); else filtered.forEach((row) => next.add(row.id)); return next; });
  const selectAllMatching = async () => {
    if (!hasMore || selectingAll) return;
    setSelectingAll(true); setNotice("Loading all shipments in this filter…");
    try {
      const statusQuery = status === "All" ? "" : `&status=${encodeURIComponent(status)}`;
      const allRows: ShipmentRow[] = []; let pageOffset = 0; let more = true;
      while (more) {
        const result = await pssApi<{ data: Array<Record<string, unknown>>; pagination?: { next_offset?: number; has_more?: boolean } }>(`/v1/shipments?limit=50&offset=${pageOffset}&include_tracking=1${statusQuery}`);
        const pageRows = (result.data ?? []).map(mapShipmentRow);
        allRows.push(...pageRows); const nextOffset = Number(result.pagination?.next_offset ?? pageOffset + pageRows.length);
        more = Boolean(result.pagination?.has_more) && nextOffset > pageOffset; pageOffset = nextOffset;
      }
      const matchingRows = allRows.filter(matchesCurrentFilter); setRows(allRows); setOffset(pageOffset); setHasMore(false); setSelectedIds(new Set(matchingRows.map((row) => row.id))); setNotice(`${matchingRows.length} shipments selected in this filter.`);
    } catch (error) { setNotice(getPssErrorDetails(error, "All shipments in this filter could not be selected.").message); } finally { setSelectingAll(false); }
  };
  const downloadDocument = async (row: ShipmentRow, documentId: string | undefined, label: string) => {
    if (!documentId) return;
    try {
      const { blob } = await pssApiFile(`/v1/documents/${encodeURIComponent(documentId)}`);
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${label}-${row.pssTracking}.pdf`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500); setNotice(`${label} downloaded.`);
    } catch (error) { setNotice(`${label} download failed: ${getPssErrorDetails(error, `The ${label.toLowerCase()} could not be downloaded.`).message}`); }
  };
  const downloadPod = async (row: ShipmentRow) => {
    setOpenMenu(null);
    setNotice("Downloading POD from Delhivery…");
    try {
      if (row.podDocumentId) { await downloadDocument(row, row.podDocumentId, "POD"); return; }
      const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(row.id)}/document?doc_type=LM_POD`);
      const artifact = result.data?.artifact;
      const base64 = artifactBase64s(artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).find((value) => /^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 100);
      const directUrl = artifactUrl(artifact);
      if (base64) { downloadBase64(`POD-${row.pssTracking}.pdf`, base64, artifactField(artifact, ["content_type", "contentType", "mime_type", "mimeType"]) ?? "application/pdf"); setNotice("POD downloaded."); return; }
      if (directUrl) { const link = document.createElement("a"); link.href = directUrl; link.download = `POD-${row.pssTracking}`; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click(); setNotice("POD download started."); return; }
      throw new Error("Delhivery returned no POD document");
    } catch (error) { setNotice(`POD download failed: ${getPssErrorDetails(error, "The POD could not be downloaded.").message}`); }
  };
  const fetchProviderArtifact = async (row: ShipmentRow, kind: "lr-copy" | "document") => {
    const query = kind === "lr-copy" ? "?lr_copy_type=SHIPPER%20COPY" : "?doc_type=LM_POD";
    const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(row.id)}/${kind}${query}`);
    const artifact = result.data?.artifact;
    const base64 = artifactBase64s(artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).find((value) => /^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 100);
    const directUrl = artifactUrl(artifact);
    const label = kind === "lr-copy" ? "LR" : "POD";
    if (base64) return { name: `${label}-${row.pssTracking}.pdf`, blob: new Blob([base64Bytes(base64)], { type: artifactField(artifact, ["content_type", "contentType", "mime_type", "mimeType"]) ?? "application/pdf" }) };
    if (directUrl) { const response = await fetch(directUrl); if (!response.ok) throw new Error(`Unable to fetch ${label} document`); return { name: `${label}-${row.pssTracking}.pdf`, blob: await response.blob() }; }
    throw new Error(`Delhivery returned no ${label} document`);
  };
  const runBulkDocumentDownload = async (kind: "lr-copy" | "document") => {
    const label = kind === "lr-copy" ? "LR" : "POD";
    if (!selectedRows.length) return;
    setOpenMenu(null); setNotice(`Downloading ${label} documents…`);
    const files: Array<{ name: string; blob: Blob }> = []; let failed = 0;
    for (const row of selectedRows) { try { if (kind === "document" && row.podDocumentId) { const { blob } = await pssApiFile(`/v1/documents/${encodeURIComponent(row.podDocumentId)}`); files.push({ name: `POD-${row.pssTracking}.pdf`, blob }); } else files.push(await fetchProviderArtifact(row, kind)); } catch { failed += 1; } }
    if (files.length) { const archive = await buildZip(files); const url = URL.createObjectURL(archive); const link = document.createElement("a"); link.href = url; link.download = `PSS-${label.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.zip`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500); }
    setNotice(`${label}: ${files.length} added to ZIP${failed ? `, ${failed} unavailable` : ""}.`);
  };
  const cancelSelected = async () => {
    if (!selectedRows.length || !window.confirm(`Cancel ${selectedRows.length} selected shipment${selectedRows.length === 1 ? "" : "s"}?`)) return;
    setNotice("Cancelling selected shipments…"); let success = 0; let failed = 0;
    for (const row of selectedRows) { try { await pssApi(`/v1/shipments/${encodeURIComponent(row.id)}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }); success += 1; } catch { failed += 1; } }
    setSelectedIds(new Set()); setNotice(`Cancelled ${success} shipment${success === 1 ? "" : "s"}${failed ? `; ${failed} could not be cancelled` : ""}.`); setReloadKey((value) => value + 1);
  };
  const deleteSelected = async () => {
    if (!selectedRows.length) return;
    if (!deletableRows.length) { setNotice("Nothing selected can be deleted. Only cancelled or failed shipments without courier references can be permanently deleted."); return; }
    const skipped = selectedRows.length - deletableRows.length;
    if (!window.confirm(`Permanently delete ${deletableRows.length} eligible shipment${deletableRows.length === 1 ? "" : "s"} from the database?${skipped ? ` ${skipped} selected shipment${skipped === 1 ? " is" : "s are"} not eligible and will be kept.` : ""} This cannot be undone.`)) return;
    setNotice("Deleting selected local shipment records…"); let success = 0; let failed = 0;
    for (const row of deletableRows) { try { await pssApi(`/v1/shipments/${encodeURIComponent(row.id)}`, { method: "DELETE" }); success += 1; } catch { failed += 1; } }
    setSelectedIds(new Set()); setNotice(`Deleted ${success} shipment${success === 1 ? "" : "s"}${failed ? `; ${failed} could not be deleted` : ""}${skipped ? `; ${skipped} selected shipment${skipped === 1 ? " was" : "s were"} kept because they are not eligible` : ""}.`); setReloadKey((value) => value + 1);
  };
  const openShipmentAction = (row: ShipmentRow, action: "label" | "lr") => { setOpenMenu(null); router.push(`/dashboard/shipmentTracking?id=${encodeURIComponent(row.pssTracking)}&action=${action}`); };

  return <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 w-full flex-col gap-3 overflow-hidden">
    <div className="relative flex min-w-0 items-center rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><Search className="ml-3 size-4 shrink-0 text-muted-foreground" /><input aria-label="Search all shipments" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments, references, customers, or cities…" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/70" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="mr-2 rounded p-1 text-muted-foreground hover:bg-accent"><X className="size-3.5" /></button>}</div>
    <div className="flex min-h-0 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Shipment status filters">{statuses.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition", status === item ? "bg-background text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-background/70 hover:text-foreground")}><span>{item}</span><span className={cn("text-[11px] tabular-nums", status === item ? "text-primary" : "text-muted-foreground/80")}>{counts[item]}</span></button>)}</div>
    <p className="-mt-1 px-1 text-[11px] text-muted-foreground">Active is a rollup of open statuses and overlaps with Booked, In Transit, Exception, and other active categories; use All for the mutually exclusive total.</p>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs"><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground"><span className="hidden sm:inline">Select shipments to run bulk actions · Showing {rows.length}{hasMore ? "+" : ""}</span><div className="flex flex-wrap items-center gap-2">{selectedRows.length > 0 && <><span className="font-semibold text-foreground">{selectedRows.length} selected</span>{hasMore && allVisibleSelected && <button type="button" onClick={() => void selectAllMatching()} disabled={selectingAll} className="rounded-md border border-primary/50 px-2 py-1 font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">{selectingAll ? "Selecting all…" : "Select all matching"}</button>}<button type="button" onClick={() => void cancelSelected()} className="rounded-md border border-border px-2 py-1 font-semibold hover:bg-accent">Cancel</button><button type="button" disabled={!deletableRows.length} title={deletableRows.length ? "Permanently delete eligible cancelled or failed shipments without courier references" : "Only cancelled or failed shipments without courier references can be deleted"} onClick={() => void deleteSelected()} className="rounded-md border border-destructive/50 px-2 py-1 font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50">Delete{deletableRows.length && deletableRows.length !== selectedRows.length ? ` (${deletableRows.length} eligible)` : ""}</button><button type="button" onClick={() => void runBulkDocumentDownload("lr-copy")} className="rounded-md border border-border px-2 py-1 font-semibold hover:bg-accent">Download LR</button><button type="button" onClick={() => void runBulkDocumentDownload("document")} className="rounded-md border border-border px-2 py-1 font-semibold hover:bg-accent">Download POD</button></>}{notice && <span role={staleData ? "status" : "alert"} className={staleData ? "text-amber-700 dark:text-amber-300" : "text-destructive"}>{notice}</span>}</div></div>{filtered.length ? <div className="min-h-0 flex-1 overflow-auto" onScroll={(event) => { const element = event.currentTarget; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 180) void loadMore(); }}><table className="w-full min-w-[1220px] text-left text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur"><tr><th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all visible shipments" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>{["Courier reference", "Booking date", "Consignor", "Consignee", "No. of box", "Weight", "Courier", "ETA", "Status", ""].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{filtered.map((row) => <tr key={`${row.id}-${row.courierTracking}`} className="transition hover:bg-accent/30"><td className="px-4 py-3"><input type="checkbox" aria-label={`Select shipment ${row.pssTracking}`} checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} /></td><td className="px-4 py-3 font-mono font-semibold"><a href={`/dashboard/shipmentTracking?id=${encodeURIComponent(row.pssTracking)}`} className={cn("inline-flex items-center gap-1.5", row.lr ? "hover:text-primary" : "text-muted-foreground")}>{row.lr || "Not available"}<PackageSearch className="size-3.5" /></a></td><td className="px-4 py-3 text-muted-foreground">{row.booked}</td><td className="max-w-[190px] px-4 py-3 font-medium" title={row.consignor}><span className="block truncate">{row.consignor}</span>{row.consignorAddress && <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground/70" title={row.consignorAddress}>{row.consignorAddress}</span>}</td><td className="max-w-[190px] px-4 py-3 font-medium" title={row.consignee}><span className="block truncate">{row.consignee}</span>{row.consigneeAddress && <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground/70" title={row.consigneeAddress}>{row.consigneeAddress}</span>}</td><td className="px-4 py-3">{row.pieces}</td><td className="px-4 py-3">{row.weight}</td><td className="px-4 py-3">{row.courier}</td><td className="px-4 py-3 text-muted-foreground">{row.eta}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", statusStyles[row.status])}>{row.status}</span></td><td className="relative px-4 py-3 text-right"><button type="button" aria-label={`Shipment actions for ${row.pssTracking}`} aria-expanded={openMenu === row.id} onClick={() => setOpenMenu((current) => current === row.id ? null : row.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><MoreVertical className="size-4" /></button>{openMenu === row.id && <div className="absolute right-3 top-10 z-30 w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"><ActionItem icon={<FileText className="size-3.5" />} label="Invoice Download" disabled={!row.invoiceDocumentId} onClick={() => { setOpenMenu(null); void downloadDocument(row, row.invoiceDocumentId, "Invoice"); }} /><ActionItem icon={<FileText className="size-3.5" />} label="POD Download" disabled={!row.podDocumentId && row.status !== "Delivered"} onClick={() => void downloadPod(row)} /><ActionItem icon={<LifeBuoy className="size-3.5" />} label="Raise ticket" onClick={() => { setOpenMenu(null); router.push(`/dashboard/supportTicketCreation?shipmentId=${encodeURIComponent(row.id)}`); }} /><ActionItem icon={<Tag className="size-3.5" />} label="Download label" onClick={() => openShipmentAction(row, "label")} /><ActionItem icon={<Download className="size-3.5" />} label="Download LR" onClick={() => openShipmentAction(row, "lr")} /></div>}</td></tr>)}</tbody></table>{hasMore && <div className="flex flex-col items-center gap-2 border-t border-border p-4"><p className="text-xs text-muted-foreground">More shipments are available.</p><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{loadingMore ? "Loading…" : "Load more shipments"}</button></div>}</div> : <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center"><Search className="mb-2 size-5 text-muted-foreground/60" /><p className="text-sm font-semibold">{loading ? "Loading production shipments…" : loadError ? "Production shipments unavailable" : "No shipments found"}</p>{loading ? <p className="mt-1 text-xs text-muted-foreground">Retrieving records from the authenticated Worker.</p> : loadError ? <><p className="mt-1 max-w-md text-xs text-muted-foreground">{loadError}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">Retry shipments</button></> : <p className="mt-1 text-xs text-muted-foreground">Try another search or status.</p>}</div>}</div>
  </div>;
}

function ActionItem({ icon, label, disabled, onClick }: { icon: ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground/45">{icon}<span>{label}</span>{disabled && <span className="ml-auto text-[10px]">Unavailable</span>}</button>;
}
