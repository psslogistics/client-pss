import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { localDateInput, shiftLocalDays } from "../lib/date-format.ts";

const current = new Date(2026, 9, 28, 12, 0, 0);
assert.equal(localDateInput(new Date(2026, 9, 1, 23, 59, 0)), "2026-10-01");
assert.equal(shiftLocalDays(current, -27), "2026-10-01");
const source = await readFile(new URL("../components/block/reportsAnalytics.tsx", import.meta.url), "utf8");
for (const token of ["reportRange", "localDateInput", "shiftLocalDays", "Generated at", "Timezone", "toClientShipmentStatus", "isDelayedShipment", "Status summary"]) assert.ok(source.includes(token), `missing report contract token: ${token}`);
assert.doesNotMatch(source, /dateStyle: "medium", timeStyle: "short", timeZoneName/, "Intl.DateTimeFormat cannot combine dateStyle/timeStyle with timeZoneName");
assert.match(source, /day: "2-digit", month: "short", year: "numeric".*timeZoneName: "short"/, "report timestamp must use compatible explicit date parts");
console.log("Report contract checks passed (12 checks).");
