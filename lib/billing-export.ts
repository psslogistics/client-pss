import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { zipSync } from "fflate";
import { formatDate, localDateInput, shiftLocalDays } from "@/lib/date-format";
import { buildWorkbook, type WorkbookCell } from "@/lib/xlsx";
import { EXAMPLE_INVOICE_BUYER, EXAMPLE_INVOICE_SELLER, amountInWords, cycleInvoiceNumber, invoiceNumberForLr } from "@/lib/invoice-contract";

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
const shipmentInvoiceNumber = (record: BillingExportRecord) => record.lr_number ? invoiceNumberForLr(record.lr_number) : invoiceNumberForLr(undefined);
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
const exampleSeller = `${EXAMPLE_INVOICE_SELLER.name}\n${EXAMPLE_INVOICE_SELLER.address}\nGSTIN: ${EXAMPLE_INVOICE_SELLER.gstin}\nEmail: ${EXAMPLE_INVOICE_SELLER.email}`;
const exampleBuyer = `${EXAMPLE_INVOICE_BUYER.name}\n${EXAMPLE_INVOICE_BUYER.address}\nGSTIN: ${EXAMPLE_INVOICE_BUYER.gstin}`;
// Billing cycles are inclusive: a 30-day cycle contains today plus the prior
// 29 local calendar days, matching the Reports date-range semantics.
const billingPeriod = (days: number, now = new Date()) => ({ start: shiftLocalDays(now, -(days - 1)), end: localDateInput(now) });

function makeXlsx(records: BillingExportRecord[], days: number) {
  const period = billingPeriod(days);
  const headers = ["Invoice", "Shipment ID", "PSS Reference", "LR / LRN", "Tracking", "From", "To", "Consignor", "Consignee", "Origin address", "Destination address", "Pieces", "Weight (kg)", "Chargeable weight (kg)", "Dimensions", "Declared value", "Billing date", "Status", "Due date", "Charge breakup", "Tax", "Adjustments", "Amendments", "Total"];
  const rows: WorkbookCell[][] = records.map((record) => [
    shipmentInvoiceNumber(record), record.shipment_pss_reference || "Pending reference", record.shipment_pss_reference, record.lr_number, record.tracking_number,
    record.shipment_origin, record.shipment_destination, text(record.shipment_origin_address?.name), record.shipment_consignee ?? text(record.shipment_destination_address?.name),
    addressText(record.shipment_origin_address), addressText(record.shipment_destination_address), record.pieces ?? null, record.total_weight_kg ?? null,
    record.pricing?.chargeableWeightKg ?? null, dimensionsText(record.dimensions), record.declared_value ?? null, record.created_at, record.status, record.due_date ?? null,
    breakupText(record), taxFor(record), record.adjustments?.map((item) => `${item.component_code}: ${money(item.previous_amount)} -> ${money(item.new_amount)} (${item.reason})`).join(" | "),
    record.amendments?.map((item) => `${item.amendment_type}: ${money(item.previous_amount)} -> ${money(item.new_amount)} (${item.reason})`).join(" | "), record.amount,
  ] as WorkbookCell[]);
  const billableTotal = records.filter((record) => !isExcluded(record)).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  return buildWorkbook([
    { name: "Billing summary", headers: ["Field", "Value"], rows: [["Period", `${period.start} to ${period.end}`], ["Generated at", localDateInput()], ["Records exported", records.length], ["Billable records", records.filter((record) => !isExcluded(record)).length], ["Excluded records", records.filter(isExcluded).length], ["Final billed total", billableTotal]], columnWidths: [24, 34], currencyColumns: [1], autoFilter: false },
    { name: `Billing ${days} days`, headers, rows, columnWidths: [18, 22, 18, 16, 18, 20, 20, 20, 22, 34, 34, 10, 14, 20, 24, 16, 22, 14, 22, 42, 14, 42, 42, 16], numericColumns: [11, 12, 13], currencyColumns: [15, 20, 23], dateColumns: [16, 18] },
  ]);
}

