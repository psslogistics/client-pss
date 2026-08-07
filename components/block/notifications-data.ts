export type NotificationCategory = "Shipments" | "Operations" | "Billing" | "System" | "Support";
export type NotificationTone = "info" | "success" | "warning" | "critical";

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  message: string;
  time: string;
  unread?: boolean;
  actionLabel: string;
  actionHref: string;
};

export const NOTIFICATIONS_STORAGE_KEY = "pss-notification-read-ids";
export const NOTIFICATIONS_EVENT = "pss-notifications-updated";

export const notifications: NotificationItem[] = [
  { id: "route-diversion", category: "Operations", tone: "critical", title: "Festival route diversion", message: "Routes through central Bengaluru are diverted today from 6:00 PM due to festival closures.", time: "about 1 hour ago", unread: true, actionLabel: "Review routes", actionHref: "/dashboard/shipmentTracking" },
  { id: "customs-hold", category: "Shipments", tone: "warning", title: "Customs hold", message: "PSS20260138 requires additional customs documentation before clearance.", time: "about 4 hours ago", unread: true, actionLabel: "Resolve", actionHref: "/dashboard/shipmentTracking?id=PSS20260138" },
  { id: "wallet-topped-up", category: "Billing", tone: "success", title: "Wallet topped up", message: "Your wallet was topped up with ₹25,000.00.", time: "about 16 hours ago", unread: true, actionLabel: "View wallet", actionHref: "/dashboard/walletManagement" },
  { id: "area-closure", category: "Operations", tone: "warning", title: "Area temporarily closed", message: "Pickup service is paused in Old Delhi today because of a local access restriction.", time: "1 day ago", unread: true, actionLabel: "View impact", actionHref: "/dashboard/pickupRequests" },
  { id: "delivery-confirmed", category: "Shipments", tone: "success", title: "Delivery confirmed", message: "PSS20260129 was delivered to the recipient in Hamburg.", time: "2 days ago", actionLabel: "View shipment", actionHref: "/dashboard/shipmentTracking?id=PSS20260129" },
  { id: "scheduled-maintenance", category: "System", tone: "info", title: "Scheduled maintenance", message: "System maintenance is planned tonight from 02:00–04:00 UTC. Shipment processing may be delayed.", time: "2 days ago", actionLabel: "Learn more", actionHref: "/dashboard/notificationsAlerts" },
  { id: "shipment-delayed", category: "Shipments", tone: "warning", title: "Shipment delayed", message: "Shipment PSS20260142 is delayed by 3 days due to port congestion.", time: "2 days ago", actionLabel: "View shipment", actionHref: "/dashboard/shipmentTracking?id=PSS20260142" },
  { id: "invoice-overdue", category: "Billing", tone: "warning", title: "Invoice overdue", message: "Invoice INV20260018 is 12 days overdue.", time: "3 days ago", actionLabel: "View invoice", actionHref: "/dashboard/billingInvoiceManagement" },
  { id: "return-approved", category: "Shipments", tone: "success", title: "Return approved", message: "Return RTN20260005 has been approved for pickup.", time: "3 days ago", actionLabel: "View return", actionHref: "/dashboard/returnShipments" },
  { id: "pickup-completed", category: "Operations", tone: "success", title: "Pickup completed", message: "Pickup PKU20260007 was completed by James Carter.", time: "3 days ago", actionLabel: "View details", actionHref: "/dashboard/pickupRequests" },
  { id: "support-reply", category: "Support", tone: "info", title: "New support reply", message: "Support ticket TKT20260003 has a new response from the operations team.", time: "4 days ago", actionLabel: "Open ticket", actionHref: "/dashboard/supportTicketCreation" },
  { id: "system-recovered", category: "System", tone: "success", title: "System recovered", message: "The document processing service is operating normally again.", time: "5 days ago", actionLabel: "View status", actionHref: "/dashboard/notificationsAlerts" },
];

export const defaultUnreadIds = notifications.filter((item) => item.unread).map((item) => item.id);

export function readIdsFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export function saveReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
}

export function markNotificationRead(id: string, readIds: string[]) {
  if (!readIds.includes(id)) saveReadIds([...readIds, id]);
}

export function markAllNotificationsRead() {
  saveReadIds(notifications.map((item) => item.id));
}
