# Client panel issue register

Updated: 2026-10-29

This register keeps the panel audit scoped. Production records are not used as disposable test data; destructive or provider-submitting tests require isolated fixtures and explicit release approval.

## Baseline and evidence

| Area | Current evidence | State |
| --- | --- | --- |
| Booking and saved addresses | Client TypeScript, warehouse contract, and pickup contract checks pass. Dedicated warehouse/address fields are used by Booking; country now persists through client address create/update as well as reload mapping. Consignee saves now explicitly send `address_kind: "consignee"` in Client commit `c23394c`, preventing the Worker default from classifying them as consignors. Client commit `0d8e6cc` strips internal `PSS-...` fragments from saved Consignor and Consignee labels without changing IDs or dedicated fields. Client commit `02b5425` now performs a cache-bypassed read-back after each save and selects the server-returned record. | Source-fixed and live-verified after a fresh Booking load: saved consignor and consignee lists were fetched, existing records were selected, and every dedicated name/phone/address/city/state/PIN/country field repopulated. No new production record was created; POST-to-reload proof remains intentionally limited to existing persisted records and the isolated fixture matrix |
| Shipment status counts | Worker and Client now share raw status predicates for delayed and in-transit views; delayed is derived from EDD and terminal-state exclusions. | Source-fixed and live-verified: Dashboard and All Shipments both showed 72 total, 52 active, 37 delayed, and 16 exceptions; mutually exclusive All Shipments buckets summed to 72 (Booked 14, Cancelled 2, Delivered 18, Exception 16, In Transit 11, Out for Delivery 11). |
| Tracking | Client consumes server tracking events and uses the latest event for the displayed status. Cache-busted production tracking for LR `322012867` now shows `Booked`, matching the provider movement event, instead of the former hardcoded `Manifested` label. | Source-fixed and live-verified on Client commit `12528fe` |
| Dashboard activity and delayed links | Live inspection exposed raw event keys (`addresses.created`, `shipment.provider_failed`) and internal UUIDs in activity/delayed-shipment links. Client activity labels now use customer-safe wording, and delayed links now carry LR/AWB/tracking/PSS references. Worker overview activity now includes LR/AWB fallbacks. Worker commit `c4fb593` also applies classified-shipment visibility to dashboard wallet activity. The dashboard now requests COD rows when the client has `cod.read` scope and computes unsettled COD exposure from those rows. | Source-fixed; authenticated scans of all 23 Client routes found no rendered raw UUIDs, legacy provider-account labels, raw event keys, route crashes, refresh-failure banners, or reviewed test references. Cache-busted live dashboard verification after Worker `07a598f` / deployment `6a47bfd9-d6a1-4714-bb91-bfcbf94f378d` returned successfully; wallet balance rendered and COD exposure correctly showed `Not available` for the current zero-row client. |
| Labels | Provider assets are preserved, mixed raster/PDF assets are imposed on exact A4 grids, A4 remains one full-page label, the UI carries the shipment box count, and the filename is `<reference>-LABEL-<size>.pdf`. Downloads now fail truthfully when fewer than `box_count + 1` printable assets are returned. | Source-fixed and live-verified for a 21-box provider fixture: A4 produced 22 pages, smaller sizes produced 3 A4 grid pages each, filenames and page sizes were correct, and the first grid page was visually checked for barcode/QR readability. Worker deployment `5f897e75-b812-4e6f-ab33-8d4f8f589623` added bounded asset retries. |
| Billing | Shipment invoice number is `INV-<LR>` when LR exists; individual invoices use the client Bill To address; consolidated exports are available for 15, 30, 60, and 90 days with PDF/XLSX output. The Worker no longer derives new invoice numbers from internal UUIDs, and consolidated PDF totals now separate subtotal and taxes and render the amount in words. Client rendering now suppresses legacy `INV-SHIPMENT`/UUID-era values and uses LR/AWB/tracking/PSS references. Commit `fa2d125` now sends explicit local `start_date`/`end_date` bounds to the Worker, and the Worker accepts those bounds using calendar-date comparison. | Source-fixed and live-verified: the authenticated 15-day export downloaded `PSS-Billing-2026-10-15-to-2026-10-29.zip` containing the matching XLSX and PDF. Worker version `634e0e88-0815-4d60-8ade-f06f8dea5149` is deployed. Current Billing settled at ₹29,102 across 25 billable records with 0 pending records; the shared non-production reconciliation fixture covers billing, wallet, COD, and report identities/totals. |
| Reports | Default report range is loaded from preferences and local-date-safe; exports include title, period, timestamp, timezone, and counts. Complete-report PDF timestamps are also Asia/Kolkata-safe and operator UUIDs are not rendered. Worker commit `14e8ba0` now projects the pickup contact/location/package fields and shipment/billing identity fields consumed by the complete report, preventing real values from falling back to `Not recorded`. | Source-fixed; cache-busted live report loaded 72 shipments and 81 pickups, and the Export action produced a dated XLSX. The complete-report projection contract passed 5 checks and Worker version `ed2474fa-253b-4693-8687-6ecb25769330` is deployed. Cross-route totals remain pending. |
| Courier visibility | Booking, pickup, pricing, rate card, settings, and integrations use `/v1/client-courier-capabilities`; pickup renders only the public courier name while retaining an opaque routing ID. Legacy provider-account aliases now map to PSS-facing service names (`PSS Heavy Freight`, `PSS Economy Freight`, `PSS Standard Freight`, and `PSS Freight Service`) in Client commit `5694f6e`. | Source-fixed; authenticated capability matrix and full rendered-text scan passed with no provider-only labels in the 23-route scan |
| Profile assignment | Profile displays the active client membership name separately from the editable profile company name. | Source-fixed; live membership fixture pending |
| Wallet and COD | Wallet exposes current balance, credits, debits, net movement, pending, and reversed amounts with signed transaction rows; COD exposes total, pending, paid, and failed settlement totals. Dashboard and Billing now consume the shared Client finance contract for billing exclusion/pending/paid and COD exposure rules. | Wallet live-verified after Worker commits `eb9173f` and `a70201d`; dashboard COD query is live-verified after Worker `07a598f` / deployment `6a47bfd9-d6a1-4714-bb91-bfcbf94f378d`; current client has zero COD rows. The non-production reconciliation fixture passes shared billing/wallet/COD identity and total checks; a populated live COD settlement remains unavailable without seeding production data. |
| Returns and weight reconciliation | Client tables use shipment references instead of raw shipment UUIDs; return creation uses a shipment selector. Pickup list/detail visibility now excludes classified standalone pickups and pickups linked to classified shipments. | Pickup source-fixed and live-verified after Worker `b2dfc134-cef1-4243-bdfe-e7e0be9e33f2`; authenticated Pickup view shows 54 of 54 with no reviewed test/QA records. Returns reached the authenticated empty state; a populated return fixture remains pending. Weight reconciliation loaded with its 20 kg rule and zero open records; populated fixture remains pending. |
| NDR and exceptions | Client case responses now join safe shipment references; case creation uses a shipment selector and no longer renders raw case or shipment UUIDs. | Source-fixed; authenticated NDR/Exceptions route loaded with a truthful empty state; populated case workflow remains pending |
| Support filters | Open, Resolved, and Closed tabs are stateful and filter the ticket list. | Source-fixed and live-verified: authenticated Support route exposed and exercised all three tabs without a crash; populated ticket fixture remains pending |

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
- [x] Authenticated smoke test for every client route (23 Client routes loaded without a route-level crash; populated-data workflow evidence is tracked separately below)
- [x] Saved address survives a fresh Booking load and repopulates dedicated fields for both consignor and consignee; save-to-reload is additionally covered by the cache-bypassed read-back path and non-production fixture matrix
- [x] Label PDF opens, has the expected page size/count, and preserves barcode readability
- [x] Report, billing, wallet, and COD identities and totals reconcile against the same non-production fixture set; the current production client has no COD rows for a controlled live reconciliation
- [x] No provider-only text, raw UUID, or test record appears in client-facing output in the authenticated 23-route rendered-text scan; reviewed test/QA records are explicitly classified and hidden on Pickup, Warehouse, and Shipment lists
- [x] Client production build completes with elevated filesystem access; ordinary sandboxed execution still fails on Next output-directory creation with Windows `EPERM`
- [x] Vercel deployment is Ready and authenticated production routes are verified (Client `ab5f992`; Worker `6a47bfd9-d6a1-4714-bb91-bfcbf94f378d`)

## Known delivery constraint

The consolidated invoice is currently a vector PDF generated in the browser with `jsPDF` and `jspdf-autotable`. It has the planned invoice structure, A4 output, client/PSS address blocks, shipment articles, totals, and stable cycle filenames, but this checkout has no LaTeX compiler or browser-safe LaTeX-to-PDF runtime. A true LaTeX compilation service must be introduced as a separately approved infrastructure change before replacing the current deployment-safe generator; this is intentionally not faked by downloading an uncompiled `.tex` file as a PDF.
