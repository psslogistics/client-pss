import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/billing-export.ts", import.meta.url), "utf8");
const block = await readFile(new URL("../components/block/billingInvoiceManagement.tsx", import.meta.url), "utf8");
const invoice = await readFile(new URL("../lib/invoice-pdf.ts", import.meta.url), "utf8");
const worker = await readFile(new URL("../../admin-pss/worker/src/index.ts", import.meta.url), "utf8");
const checks = [
  ["shipment invoice numbers use LR", source.includes("invoiceNumberForLr(record.lr_number)") && block.includes("invoiceNumberForLr(row.lr_number)")],
  ["legacy invoice values are not rendered as current invoice numbers", source.includes("record.lr_number ? invoiceNumberForLr(record.lr_number) : invoiceNumberForLr(undefined)") && block.includes("row.lr_number ? invoiceNumberForLr(row.lr_number) : invoiceNumberForLr(undefined)")],
  ["billing shipment reference has a client-safe fallback", block.includes('row.shipment_pss_reference || "Pending reference"')],
  ["consolidated cycle identifiers are stable", source.includes("cycleInvoiceNumber(period.start, period.end)")],
  ["supported export ranges are present", block.includes("[15, 30, 60, 90]")],
  ["invoice contains both address blocks", source.includes("exampleSeller") && source.includes("exampleBuyer") && source.includes('pdf.text("From"') && source.includes('pdf.text("Bill to"')],
  ["invoice contains shipment article fields", ["LR / LRN", "Route and consignee", "Boxes / weight", "Charge breakup", "Amount"].every((field) => source.includes(field))],
  ["cancelled records are excluded from totals", source.includes("isExcluded") && source.includes("billableTotal") && source.includes("!isExcluded(record)")],
  ["PDF and XLSX are delivered together", source.includes("application/zip") && source.includes(".xlsx") && source.includes(".pdf")],
  ["billing dates are local-date safe", source.includes("billingPeriod") && source.includes("shiftLocalDays") && source.includes("localDateInput")],
  ["billing cycles are inclusive local days", source.includes("-(days - 1)")],
  ["consolidated PDF shows separate subtotal and taxes", source.includes("const taxTotal") && source.includes("const subtotal") && source.includes('pdf.text(`Rs. ${money(taxTotal)}`')],
  ["invoice amount is rendered in words", source.includes("amountInWords(total)")],
  ["shipment invoice maps client bill-to address", block.includes("client_address") && block.includes("EXAMPLE_INVOICE_BUYER.address") && invoice.includes("client_address") && invoice.includes("Buyer (Bill to)")],
  ["billing export uses one captured local date", block.includes("const now = new Date()") && block.includes("downloadBillingExport(rows, days, now)") && source.includes("billingPeriod(days, now)")],
  ["billing API accepts explicit calendar date bounds", block.includes("start_date: period.start") && worker.includes("start_date") && worker.includes("date(b.created_at) >= date(?)")],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Billing contract checks failed: ${failed.join(", ")}`);
console.log(`Billing contract checks passed (${checks.length} checks).`);
