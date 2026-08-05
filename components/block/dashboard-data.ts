export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  sparklinePoints: string;
  category: string;
  description: string;
}

export const ALL_KPI_METRICS: KpiMetric[] = [
  {
    id: "active_shipments",
    title: "Active Shipments",
    value: "30",
    change: "12.4%",
    isPositive: true,
    sparklinePoints: "0.0,25.2 6.2,22.4 12.3,17.7 18.5,22.4 24.6,28.0 30.8,17.7 36.9,3.7 43.1,12.1 49.2,5.6 55.4,0.0 61.5,27.1 67.7,22.4 73.8,10.3 80.0,2.8",
    category: "Operations",
    description: "Total active cargo currently in motion",
  },
  {
    id: "delayed_shipments",
    title: "Delayed Shipments",
    value: "8",
    change: "8.1%",
    isPositive: false,
    sparklinePoints: "0.0,28.0 6.2,18.7 12.3,23.3 18.5,14.0 24.6,9.3 30.8,18.7 36.9,4.7 43.1,14.0 49.2,0.0 55.4,9.3 61.5,14.0 67.7,18.7 73.8,4.7 80.0,9.3",
    category: "Exceptions",
    description: "Shipments behind original delivery schedule",
  },
  {
    id: "ontime_delivery",
    title: "On-Time Delivery",
    value: "36%",
    change: "2.3%",
    isPositive: true,
    sparklinePoints: "0.0,28.0 6.2,20.0 12.3,24.0 18.5,16.0 24.6,12.0 30.8,20.0 36.9,8.0 43.1,16.0 49.2,4.0 55.4,12.0 61.5,8.0 67.7,4.0 73.8,0.0 80.0,4.0",
    category: "Performance",
    description: "Percentage of shipments delivered within SLA window",
  },
  {
    id: "revenue_30d",
    title: "Revenue (30d)",
    value: "₹10,51,350.50",
    change: "15.7%",
    isPositive: true,
    sparklinePoints: "0.0,18.8 6.2,26.8 12.3,4.5 18.5,0.0 24.6,0.6 30.8,23.9 36.9,27.2 43.1,28.0 49.2,13.7 55.4,2.1 61.5,10.7 67.7,26.9 73.8,7.9 80.0,1.5",
    category: "Finance",
    description: "Total billed freight revenue over last 30 days",
  },
  {
    id: "today_pickups",
    title: "Pickups Today",
    value: "11",
    change: "5.0%",
    isPositive: true,
    sparklinePoints: "0.0,20.0 10.0,15.0 20.0,25.0 30.0,10.0 40.0,18.0 50.0,8.0 60.0,22.0 70.0,12.0 80.0,5.0",
    category: "Operations",
    description: "Dispatch pickups scheduled for execution today",
  },
  {
    id: "avg_transit_time",
    title: "Avg Transit Time",
    value: "4.2 Days",
    change: "1.1 days",
    isPositive: true,
    sparklinePoints: "0.0,5.0 10.0,12.0 20.0,8.0 30.0,22.0 40.0,14.0 50.0,25.0 60.0,18.0 70.0,10.0 80.0,15.0",
    category: "Performance",
    description: "Average transit time from booking to destination",
  },
  {
    id: "overdue_invoices",
    title: "Overdue Invoices",
    value: "₹8,420.00",
    change: "2.1%",
    isPositive: false,
    sparklinePoints: "0.0,25.0 10.0,18.0 20.0,22.0 30.0,14.0 40.0,20.0 50.0,9.0 60.0,16.0 70.0,5.0 80.0,2.0",
    category: "Finance",
    description: "Pending unpaid invoices past their payment due date",
  },
  {
    id: "rto_rate",
    title: "Return Rate (RTO)",
    value: "6.2%",
    change: "0.4%",
    isPositive: true,
    sparklinePoints: "0.0,10.0 10.0,20.0 20.0,15.0 30.0,24.0 40.0,18.0 50.0,22.0 60.0,12.0 70.0,16.0 80.0,8.0",
    category: "Exceptions",
    description: "Percentage of shipments returned to origin",
  },
  {
    id: "customs_exceptions",
    title: "Customs Hold",
    value: "3 Cargoes",
    change: "1.0",
    isPositive: false,
    sparklinePoints: "0.0,28.0 10.0,22.0 20.0,25.0 30.0,18.0 40.0,12.0 50.0,19.0 60.0,14.0 70.0,8.0 80.0,4.0",
    category: "Exceptions",
    description: "International shipments currently on customs hold",
  },
  {
    id: "wallet_balance",
    title: "Wallet Balance",
    value: "₹2,84,750.42",
    change: "12.0%",
    isPositive: true,
    sparklinePoints: "0.0,22.0 10.0,18.0 20.0,12.0 30.0,16.0 40.0,8.0 50.0,14.0 60.0,6.0 70.0,10.0 80.0,2.0",
    category: "Finance",
    description: "Available credit balance for booking dispatches",
  },
];

