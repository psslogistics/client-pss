"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatReportCurrency, formatReportDate, readClientReportData } from "@/lib/client-report";
import type { BillingRecord } from "@/lib/client-finance-data";

type ClientReportPreviewProps = { onClose: () => void };
const dateValue = (value: string) => value === "Not provided" ? "Not provided" : formatReportDate(value);
const statusColor = (status: string) => status === "Delivered" ? "text-emerald-700 dark:text-emerald-300" : status === "Cancelled" ? "text-destructive" : "text-foreground";

export default function ClientReportPreview({ onClose }: ClientReportPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const data = useMemo(() => readClientReportData(), []);
  const summary = useMemo(() => {
    const statuses = new Map<string, number>();
    data.shipments.forEach((record) => statuses.set(record.status, (statuses.get(record.status) || 0) + 1));
    return {
      statuses: [...statuses.entries()].map(([label, count]) => ({ label, count })),
      modes: [...new Set(data.shipments.map((record) => "mode" in record ? String(record.mode) : "").filter(Boolean))].map((label) => ({ label, count: data.shipments.filter((record) => "mode" in record && String(record.mode) === label).length })),
      totalCost: data.shipments.reduce((sum, record) => sum + record.total, 0),
      totalWeight: data.shipments.reduce((sum, record) => sum + record.billableWeight, 0),
      delivered: data.shipments.filter((record) => record.status === "Delivered").length,
    };
  }, [data]);

  const downloadPdf = () => {
    setIsDownloading(true);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    let y = 44;
    const today = new Date().toISOString().slice(0, 10);
    const addHeader = (title: string) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(23, 32, 51);
      pdf.text(title, margin, y);
      y += 22;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Prepared ${today} | Client operations report | Frontend data snapshot`, margin, y);
      y += 18;
    };
    const ensureSpace = (height: number) => { if (y + height > 770) { pdf.addPage(); y = 44; } };
    const section = (title: string) => { ensureSpace(32); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(37, 99, 235); pdf.text(title, margin, y); y += 16; };
    const table = (head: string[], body: string[][], widths?: number[]) => { ensureSpace(72); autoTable(pdf, { startY: y, head: [head], body: body.length ? body : [["No records available", ...Array(Math.max(0, head.length - 1)).fill("")]], margin: { left: margin, right: margin }, tableWidth: pageWidth - margin * 2, styles: { font: "helvetica", fontSize: 7, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [37, 99, 235], textColor: 255 }, alternateRowStyles: { fillColor: [245, 248, 252] }, columnStyles: widths ? Object.fromEntries(widths.map((width, index) => [index, { cellWidth: width }])) : undefined }); y = (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18; };

    addHeader("PSS Logistics - Complete Client Report");
    section("Executive overview");
    table(["Metric", "Value"], [["Total shipments", String(data.shipments.length)], ["Delivered shipments", String(summary.delivered)], ["Total billable weight", `${summary.totalWeight.toFixed(2)} kg`], ["Total shipment cost", formatReportCurrency(summary.totalCost)], ["Pickup records", String(data.pickups.length)], ["Open operational cases", String(data.ndr.length + data.exceptions.length)]], [180, 300]);
    section("Shipment status distribution");
    table(["Status", "Shipments", "Share"], summary.statuses.map((item) => [item.label, String(item.count), data.shipments.length ? `${Math.round((item.count / data.shipments.length) * 100)}%` : "0%"]), [220, 110, 110]);
    section("Transport mode breakdown");
    table(["Mode", "Shipments", "Share"], summary.modes.map((item) => [item.label, String(item.count), data.shipments.length ? `${Math.round((item.count / data.shipments.length) * 100)}%` : "0%"]), [220, 110, 110]);
    section("Complete shipment lifecycle");
    table(["Reference", "Booked", "Pickup", "Delivered", "Status", "Route", "Courier", "Weight", "Cost", "Payment", "POD"], data.shipments.map((record) => [record.id, dateValue(record.bookingDate), dateValue(record.pickupDate), dateValue(record.deliveryDate), record.status, `${record.origin} to ${record.destination}`, record.courier, `${record.billableWeight.toFixed(2)} kg`, formatReportCurrency(record.total), record.payment, record.pod]), [58, 55, 55, 55, 55, 82, 62, 52, 58, 45, 42]);
    section("Pickup activity");
    table(["Reference", "Date", "Customer", "Location", "Window", "Pieces", "Weight", "Status"], data.pickups.map((pickup) => [pickup.reference, dateValue(pickup.date), pickup.customer, pickup.location, pickup.window, String(pickup.pieces), pickup.weight, pickup.status]), [65, 58, 90, 80, 68, 40, 55, 65]);
    section("Billing and charge detail");
    table(["Reference", "Declared", "Measured", "Billable", "Base", "Weight charge", "Tax", "Total", "COD"], data.shipments.map((record) => [record.id, `${record.declaredWeight.toFixed(2)} kg`, `${record.measuredWeight.toFixed(2)} kg`, `${record.billableWeight.toFixed(2)} kg`, formatReportCurrency(record.baseCharge), formatReportCurrency(record.weightCharge), formatReportCurrency(record.tax), formatReportCurrency(record.total), record.cod ? formatReportCurrency(record.cod) : "-"]), [60, 55, 55, 55, 55, 65, 50, 55, 50]);
    section("Exceptions and client action");
    table(["Type", "Reference", "Status", "Severity", "Date", "Details"], [...data.ndr.map((item) => ["NDR", item.shipment, item.status, item.priority, dateValue(item.date), `${item.reason} - ${item.notes}`]), ...data.exceptions.map((item) => ["Exception", item.shipment, item.status, item.severity, dateValue(item.date), `${item.title} - ${item.details}`])], [55, 65, 90, 55, 58, 190]);
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) { pdf.setPage(page); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139); pdf.text(`PSS Logistics | Client report | Page ${page} of ${pageCount}`, margin, 810); }
    pdf.save(`PSS-client-report-${today}.pdf`);
    setIsDownloading(false);
  };

  const recordCount = data.shipments.length + data.pickups.length + data.ndr.length + data.exceptions.length;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-6" role="dialog" aria-modal="true" aria-labelledby="client-report-title">
    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></div><div><h2 id="client-report-title" className="text-base font-semibold text-foreground">Complete client report</h2><p className="text-xs text-muted-foreground">All available client-facing records · {recordCount} total records</p></div></div><button type="button" onClick={onClose} aria-label="Close report preview" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6"><article className="mx-auto max-w-5xl space-y-5 rounded-xl border border-border bg-card p-5 shadow-xs sm:p-8"><div className="flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">PSS Logistics · Client operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Complete client report</h1><p className="mt-1 text-xs text-muted-foreground">Generated when downloaded from available frontend client data.</p></div><div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-800 dark:text-amber-200">Demo/data snapshot<br />Not an authoritative invoice or compliance record.</div></div>
        <section><h3 className="text-sm font-semibold">Executive overview</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Shipments", data.shipments.length], ["Delivered", summary.delivered], ["Billable weight", `${summary.totalWeight.toFixed(2)} kg`], ["Shipment cost", formatReportCurrency(summary.totalCost)], ["Open cases", data.ndr.length + data.exceptions.length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold tabular-nums text-foreground">{value}</p></div>)}</div></section>
        <section><h3 className="text-sm font-semibold">Shipment status distribution</h3><div className="mt-3 flex flex-wrap gap-2">{summary.statuses.length ? summary.statuses.map((item) => <span key={item.label} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"><strong>{item.label}</strong><span className="ml-2 text-muted-foreground">{item.count}</span></span>) : <p className="text-xs text-muted-foreground">No records available.</p>}</div></section>
        <section><h3 className="text-sm font-semibold">Transport mode breakdown</h3><div className="mt-3 flex flex-wrap gap-2">{summary.modes.length ? summary.modes.map((item) => <span key={item.label} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"><strong>{item.label}</strong><span className="ml-2 text-muted-foreground">{item.count}</span></span>) : <p className="text-xs text-muted-foreground">No records available.</p>}</div></section>
        <ReportTable title="Complete shipment lifecycle" headers={["Reference", "Booked", "Pickup", "Delivered", "Status", "Route", "Courier", "Weight", "Cost", "Payment", "POD"]} rows={data.shipments.map((record) => [record.id, dateValue(record.bookingDate), dateValue(record.pickupDate), dateValue(record.deliveryDate), <span className={statusColor(record.status)}>{record.status}</span>, `${record.origin} to ${record.destination}`, record.courier, `${record.billableWeight.toFixed(2)} kg`, formatReportCurrency(record.total), record.payment, record.pod])} />
        <ReportTable title="Pickup activity" headers={["Reference", "Date", "Customer", "Location", "Window", "Pieces", "Weight", "Status"]} rows={data.pickups.map((pickup) => [pickup.reference, dateValue(pickup.date), pickup.customer, pickup.location, pickup.window, pickup.pieces, pickup.weight, pickup.status])} />
        <ReportTable title="Billing and charge detail" headers={["Reference", "Declared", "Measured", "Billable", "Base", "Weight charge", "Tax", "Total", "COD"]} rows={data.shipments.map((record) => [record.id, `${record.declaredWeight.toFixed(2)} kg`, `${record.measuredWeight.toFixed(2)} kg`, `${record.billableWeight.toFixed(2)} kg`, formatReportCurrency(record.baseCharge), formatReportCurrency(record.weightCharge), formatReportCurrency(record.tax), formatReportCurrency(record.total), record.cod ? formatReportCurrency(record.cod) : "-"])} />
        <ReportTable title="Exceptions and client action" headers={["Type", "Reference", "Status", "Severity", "Date", "Details"]} rows={[...data.ndr.map((item) => ["NDR", item.shipment, item.status, item.priority, dateValue(item.date), `${item.reason} - ${item.notes}`]), ...data.exceptions.map((item) => ["Exception", item.shipment, item.status, item.severity, dateValue(item.date), `${item.title} - ${item.details}`])]} />
      </article></div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3"><p className="text-[11px] text-muted-foreground">The PDF contains the same client-facing snapshot shown above.</p><div className="flex items-center gap-2"><button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-accent"><Printer className="size-3.5" /> Close preview</button><button type="button" onClick={downloadPdf} disabled={isDownloading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"><Download className="size-3.5" /> {isDownloading ? "Preparing PDF..." : "Download PDF"}</button></div></footer>
    </div>
  </div>;
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number | ReactNode)[][] }) {
  return <section><h3 className="text-sm font-semibold">{title}</h3><div className="mt-3 overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[760px] text-left text-[11px]"><thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex} className="align-top hover:bg-muted/20">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-foreground">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-muted-foreground">No records available.</td></tr>}</tbody></table></div></section>;
}
