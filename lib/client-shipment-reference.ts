type ShipmentReferenceRow = Record<string, unknown>;

const text = (value: unknown) => {
  const candidate = String(value ?? "").trim();
  return candidate && candidate !== "null" && candidate !== "undefined" ? candidate : "";
};

/** Provider reference first, then client order ID, then PSS reference. */
export function clientShipmentReference(row: ShipmentReferenceRow, fallback = "Shipment reference unavailable") {
  const provider = text(row.lr_number) || text(row.master_awb) || text(row.awb) || text(row.tracking_number) || text(row.provider_reference);
  const orderId = text(row.order_id) || text(row.client_order_id) || text(row.orderId);
  const pssReference = text(row.pss_reference) || text(row.shipment_pss_reference);
  if (provider) return provider;
  if (orderId) return orderId;
  if (pssReference) return pssReference;
  const internalId = text(row.id);
  return internalId ? `PSS-${internalId.replaceAll("-", "").slice(0, 8).toUpperCase()}` : fallback;
}
