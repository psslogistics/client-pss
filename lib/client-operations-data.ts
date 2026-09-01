export type AddressKind = "warehouse" | "consignor" | "consignee";
export type SavedAddressRecord = { id: string; name: string; kind: AddressKind; company: string; address: { line: string; city: string; state: string; pincode: string; country: string }; contact: { name: string; phone: string; email: string }; default: boolean; archived?: boolean; notes?: string };
export type NdrCase = { id: string; shipment: string; client: string; consignee: string; destination: string; courier: string; attempt: number; date: string; reason: string; status: "New" | "Awaiting client action" | "Reattempt requested" | "RTO requested" | "Resolved"; priority: "High" | "Medium"; deadline: string; notes: string };
export type ExceptionCase = { id: string; shipment: string; category: string; severity: "Critical" | "High" | "Medium"; status: "New" | "Acknowledged" | "Awaiting client information" | "Under review" | "Resolved"; date: string; courier: string; location: string; title: string; details: string; action: string };
export const addressKeys: Record<AddressKind, string> = { warehouse: "pss_saved_warehouses", consignor: "pss_saved_pickup_addresses", consignee: "pss_saved_consignee_addresses" };
export const seedAddresses: Record<AddressKind, SavedAddressRecord[]> = { warehouse: [], consignor: [], consignee: [] };
export const ndrCases: NdrCase[] = [];
export const exceptionCases: ExceptionCase[] = [];
export function readAddresses(kind: AddressKind) { return seedAddresses[kind]; }
export function writeAddresses(_kind: AddressKind, _records: SavedAddressRecord[]) { /* Production persistence will be provided by the operations API. */ }
