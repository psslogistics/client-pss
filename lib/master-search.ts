import companyData from "@/data/company-demo/company-data.json";

export type ClientSearchResult = {
  id: string;
  type: "Shipment" | "Invoice" | "Pickup" | "Page";
  title: string;
  detail: string;
  href: string;
  keywords: string;
};

const missing = "Not provided";

function resultScore(result: ClientSearchResult, query: string) {
  const title = result.title.toLowerCase();
  const keywords = result.keywords.toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (keywords.startsWith(query)) return 45;
  if (keywords.includes(query)) return 25;
  return 0;
}

export function getClientSearchIndex(): ClientSearchResult[] {
  const pages: ClientSearchResult[] = [
    ["Dashboard", "/dashboard"],
    ["Booking", "/dashboard/shipmentBooking"],
    ["Tracking", "/dashboard/shipmentTracking"],
    ["Pickup", "/dashboard/pickupRequests"],
    ["RTO", "/dashboard/returnShipments"],
    ["Warehouses", "/dashboard/warehouseManagement"],
    ["NDR", "/dashboard/ndrManagement"],
    ["Exceptions", "/dashboard/exceptionsManagement"],
    ["Wallet", "/dashboard/walletManagement"],
    ["Billing", "/dashboard/billingInvoiceManagement"],
    ["Reports", "/dashboard/reportsAnalytics"],
    ["Support", "/dashboard/supportTicketCreation"],
    ["Notifications", "/dashboard/notificationsAlerts"],
    ["Profile", "/dashboard/profileAccountManagement"],
    ["Settings", "/dashboard/userSettings"],
  ].map(([title, href]) => ({ id: `page-${href}`, type: "Page", title, detail: "Open workspace page", href, keywords: `${title} page workspace` }));

  const shipments = companyData.deliveries.flatMap((shipment) => {
    const shipmentResult: ClientSearchResult = {
      id: `shipment-${shipment.id}`,
      type: "Shipment",
      title: shipment.id || shipment.orderId || "Shipment",
      detail: `${shipment.origin} → ${shipment.destination} · ${shipment.status}`,
      href: `/dashboard/shipmentTracking?shipment=${encodeURIComponent(shipment.id)}`,
      keywords: [shipment.id, shipment.orderId, shipment.courierTracking, shipment.client, shipment.consignee, shipment.invoiceNumber, shipment.purId, shipment.masterWaybill, shipment.origin, shipment.destination, shipment.status].join(" "),
    };
    const invoice = shipment.invoiceNumber !== missing ? [{
      id: `invoice-${shipment.invoiceNumber}-${shipment.id}`,
      type: "Invoice" as const,
      title: shipment.invoiceNumber,
      detail: `${shipment.value} · Shipment ${shipment.id}`,
      href: `/dashboard/billingInvoiceManagement?invoice=${encodeURIComponent(shipment.invoiceNumber)}`,
      keywords: [shipment.invoiceNumber, shipment.id, shipment.orderId, shipment.client, shipment.value].join(" "),
    }] : [];
    return [shipmentResult, ...invoice];
  });

  const pickups = companyData.pickups.map((pickup) => ({
    id: `pickup-${pickup.id}`,
    type: "Pickup" as const,
    title: pickup.reference,
    detail: `${pickup.customer} · ${pickup.status} · ${pickup.location}`,
    href: `/dashboard/pickupRequests?pickup=${encodeURIComponent(pickup.id)}`,
    keywords: [pickup.id, pickup.reference, pickup.client, pickup.customer, pickup.location, pickup.address, pickup.status].join(" "),
  }));

  return [...pages, ...shipments, ...pickups];
}

export function searchClientMaster(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return getClientSearchIndex()
    .map((result) => ({ result, score: resultScore(result, normalized) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .slice(0, 12)
    .map(({ result }) => result);
}
