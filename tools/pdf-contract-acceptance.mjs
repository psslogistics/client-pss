import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { createInvoicePdf } from "../lib/invoice-pdf.ts";

const { doc, invoiceNumber } = createInvoicePdf({
  id: "fixture-billing-row",
  amount: 1180,
  status: "paid",
  created_at: "2026-10-28T10:00:00.000Z",
  lr_number: "321964753",
  buyer_name: "Fixture Client",
  buyer_address: "12 Client Road, Gurugram, Haryana 122001",
  origin: "New Delhi",
  destination: "Gurugram",
  pieces: 1,
  weight_kg: 20,
});

assert.equal(invoiceNumber, "INV-321964753");
const bytes = doc.output("arraybuffer");
assert.ok(bytes.byteLength > 1000, "invoice PDF should contain a real document");
const parsed = await PDFDocument.load(bytes);
assert.equal(parsed.getPageCount(), 1, "fixture invoice should fit on one A4 page");
const [page] = parsed.getPages();
assert.ok(Math.abs(page.getWidth() - 595.28) < 1, "invoice width should be A4");
assert.ok(Math.abs(page.getHeight() - 841.89) < 1, "invoice height should be A4");
const pending = createInvoicePdf({ id: "internal-uuid-that-must-not-leak", invoice_number: "INV-SHIPMENT", amount: 100, status: "pending", created_at: "2026-10-28T10:00:00.000Z", tracking_number: "PSS-ORDER-01" });
assert.equal(pending.invoiceNumber, "INV-PENDING-REFERENCE", "legacy or UUID-derived invoice numbers must not be rendered");

console.log("PDF artifact contract checks passed (6 checks).");
