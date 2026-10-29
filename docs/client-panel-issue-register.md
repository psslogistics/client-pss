# Client panel issue register

Updated: 2026-10-29

This register keeps the panel audit scoped. Production records are not used as disposable test data; destructive or provider-submitting tests require isolated fixtures and explicit release approval.

## Baseline and evidence

| Area | Current evidence | State |
| --- | --- | --- |
| Booking and saved addresses | Client TypeScript, warehouse contract, and pickup contract checks pass. Dedicated warehouse/address fields are used by Booking; country now persists through client address create/update as well as reload mapping. | Verified in source/contracts; authenticated save-and-reload remains a release-gate check |
| Shipment status counts | Worker and Client now share raw status predicates for delayed and in-transit views; delayed is derived from EDD and terminal-state exclusions. | Source-fixed; cross-route runtime reconciliation pending |
| Tracking | Client consumes server tracking events and uses the latest event for the displayed status. Cache-busted production tracking for LR `322012867` now shows `Booked`, matching the provider movement event, instead of the former hardcoded `Manifested` label. | Source-fixed and live-verified on Client commit `12528fe` |
| Dashboard activity and delayed links | Live inspection exposed raw event keys (`addresses.created`, `shipment.provider_failed`) and internal UUIDs in activity/delayed-shipment links. Client activity labels now use customer-safe wording, and delayed links now carry LR/AWB/tracking/PSS references. Worker overview activity now includes LR/AWB fallbacks. | Source-fixed; authenticated cache-busted scans of Dashboard, All Shipments, Tracking, Reports, Billing, Wallet, and Settings showed no raw UUIDs, legacy provider-account labels, or obvious test references. Full route-matrix scan remains open. |
| Labels | Provider assets are preserved, mixed raster/PDF assets are imposed on exact A4 grids, A4 remains one full-page label, the UI carries the shipment box count, and the filename is `<reference>-LABEL-<size>.pdf`. Downloads now fail truthfully when fewer than `box_count + 1` printable assets are returned. | Source-fixed and live-verified for a 21-box provider fixture: A4 produced 22 pages, smaller sizes produced 3 A4 grid pages each, filenames and page sizes were correct, and the first grid page was visually checked for barcode/QR readability. Worker deployment `5f897e75-b812-4e6f-ab33-8d4f8f589623` added bounded asset retries. |
| Billing | Shipment invoice number is `INV-<LR>` when LR exists; individual invoices use the client Bill To address; consolidated exports are available for 15, 30, 60, and 90 days with PDF/XLSX output. The Worker no longer derives new invoice numbers from internal UUIDs, and consolidated PDF totals now separate subtotal and taxes and render the amount in words. Client rendering now suppresses legacy `INV-SHIPMENT`/UUID-era values and uses LR/AWB/tracking/PSS references. | Source-fixed; live billing page loaded 25 records and a 30-day download produced a ZIP containing the expected XLSX and PDF. Finance reconciliation across the shared fixture set remains pending. |
| Reports | Default report range is loaded from preferences and local-date-safe; exports include title, period, timestamp, timezone, and counts. Complete-report PDF timestamps are also Asia/Kolkata-safe and operator UUIDs are not rendered. | Source-fixed; live report loaded 72 shipments and 81 pickups, and the Export action produced a dated XLSX. Cross-route totals remain pending. |
| Courier visibility | Booking, pickup, pricing, rate card, settings, and integrations use `/v1/client-courier-capabilities`; pickup renders only the public courier name while retaining an opaque routing ID. Legacy provider-account aliases now map to PSS-facing service names (`PSS Heavy Freight`, `PSS Economy Freight`, `PSS Standard Freight`, and `PSS Freight Service`) in Client commit `5694f6e`. | Source-fixed; authenticated capability matrix and full rendered-text scan still need release-gate verification |
| Profile assignment | Profile displays the active client membership name separately from the editable profile company name. | Source-fixed; live membership fixture pending |
| Wallet and COD | Wallet exposes current balance, credits, debits, net movement, pending, and reversed amounts with signed transaction rows; COD exposes total, pending, paid, and failed settlement totals. | Wallet live-verified after Worker commits `eb9173f` and `a70201d`; the page now returns bounded data and displays client-safe shipment references. Controlled COD settlement fixture and cross-finance reconciliation remain pending. |
| Returns and weight reconciliation | Client tables use shipment references instead of raw shipment UUIDs; return creation uses a shipment selector. | Source-fixed; endpoint/runtime fixture pending |
| NDR and exceptions | Client case responses now join safe shipment references; case creation uses a shipment selector and no longer renders raw case or shipment UUIDs. | Source-fixed; authenticated case workflow pending |
| Support filters | Open, Resolved, and Closed tabs are stateful and filter the ticket list. | Source-fixed; live ticket fixture pending |

## Required fixture matrix

The non-production scenario matrix is recorded in `tools/fixtures/client-panel-scenarios.json`. These are acceptance inputs only; they have not been seeded into production.

- [x] Normal booked shipment with LR
- [x] Delayed shipment with past EDD
- [x] Exception shipment without provider reference
- [x] Multi-box Delhivery shipment with MPS asset
- [x] Shipment without LR/AWB
- [x] COD shipment with pending and paid remittance states
- [x] Failed pickup and retryable pickup
- [x] Saved consignor and saved consignee
- [x] Pending courier weight and open dispute window
- [x] Paid and unpaid billing records
- [x] Draft KYC and approved KYC client accounts

The matrix is validated by `npm run test:fixtures`; it is not seeded into production.

## Release-gate checks still required

- [x] Public production routes return HTTP 200 for `/dashboard` and `/dashboard/billingInvoiceManagement` (unauthenticated reachability only)
- [x] Authenticated smoke test for every client route (18 Client routes loaded without a route-level crash; Wallet was separately rechecked on its actual `/walletManagement` path)
- [ ] Saved address survives reload and repopulates dedicated fields
- [x] Label PDF opens, has the expected page size/count, and preserves barcode readability
- [ ] Report, billing, wallet, and COD totals reconcile against the same fixture set
- [ ] No provider-only text, raw UUID, or test record appears in client-facing output
- [x] Client production build completes with elevated filesystem access; ordinary sandboxed execution still fails on Next output-directory creation with Windows `EPERM`
- [x] Vercel deployment is Ready and authenticated production routes are verified (Client `12528fe`; Worker `dcc64e9f-5afc-477c-8c9f-0159081de2d6`)

## Known delivery constraint

The consolidated invoice is currently a vector PDF generated in the browser with `jsPDF` and `jspdf-autotable`. It has the planned invoice structure, A4 output, client/PSS address blocks, shipment articles, totals, and stable cycle filenames, but this checkout has no LaTeX compiler or browser-safe LaTeX-to-PDF runtime. A true LaTeX compilation service must be introduced as a separately approved infrastructure change before replacing the current deployment-safe generator; this is intentionally not faked by downloading an uncompiled `.tex` file as a PDF.