export const DEFAULT_SELECTED_KPI_IDS = [
  "active_shipments",
  "delayed_shipments",
  "ontime_delivery",
  "revenue_30d",
  "today_pickups",
];

export interface VolumeMetricDef {
  key: string;
  label: string;
  color: string;
  gradientId: string;
}

export const ALL_VOLUME_METRICS: VolumeMetricDef[] = [
  { key: "shipments", label: "Shipments", color: "var(--primary)", gradientId: "shipmentsGradient" },
  { key: "deliveries", label: "Deliveries", color: "#06b6d4", gradientId: "deliveriesGradient" },
  { key: "pickups", label: "Pickups", color: "#10b981", gradientId: "pickupsGradient" },
  { key: "inTransit", label: "In Transit", color: "#8b5cf6", gradientId: "inTransitGradient" },
  { key: "returns", label: "Returns", color: "#f59e0b", gradientId: "returnsGradient" },
  { key: "cancelled", label: "Cancelled", color: "#f43f5e", gradientId: "cancelledGradient" },
];

export const DEFAULT_SELECTED_VOLUME_KEYS = ["shipments", "deliveries", "pickups"];

export interface ShipmentSummaryItem {
  status: string;
  count: number;
  badgeClass: string;
  barClass: string;
  dotClass: string;
  percentage: number;
}

export const SHIPMENT_SUMMARY: ShipmentSummaryItem[] = [
  {
    status: "Booked",
    count: 9,
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    barClass: "bg-primary",
    dotClass: "bg-primary",
    percentage: 18.75,
  },
  {
    status: "Picked Up",
    count: 7,
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    barClass: "bg-sky-500",
    dotClass: "bg-sky-500",
    percentage: 14.58,
  },
  {
    status: "In Transit",
    count: 7,
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    barClass: "bg-sky-500",
    dotClass: "bg-sky-500",
    percentage: 14.58,
  },
  {
    status: "Out for Delivery",
    count: 7,
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    barClass: "bg-amber-500",
    dotClass: "bg-amber-500",
    percentage: 14.58,
  },
  {
    status: "Delivered",
    count: 4,
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    barClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
    percentage: 8.33,
  },
  {
    status: "Delayed",
    count: 7,
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    barClass: "bg-amber-500",
    dotClass: "bg-amber-500",
    percentage: 14.58,
  },
  {
    status: "Exception",
    count: 1,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    barClass: "bg-destructive",
    dotClass: "bg-destructive",
    percentage: 2.08,
  },
  {
    status: "Returned",
    count: 3,
    badgeClass: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground",
    dotClass: "bg-muted-foreground",
    percentage: 6.25,
  },
  {
    status: "Cancelled",
    count: 3,
    badgeClass: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground",
    dotClass: "bg-muted-foreground",
    percentage: 6.25,
  },
];

export interface TransportMode {
  name: string;
  count: string;
  percentage: string;
  color: string;
}

