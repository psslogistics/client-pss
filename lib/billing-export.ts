import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { zipSync } from "fflate";
import { formatDate } from "@/lib/date-format";
import { buildWorkbook, type WorkbookCell } from "@/lib/xlsx";

export type BillingExportRecord = {
  id: string;
  invoice_number?: string;
  shipment_id?: string;
  amount: number;
  currency?: string;
  status: string;
  due_date?: string;
  created_at: string;
  shipment_pss_reference?: string;
  tracking_number?: string;
  lr_number?: string;
  master_awb?: string;
  shipment_origin?: string;
  shipment_destination?: string;
  shipment_origin_address?: Record<string, unknown> | null;
  shipment_destination_address?: Record<string, unknown> | null;
  shipment_consignee?: string;
  shipment_description?: string;
  total_weight_kg?: number;
  declared_value?: number;
  pieces?: number;
  edd?: string;
  dimensions?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  shipment_created_at?: string;
  pricing?: { lane?: string; chargeableWeightKg?: number; lines?: Array<{ code: string; label: string; amount: number; marker?: "*" }> } | null;
  line_items?: Array<{ code: string; label: string; amount: number; marker?: "*"; display_order?: number }>;
  adjustments?: Array<{ component_code: string; previous_amount: number; new_amount: number; reason: string; created_at: string }>;
  amendments?: Array<{ id: string; amendment_type: string; previous_amount: number; new_amount: number; reason: string; created_at: string }>;
};

