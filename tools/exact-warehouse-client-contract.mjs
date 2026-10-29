import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/block/shipmentBooking.tsx", import.meta.url), "utf8");
const occurrences = (source.match(/warehouse_id: selectedSavedPickupId \|\| undefined/g) ?? []).length;
if (occurrences < 2) throw new Error("Client booking and pickup payloads must both carry the selected warehouse ID");
if (!source.includes("shipment-${courier.accountId || courier.id}-${selectedSavedPickupId || \"warehouse\"}")) throw new Error("Client shipment idempotency keys must include the selected account and warehouse");
if (!source.includes('"/v1/warehouses"') || !source.includes("provider_account_id: courier?.accountId || undefined")) throw new Error("Saved warehouses must preserve the selected Delhivery account when one is selected");
if (!source.includes("contact_name: pickupPerson.name")) throw new Error("Saved warehouses must preserve the consignor name");
if (!source.includes("contact_name") || !/contact:\s*\{\s*name:\s*pick\(row\.contact_name,\s*row\.contactName/.test(source)) throw new Error("Saved warehouses must restore the consignor name after reload");
if (!source.includes("state: pickup.state")) throw new Error("Saved warehouses must preserve the consignor state");
if (!source.includes("row.state") || !/state:\s*pick\(row\.state,\s*parts\.length >= 4 \? parts\[2\]/.test(source)) throw new Error("Saved warehouses must restore the consignor state after reload");
if (!source.includes("country: delivery.country")) throw new Error("Saved consignees must preserve country when saved from Booking");
console.log("Client exact warehouse contract passed");
