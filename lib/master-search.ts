export type ClientSearchResult = {
  id: string;
  type: "Shipment" | "Invoice" | "Pickup" | "Page";
  title: string;
  detail: string;
  href: string;
  keywords: string;
};

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

  return pages;
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
