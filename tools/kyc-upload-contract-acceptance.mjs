import assert from "node:assert/strict";
import fs from "node:fs";

const kyc = fs.readFileSync("components/block/clientKycForm.tsx", "utf8");

const checks = [
  ["KYC upload records the original filename", kyc.includes("p_original_filename: file.name")],
  ["KYC reloads persisted document metadata", kyc.includes("original_filename,status")],
  ["uploaded documents display the filename", kyc.includes("files[type]?.name ?? persistedDocument?.original_filename")],
  ["uploaded documents show a clear uploaded state", kyc.includes('text-[11px] font-semibold">Uploaded</p>')],
  ["uploaded documents retain a replacement action", kyc.includes("Replace document")],
  ["document failure is surfaced to the user", kyc.includes("The document record could not be saved")],
];

for (const [label, passed] of checks) assert.ok(passed, label);
console.log(`KYC upload contract checks passed (${checks.length} checks).`);
