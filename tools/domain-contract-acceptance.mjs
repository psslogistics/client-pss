import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  countActiveShipmentStatuses,
  isActiveShipmentStatus,
  isDelayedShipment,
  normalizeShipmentStatus,
  shipmentStatusPolicy,
  toClientShipmentStatus,
} from "../lib/shipment-status.ts";
import { expectedStickerCount, labelFileName } from "../lib/label-contract.ts";
import { cleanClientAddress, clientAddressDetails } from "../lib/address-display.ts";

assert.equal(normalizeShipmentStatus("Ready to Ship"), "manifested");
assert.equal(normalizeShipmentStatus("picked_up"), "in_transit");
assert.equal(toClientShipmentStatus("manifested"), "Booked");
assert.equal(toClientShipmentStatus("out_for_delivery"), "Out for Delivery");
assert.equal(isActiveShipmentStatus("provider_pending"), true);
assert.equal(isActiveShipmentStatus("delivered"), false);
assert.equal(countActiveShipmentStatuses(124, { booked: 47, cancelled: 2, delivered: 18, exception: 35, in_transit: 11, out_for_delivery: 11, delayed: 69 }), 104);
assert.equal(isDelayedShipment("2026-10-01", "booked", new Date("2026-10-28T12:00:00+05:30")), true);
assert.equal(isDelayedShipment("2026-10-01", "delivered", new Date("2026-10-28T12:00:00+05:30")), false);
assert.equal(shipmentStatusPolicy("provider_pending").labelDownload, false);
assert.equal(shipmentStatusPolicy("manifested").pickupScheduling, true);
assert.equal(labelFileName("321964753", "4x2.5"), "321964753-LABEL-4x2.5.pdf");
assert.equal(labelFileName("LR 123/456", "a4"), "LR-123-456-LABEL-A4.pdf");
assert.equal(expectedStickerCount(1), 2);
assert.equal(expectedStickerCount(3), 4);
assert.equal(cleanClientAddress("RISHIKESH PAL || 7084685756 Address: FUJIYAMA POWER SYSTEMS LIMITED-NOIDA 51,52 State: Uttar Pradesh (Code: 09) GSTIN / Unique ID: 09AADCF2634F1ZU"), "FUJIYAMA POWER SYSTEMS LIMITED-NOIDA 51,52");
assert.deepEqual(clientAddressDetails(JSON.stringify({ name: "PSS Client", address: "Address: 12 Main Road", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" }), "Fallback"), { name: "PSS Client", address: "12 Main Road, Jaipur, Rajasthan, 302001, India" });
const labelSource = await readFile(new URL("../components/block/delhiveryLabelMenu.tsx", import.meta.url), "utf8");
const labelPdfSource = await readFile(new URL("../lib/label-pdf.ts", import.meta.url), "utf8");
const trackingSource = await readFile(new URL("../components/block/shipmentTracking.tsx", import.meta.url), "utf8");
const supportSource = await readFile(new URL("../components/block/supportTicketCreation.tsx", import.meta.url), "utf8");
const shipmentsSource = await readFile(new URL("../components/block/allShipments.tsx", import.meta.url), "utf8");
const dashboardSource = await readFile(new URL("../components/block/dashboard.tsx", import.meta.url), "utf8");
const dashboardOperationsSource = await readFile(new URL("../components/block/client-dashboard-operations.tsx", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../../admin-pss/worker/src/index.ts", import.meta.url), "utf8");
assert.match(labelSource, /Do not recursively infer a wrapper's type/);
assert.match(labelSource, /expectedStickerCount\(boxes\)/);
assert.match(labelPdfSource, /pdf\.embedPng/);
assert.match(labelPdfSource, /pdf\.embedPage/);
assert.match(labelPdfSource, /595\.28, 841\.89/);
assert.match(labelPdfSource, /a4: \{ width: a4Points\[0\] - 12, height: a4Points\[1\] - 18, columns: 1, rows: 1/);
assert.match(trackingSource, /invoiceNumberForLr\(lrn\)/);
assert.match(trackingSource, /dashboard\/supportTicketCreation/);
assert.match(trackingSource, /dashboard\/weightReconciliation/);
assert.match(trackingSource, /dashboard\/ndrExceptions/);
assert.match(trackingSource, /dashboard\/returnShipments/);
assert.match(supportSource, /Shipment support request/);
assert.match(supportSource, /searchParams\.get\("reference"\)/);
assert.match(shipmentsSource, /supportTicketCreation\?reference=/);
assert.doesNotMatch(shipmentsSource, /supportTicketCreation\?shipmentId=\$\{encodeURIComponent\(row\.id\)\}/);
assert.match(dashboardSource, /clientActivityTitle/);
assert.doesNotMatch(dashboardSource, /title: String\(row\.action \?\? "Activity"\)/);
assert.match(dashboardSource, /trackingQuery/);
assert.match(dashboardSource, /trackingQuery.*shipment\.id/);
assert.match(dashboardSource, /trackingId.*Reference pending/);
assert.doesNotMatch(dashboardSource, /trackingId: String\(shipment\.tracking_number \?\? shipment\.id\)/);
assert.match(dashboardOperationsSource, /trackingQuery/);
assert.doesNotMatch(dashboardOperationsSource, /shipmentTracking\?id=\$\{encodeURIComponent\(shp\.id\)\}/);
assert.match(workerSource, /client_addresses \(id, client_id, label, address_kind, contact_name, phone, address, city, state, country, pincode\)/);
assert.match(workerSource, /entityUpdate\[1\] === "addresses" \? \["label", "address_kind", "contact_name", "phone", "address", "city", "state", "country", "pincode", "is_test"\]/);
console.log("Shipment, dashboard, address, and label domain contract checks passed (37 checks).");
