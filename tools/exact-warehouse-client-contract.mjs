import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/block/shipmentBooking.tsx", import.meta.url), "utf8");
const occurrences = (source.match(/warehouse_id: selectedSavedPickupId \|\| undefined/g) ?? []).length;
if (occurrences < 2) throw new Error("Client booking and pickup payloads must both carry the selected warehouse ID");
if (!source.includes("shipment-${courier.accountId || courier.id}-${selectedSavedPickupId || \"warehouse\"}")) throw new Error("Client shipment idempotency keys must include the selected account and warehouse");
console.log("Client exact warehouse contract passed");
