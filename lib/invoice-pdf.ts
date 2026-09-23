import { jsPDF } from "jspdf";

export type InvoicePdfRecord = {
  id: string;
  invoice_number?: string;
  shipment_id?: string;
  amount: number;
  currency?: string;
  status: string;
  due_date?: string;
  created_at: string;
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
  destination?: string;
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

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 36;
const INK = [24, 24, 24] as const;
const GREY = [238, 238, 238] as const;

const wordsBelowHundred = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function wordsUnderThousand(value: number): string {
  if (value < 20) return wordsBelowHundred[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${wordsBelowHundred[value % 10]}` : ""}`;
  return `${wordsBelowHundred[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${wordsUnderThousand(value % 100)}` : ""}`;
}
function amountInWords(value: number) {
  const rounded = Math.max(0, Math.round(value));
  if (!rounded) return "Zero Only";
  const groups: Array<[number, string]> = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [1, ""]];
  let remaining = rounded;
  const result: string[] = [];
  for (const [unit, label] of groups) {
    const count = Math.floor(remaining / unit);
    if (count) result.push(`${wordsUnderThousand(count)}${label ? ` ${label}` : ""}`);
    remaining %= unit;
  }
  return `${result.join(" ")} Only`;
}

function clean(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}
function date(value: string | undefined) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? "Not provided" : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

export function createInvoicePdf(record: InvoicePdfRecord) {
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H] });
  const total = Number(record.amount || 0);
  const taxRate = Number(record.tax_rate ?? 0);
  const tax = Number(record.tax ?? (taxRate ? total * taxRate / (100 + taxRate) : 0));
  const base = Math.max(0, total - tax - Number(record.round_off ?? 0));
  const roundOff = Number(record.round_off ?? (Math.round(total) - total));
  const quantity = Number(record.quantity ?? 1);
  const rate = Number(record.rate ?? base / Math.max(quantity, 1));
  const invoiceNumber = clean(record.invoice_number, `PSS/${new Date().getFullYear()}/${record.id.slice(0, 8).toUpperCase()}`);
  const invoiceDate = date(record.created_at);

  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Tax Invoice", 174, 34);
  doc.setFontSize(11); doc.text("e-Invoice", 416, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(record.irn ? `IRN: ${record.irn}` : "IRN: Not available", 38, 83);
  doc.text(record.ack_number ? `Ack No. : ${record.ack_number}` : "Ack No. : Not available", 38, 101);
  doc.text(record.ack_date ? `Ack Date : ${date(record.ack_date)}` : "Ack Date : Not available", 38, 119);
  line(doc, 392, 44, 532, 44, 0.4); line(doc, 532, 44, 532, 164, 0.4); line(doc, 532, 164, 392, 164, 0.4); line(doc, 392, 164, 392, 44, 0.4);
  doc.setFontSize(7); doc.text(record.irn ? "IRN QR data available" : "E-invoice QR data unavailable", 462, 106, { align: "center" });

  const top = 164; const sellerH = 84; const buyerH = 70; const metaX = 276; const leftW = 240; const metaRowH = (sellerH + buyerH) / 6;
  cell(doc, LEFT, top, leftW, sellerH, `${clean(record.seller_name, "PSS LOGISTICS")}\n${clean(record.seller_address, "Seller address not configured")}\nGSTIN/UIN: ${clean(record.seller_gstin, "Not provided")}\nState Name: ${clean(record.seller_state, "Not provided")}, Code: ${clean(record.seller_state_code, "--")}\nContact: ${clean(record.seller_contact, "Not provided")}\nE-Mail: ${clean(record.seller_email, "Not provided")}`, { bold: true, size: 8 });
  cell(doc, LEFT, top + sellerH, leftW, buyerH, `Buyer (Bill to)\n${clean(record.buyer_name, "Client account")}\n${clean(record.buyer_address, "Buyer address not provided")}\nGSTIN/UIN: ${clean(record.buyer_gstin, "Not provided")}\nState Name: ${clean(record.buyer_state, "Not provided")}, Code: ${clean(record.buyer_state_code, "--")}`, { size: 8 });
  const metaRows = [["Invoice No.", invoiceNumber, "Dated", invoiceDate], ["Delivery Note", "", "", ""], ["Reference No. & Date", clean(record.reference_number, ""), "Other References", ""], ["Buyer's Order No.", "", "Dated", ""], ["Dispatch Doc No.", clean(record.shipment_id, ""), "Delivery Note Date", ""], ["Dispatched through", "", "Destination", clean(record.destination, "")]];
  metaRows.forEach((row, index) => { const y = top + index * metaRowH; cell(doc, metaX, y, 92, metaRowH, row[0], { size: 6.5 }); cell(doc, metaX + 92, y, 72, metaRowH, row[1], { bold: index === 0, size: 7 }); cell(doc, metaX + 164, y, 58, metaRowH, row[2], { size: 6.5 }); cell(doc, metaX + 222, y, 42, metaRowH, row[3], { bold: index === 0, size: 7 }); });

  const tableTop = top + sellerH + 70; const widths = [34, 224, 62, 54, 58, 108]; const headers = ["Sl\nNo.", "Description of\nServices", "HSN/SAC", "Quantity", "Rate", "Amount"];
  let x = LEFT; headers.forEach((header, index) => { cell(doc, x, tableTop, widths[index], 31, header, { bold: true, align: index === 0 ? "center" : "center", size: 7, fill: true }); x += widths[index]; });
  x = LEFT; const description = clean(record.service_description, "B2B COURIER SERVICE"); const item = ["1", description, clean(record.hsn_sac, "996812"), String(quantity), money(rate), money(base)]; item.forEach((value, index) => { cell(doc, x, tableTop + 31, widths[index], 176, value, { bold: index === 1, align: index === 0 || index > 1 ? "right" : "left", size: 8 }); x += widths[index]; });
  const subtotalY = tableTop + 207; cell(doc, LEFT, subtotalY, 456, 22, "Total", { align: "right", size: 8 }); cell(doc, LEFT + 456, subtotalY, 84, 22, money(total), { bold: true, align: "right", size: 11 });
  if (tax) { cell(doc, LEFT, tableTop + 64, 258, 21, `OUTPUT GST @ ${taxRate || "applicable"}%`, { bold: true, italic: true, align: "right", size: 8, fill: true }); cell(doc, LEFT + 456, tableTop + 64, 84, 21, money(tax), { bold: true, align: "right", size: 9, fill: true }); }
  if (roundOff) { cell(doc, LEFT, tableTop + 85, 258, 21, "ROUND OFF", { bold: true, italic: true, align: "right", size: 8 }); cell(doc, LEFT + 456, tableTop + 85, 84, 21, money(roundOff), { bold: true, align: "right", size: 9 }); }

  const wordsY = subtotalY + 22; cell(doc, LEFT, wordsY, 540, 52, `Amount Chargeable (in words)\nINR ${amountInWords(total)}`, { bold: true, size: 9 });
  const lowerY = wordsY + 52; cell(doc, LEFT, lowerY, 270, 65, `Company's PAN       : ${clean(record.seller_pan, "Not provided")}\n\nDeclaration\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.`, { size: 8 });
  cell(doc, LEFT + 270, lowerY, 270, 65, `Company's Bank Details\nA/c Holder's Name : ${clean(record.bank_account_name, "PSS LOGISTICS")}\nBank Name          : ${clean(record.bank_name, "Not configured")}\nA/c No.             : ${clean(record.bank_account_number, "Not configured")}\nBranch & IFS Code  : ${clean(record.bank_branch_ifsc, "Not configured")}`, { size: 8 });
  cell(doc, LEFT, lowerY + 65, 240, 44, "Customer's Seal and Signature", { size: 8 }); cell(doc, LEFT + 240, lowerY + 65, 300, 44, "for PSS LOGISTICS\n\nAuthorised Signatory", { bold: true, align: "right", size: 8 });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("This is a Computer Generated Invoice", PAGE_W / 2, lowerY + 126, { align: "center" });
  return { doc, invoiceNumber };
}

export function downloadInvoicePdf(record: InvoicePdfRecord) {
  const { doc, invoiceNumber } = createInvoicePdf(record);
  doc.save(`${invoiceNumber.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`);
}
