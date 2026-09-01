export interface KpiMetric { id: string; title: string; value: string; change: string; isPositive: boolean; sparklinePoints: string; category: string; description: string; }
export interface VolumeMetricDef { key: string; label: string; color: string; gradientId: string; }
export interface ShipmentSummaryItem { status: string; count: number; badgeClass: string; barClass: string; dotClass: string; percentage: number; }
export interface DashboardAlert { id: string; title: string; description: string; timeAgo: string; refId?: string; type: "destructive" | "warning" | "info"; dotColor: string; }
export interface ActivityItem { id: string; title: string; description: string; timeAgo: string; iconType: "destructive" | "primary" | "info" | "warning" | "muted"; iconName: string; }
export interface VolumePoint { label: string; shipments: number; deliveries: number; pickups: number; inTransit: number; returns: number; cancelled: number; [key: string]: string | number; }
export interface DelayedShipment { id: string; trackingId: string; origin: string; destination: string; carrier: string; date: string; mode: string; }
export interface PickupRequest { id: string; pickupId: string; timeSlot: string; status: string; company: string; location: string; pcs: number; kg: number; badgeClass: string; dotClass: string; }
export interface TransportMode { name: string; shipments: number; percentage: number; color: string; }

// These are presentation definitions only. Operational values come from production APIs.
export const ALL_KPI_METRICS: KpiMetric[] = [];
export const DEFAULT_SELECTED_KPI_IDS: string[] = [];
export const ALL_VOLUME_METRICS: VolumeMetricDef[] = [
  { key: "shipments", label: "Shipments", color: "var(--primary)", gradientId: "shipmentsGradient" },
  { key: "deliveries", label: "Deliveries", color: "#06b6d4", gradientId: "deliveriesGradient" },
  { key: "pickups", label: "Pickups", color: "#10b981", gradientId: "pickupsGradient" },
  { key: "inTransit", label: "In Transit", color: "#8b5cf6", gradientId: "inTransitGradient" },
  { key: "returns", label: "Returns", color: "#f59e0b", gradientId: "returnsGradient" },
  { key: "cancelled", label: "Cancelled", color: "#f43f5e", gradientId: "cancelledGradient" },
];
export const DEFAULT_SELECTED_VOLUME_KEYS = ["shipments", "deliveries", "pickups"];
export const SHIPMENT_SUMMARY: ShipmentSummaryItem[] = [];
export const ACTION_ALERTS: DashboardAlert[] = [];
export const QUICK_ACTIONS = [];
export const RECENT_ACTIVITIES: ActivityItem[] = [];
export const TRANSPORT_MODES: TransportMode[] = [];
export const VOLUME_DATA: Record<string, VolumePoint[]> = { "7D": [], "14D": [], "30D": [] };