export const TRANSPORT_MODES: TransportMode[] = [
  { name: "Ocean", count: "1,842", percentage: "38.5%", color: "var(--chart-1, #3b82f6)" },
  { name: "Air", count: "968", percentage: "20.2%", color: "var(--chart-2, #06b6d4)" },
  { name: "Road", count: "1,456", percentage: "30.4%", color: "var(--chart-3, #10b981)" },
  { name: "Rail", count: "524", percentage: "10.9%", color: "var(--chart-4, #f59e0b)" },
];

export interface DelayedShipment {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  carrier: string;
  date: string;
  mode: string;
}

export const DELAYED_SHIPMENTS: DelayedShipment[] = [
  {
    id: "SHP-00031",
    trackingId: "PSS20260031",
    origin: "Toronto",
    destination: "Singapore",
    carrier: "DHL Express",
    date: "Aug 29, 2026",
    mode: "Ocean",
  },
  {
    id: "SHP-00041",
    trackingId: "PSS20260041",
    origin: "Los Angeles",
    destination: "Hong Kong",
    carrier: "MSC",
    date: "Aug 11, 2026",
    mode: "Road",
  },
  {
    id: "SHP-00018",
    trackingId: "PSS20260018",
    origin: "Hamburg",
    destination: "Rotterdam",
    carrier: "UPS",
    date: "Aug 27, 2026",
    mode: "Air",
  },
  {
    id: "SHP-00021",
    trackingId: "PSS20260021",
    origin: "London",
    destination: "Rotterdam",
    carrier: "Hapag-Lloyd",
    date: "Aug 27, 2026",
    mode: "Air",
  },
  {
    id: "SHP-00009",
    trackingId: "PSS20260009",
    origin: "Frankfurt",
    destination: "Tokyo",
    carrier: "MSC",
    date: "Aug 6, 2026",
    mode: "Rail",
  },
];

export interface PickupRequest {
  id: string;
  pickupId: string;
  timeSlot: string;
  status: string;
  badgeClass: string;
  dotClass: string;
  company: string;
  location: string;
  pcs: number;
  kg: number;
}

export const TODAY_PICKUPS: PickupRequest[] = [
  {
    id: "PKU-05",
    pickupId: "PKU20260005",
    timeSlot: "8 AM",
    status: "Cancelled",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
    company: "Helix Components",
    location: "Hamburg, Germany",
    pcs: 46,
    kg: 209,
  },
  {
    id: "PKU-08",
    pickupId: "PKU20260008",
    timeSlot: "8 AM",
    status: "Cancelled",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
    company: "Atlas Manufacturing",
    location: "Singapore, Singapore",
    pcs: 18,
    kg: 1170,
  },
  {
    id: "PKU-10",
    pickupId: "PKU20260010",
    timeSlot: "8 AM",
    status: "En Route",
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    dotClass: "bg-sky-500",
    company: "Vanguard Supply Co",
    location: "Los Angeles, United States",
    pcs: 8,
    kg: 1031,
  },
  {
    id: "PKU-01",
    pickupId: "PKU20260001",
    timeSlot: "9 AM",
    status: "Scheduled",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    dotClass: "bg-primary",
    company: "Vanguard Supply Co",
    location: "Rotterdam, Netherlands",
    pcs: 50,
    kg: 270,
  },
  {
    id: "PKU-03",
    pickupId: "PKU20260003",
    timeSlot: "9 AM",
    status: "En Route",
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    dotClass: "bg-sky-500",
    company: "Vanguard Supply Co",
    location: "Shanghai, China",
    pcs: 30,
    kg: 507,
  },
];

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  refId?: string;
  type: "destructive" | "warning" | "info";
  dotColor: string;
}

