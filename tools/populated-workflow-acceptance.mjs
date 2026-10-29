import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixture = JSON.parse(await readFile(new URL("./fixtures/client-panel-scenarios.json", import.meta.url), "utf8"));
const scenarios = new Map(fixture.scenarios.map((scenario) => [scenario.id, scenario]));
const required = ["cod-pending", "cod-paid", "pickup-failed", "return-open", "ndr-open", "support-open", "weight-open"];
for (const id of required) assert.ok(scenarios.has(id), `missing populated workflow fixture: ${id}`);
assert.equal(scenarios.get("cod-pending").status, "pending");
assert.equal(scenarios.get("cod-paid").status, "paid");
assert.equal(scenarios.get("pickup-failed").retryable, true);
assert.equal(scenarios.get("return-open").shipment_id, "booked-lr");
assert.equal(scenarios.get("ndr-open").shipment_id, "booked-lr");
assert.equal(scenarios.get("support-open").shipment_id, "booked-lr");
assert.equal(scenarios.get("weight-open").shipment_id, "booked-lr");

const sourceFiles = await Promise.all([
  "app/dashboard/codRemittance/page.tsx",
  "components/block/returnShipments.tsx",
  "components/block/operationsManagement.tsx",
  "components/block/supportTicketCreation.tsx",
  "components/block/weightReconciliationWorkspace.tsx",
].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
for (const [index, token] of ["cod-remittances", "shipment", "/v1/exceptions", "tickets", "weight-reconciliation"].entries()) assert.ok(sourceFiles[index].includes(token), `workflow source is missing ${token}`);
assert.ok(sourceFiles[1].includes("Customer requested return") && sourceFiles[1].includes("Additional details"), "return requests must use a controlled reason and optional details");
assert.ok(sourceFiles.every((source) => !/raw UUID|shipment UUID/i.test(source)), "workflow UI must not advertise raw UUIDs");
console.log(`Populated workflow fixture checks passed (${required.length + sourceFiles.length + 1} checks).`);
