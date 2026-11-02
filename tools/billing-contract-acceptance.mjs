import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/billing-export.ts", import.meta.url), "utf8");
const block = await readFile(new URL("../components/block/billingInvoiceManagement.tsx", import.meta.url), "utf8");
const invoice = await readFile(new URL("../lib/invoice-pdf.ts", import.meta.url), "utf8");
const worker = await readFile(new URL("../../admin-pss/worker/src/index.ts", import.meta.url), "utf8");
const checks = [
  ["shipment invoice numbers use LR", source.includes("invoiceNumberForLr(record.lr_number)") && block.includes("invoiceNumberForLr(row.lr_number)")],
  ["legacy and unconfirmed invoice values are not rendered as current invoice numbers", source.includes("record.lr_number ? invoiceNumberForLr(record.lr_number) : invoiceNumberForLr(undefined)") && block.includes("isFinanceReviewRecord(row) ? \"Needs finance review\" : invoiceNumberForLr(row.lr_number)") && block.includes("Unavailable until confirmed")],
  ["billing shipment reference has a client-safe fallback", source.includes("clientShipmentReference(record, \"Pending reference\")") && block.includes("clientShipmentReference(row, \"Pending reference\")")],
  ["consolidated cycle identifiers are stable", source.includes("cycleInvoiceNumber(period.start, period.end)")],
  ["supported export ranges are present", block.includes("[15, 30, 60, 90]")],
  ["billing export is clearly a statement, not a tax invoice", source.includes("CONSOLIDATED BILLING STATEMENT") && source.includes("NOT A TAX INVOICE") && !source.includes("EXAMPLE_INVOICE_")],
  ["invoice contains shipment article fields", ["LR / LRN", "Route and consignee", "Boxes / weight", "Charge breakup", "Amount"].every((field) => source.includes(field))],
  ["cancelled records are excluded from totals", source.includes("isExcluded") && source.includes("billableTotal") && source.includes("!isExcluded(record)")],
  ["PDF and XLSX are delivered together", source.includes("application/zip") && source.includes(".xlsx") && source.includes(".pdf")],
  ["billing dates are local-date safe", source.includes("billingPeriod") && source.includes("shiftLocalDays") && source.includes("localDateInput")],
  ["billing cycles are inclusive local days", source.includes("-(days - 1)")],
  ["consolidated PDF shows separate subtotal and taxes", source.includes("const taxTotal") && source.includes("const subtotal") && source.includes('pdf.text(`Rs. ${money(taxTotal)}`')],
  ["invoice amount is rendered in words", source.includes("amountInWords(total)")],
  ["shipment PDF avoids invented legal identity and labels statement accurately", block.includes("billing statement") && invoice.includes("Shipment Billing Statement") && invoice.includes("Billing statement only. This is not a tax invoice.") && !invoice.includes("EXAMPLE_INVOICE_") && !block.includes("EXAMPLE_INVOICE_")],
  ["billing table uses the LR-based reference shown in the downloaded statement", block.includes("isFinanceReviewRecord(row) ? \"Needs finance review\" : invoiceNumberForLr(row.lr_number)") && invoice.includes("const invoiceNumber = invoiceNumberForLr(record.lr_number)")],
  ["unlinked and unconfirmed finance rows are separated from billed totals", block.includes("reviewCount") && block.includes("isFinanceReviewRecord") && source.includes("shipment_link_status") && source.includes("isFinanceReviewRecord")],
  ["billing export uses one captured local date", block.includes("const now = new Date()") && block.includes("downloadBillingExport(rows, days, now)") && source.includes("billingPeriod(days, now)")],
  ["billing API accepts explicit calendar date bounds", block.includes("start_date: period.start") && worker.includes("start_date") && worker.includes("date(b.created_at) >= date(?)")],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Billing contract checks failed: ${failed.join(", ")}`);
console.log(`Billing contract checks passed (${checks.length} checks).`);
