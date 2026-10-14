import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/block/shipmentBooking.tsx", import.meta.url), "utf8");
const occurrences = (source.match(/warehouse_id: selectedSavedPickupId \|\| undefined/g) ?? []).length;
if (occurrences < 2) throw new Error("Client booking and pickup payloads must both carry the selected warehouse ID");
if (!source.includes("shipment-${courier.accountId || courier.id}-${selectedSavedPickupId || \"warehouse\"}")) throw new Error("Client shipment idempotency keys must include the selected account and warehouse");
if (!source.includes('"/v1/warehouses"') || !source.includes("provider_account_id: courier?.accountId || undefined")) throw new Error("Saved warehouses must preserve the selected Delhivery account when one is selected");
if (!source.includes("contact_name: pickupPerson.name")) throw new Error("Saved warehouses must preserve the consignor name");
if (!source.includes("row.contact_name ?? parts[0] ?? \"\"")) throw new Error("Saved warehouses must restore the consignor name after reload");
if (!source.includes("state: pickup.state")) throw new Error("Saved warehouses must preserve the consignor state");
if (!source.includes('row.state ?? parts[2] ?? ""')) throw new Error("Saved warehouses must restore the consignor state after reload");
console.log("Client exact warehouse contract passed");
