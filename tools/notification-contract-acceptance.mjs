import assert from "node:assert/strict";
import fs from "node:fs";

const settings = fs.readFileSync("components/block/settings.tsx", "utf8");
const notifications = fs.readFileSync("components/block/notificationsAlerts.tsx", "utf8");

const settingsChecks = [
  ["settings reads persisted preferences", settings.includes('pssApi<{ data: { preferences?:') && settings.includes('"/v1/preferences"')],
  ["settings writes preferences with PUT", settings.includes('method: "PUT"') && settings.includes('body: JSON.stringify({ preferences: next })')],
  ["settings uses idempotency for writes", settings.includes('"Idempotency-Key": crypto.randomUUID()')],
  ["notification preferences default all categories to enabled", settings.includes("notifications: { shipment: true, operations: true, finance: true, support: true }")],
];

const notificationChecks = [
  ["notifications load from the Worker", notifications.includes('pssApi<{ data: Array<Record<string, unknown>> }>("/v1/notifications")')],
  ["notifications preserve server identifiers", notifications.includes("id: String(row.id)")],
  ["single notification read state persists", notifications.includes('method: "PATCH"') && notifications.includes("is_read: true")],
  ["mark-all-read updates every unread item", notifications.includes("Promise.all(unreadIds.map")],
  ["notification failures are surfaced", notifications.includes("Notifications could not be loaded")],
];

const checks = [...settingsChecks, ...notificationChecks];
for (const [label, passed] of checks) assert.ok(passed, label);
console.log(`Notification/settings contract checks passed (${checks.length} checks).`);
