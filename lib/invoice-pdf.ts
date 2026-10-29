import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/date-format";
import { EXAMPLE_INVOICE_BUYER, EXAMPLE_INVOICE_SELLER, amountInWords, invoiceFileName, invoiceNumberForLr } from "@/lib/invoice-contract";

export type InvoicePdfRecord = {
  id: string;
  invoice_number?: string;
  shipment_id?: string;
  amount: number;
  currency?: string;
  status: string;
  due_date?: string;
  created_at: string;
  pricing?: { lane?: string; chargeableWeightKg?: number; lines?: Array<{ code: string; label: string; amount: number; marker?: "*" }> } | null;
  line_items?: Array<{ code: string; label: string; amount: number; marker?: "*"; display_order?: number }>;
  adjustments?: Array<{ component_code: string; previous_amount: number; new_amount: number; reason: string; created_at: string }>;
  amendments?: Array<{ id: string; amendment_type: string; previous_amount: number; new_amount: number; reason: string; weight_received_at?: string | null; ticket_deadline_at?: string | null; created_at: string }>;
  provider_weight_received_at?: string | null;
  client_dispute_deadline_at?: string | null;
  service_description?: string;
  hsn_sac?: string;
  quantity?: number;
  rate?: number;
  tax_rate?: number;
  tax?: number;
  round_off?: number;
  buyer_name?: string;
  buyer_address?: string;
  buyer_gstin?: string;
  buyer_state?: string;
  buyer_state_code?: string;
  client_name?: string;
  client_address?: string;
  client_gstin?: string;
  client_state?: string;
  client_state_code?: string;
  destination?: string;
  origin?: string;
  consignor?: string;
  consignee?: string;
  lr_number?: string;
  tracking_number?: string;
  pieces?: number;
  weight_kg?: number;
  dimensions?: Array<Record<string, unknown>> | Record<string, unknown> | null;
  reference_number?: string;
  seller_name?: string;
  seller_address?: string;
  seller_gstin?: string;
  seller_pan?: string;
  seller_state?: string;
  seller_state_code?: string;
  seller_contact?: string;
  seller_email?: string;
  bank_account_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_ifsc?: string;
  irn?: string;
  ack_number?: string;
  ack_date?: string;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const LEFT = 36;
const INK = [24, 24, 24] as const;
const GREY = [238, 238, 238] as const;

function clean(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}
function date(value: string | undefined) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? "Not provided" : formatDate(parsed.toISOString());
}
function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, width = 0.6) {
  doc.setLineWidth(width); doc.setDrawColor(...INK); doc.line(x1, y1, x2, y2);
}
function cell(doc: jsPDF, x: number, y: number, w: number, h: number, text: string, options: { bold?: boolean; align?: "left" | "center" | "right"; size?: number; fill?: boolean; italic?: boolean } = {}) {
  if (options.fill) { doc.setFillColor(...GREY); doc.rect(x, y, w, h, "F"); }
  line(doc, x, y, x + w, y); line(doc, x, y + h, x + w, y + h); line(doc, x, y, x, y + h); line(doc, x + w, y, x + w, y + h);
  doc.setFont("helvetica", options.bold ? "bold" : options.italic ? "italic" : "normal"); doc.setFontSize(options.size ?? 9); doc.setTextColor(...INK);
  const align = options.align ?? "left"; const tx = align === "right" ? x + w - 5 : align === "center" ? x + w / 2 : x + 5;
  const lines = doc.splitTextToSize(text, Math.max(w - 10, 10)); doc.text(lines, tx, y + 13, { align, baseline: "alphabetic" });
}

function clientChargeLabel(label: string) {
  return label
    .replace(/carrier\s+risk\s+fee/gi, "Risk coverage fee")
    .replace(/carrier\s+risk/gi, "Risk coverage")
    .replace(/\bFOV\b/g, "Freight value protection");
}