export const ACTION_ALERTS: DashboardAlert[] = [
  {
    id: "alt-1",
    title: "3 shipments in customs exception",
    description: "Action required — documentation needed to release cargo.",
    timeAgo: "about 2 hours ago",
    refId: "PSS20260138",
    type: "destructive",
    dotColor: "bg-destructive",
  },
  {
    id: "alt-2",
    title: "5 shipments delayed",
    description: "Port congestion at Shanghai causing 2–4 day delays.",
    timeAgo: "about 5 hours ago",
    type: "warning",
    dotColor: "bg-amber-500",
  },
  {
    id: "alt-3",
    title: "Invoice overdue",
    description: "INV20260018 is 12 days past due (₹8,420).",
    timeAgo: "1 day ago",
    refId: "INV20260018",
    type: "destructive",
    dotColor: "bg-destructive",
  },
  {
    id: "alt-4",
    title: "Wallet balance below threshold",
    description: "Balance is below the ₹50,000 minimum. Consider topping up.",
    timeAgo: "1 day ago",
    type: "warning",
    dotColor: "bg-amber-500",
  },
  {
    id: "alt-5",
    title: "Carrier rate update",
    description: "New carrier rates take effect August 1.",
    timeAgo: "2 days ago",
    type: "info",
    dotColor: "bg-sky-500",
  },
];

export interface QuickAction {
  title: string;
  description: string;
  href: string;
  iconName: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { title: "New Shipment", description: "Book a shipment", href: "/dashboard/shipmentBooking", iconName: "CirclePlus" },
  { title: "Schedule Pickup", description: "Arrange pickup", href: "/dashboard/pickupRequests", iconName: "Truck" },
  { title: "Track Shipment", description: "Live tracking", href: "/dashboard/shipmentTracking", iconName: "MapPin" },
  { title: "Download Report", description: "Export data", href: "/dashboard/reportsAnalytics", iconName: "FileText" },
  { title: "Top Up Wallet", description: "Add funds", href: "/dashboard/walletManagement", iconName: "Wallet" },
  { title: "Raise Ticket", description: "Get help", href: "/dashboard/supportTicketCreation", iconName: "LifeBuoy" },
];

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  iconType: "destructive" | "primary" | "info" | "warning" | "muted";
  iconName: string;
}

export const RECENT_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    title: "Shipment delayed",
    description: "Shipment PSS20260030 flagged as delayed",
    timeAgo: "about 13 hours ago",
    iconType: "destructive",
    iconName: "TriangleAlert",
  },
  {
    id: "act-2",
    title: "New shipment booked",
    description: "Booking PSS20260018 confirmed and dispatched",
    timeAgo: "about 13 hours ago",
    iconType: "primary",
    iconName: "Package",
  },
  {
    id: "act-3",
    title: "Pickup completed",
    description: "Pickup PKU20260047 completed successfully",
    timeAgo: "about 18 hours ago",
    iconType: "info",
    iconName: "Truck",
  },
  {
    id: "act-4",
    title: "Pickup scheduled",
    description: "Pickup PKU20260021 scheduled for today",
    timeAgo: "about 18 hours ago",
    iconType: "info",
    iconName: "Truck",
  },
  {
    id: "act-5",
    title: "Shipment delivered",
    description: "Shipment PSS20260030 delivered to recipient",
    timeAgo: "1 day ago",
    iconType: "primary",
    iconName: "Package",
  },
  {
    id: "act-6",
    title: "Return requested",
    description: "Return RTN20260007 submitted by customer",
    timeAgo: "1 day ago",
    iconType: "warning",
    iconName: "RotateCcw",
  },
  {
    id: "act-7",
    title: "Customs cleared",
    description: "Customs clearance for PSS20260035",
    timeAgo: "1 day ago",
    iconType: "muted",
    iconName: "Settings",
  },
];

export interface VolumePoint {
  label: string;
  shipments: number;
  deliveries: number;
  pickups: number;
  inTransit: number;
  returns: number;
  cancelled: number;
  [key: string]: string | number;
}

