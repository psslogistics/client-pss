export type NotificationCategory = "Shipments" | "Operations" | "Billing" | "System" | "Support";
export type NotificationTone = "info" | "success" | "warning" | "critical";
export type NotificationItem = { id: string; category: NotificationCategory; tone: NotificationTone; title: string; message: string; time: string; unread?: boolean; actionLabel: string; actionHref: string };

export const NOTIFICATIONS_STORAGE_KEY = "pss-notification-read-ids";
export const NOTIFICATIONS_EVENT = "pss-notifications-updated";
export const notifications: NotificationItem[] = [];
export const defaultUnreadIds: string[] = [];
export function readIdsFromStorage(): string[] { return []; }
export function saveReadIds(_ids: string[]) { /* Notifications will be persisted by the production API. */ }
export function markNotificationRead(_id: string, _readIds: string[]) { /* Notifications will be persisted by the production API. */ }
export function markAllNotificationsRead() { /* Notifications will be persisted by the production API. */ }
