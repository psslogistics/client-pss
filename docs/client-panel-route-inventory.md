# Client panel route inventory

Updated: 2026-10-29

This is a source-level Phase 0 inventory. Live authenticated verification remains a release-gate task and must use isolated, non-submitting fixtures.

| Route | Primary workflow | Current source state |
| --- | --- | --- |
| `/dashboard` | Dashboard counts and operational summary | Shared shipment status contract wired; live count reconciliation pending |
| `/dashboard/shipmentBooking` | Booking, KYC gate, saved consignor/consignee | Dedicated address mapping, server-side address search, KYC gate wired |
| `/dashboard/allShipments` | Shipment list, filters, documents, labels | Shared status counts, client-safe references, label menu wired |
| `/dashboard/shipmentTracking` | Timeline and provider refresh | Latest authoritative event drives displayed status |
| `/dashboard/pickupRequests` | Pickup requests and export | Provider-backed pickup contract and searchable locations present |
| `/dashboard/warehouseManagement` | Saved consignor locations | Dedicated warehouse contract and active/search pagination API present |
| `/dashboard/pincodeServiceability` | Pincode lookup/serviceability | Contract tests present; live provider check remains gated |
| `/dashboard/rateCalculator` | Client pricing quote | Public PSS service labels and client-scoped courier capability response |
| `/dashboard/rateCard` | Assigned rate card | Client-assigned rate card and available courier display |
| `/dashboard/rateCheck` | PSS rate preview | Provider account names hidden from rendered output |
| `/dashboard/weightReconciliation` | Weight dispute window | Client-safe shipment references and deadline/status display |
| `/dashboard/walletManagement` | Wallet balance and movement | Current balance, credits, debits, net movement, pending, and reversed amounts; raw UUID fallback removed |
| `/dashboard/billingInvoiceManagement` | Billing rows and exports | Shipment/cycle invoice identifiers, 15/30/60/90 exports, PDF/XLSX ZIP |
| `/dashboard/codRemittance` | COD settlement tracking | Joined shipment references, total/pending/paid/failed summaries, and client-safe empty states |
| `/dashboard/reportsAnalytics` | Date-filtered report export | Preference-backed local date range and typed XLSX export |
| `/dashboard/exceptionsManagement` | Exceptions/NDR | Client-safe shipment references and shipment selector wired; live workflow verification pending |
| `/dashboard/ndrExceptions` | NDR handling | Client-safe shipment references and shipment selector wired; live workflow verification pending |
| `/dashboard/ndrManagement` | NDR management | Client-safe shipment references and shipment selector wired; live workflow verification pending |
| `/dashboard/supportTicketCreation` | Ticket creation and status filters | Open/Resolved/Closed filters wired |
| `/dashboard/notificationsAlerts` | Notification feed/preferences | Preference persistence and event delivery require live verification |
| `/dashboard/returnShipments` | Return/RTO request | Shipment selector replaces raw UUID entry |
| `/dashboard/profileAccountManagement` | Profile and membership identity | Active membership shown separately from editable company text |
| `/dashboard/userSettings` | Preferences, security, integrations | Available couriers only; unfinished capabilities explicitly managed/unavailable |

## Evidence boundaries

- Production records were not deleted or used as disposable fixtures.
- Client and Worker TypeScript checks pass.
- Client pickup, warehouse, domain/label checks and Worker pricing, pickup, warehouse, and serviceability checks pass.
- The Client production build passed end-to-end in an isolated output directory when run with elevated filesystem access; the ordinary sandboxed runner still hits Windows `EPERM` while creating Next output directories. Authenticated browser verification remains separate and is not inferred from source checks.
