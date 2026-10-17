import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/block/pickupRequests.tsx", import.meta.url), "utf8");
const bookingSource = await readFile(new URL("../components/block/shipmentBooking.tsx", import.meta.url), "utf8");
const checks = [
  ["canonical fields are mapped", ["row.requested_date", "row.requested_time_slot", "row.pickup_address", "row.contact_name", "row.contact_phone"].every((field) => source.includes(field))],
  ["provider account and saved pickup location are selectable", source.includes("Courier account") && source.includes("Saved pickup location")],
  ["pickup reference uses Delhivery PUR with a muted unscheduled fallback", source.includes('reference: providerReference || "Not scheduled"') && source.includes('pickup.reference === "Not scheduled"') && source.includes('value={pickup.providerReference || "Not scheduled"}')],
  ["latest pickup requests sort first", source.includes('key: "createdAt", direction: "desc"') && source.includes("Date.parse(a.createdAt || \"\")") && source.includes("createdAt: String(row.created_at ?? \"\")")],
  ["saved addresses do not masquerade as warehouse IDs", source.includes('source: "warehouse" as const') && source.includes('source: "address" as const') && source.includes('warehouse.source === "warehouse" ? warehouse.id : ""')],
  ["standalone pickups allow optional AWB references", source.includes("Delhivery AWB(s) (optional)") && source.includes("Leave blank for a location-only pickup") && source.includes("awb_number: manifested ? undefined : form.awbNumber.split") && !source.includes('required={form.provider === "delhivery"}')],
  ["retry/reschedule/cancel actions exist", source.includes("retryPickup") && source.includes("reschedulePickup") && source.includes("cancelPickup")],
  ["refresh and calendar actions exist", source.includes("loadPickups(true)") && source.includes("Calendar View")],
  ["provider status polling and stale-slot resets exist", source.includes("setInterval") && source.includes("setRescheduleSlotOptions([])")],
  ["provider confirmation is not presented as scheduled by default", source.includes("Provider confirmation is pending") || source.includes("Provider Pending")],
  ["notifications distinguish outcomes", source.includes("NoticeTone") && source.includes('"pending"') && source.includes('"error"') && source.includes("role={noticeTone")],
  ["shipment booking does not create a duplicate pickup", !bookingSource.includes("pendingPickupRecovery") && bookingSource.includes("Pickup scheduling is handled separately")],
  ["pickup scheduling is explicit on the Pickup page", !bookingSource.includes("pickupRequestInProgress") && source.includes("Schedule a pickup")],
  ["manifested shipments are selected server-side", source.includes("selection_mode: manifested ? \"manifested\" : \"blind\"") && source.includes("shipment_ids: manifested ? selectedCandidateIds")],
  ["invoice validation does not leave booking stuck", bookingSource.includes("setSingleSubmitting(false)") && bookingSource.includes("The invoice could not be read")],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Client pickup contract checks failed: ${failed.join(", ")}`);
console.log(`Client pickup contract checks passed (${checks.length} checks).`);