// Mathematically balanced daily time series:
// 7D: 7 points (6 intervals, 1-day step)
// 14D: 15 points (14 intervals, 2-day step)
// 30D: 31 points (30 intervals, 5-day step)
export const VOLUME_DATA: Record<string, VolumePoint[]> = {
  "7D": [
    { label: "Jul 20", shipments: 75, deliveries: 65, pickups: 42, inTransit: 55, returns: 12, cancelled: 4 },
    { label: "Jul 21", shipments: 82, deliveries: 70, pickups: 48, inTransit: 60, returns: 10, cancelled: 3 },
    { label: "Jul 22", shipments: 95, deliveries: 80, pickups: 55, inTransit: 72, returns: 15, cancelled: 5 },
    { label: "Jul 23", shipments: 102, deliveries: 86, pickups: 60, inTransit: 80, returns: 14, cancelled: 2 },
    { label: "Jul 24", shipments: 108, deliveries: 90, pickups: 64, inTransit: 85, returns: 11, cancelled: 3 },
    { label: "Jul 25", shipments: 110, deliveries: 92, pickups: 68, inTransit: 88, returns: 9, cancelled: 4 },
    { label: "Jul 26", shipments: 115, deliveries: 96, pickups: 72, inTransit: 92, returns: 8, cancelled: 2 },
  ],
  "14D": [
    { label: "Jul 13", shipments: 52, deliveries: 45, pickups: 30, inTransit: 40, returns: 8, cancelled: 3 },
    { label: "Jul 14", shipments: 55, deliveries: 47, pickups: 31, inTransit: 42, returns: 8, cancelled: 2 },
    { label: "Jul 15", shipments: 58, deliveries: 48, pickups: 32, inTransit: 44, returns: 9, cancelled: 2 },
    { label: "Jul 16", shipments: 64, deliveries: 52, pickups: 36, inTransit: 48, returns: 7, cancelled: 4 },
    { label: "Jul 17", shipments: 75, deliveries: 60, pickups: 40, inTransit: 55, returns: 11, cancelled: 3 },
    { label: "Jul 18", shipments: 82, deliveries: 68, pickups: 44, inTransit: 62, returns: 13, cancelled: 4 },
    { label: "Jul 19", shipments: 85, deliveries: 70, pickups: 45, inTransit: 65, returns: 14, cancelled: 5 },
    { label: "Jul 20", shipments: 78, deliveries: 66, pickups: 42, inTransit: 58, returns: 10, cancelled: 2 },
    { label: "Jul 21", shipments: 72, deliveries: 68, pickups: 44, inTransit: 52, returns: 8, cancelled: 3 },
    { label: "Jul 22", shipments: 75, deliveries: 65, pickups: 42, inTransit: 55, returns: 12, cancelled: 4 },
    { label: "Jul 23", shipments: 82, deliveries: 70, pickups: 48, inTransit: 60, returns: 10, cancelled: 3 },
    { label: "Jul 24", shipments: 95, deliveries: 80, pickups: 55, inTransit: 72, returns: 15, cancelled: 5 },
    { label: "Jul 25", shipments: 102, deliveries: 86, pickups: 60, inTransit: 80, returns: 14, cancelled: 2 },
    { label: "Jul 26", shipments: 108, deliveries: 90, pickups: 64, inTransit: 85, returns: 11, cancelled: 3 },
    { label: "Jul 27", shipments: 115, deliveries: 96, pickups: 72, inTransit: 92, returns: 8, cancelled: 2 },
  ],
  "30D": [
    { label: "Jul 1", shipments: 42, deliveries: 35, pickups: 25, inTransit: 30, returns: 5, cancelled: 2 },
    { label: "Jul 2", shipments: 46, deliveries: 37, pickups: 28, inTransit: 32, returns: 6, cancelled: 1 },
    { label: "Jul 3", shipments: 52, deliveries: 39, pickups: 30, inTransit: 38, returns: 4, cancelled: 3 },
    { label: "Jul 4", shipments: 58, deliveries: 40, pickups: 32, inTransit: 42, returns: 7, cancelled: 2 },
    { label: "Jul 5", shipments: 61, deliveries: 45, pickups: 34, inTransit: 46, returns: 8, cancelled: 4 },
    { label: "Jul 6", shipments: 63, deliveries: 49, pickups: 36, inTransit: 48, returns: 5, cancelled: 2 },
    { label: "Jul 7", shipments: 65, deliveries: 52, pickups: 38, inTransit: 50, returns: 9, cancelled: 3 },
    { label: "Jul 8", shipments: 59, deliveries: 50, pickups: 35, inTransit: 45, returns: 6, cancelled: 1 },
    { label: "Jul 9", shipments: 54, deliveries: 49, pickups: 31, inTransit: 42, returns: 4, cancelled: 2 },
    { label: "Jul 10", shipments: 50, deliveries: 48, pickups: 29, inTransit: 40, returns: 5, cancelled: 3 },
    { label: "Jul 11", shipments: 62, deliveries: 52, pickups: 35, inTransit: 48, returns: 8, cancelled: 2 },
    { label: "Jul 12", shipments: 70, deliveries: 56, pickups: 40, inTransit: 54, returns: 10, cancelled: 4 },
    { label: "Jul 13", shipments: 78, deliveries: 60, pickups: 45, inTransit: 60, returns: 7, cancelled: 2 },
    { label: "Jul 14", shipments: 80, deliveries: 64, pickups: 48, inTransit: 62, returns: 9, cancelled: 3 },
    { label: "Jul 15", shipments: 82, deliveries: 67, pickups: 50, inTransit: 64, returns: 11, cancelled: 1 },
    { label: "Jul 16", shipments: 84, deliveries: 70, pickups: 52, inTransit: 66, returns: 12, cancelled: 4 },
    { label: "Jul 17", shipments: 80, deliveries: 72, pickups: 48, inTransit: 62, returns: 8, cancelled: 2 },
    { label: "Jul 18", shipments: 75, deliveries: 70, pickups: 45, inTransit: 58, returns: 7, cancelled: 3 },
    { label: "Jul 19", shipments: 72, deliveries: 68, pickups: 42, inTransit: 55, returns: 9, cancelled: 2 },
    { label: "Jul 20", shipments: 78, deliveries: 71, pickups: 46, inTransit: 60, returns: 10, cancelled: 4 },
    { label: "Jul 21", shipments: 86, deliveries: 74, pickups: 50, inTransit: 66, returns: 8, cancelled: 1 },
    { label: "Jul 22", shipments: 95, deliveries: 80, pickups: 55, inTransit: 74, returns: 12, cancelled: 3 },
    { label: "Jul 23", shipments: 102, deliveries: 85, pickups: 60, inTransit: 80, returns: 11, cancelled: 2 },
    { label: "Jul 24", shipments: 106, deliveries: 88, pickups: 64, inTransit: 84, returns: 9, cancelled: 4 },
    { label: "Jul 25", shipments: 110, deliveries: 92, pickups: 68, inTransit: 88, returns: 7, cancelled: 2 },
    { label: "Jul 26", shipments: 112, deliveries: 94, pickups: 70, inTransit: 90, returns: 8, cancelled: 3 },
    { label: "Jul 27", shipments: 114, deliveries: 95, pickups: 72, inTransit: 92, returns: 6, cancelled: 1 },
    { label: "Jul 28", shipments: 116, deliveries: 97, pickups: 74, inTransit: 94, returns: 7, cancelled: 2 },
    { label: "Jul 29", shipments: 118, deliveries: 98, pickups: 76, inTransit: 95, returns: 5, cancelled: 3 },
    { label: "Jul 30", shipments: 120, deliveries: 100, pickups: 78, inTransit: 96, returns: 6, cancelled: 1 },
    { label: "Jul 31", shipments: 122, deliveries: 102, pickups: 80, inTransit: 98, returns: 5, cancelled: 1 },
  ],
};