const money = (value: unknown) => Number(value ?? 0).toFixed(2);
const text = (value: unknown) => String(value ?? "").trim();
const addressText = (value: Record<string, unknown> | null | undefined) => value ? [value.name, value.line ?? value.address_line1 ?? value.address, value.city, value.state, value.pincode ?? value.pin].map(text).filter(Boolean).join(", ") : "";
const dimensionsText = (value: BillingExportRecord["dimensions"]) => {
  if (!value) return "";
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => `${text(item.length)} x ${text(item.width ?? item.breadth)} x ${text(item.height)}${text(item.unit) ? ` ${text(item.unit)}` : ""}`).filter((item) => item.replace(/[ x]/g, "")).join("; ");
};
const linesFor = (record: BillingExportRecord) => record.line_items?.length ? [...record.line_items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) : record.pricing?.lines ?? [];
const taxFor = (record: BillingExportRecord) => linesFor(record).filter((line) => line.code.toLowerCase().includes("gst") || line.code.toLowerCase().includes("tax")).reduce((sum, line) => sum + Number(line.amount || 0), 0);
const breakupText = (record: BillingExportRecord) => linesFor(record).map((line) => `${line.label}${line.marker ?? ""}: Rs. ${money(line.amount)}`).join(" | ");
const isExcluded = (record: BillingExportRecord) => ["void", "cancelled", "canceled"].includes(text(record.status).toLowerCase());
const downloadBytes = (bytes: ArrayBuffer, filename: string, type: string) => { const url = URL.createObjectURL(new Blob([bytes], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };

function makeXlsx(records: BillingExportRecord[], days: number) {
  const headers = ["Invoice", "Shipment ID", "PSS Reference", "LR / LRN", "Tracking", "From", "To", "Consignor", "Consignee", "Origin address", "Destination address", "Pieces", "Weight (kg)", "Chargeable weight (kg)", "Dimensions", "Declared value", "Billing date", "Status", "Due date", "Charge breakup", "Tax", "Adjustments", "Amendments", "Total"];
  const rows: WorkbookCell[][] = records.map((record) => [
    record.invoice_number ?? record.id, record.shipment_id, record.shipment_pss_reference, record.lr_number, record.tracking_number,
    record.shipment_origin, record.shipment_destination, text(record.shipment_origin_address?.name), record.shipment_consignee ?? text(record.shipment_destination_address?.name),
    addressText(record.shipment_origin_address), addressText(record.shipment_destination_address), record.pieces ?? null, record.total_weight_kg ?? null,
    record.pricing?.chargeableWeightKg ?? null, dimensionsText(record.dimensions), record.declared_value ?? null, record.created_at, record.status, record.due_date ?? null,
    breakupText(record), taxFor(record), record.adjustments?.map((item) => `${item.component_code}: ${money(item.previous_amount)} -> ${money(item.new_amount)} (${item.reason})`).join(" | "),
    record.amendments?.map((item) => `${item.amendment_type}: ${money(item.previous_amount)} -> ${money(item.new_amount)} (${item.reason})`).join(" | "), record.amount,
  ] as WorkbookCell[]);
  const billableTotal = records.filter((record) => !isExcluded(record)).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  return buildWorkbook([
    { name: "Billing summary", headers: ["Field", "Value"], rows: [["Period", `Last ${days} days`], ["Generated at", new Date().toISOString()], ["Records exported", records.length], ["Billable records", records.filter((record) => !isExcluded(record)).length], ["Excluded records", records.filter(isExcluded).length], ["Final billed total", billableTotal]], columnWidths: [24, 34], currencyColumns: [1], autoFilter: false },
    { name: `Billing ${days} days`, headers, rows, columnWidths: [18, 22, 18, 16, 18, 20, 20, 20, 22, 34, 34, 10, 14, 20, 24, 16, 22, 14, 22, 42, 14, 42, 42, 16], numericColumns: [11, 12, 13], currencyColumns: [15, 20, 23], dateColumns: [16, 18] },
  ]);
}

function makeSummaryPdf(records: BillingExportRecord[], days: number) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 28;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const billable = records.filter((record) => !isExcluded(record));
  const excluded = records.length - billable.length;
  const total = billable.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const generated = formatDate(new Date().toISOString());
  pdf.setProperties({ title: `PSS Logistics Billing - Last ${days} days`, subject: "Client billing export", creator: "PSS Logistics" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(23, 32, 51); pdf.text("PSS Logistics - Billing Summary", margin, 38);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.text(`Period: last ${days} days | Generated: ${generated}`, margin, 55);
  pdf.setFontSize(10); pdf.setTextColor(23, 32, 51); pdf.text(`Records: ${records.length} | Billable: ${billable.length} | Excluded: ${excluded} | Final billed total: Rs. ${money(total)}`, margin, 78);
  autoTable(pdf, {
    startY: 96,
    head: [["Invoice", "LR / LRN", "From -> To", "Pieces", "Weight", "Status", "Billing date", "Total"]],
    body: records.map((record) => [text(record.invoice_number ?? record.id), text(record.lr_number ?? "Not available"), `${text(record.shipment_origin)} -> ${text(record.shipment_destination)}`, text(record.pieces ?? ""), `${text(record.total_weight_kg ?? "")} kg`, text(record.status), formatDate(record.created_at), `Rs. ${money(record.amount)}`]),
    margin: { left: margin, right: margin, top: 74, bottom: 32 },
    tableWidth: pageWidth - margin * 2,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, overflow: "linebreak", lineColor: [203, 213, 225], lineWidth: 0.35, textColor: [30, 41, 59] },
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: "bold", halign: "left" },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 76 }, 2: { cellWidth: 210 }, 3: { cellWidth: 46, halign: "right" }, 4: { cellWidth: 66, halign: "right" }, 5: { cellWidth: 70 }, 6: { cellWidth: 82 }, 7: { cellWidth: 78, halign: "right" } },
    didDrawPage: (hookData) => {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
      pdf.text("PSS Logistics | Confidential client billing export", margin, pageHeight - 16);
      pdf.text(`Page ${hookData.pageNumber}`, pageWidth - margin - 42, pageHeight - 16);
    },
  });
  return pdf.output("arraybuffer");
}

export function downloadBillingExport(records: BillingExportRecord[], days: number) {
  const xlsx = makeXlsx(records, days);
  const pdf = new Uint8Array(makeSummaryPdf(records, days));
  const archive = zipSync({
    [`PSS-Billing-Last-${days}-Days.xlsx`]: xlsx,
    [`PSS-Billing-Last-${days}-Days.pdf`]: pdf,
  });
  downloadBytes(archive.buffer, `PSS-Billing-Last-${days}-Days.zip`, "application/zip");
}
