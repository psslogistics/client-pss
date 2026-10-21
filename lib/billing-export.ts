import { zipSync } from "fflate";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/date-format";

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
  return list.map((item) => `${text(item.length)} × ${text(item.width ?? item.breadth)} × ${text(item.height)}${text(item.unit) ? ` ${text(item.unit)}` : ""}`).filter((item) => item.replace(/[ ×]/g, "")).join("; ");
};
const linesFor = (record: BillingExportRecord) => (record.line_items?.length ? [...record.line_items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) : record.pricing?.lines ?? []);
const taxFor = (record: BillingExportRecord) => linesFor(record).filter((line) => line.code.toLowerCase().includes("gst") || line.code.toLowerCase().includes("tax")).reduce((sum, line) => sum + Number(line.amount || 0), 0);
const breakupText = (record: BillingExportRecord) => linesFor(record).map((line) => `${line.label}${line.marker ?? ""}: ₹${money(line.amount)}`).join(" | ");
const xmlEscape = (value: unknown) => text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function makeXlsx(records: BillingExportRecord[], days: number) {
  const headers = ["Invoice", "Shipment ID", "PSS Reference", "LR / LRN", "Tracking", "From", "To", "Consignor", "Consignee", "Origin address", "Destination address", "Pieces", "Weight (kg)", "Chargeable weight (kg)", "Dimensions", "Declared value", "Billing date", "Status", "Due date", "Charge breakup", "Tax", "Adjustments", "Amendments", "Total"];
  const rows = records.map((record) => [
    record.invoice_number ?? record.id, record.shipment_id, record.shipment_pss_reference, record.lr_number, record.tracking_number,
    record.shipment_origin, record.shipment_destination, record.shipment_origin_address?.name, record.shipment_consignee ?? record.shipment_destination_address?.name,
    addressText(record.shipment_origin_address), addressText(record.shipment_destination_address), record.pieces, record.total_weight_kg,
    record.pricing?.chargeableWeightKg, dimensionsText(record.dimensions), record.declared_value, record.created_at, record.status, record.due_date,
    breakupText(record), money(taxFor(record)), record.adjustments?.map((item) => `${item.component_code}: ${money(item.previous_amount)} → ${money(item.new_amount)} (${item.reason})`).join(" | "),
    record.amendments?.map((item) => `${item.amendment_type}: ${money(item.previous_amount)} → ${money(item.new_amount)} (${item.reason})`).join(" | "), money(record.amount),
  ]);
  const allRows = [headers, ...rows];
  const sheetRows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => `<c r="${String.fromCharCode(65 + (colIndex % 26))}${rowIndex + 1}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join("")}</row>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    "_rels/.rels": new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Billing ${days} days" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`),
  };
  return zipSync(files, { level: 6 });
}

function download(bytes: Uint8Array, filename: string, type: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeSummaryPdf(records: BillingExportRecord[], days: number) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" }); const total = records.filter((record) => !["void", "cancelled"].includes(record.status)).reduce((sum, record) => sum + Number(record.amount || 0), 0); const generated = formatDate(new Date().toISOString());
  pdf.setFontSize(18); pdf.text("PSS Logistics Billing Summary", 40, 44); pdf.setFontSize(9); pdf.text(`Last ${days} days · Generated ${generated}`, 40, 61); pdf.setFontSize(11); pdf.text(`Shipments: ${records.length}`, 40, 88); pdf.text(`Final billed total: ₹${money(total)}`, 40, 106);
  autoTable(pdf, { startY: 126, head: [["Invoice", "LR / LRN", "From → To", "Weight", "Status", "Total"]], body: records.map((record) => [text(record.invoice_number ?? record.id), text(record.lr_number ?? "Not available"), `${text(record.shipment_origin)} → ${text(record.shipment_destination)}`, `${text(record.total_weight_kg)} kg`, text(record.status), `₹${money(record.amount)}`]), margin: { left: 40, right: 40 }, styles: { font: "helvetica", fontSize: 7, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [37, 99, 235], textColor: 255 }, alternateRowStyles: { fillColor: [245, 248, 252] } });
  return pdf.output("arraybuffer");
}

export function downloadBillingExport(records: BillingExportRecord[], days: number) {
  const suffix = `Last-${days}-Days`;
  download(makeXlsx(records, days), `PSS-Billing-${suffix}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  download(new Uint8Array(makeSummaryPdf(records, days)), `PSS-Billing-${suffix}.pdf`, "application/pdf");
}
