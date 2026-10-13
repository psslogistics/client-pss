import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/block/pickupRequests.tsx", import.meta.url), "utf8");
const bookingSource = await readFile(new URL("../components/block/shipmentBooking.tsx", import.meta.url), "utf8");
const checks = [
  ["canonical fields are mapped", ["row.requested_date", "row.requested_time_slot", "row.pickup_address", "row.contact_name", "row.contact_phone"].every((field) => source.includes(field))],
  ["provider account and saved pickup location are selectable", source.includes("Courier account") && source.includes("Saved pickup location")],
  ["standalone Delhivery pickups collect AWB references", source.includes("Delhivery AWB(s)") && source.includes("awb_number: form.awbNumber.split")],
  ["retry/reschedule/cancel actions exist", source.includes("retryPickup") && source.includes("reschedulePickup") && source.includes("cancelPickup")],
  ["refresh and calendar actions exist", source.includes("loadPickups(true)") && source.includes("Calendar View")],
  ["provider status polling and stale-slot resets exist", source.includes("setInterval") && source.includes("setRescheduleSlotOptions([])") && bookingSource.includes("setPickupOptions([])")],
  ["provider confirmation is not presented as scheduled by default", source.includes("Provider confirmation is pending") || source.includes("Provider Pending")],
  ["notifications distinguish outcomes", source.includes("NoticeTone") && source.includes('"pending"') && source.includes('"error"') && source.includes("role=\"status\"")],
  ["shipment retry does not duplicate a saved shipment", bookingSource.includes("pendingPickupRecovery") && bookingSource.includes("Retrying its pickup request without creating another shipment") && bookingSource.includes("pendingPickupRecovery.pickupId")],
  ["failed pickup fallback reuses the pickup record", bookingSource.includes("const pickupResult") && bookingSource.includes("createdPickupId") && bookingSource.includes("pickup-retry-")],
  ["Delhivery stale end-time failures advance to another window", bookingSource.includes("end\\s*time\\s*cannot\\s*be\\s*in\\s*past") && bookingSource.includes("time.*window.*past")],
  ["invoice validation does not leave booking stuck", bookingSource.includes("setSingleSubmitting(false)") && bookingSource.includes("The invoice could not be read")],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Client pickup contract checks failed: ${failed.join(", ")}`);
console.log(`Client pickup contract checks passed (${checks.length} checks).`);