function makeSummaryPdf(records: BillingExportRecord[], days: number) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const margin = 34;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const billable = records.filter((record) => !isExcluded(record));
  const excluded = records.length - billable.length;
  const total = billable.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const taxTotal = billable.reduce((sum, record) => sum + taxFor(record), 0);
  const subtotal = Math.max(0, total - taxTotal);
  const generatedAt = new Date();
  const period = billingPeriod(days, generatedAt);
  const generated = formatDate(generatedAt.toISOString());
  const cycleNumber = cycleInvoiceNumber(period.start, period.end);
  pdf.setProperties({ title: `PSS Logistics Billing Invoice ${cycleNumber}`, subject: "Consolidated client tax invoice", creator: "PSS Logistics" });
  const drawHeader = () => {
    pdf.setFillColor(15, 57, 88); pdf.rect(0, 0, pageWidth, 74, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(255, 255, 255); pdf.text("PSS LOGISTICS", margin, 32);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text("CONSOLIDATED TAX INVOICE", margin, 49);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(cycleNumber, pageWidth - margin, 30, { align: "right" });
    pdf.setFont("helvetica", "normal"); pdf.text(`Billing period: Last ${days} days`, pageWidth - margin, 46, { align: "right" });
  };
  drawHeader();
  pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text("From", margin, 98); pdf.text("Bill to", pageWidth / 2 + 8, 98);
  pdf.setDrawColor(203, 213, 225); pdf.setFillColor(248, 250, 252); pdf.roundedRect(margin, 106, pageWidth / 2 - margin - 8, 84, 5, 5, "FD"); pdf.roundedRect(pageWidth / 2 + 8, 106, pageWidth / 2 - margin - 8, 84, 5, 5, "FD");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(exampleSeller.split("\n"), margin + 10, 122); pdf.text(exampleBuyer.split("\n"), pageWidth / 2 + 18, 122);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(15, 57, 88); pdf.text("Invoice details", margin, 214);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(30, 41, 59); pdf.text(`Invoice number: ${cycleNumber}`, margin, 230); pdf.text(`Invoice date: ${generated}`, margin, 244); pdf.text(`Shipments included: ${billable.length}`, pageWidth / 2 + 8, 230); pdf.text(`Excluded records: ${excluded}`, pageWidth / 2 + 8, 244);
  autoTable(pdf, {
    startY: 264,
    head: [["#", "Shipment / invoice", "Route and consignee", "Boxes / weight", "Amount"]],
    body: billable.map((record, index) => {
      const lr = text(record.lr_number ?? "Not available");
      const invoice = shipmentInvoiceNumber(record);
      return [String(index + 1), `${invoice}\nLR / LRN: ${lr}\nDate: ${formatDate(record.shipment_created_at ?? record.created_at)}`, `${text(record.shipment_origin) || "Not provided"} -> ${text(record.shipment_destination) || "Not provided"}\nConsignee: ${text(record.shipment_consignee) || "Not provided"}`, `${text(record.pieces ?? 1)} boxes\n${text(record.total_weight_kg ?? "Not recorded")} kg`, `Rs. ${money(record.amount)}`];
    }),
    margin: { left: margin, right: margin, top: 74, bottom: 54 },
    tableWidth: pageWidth - margin * 2,
    rowPageBreak: "avoid",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 6, minCellHeight: 34, overflow: "linebreak", lineColor: [203, 213, 225], lineWidth: 0.35, textColor: [30, 41, 59], valign: "middle" },
    headStyles: { fillColor: [15, 57, 88], textColor: 255, fontStyle: "bold", halign: "left" },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: { 0: { cellWidth: 24, halign: "center" }, 1: { cellWidth: 140 }, 2: { cellWidth: 170 }, 3: { cellWidth: 64, halign: "right" }, 4: { cellWidth: 76, halign: "right" } },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) drawHeader();
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139); pdf.text("PSS Logistics | Computer generated invoice | Example addresses pending configuration", margin, pageHeight - 24); pdf.text(`Page ${hookData.pageNumber}`, pageWidth - margin, pageHeight - 24, { align: "right" });
    },
  });
  const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 264;
  const totalsY = finalY + 18;
  const needsTotalsPage = totalsY + 92 > pageHeight - 40;
  if (needsTotalsPage) { pdf.addPage(); drawHeader(); }
  const y = needsTotalsPage ? 104 : totalsY;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(15, 57, 88); pdf.text("Amount summary", margin, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(30, 41, 59); pdf.text("Subtotal", pageWidth - margin - 180, y + 18); pdf.text(`Rs. ${money(subtotal)}`, pageWidth - margin, y + 18, { align: "right" }); pdf.text("Taxes / charges", pageWidth - margin - 180, y + 34); pdf.text(`Rs. ${money(taxTotal)}`, pageWidth - margin, y + 34, { align: "right" });
  pdf.setDrawColor(15, 57, 88); pdf.line(pageWidth - margin - 170, y + 42, pageWidth - margin, y + 42); pdf.setFont("helvetica", "bold"); pdf.text("Grand total", pageWidth - margin - 128, y + 58); pdf.text(`Rs. ${money(total)}`, pageWidth - margin, y + 58, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(`Amount chargeable in words: ${amountInWords(total)}`, margin, y + 76); pdf.text("Payment terms: As agreed with the client account.", margin, y + 90);
  return pdf.output("arraybuffer");
}

export function downloadBillingExport(records: BillingExportRecord[], days: number) {
  const xlsx = makeXlsx(records, days);
  const pdf = new Uint8Array(makeSummaryPdf(records, days));
  const period = billingPeriod(days);
  const archive = zipSync({
    [`PSS-BILL-${period.start}-to-${period.end}.xlsx`]: xlsx,
    [`PSS-BILL-${period.start}-to-${period.end}.pdf`]: pdf,
  });
  downloadBytes(archive.buffer, `PSS-Billing-${period.start}-to-${period.end}.zip`, "application/zip");
}