function dimensionsText(value: InvoicePdfRecord["dimensions"]) {
  if (!value) return "Not provided";
  const list = Array.isArray(value) ? value : [value];
  const text = list.map((item) => {
    const length = String(item.length ?? "").trim();
    const width = String(item.width ?? item.breadth ?? "").trim();
    const height = String(item.height ?? "").trim();
    const unit = String(item.unit ?? "").trim();
    return [length, width, height].every(Boolean) ? `${length} × ${width} × ${height}${unit ? ` ${unit}` : ""}` : "";
  }).filter(Boolean).join("; ");
  return text || "Not provided";
}

export function createInvoicePdf(record: InvoicePdfRecord) {
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H] });
  const total = Number(record.amount || 0);
  const taxRate = Number(record.tax_rate ?? 0);
  const pricingTax = record.pricing?.lines?.find((line) => line.code === "gst")?.amount ?? 0;
  const tax = Number(record.tax ?? (pricingTax || (taxRate ? total * taxRate / (100 + taxRate) : 0)));
  const base = Math.max(0, total - tax - Number(record.round_off ?? 0));
  const roundOff = Number(record.round_off ?? (Math.round(total) - total));
  const quantity = Number(record.quantity ?? 1);
  const rate = Number(record.rate ?? base / Math.max(quantity, 1));
  const invoiceNumber = invoiceNumberForLr(record.lr_number);
  const publicReference = clean(record.lr_number ?? record.tracking_number ?? record.reference_number, "Pending reference");
  const invoiceDate = date(record.created_at);

  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Tax Invoice", LEFT, 38);
  doc.setFontSize(10); doc.text("PSS LOGISTICS", PAGE_W - LEFT, 38, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Invoice No.: ${invoiceNumber}`, LEFT, 56); doc.text(`Invoice date: ${invoiceDate}`, PAGE_W - LEFT, 56, { align: "right" });
  line(doc, LEFT, 66, PAGE_W - LEFT, 66, 0.8);

  const boxY = 78; const boxH = 94; const boxW = 261;
  cell(doc, LEFT, boxY, boxW, boxH, `From\n${clean(record.seller_name, EXAMPLE_INVOICE_SELLER.name)}\n${clean(record.seller_address, EXAMPLE_INVOICE_SELLER.address)}\nGSTIN: ${clean(record.seller_gstin, EXAMPLE_INVOICE_SELLER.gstin)}\n${clean(record.seller_contact, EXAMPLE_INVOICE_SELLER.contact)} · ${clean(record.seller_email, EXAMPLE_INVOICE_SELLER.email)}`, { bold: true, size: 8 });
  cell(doc, LEFT + boxW + 18, boxY, boxW, boxH, `Buyer (Bill to)\n${clean(record.client_name ?? record.buyer_name, EXAMPLE_INVOICE_BUYER.name)}\n${clean(record.client_address ?? record.buyer_address, EXAMPLE_INVOICE_BUYER.address)}\nGSTIN: ${clean(record.client_gstin ?? record.buyer_gstin, EXAMPLE_INVOICE_BUYER.gstin)}\n${clean(record.client_state ?? record.buyer_state, EXAMPLE_INVOICE_BUYER.state)}`, { bold: true, size: 8 });

  const metaY = 190;
  autoTable(doc, { startY: metaY, head: [["LR / LRN", "Shipment reference", "Route", "Boxes / weight"]], body: [[clean(record.lr_number, "Pending"), publicReference, `${clean(record.origin, "Not provided")} → ${clean(record.destination, "Not provided")}`, `${record.pieces ?? 1} / ${record.weight_kg ?? "—"} kg`]], margin: { left: LEFT, right: LEFT }, tableWidth: PAGE_W - LEFT * 2, styles: { font: "helvetica", fontSize: 8, cellPadding: 6, overflow: "linebreak", minCellHeight: 26, valign: "middle", lineColor: [203, 213, 225], lineWidth: 0.4, textColor: [...INK] }, headStyles: { fillColor: [238, 238, 238], textColor: [...INK], fontStyle: "bold" }, columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 122 }, 2: { cellWidth: 232 }, 3: { cellWidth: 68, halign: "right" } } });

  const invoiceLines = (record.line_items?.length ? [...record.line_items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) : record.pricing?.lines ?? []);
  const chargeBreakup = invoiceLines.map((item) => `${clientChargeLabel(item.label)}${item.marker ?? ""}: ₹${money(item.amount)}`).join("\n");
  const shipmentDetails = [`Service: ${clean(record.service_description, "B2B COURIER SERVICE")}`, `Consignor: ${clean(record.consignor, "Not provided")}`, `Consignee: ${clean(record.consignee, "Not provided")}`, `Dimensions: ${dimensionsText(record.dimensions)}`].join("\n");
  const itemDescription = [shipmentDetails, chargeBreakup].filter(Boolean).join("\n\n");
  const tableY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? metaY + 50) + 14;
  autoTable(doc, { startY: tableY, head: [["#", "Description of services", "HSN/SAC", "Qty", "Rate", "Amount"]], body: [["1", itemDescription, clean(record.hsn_sac, "996812"), String(quantity), `₹${money(rate)}`, `₹${money(base)}`]], margin: { left: LEFT, right: LEFT }, tableWidth: PAGE_W - LEFT * 2, rowPageBreak: "avoid", styles: { font: "helvetica", fontSize: 8, cellPadding: 7, overflow: "linebreak", minCellHeight: 42, valign: "top", lineColor: [203, 213, 225], lineWidth: 0.4, textColor: [...INK] }, headStyles: { fillColor: [24, 24, 24], textColor: 255, fontStyle: "bold", halign: "center" }, columnStyles: { 0: { cellWidth: 24, halign: "center" }, 1: { cellWidth: 247 }, 2: { cellWidth: 58, halign: "center" }, 3: { cellWidth: 46, halign: "right" }, 4: { cellWidth: 68, halign: "right" }, 5: { cellWidth: 80, halign: "right" } } });
  const subtotalY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableY + 90) + 10;
  const totals = [["Subtotal", `₹${money(base)}`], ...(tax ? [[`GST @ ${taxRate || "applicable"}%`, `₹${money(tax)}`]] : []), ...(roundOff ? [["Round off", `₹${money(roundOff)}`]] : []), ["Total", `₹${money(total)}`]];
  autoTable(doc, { startY: subtotalY, body: totals, margin: { left: 330, right: LEFT }, tableWidth: PAGE_W - LEFT - 330, styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.4, textColor: [...INK] }, columnStyles: { 0: { cellWidth: 100, fontStyle: "bold" }, 1: { cellWidth: 94, halign: "right" } }, didParseCell: (hook) => { if (hook.row.index === totals.length - 1) hook.cell.styles.fontStyle = "bold"; } });
  const totalsBottom = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? subtotalY + 80);
  const lowerY = totalsBottom + 12;
  cell(doc, LEFT, lowerY, 540, 46, `Amount chargeable in words\nINR ${amountInWords(total)}`, { bold: true, size: 8 });
  cell(doc, LEFT, lowerY + 58, 260, 68, `Company's PAN: ${clean(record.seller_pan, "Not provided")}\n\nDeclaration\nComputer-generated invoice.`, { size: 8 });
  cell(doc, LEFT + 280, lowerY + 58, 260, 68, `Payment details\nBank: ${clean(record.bank_name, "Not configured")}\nAccount: ${clean(record.bank_account_number, "Not configured")}\nIFSC: ${clean(record.bank_branch_ifsc, "Not configured")}`, { size: 8 });
  cell(doc, LEFT, lowerY + 136, 240, 38, "Customer's Seal and Signature", { size: 8 }); cell(doc, LEFT + 240, lowerY + 136, 300, 38, "for PSS LOGISTICS\nAuthorised Signatory", { bold: true, align: "right", size: 8 });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("This is a Computer Generated Invoice", PAGE_W / 2, lowerY + 194, { align: "center" });
  return { doc, invoiceNumber };
}

export function downloadInvoicePdf(record: InvoicePdfRecord) {
  const { doc, invoiceNumber } = createInvoicePdf(record);
  doc.save(invoiceFileName(invoiceNumber));
}
