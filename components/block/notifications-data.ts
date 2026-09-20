export type NotificationCategory = "Shipments" | "Operations" | "Billing" | "System" | "Support";
export type NotificationTone = "info" | "success" | "warning" | "critical";
export type NotificationItem = { id: string; category: NotificationCategory; tone: NotificationTone; title: string; message: string; time: string; unread?: boolean; actionLabel: string; actionHref: string };
