"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronDown,
  Download,
  FileText,
  Info,
  Package,
  Ruler,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Save,
  UserRound,
  X,
} from "lucide-react";
import Dropdown from "@/components/ui/dropdown";
import ConfirmationToast, { type ConfirmationToastTone } from "@/components/ui/confirmationToast";
import { pssApi } from "@/lib/pss-api";

type Address = { line: string; city: string; state: string; pincode: string; country: string };
type Contact = { name: string; phone: string; email: string };
type SavedPickup = { id: string; name: string; address: Address; contact: Contact };
type PinStatus = "idle" | "loading" | "success" | "error";
type PaymentMode = "COD" | "Prepaid";
type BulkShipment = {
  id: string;
  sourceRow: number;
  from: string;
  to: string;
  consignor: string;
  consignee: string;
  consignorPhone: string;
  consigneePhone: string;
  description: string;
  weight: string;
  pieces: string;
  shipmentValue: string;
  ewayBill: File | null;
  ewayBillAvailable: boolean;
  originPincode: string;
  destinationPincode: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  invoiceAvailable: boolean;
  invoice: File | null;
  courier: string;
  paymentMode: PaymentMode;
  codAmount: string;
  dcNumber: string;
  dcDate: string;
  dcSeller: string;
  dcBuyer: string;
  dcValue: string;
  dcReason: string;
  errors: string[];
};
type ChallanData = { number: string; date: string; seller: string; buyer: string; value: string; reason: string; from?: string; to?: string; paymentMode?: PaymentMode; codAmount?: string; invoice?: string };
type ShipmentDetails = { description: string; weight: string; pieces: string; value: string };
type BoxDimension = { length: string; width: string; height: string; boxCount: string };

const emptyAddress: Address = { line: "", city: "", state: "", pincode: "", country: "India" };
const emptyContact: Contact = { name: "", phone: "", email: "" };
const field = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";
const fileAsBase64 = async (file: File) => { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ""; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(binary); };
const allCouriers = [
  { id: "delhivery", provider: "delhivery", name: "Delhivery", service: "Provider quote required", eta: "Provider confirmation required", rate: "Live quote unavailable", confidence: 0, accountName: "", accountId: "", accent: "bg-violet-500/10 text-violet-600" },
  { id: "trackon", provider: "trackon", name: "Trackon", service: "Provider quote required", eta: "Provider confirmation required", rate: "Live quote unavailable", confidence: 0, accountName: "", accountId: "", accent: "bg-sky-500/10 text-sky-600" },
  { id: "xpressbees", provider: "xpressbees", name: "XpressBees", service: "Provider quote required", eta: "Provider confirmation required", rate: "Live quote unavailable", confidence: 0, accountName: "", accountId: "", accent: "bg-orange-500/10 text-orange-600" },
];
const dispatchPendingOption = { id: "dispatch_pending", provider: "", name: "Dispatch pending", service: "Courier assigned after provider activation", eta: "EDD pending", rate: "No quote", confidence: 0, accountName: "", accountId: "", accent: "bg-amber-500/10 text-amber-600" };
const pickupSlots = ["09:00 AM – 11:00 AM", "11:00 AM – 01:00 PM", "02:00 PM – 04:00 PM", "04:00 PM – 06:00 PM"];
const EWAY_THRESHOLD = 50000;
const bulkHeaders = ["from", "to", "origin_city", "origin_state", "origin_pincode", "destination_city", "destination_state", "destination_pincode", "consignor", "consignee", "consignor_phone", "consignee_phone", "description", "weight_kg", "pieces", "shipment_value", "invoice_available", "payment_mode", "cod_amount", "eway_bill_available", "dc_number", "dc_date", "dc_seller", "dc_buyer", "dc_value", "dc_reason"];

const csvRows = (text: string) => text.trim().split(/\r?\n/).map((line) => line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((cell) => cell.trim().replace(/^\"|\"$/g, "")));
const makeBulkRows = (rows: string[][]): BulkShipment[] => {
  const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) || [];
  const index = (name: string) => headers.indexOf(name);
  const unique = new Map<string, BulkShipment>();
  rows.filter((row) => row.some(Boolean)).forEach((row, rowIndex) => {
    const get = (name: string) => row[index(name)]?.trim() || "";
    const from = get("from");
    const to = get("to");
    const destinationPincode = get("destination_pincode");
    const paymentMode = get("payment_mode").toLowerCase() === "cod" ? "COD" : "Prepaid";
    const invoiceValue = get("invoice_available").toLowerCase();
    const paymentValue = get("payment_mode").toLowerCase();
    const errors = [
      ...(!from ? ["From address is missing"] : []),
      ...(!to ? ["To address is missing"] : []),
      ...(!get("origin_city") ? ["Origin city is missing"] : []),
      ...(!get("origin_state") ? ["Origin state is missing"] : []),
      ...(!get("destination_city") ? ["Destination city is missing"] : []),
      ...(!get("destination_state") ? ["Destination state is missing"] : []),
      ...(!get("consignor") ? ["Consignor is missing"] : []),
      ...(!get("consignee") ? ["Consignee is missing"] : []),
      ...(!validPhone(normalizePhone(get("consignor_phone"))) ? ["Consignor phone is invalid"] : []),
      ...(!validPhone(normalizePhone(get("consignee_phone"))) ? ["Consignee phone is invalid"] : []),
      ...(!get("description") ? ["Shipment description is missing"] : []),
      ...(!get("weight_kg") || Number(get("weight_kg")) <= 0 ? ["Weight must be greater than 0"] : []),
      ...(!get("pieces") || Number(get("pieces")) < 1 ? ["Pieces must be at least 1"] : []),
      ...(!get("shipment_value") || Number(get("shipment_value")) <= 0 ? ["Shipment value must be greater than 0"] : []),
      ...(!/^\d{6}$/.test(get("origin_pincode")) ? ["Origin PIN code must be 6 digits"] : []),
      ...(!/^\d{6}$/.test(destinationPincode) ? ["Destination PIN code must be 6 digits"] : []),
      ...(!["yes", "no"].includes(invoiceValue) ? ["invoice_available must be yes or no"] : []),
      ...(!["cod", "prepaid"].includes(paymentValue) ? ["payment_mode must be COD or Prepaid"] : []),
      ...(paymentValue === "cod" && (!get("cod_amount") || Number(get("cod_amount")) <= 0) ? ["COD amount must be greater than 0"] : []),
      ...(Number(get("shipment_value")) >= EWAY_THRESHOLD && get("eway_bill_available").toLowerCase() !== "yes" ? ["E-Way bill is compulsory at or above ₹50,000"] : []),
    ];
    const key = `${from.toLowerCase()}|${to.toLowerCase()}|${get("description").toLowerCase()}|${get("dc_number").toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, { id: `bulk-${rowIndex + 1}`, sourceRow: rowIndex + 2, from, to, consignor: get("consignor"), consignee: get("consignee"), consignorPhone: normalizePhone(get("consignor_phone")), consigneePhone: normalizePhone(get("consignee_phone")), description: get("description"), weight: get("weight_kg"), pieces: get("pieces"), shipmentValue: get("shipment_value"), originPincode: get("origin_pincode"), destinationPincode, originCity: get("origin_city"), originState: get("origin_state"), destinationCity: get("destination_city"), destinationState: get("destination_state"), invoiceAvailable: invoiceValue === "yes", invoice: null, courier: "", paymentMode, codAmount: get("cod_amount"), dcNumber: get("dc_number"), dcDate: get("dc_date"), dcSeller: get("dc_seller"), dcBuyer: get("dc_buyer"), dcValue: get("dc_value"), dcReason: get("dc_reason"), ewayBill: null, ewayBillAvailable: get("eway_bill_available").toLowerCase() === "yes", errors });
    else { const existing = unique.get(key); if (existing) existing.errors = [...existing.errors, `Duplicate shipment row ${rowIndex + 2} was merged`]; }
  });
  return [...unique.values()];
};

const downloadText = (name: string, content: string, type = "text/plain") => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
};
const documentContentType = (file: File) => { if (["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return file.type; const name = file.name.toLowerCase(); if (name.endsWith(".pdf")) return "application/pdf"; if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"; if (name.endsWith(".png")) return "image/png"; return null; };
const isAllowedDocument = (file: File | undefined) => Boolean(file && file.size <= 10 * 1024 * 1024 && documentContentType(file));

const loadLogo = () => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = "/pss-logo.png"; });
const pdfAscii = (value: string) => new TextEncoder().encode(value);
const concatBytes = (chunks: Uint8Array[]) => { const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0)); let offset = 0; chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.length; }); return result; };
const jpegBytes = (dataUrl: string) => { const base64 = dataUrl.split(",")[1]; const binary = atob(base64); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; };
const pdfFromJpegs = (pages: { bytes: Uint8Array; width: number; height: number }[]) => {
  const objects: Uint8Array[] = []; const pageObjectIds: number[] = []; const imageObjectIds: number[] = []; const contentObjectIds: number[] = [];
  objects.push(pdfAscii("<< /Type /Catalog /Pages 2 0 R >>")); objects.push(pdfAscii(""));
  pages.forEach(() => { pageObjectIds.push(objects.length + 1); objects.push(pdfAscii("")); contentObjectIds.push(objects.length + 1); objects.push(pdfAscii("")); imageObjectIds.push(objects.length + 1); objects.push(pdfAscii("")); });
  const pageKids = pageObjectIds.map((id) => `${id} 0 R`).join(" "); objects[1] = pdfAscii(`<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => { const imageId = imageObjectIds[index]; const contentId = contentObjectIds[index]; const content = "q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n"; objects[pageObjectIds[index] - 1] = pdfAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`); objects[contentId - 1] = pdfAscii(`<< /Length ${content.length} >>\nstream\n${content}endstream`); objects[imageId - 1] = concatBytes([pdfAscii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`), page.bytes, pdfAscii("\nendstream")]); });
  const chunks = [pdfAscii("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n")]; const offsets: number[] = [0]; let length = chunks[0].length; objects.forEach((object, index) => { offsets.push(length); const chunk = concatBytes([pdfAscii(`${index + 1} 0 obj\n`), object, pdfAscii("\nendobj\n")]); chunks.push(chunk); length += chunk.length; }); const xrefOffset = length; const xref = [pdfAscii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`), ...offsets.slice(1).map((offset) => pdfAscii(`${String(offset).padStart(10, "0")} 00000 n \n`)), pdfAscii(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)]; return concatBytes([...chunks, ...xref]);
};
const createChallanPdf = async (challans: ChallanData[]) => {
  const logo = await loadLogo(); const pages = challans.map((challan) => { const canvas = document.createElement("canvas"); canvas.width = 1275; canvas.height = 1650; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable"); const navy = "#172033"; const blue = "#2563eb"; const grey = "#64748b"; const line = "#d7dee8"; const senderCompany = challan.seller || challan.from || "Sender company"; const clientCompany = challan.buyer || challan.to || "Client company"; const text = (value: string, x: number, y: number, size = 22, color = navy, weight = "400") => { ctx.font = `${weight} ${size}px Arial`; ctx.fillStyle = color; ctx.fillText(value || "-", x, y); }; const wrap = (value: string, x: number, y: number, max: number, size = 20) => { const words = (value || "-").split(" "); let current = ""; words.forEach((word) => { const next = current ? `${current} ${word}` : word; if (ctx.measureText(next).width > max && current) { text(current, x, y, size); y += size + 8; current = word; } else current = next; }); text(current, x, y, size); }; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(logo, 60, 45, 250, 125); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 190); ctx.lineTo(1215, 190); ctx.stroke(); text("DELIVERY CHALLAN", 390, 135, 34, navy, "700"); text("Original for recipient", 930, 135, 16, grey, "400"); text("Challan no.", 790, 230, 17, grey, "700"); text(challan.number || "DC-UNASSIGNED", 965, 230, 20, navy, "700"); text("Date", 790, 265, 17, grey, "700"); text(challan.date || new Date().toISOString().slice(0, 10), 965, 265, 20, navy, "700"); ctx.fillStyle = "#f3f6fa"; ctx.fillRect(60, 315, 1155, 52); text("CONSIGNOR", 85, 348, 16, blue, "700"); text("CONSIGNEE", 655, 348, 16, blue, "700"); ctx.strokeStyle = line; ctx.strokeRect(60, 315, 1155, 205); ctx.beginPath(); ctx.moveTo(635, 315); ctx.lineTo(635, 520); ctx.stroke(); text(senderCompany, 85, 395, 22, navy, "700"); wrap(challan.from || "Address not provided", 85, 430, 490, 18); text(clientCompany, 655, 395, 22, navy, "700"); wrap(challan.to || "Address not provided", 655, 430, 490, 18); text("Shipment details", 60, 580, 22, navy, "700"); ctx.fillStyle = "#f3f6fa"; ctx.fillRect(60, 610, 1155, 48); text("Description", 85, 641, 16, grey, "700"); text("Payment", 640, 641, 16, grey, "700"); text("Value", 980, 641, 16, grey, "700"); ctx.strokeStyle = line; ctx.strokeRect(60, 610, 1155, 170); ctx.beginPath(); ctx.moveTo(625, 610); ctx.lineTo(625, 780); ctx.moveTo(950, 610); ctx.lineTo(950, 780); ctx.stroke(); text(challan.reason || "Shipment without invoice", 85, 710, 20, navy, "700"); text(challan.paymentMode || "Prepaid", 640, 710, 20, navy, "700"); text(challan.paymentMode === "COD" ? `COD ₹${challan.codAmount || "-"}` : `₹${challan.value || "-"}`, 980, 710, 20, navy, "700"); text("Transport note", 60, 850, 22, navy, "700"); ctx.fillStyle = "#f8fafc"; ctx.fillRect(60, 880, 1155, 100); wrap("This delivery challan is issued for the movement of goods and is not a tax invoice. The carrier may request supporting documentation at handover.", 85, 920, 1080, 18); text("Documentation", 60, 1050, 22, navy, "700"); text(challan.invoice ? `Invoice attached: ${challan.invoice}` : "No invoice supplied - Delivery Challan generated for transport", 85, 1090, 19, grey); text("Declaration", 60, 1190, 22, navy, "700"); wrap("I confirm that the information provided above is accurate and that the shipment is being tendered for lawful transport.", 85, 1230, 1080, 18); text("DIGITALLY SIGNED", 85, 1340, 16, blue, "700"); text("PSS Logistics document workflow", 85, 1368, 15, grey); ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(85, 1440); ctx.lineTo(410, 1440); ctx.moveTo(865, 1440); ctx.lineTo(1190, 1440); ctx.stroke(); text(senderCompany, 85, 1475, 17, navy, "700"); text("Sender / consignor company", 85, 1502, 15, grey); text(clientCompany, 865, 1475, 17, navy, "700"); text("Client / consignee company", 865, 1502, 15, grey); ctx.globalAlpha = 0.12; ctx.drawImage(logo, 965, 1530, 190, 95); ctx.globalAlpha = 1; text("PSS Logistics · Direct to every direction", 60, 1630, 15, grey); return { bytes: jpegBytes(canvas.toDataURL("image/jpeg", 0.92)), width: canvas.width, height: canvas.height }; }); const pdf = pdfFromJpegs(pages); downloadBinary(challans.length > 1 ? "pss-delivery-challans.pdf" : `${challans[0]?.number || "delivery-challan"}.pdf`, pdf, "application/pdf"); };

const downloadBinary = (name: string, bytes: Uint8Array, type: string) => {
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
};

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
};
const zipStore = (files: { name: string; content: string }[]) => {
  const encoder = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const put16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const put32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  files.forEach(({ name, content }) => { const nameBytes = encoder.encode(name); const data = encoder.encode(content); const local = new Uint8Array(30 + nameBytes.length + data.length); const view = new DataView(local.buffer); put32(view, 0, 0x04034b50); put16(view, 4, 20); put16(view, 6, 0); put16(view, 8, 0); put32(view, 14, crc32(data)); put32(view, 18, data.length); put32(view, 22, data.length); put16(view, 26, nameBytes.length); put16(view, 28, 0); local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); parts.push(local); const directory = new Uint8Array(46 + nameBytes.length); const directoryView = new DataView(directory.buffer); put32(directoryView, 0, 0x02014b50); put16(directoryView, 4, 20); put16(directoryView, 6, 20); put16(directoryView, 8, 0); put16(directoryView, 10, 0); put32(directoryView, 16, crc32(data)); put32(directoryView, 20, data.length); put32(directoryView, 24, data.length); put16(directoryView, 28, nameBytes.length); put16(directoryView, 30, 0); put16(directoryView, 32, 0); put16(directoryView, 34, 0); put16(directoryView, 36, 0); put32(directoryView, 38, 0); put32(directoryView, 42, offset); directory.set(nameBytes, 46); central.push(directory); offset += local.length; });
  const centralSize = central.reduce((sum, item) => sum + item.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer); put32(endView, 0, 0x06054b50); put16(endView, 8, files.length); put16(endView, 10, files.length); put32(endView, 12, centralSize); put32(endView, 16, offset); const all = new Uint8Array(offset + centralSize + 22); let cursor = 0; [...parts, ...central, end].forEach((part) => { all.set(part, cursor); cursor += part.length; }); return all;
};
const xmlEscape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const downloadBulkTemplate = () => {
  const sample: string[] = [];
  const rowXml = (values: string[], row: number) => `<row r="${row}">${values.map((value, index) => `<c r="${String.fromCharCode(65 + index)}${row}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join("")}</row>`;
  const workbook = zipStore([{ name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` }, { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` }, { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Shipments" sheetId="1" r:id="rId1"/></sheets></workbook>` }, { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` }, { name: "xl/worksheets/sheet1.xml", content: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml(bulkHeaders, 1)}${rowXml(sample, 2)}</sheetData></worksheet>` }]);
  downloadBinary("pss-bulk-shipment-template.xlsx", workbook, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
};

const parseXlsx = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer()); const decoder = new TextDecoder(); const entries: Record<string, string> = {}; let offset = 0;
  while (offset + 30 < bytes.length) { const view = new DataView(bytes.buffer, bytes.byteOffset + offset); if (view.getUint32(0, true) !== 0x04034b50) break; const method = view.getUint16(8, true); const compressedSize = view.getUint32(18, true); const nameLength = view.getUint16(26, true); const extraLength = view.getUint16(28, true); const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength)); const data = bytes.slice(offset + 30 + nameLength + extraLength, offset + 30 + nameLength + extraLength + compressedSize); let content = data; if (method === 8) { const stream = new Blob([data.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw")); content = new Uint8Array(await new Response(stream).arrayBuffer()); } entries[name] = decoder.decode(content); offset += 30 + nameLength + extraLength + compressedSize; }
  const sharedXml = new DOMParser().parseFromString(entries["xl/sharedStrings.xml"] || "", "application/xml"); const sharedStrings = [...sharedXml.getElementsByTagName("si")].map((item) => [...item.getElementsByTagName("t")].map((part) => part.textContent || "").join("")); const xml = new DOMParser().parseFromString(entries["xl/worksheets/sheet1.xml"] || "", "application/xml"); const rows = [...xml.getElementsByTagName("row")].map((row) => { const values: string[] = []; [...row.getElementsByTagName("c")].forEach((cell) => { const ref = cell.getAttribute("r") || "A1"; const column = ref.match(/[A-Z]+/)?.[0] || "A"; const index = [...column].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1; const raw = cell.getElementsByTagName("v")[0]?.textContent || cell.getElementsByTagName("t")[0]?.textContent || ""; values[index] = cell.getAttribute("t") === "s" ? sharedStrings[Number(raw)] || "" : raw; }); return values.map((value) => value || ""); }); return makeBulkRows(rows);
};

const update = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T, value: string) =>
  setter((current) => ({ ...current, [key]: value }));

const normalizePhone = (value: string) => { let digits = value.replace(/\D/g, "").replace(/^0+/, ""); if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2); return digits.slice(0, 10); };
const validPhone = (value: string) => /^[6-9]\d{9}$/.test(value);

function PartyFieldsCompact({ title, tone, address, setAddress, person, setPerson, pinStatus, onPincodeChange, savedPickups, selectedSavedPickupId, onSelectSaved, onSave, savedName, isRenaming, onSavedNameChange, onRename, onStartRename, onCancelRename, onDelete }: { title: string; tone: string; address: Address; setAddress: React.Dispatch<React.SetStateAction<Address>>; person: Contact; setPerson: React.Dispatch<React.SetStateAction<Contact>>; pinStatus: { state: PinStatus; message: string }; onPincodeChange: (value: string) => void; savedPickups: SavedPickup[]; selectedSavedPickupId: string; onSelectSaved: (id: string) => void; onSave: () => void; savedName: string; isRenaming: boolean; onSavedNameChange: (value: string) => void; onRename: () => void; onStartRename: () => void; onCancelRename: () => void; onDelete: () => void }) {
  const phoneInvalid = person.phone.length > 0 && !validPhone(person.phone);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}><UserRound className="h-3.5 w-3.5" /></span><h2 className="text-sm font-semibold">{title}</h2></div><Dropdown label="Reuse saved" value={selectedSavedPickupId} options={savedPickups.map((saved) => ({ value: saved.id, label: saved.name }))} onChange={onSelectSaved} className="w-52" /></div><input required className={field} placeholder="Name" value={person.name} onChange={(event) => update(setPerson, "name", event.target.value)} /><div className="grid grid-cols-2 gap-2"><div><input required type="tel" inputMode="numeric" maxLength={10} aria-invalid={phoneInvalid} className={`${field} ${phoneInvalid ? "border-destructive focus:border-destructive focus:ring-destructive/10" : ""}`} placeholder="Phone" value={person.phone} onChange={(event) => update(setPerson, "phone", normalizePhone(event.target.value))} onBlur={(event) => update(setPerson, "phone", normalizePhone(event.target.value))} />{phoneInvalid && <p className="mt-1 text-[11px] text-destructive">Use a valid 10-digit mobile number.</p>}</div><input type="email" className={field} placeholder="Email" value={person.email} onChange={(event) => update(setPerson, "email", event.target.value.trim())} /></div><input required className={field} placeholder="Address" value={address.line} onChange={(event) => update(setAddress, "line", event.target.value)} /><div className="grid grid-cols-2 gap-2"><input required className={field} placeholder="City" value={address.city} onChange={(event) => update(setAddress, "city", event.target.value)} /><input required className={field} placeholder="State" value={address.state} onChange={(event) => update(setAddress, "state", event.target.value)} /></div><div className="grid grid-cols-2 gap-2"><div><input required inputMode="numeric" maxLength={6} className={field} placeholder="PIN code" value={address.pincode} onChange={(event) => onPincodeChange(event.target.value)} />{pinStatus.state === "loading" && <p className="mt-1 text-[11px] text-muted-foreground">Finding city and state…</p>}{pinStatus.state === "success" && <p className="mt-1 text-[11px] text-emerald-600">City and state updated</p>}{pinStatus.state === "error" && <p className="mt-1 text-[11px] text-destructive">{pinStatus.message}</p>}</div><input required className={field} placeholder="Country" value={address.country} onChange={(event) => update(setAddress, "country", event.target.value)} /></div><div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">{<button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"><Save className="h-3.5 w-3.5" /> Save this {title.toLowerCase()} address</button>}{selectedSavedPickupId && (isRenaming ? <><input autoFocus className="h-7 min-w-36 flex-1 rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary" value={savedName} onChange={(event) => onSavedNameChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onRename(); if (event.key === "Escape") onCancelRename(); }} /><button type="button" onClick={onRename} className="font-medium text-primary hover:underline">Save name</button></> : <><span className="text-muted-foreground">Saved as <span className="font-medium text-foreground">{savedName}</span></span><button type="button" onClick={onStartRename} className="font-medium text-primary hover:underline">Rename</button><button type="button" onClick={onDelete} className="font-medium text-destructive hover:underline">Delete</button></>)}</div></section>;
}

export default function ShipmentBooking() {
  const [pickup, setPickup] = useState<Address>(emptyAddress);
  const [delivery, setDelivery] = useState<Address>(emptyAddress);
  const [pickupPerson, setPickupPerson] = useState<Contact>(emptyContact);
  const [deliveryPerson, setDeliveryPerson] = useState<Contact>(emptyContact);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails>({ description: "", weight: "", pieces: "", value: "" });
  const [boxDimensions, setBoxDimensions] = useState<BoxDimension[]>([{ length: "", width: "", height: "", boxCount: "" }]);
  const [ewayBill, setEwayBill] = useState<File | null>(null);
  const [pickupPinStatus, setPickupPinStatus] = useState<{ state: PinStatus; message: string }>({ state: "idle", message: "" });
  const [deliveryPinStatus, setDeliveryPinStatus] = useState<{ state: PinStatus; message: string }>({ state: "idle", message: "" });
  const [documentMode, setDocumentMode] = useState<"invoice" | "dc">("invoice");
  const [invoices, setInvoices] = useState<File[]>([]);
  const [dcOpen, setDcOpen] = useState(false);
  const [savedPickups, setSavedPickups] = useState<SavedPickup[]>([]);
  const [selectedSavedPickupId, setSelectedSavedPickupId] = useState("");
  const [savedName, setSavedName] = useState("");
  const [isRenamingSaved, setIsRenamingSaved] = useState(false);
  const [savedConsignees, setSavedConsignees] = useState<SavedPickup[]>([]);
  const [selectedSavedConsigneeId, setSelectedSavedConsigneeId] = useState("");
  const [savedConsigneeName, setSavedConsigneeName] = useState("");
  const [isRenamingConsignee, setIsRenamingConsignee] = useState(false);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: ConfirmationToastTone } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<"consignor" | "consignee" | null>(null);
  const [dc, setDc] = useState({ number: "", date: "", seller: "", buyer: "", value: "", reason: "" });
  const [showReview, setShowReview] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [singleAttemptId, setSingleAttemptId] = useState("");
  const [singleSubmitting, setSingleSubmitting] = useState(false);
  const [providerAvailability, setProviderAvailability] = useState<Record<string, boolean>>({});
  const [accountPolicies, setAccountPolicies] = useState<Array<{ id: string; provider: string; account_name: string; enabled?: boolean; confidence_score?: number; priority?: number }>>([]);
  const enabledCouriers = accountPolicies.length
    ? accountPolicies.filter((account) => account.enabled !== false && providerAvailability[account.provider] === true).map((account) => ({ ...allCouriers.find((courier) => courier.provider === account.provider) ?? allCouriers[0], id: account.id, provider: account.provider, accountId: account.id, accountName: account.account_name, confidence: Number(account.confidence_score ?? 0), name: account.account_name || account.provider, service: `${account.provider} account · confidence ${Number(account.confidence_score ?? 0).toFixed(0)}%`, rate: "Rate card / live quote", priority: Number(account.priority ?? 100) }))
    : allCouriers.filter((courier) => providerAvailability[courier.provider] === true);
  const providerUnavailable = enabledCouriers.length === 0;
  const couriers = providerUnavailable ? [dispatchPendingOption] : enabledCouriers;
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);
  const [singleCompleted, setSingleCompleted] = useState(false);
  const [bookingNotice, setBookingNotice] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Prepaid");
  const [codAmount, setCodAmount] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkShipment[]>([]);
  const [showBulkReview, setShowBulkReview] = useState(false);
  const [bulkCompleted, setBulkCompleted] = useState(false);
  const [bulkAssignCourier, setBulkAssignCourier] = useState("");
  const [bulkCourierMenuOpen, setBulkCourierMenuOpen] = useState(false);
  const [bulkRowCourierMenuOpen, setBulkRowCourierMenuOpen] = useState<string | null>(null);
  const [editingBulkRow, setEditingBulkRow] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkNotice, setBulkNotice] = useState("");
  const [bulkBatchId, setBulkBatchId] = useState("");
  const [bulkResult, setBulkResult] = useState({ created: 0, failed: 0 });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const pinRequestRef = useRef({ pickup: 0, delivery: 0 });
  const pinAbortRef = useRef<{ pickup?: AbortController; delivery?: AbortController }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    pinAbortRef.current.pickup?.abort();
    pinAbortRef.current.delivery?.abort();
  }, []);

  // Reconcile the dimension editor with the persisted piece count.
  useEffect(() => {
    const count = Math.max(1, Math.floor(Number(shipmentDetails.pieces) || 1));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoxDimensions((current) => Array.from({ length: count }, (_, index) => current[index] || { length: "", width: "", height: "" }));
  }, [shipmentDetails.pieces]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([pssApi<{ data: Array<Record<string, string>> }>("/v1/warehouses"), pssApi<{ data: Array<Record<string, string>> }>("/v1/addresses")]).then(([warehouseResult, addressResult]) => { if (cancelled) return; const map = (row: Record<string, string>): SavedPickup => ({ id: row.id, name: row.name ?? row.label ?? "Saved address", address: { line: row.address ?? "", city: row.city ?? "", state: row.state ?? "", pincode: row.pincode ?? "", country: "India" }, contact: { name: row.contact_name ?? "", phone: row.phone ?? row.contact ?? "", email: "" } }); setSavedPickups(warehouseResult.data.map(map)); setSavedConsignees(addressResult.data.map(map)); }).catch((error) => { if (!cancelled) setNotice(error instanceof Error ? error.message : "Saved addresses could not be loaded from production."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void pssApi<{ data: Record<string, { enabled?: boolean }> }>("/v1/provider-capabilities").then((result) => setProviderAvailability(Object.fromEntries(Object.entries(result.data).map(([key, value]) => [key, value.enabled === true])))).catch((error) => { setProviderAvailability({}); setNotice(error instanceof Error ? error.message : "Courier capabilities could not be loaded from production."); }); }, []);

  useEffect(() => {
    if (!showReview && !showBulkReview) return;
    void pssApi<{ data: Array<{ id: string; provider: string; account_name: string; enabled?: boolean; confidence_score?: number; priority?: number }> }>("/v1/provider-account-policies")
      .then((result) => setAccountPolicies(result.data ?? []))
      .catch(() => setAccountPolicies([]));
  }, [showReview, showBulkReview]);

  useEffect(() => {
    const menu = document.querySelector('[role="listbox"]');
    const clippingParent = menu?.parentElement?.closest(".overflow-hidden") as HTMLElement | null;
    const activeRow = menu?.parentElement?.parentElement as HTMLElement | null;
    if (!clippingParent) return;
    const previousOverflow = clippingParent.style.overflow;
    const previousRowZIndex = activeRow?.style.zIndex || "";
    clippingParent.style.overflow = "visible";
    if (activeRow) activeRow.style.zIndex = "50";
    return () => { clippingParent.style.overflow = previousOverflow; if (activeRow) activeRow.style.zIndex = previousRowZIndex; };
  }, [bulkRowCourierMenuOpen]);

  const savePickup = () => {
    const saved = { id: `${Date.now()}-${savedPickups.length}`, name: [pickupPerson.name || "Pickup", pickup.city, pickup.state, pickup.pincode].filter(Boolean).join(" · "), address: pickup, contact: pickupPerson };
    void pssApi<{ data: { id: string } }>("/v1/warehouses", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: saved.name, address: pickup.line, city: pickup.city, pincode: pickup.pincode, contact: pickupPerson.phone }) }).then((result) => { const persisted = { ...saved, id: result.data.id }; const next = [...savedPickups, persisted]; setSavedPickups(next); setSelectedSavedPickupId(persisted.id); setSavedName(persisted.name); setIsRenamingSaved(false); setNotice("Pickup address saved in production"); setToast({ message: "Consignor address saved for reuse", tone: "success" }); }).catch(() => setToast({ message: "Pickup address could not be saved", tone: "error" }));
  };

  const saveConsignee = () => {
    const saved = { id: `${Date.now()}-${savedConsignees.length}`, name: [deliveryPerson.name || "Consignee", delivery.city, delivery.state, delivery.pincode].filter(Boolean).join(" · "), address: delivery, contact: deliveryPerson };
    void pssApi<{ data: { id: string } }>("/v1/addresses", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ label: saved.name, address: delivery.line, city: delivery.city, state: delivery.state, pincode: delivery.pincode, contact_name: deliveryPerson.name, phone: deliveryPerson.phone }) }).then((result) => { const persisted = { ...saved, id: result.data.id }; const next = [...savedConsignees, persisted]; setSavedConsignees(next); setSelectedSavedConsigneeId(persisted.id); setSavedConsigneeName(persisted.name); setIsRenamingConsignee(false); setNotice("Consignee address saved in production"); setToast({ message: "Consignee address saved for reuse", tone: "success" }); }).catch(() => setToast({ message: "Consignee address could not be saved", tone: "error" }));
  };

  const reuseSavedPickup = (id: string) => { const saved = savedPickups.find((item) => item.id === id); if (!saved) return; setSelectedSavedPickupId(id); setSavedName(saved.name); setPickup(saved.address); setPickupPerson(saved.contact); setPickupPinStatus({ state: "idle", message: "" }); };
  const renameSavedPickup = () => { if (!selectedSavedPickupId || !savedName.trim()) return; void pssApi(`/v1/warehouses/${selectedSavedPickupId}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: savedName.trim() }) }).then(() => { setSavedPickups((current) => current.map((saved) => saved.id === selectedSavedPickupId ? { ...saved, name: savedName.trim() } : saved)); setSavedName(savedName.trim()); setIsRenamingSaved(false); setToast({ message: "Consignor address name updated", tone: "success" }); }).catch(() => setToast({ message: "Consignor address could not be renamed", tone: "error" })); };
  const reuseSavedConsignee = (id: string) => { const saved = savedConsignees.find((item) => item.id === id); if (!saved) return; setSelectedSavedConsigneeId(id); setSavedConsigneeName(saved.name); setDelivery(saved.address); setDeliveryPerson(saved.contact); setDeliveryPinStatus({ state: "idle", message: "" }); };
  const renameSavedConsignee = () => { if (!selectedSavedConsigneeId || !savedConsigneeName.trim()) return; void pssApi(`/v1/addresses/${selectedSavedConsigneeId}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ label: savedConsigneeName.trim() }) }).then(() => { setSavedConsignees((current) => current.map((saved) => saved.id === selectedSavedConsigneeId ? { ...saved, name: savedConsigneeName.trim() } : saved)); setSavedConsigneeName(savedConsigneeName.trim()); setIsRenamingConsignee(false); setToast({ message: "Consignee address name updated", tone: "success" }); }).catch(() => setToast({ message: "Consignee address could not be renamed", tone: "error" })); };
  const deleteSavedPickup = () => setPendingDelete("consignor");
  const deleteSavedConsignee = () => setPendingDelete("consignee");
  const confirmDelete = () => {
    if (pendingDelete === "consignor" && selectedSavedPickupId) { void pssApi(`/v1/warehouses/${selectedSavedPickupId}`, { method: "DELETE", headers: { "Idempotency-Key": crypto.randomUUID() } }).then(() => { setSavedPickups((current) => current.filter((saved) => saved.id !== selectedSavedPickupId)); setSelectedSavedPickupId(""); setSavedName(""); setIsRenamingSaved(false); setToast({ message: "Saved consignor address deleted", tone: "success" }); }).catch(() => setToast({ message: "Saved consignor address could not be deleted", tone: "error" })); }
    if (pendingDelete === "consignee" && selectedSavedConsigneeId) { void pssApi(`/v1/addresses/${selectedSavedConsigneeId}`, { method: "DELETE", headers: { "Idempotency-Key": crypto.randomUUID() } }).then(() => { setSavedConsignees((current) => current.filter((saved) => saved.id !== selectedSavedConsigneeId)); setSelectedSavedConsigneeId(""); setSavedConsigneeName(""); setIsRenamingConsignee(false); setToast({ message: "Saved consignee address deleted", tone: "success" }); }).catch(() => setToast({ message: "Saved consignee address could not be deleted", tone: "error" })); }
    setPendingDelete(null);
  };

  const lookupPincode = async (kind: "pickup" | "delivery", rawValue: string) => {
    const value = rawValue.replace(/\D/g, "").slice(0, 6);
    const setAddress = kind === "pickup" ? setPickup : setDelivery;
    const setStatus = kind === "pickup" ? setPickupPinStatus : setDeliveryPinStatus;
    const requestId = ++pinRequestRef.current[kind];
    pinAbortRef.current[kind]?.abort();
    const controller = new AbortController();
    pinAbortRef.current[kind] = controller;
    setAddress((current) => ({ ...current, pincode: value }));
    if (value.length < 6) { setStatus({ state: "idle", message: "" }); return; }
    setStatus({ state: "loading", message: "" });
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${value}`, { signal: controller.signal });
      const result = await response.json();
      if (requestId !== pinRequestRef.current[kind]) return;
      const office = result?.[0]?.Status === "Success" ? result[0].PostOffice?.[0] : null;
      if (!office) throw new Error("PIN code not found");
      setAddress((current) => ({ ...current, city: office.District || office.Name || "", state: office.State || "" }));
      setStatus({ state: "success", message: "" });
    } catch {
      if (controller.signal.aborted || requestId !== pinRequestRef.current[kind]) return;
      setStatus({ state: "error", message: "PIN code could not be verified" });
    }
  };

  const downloadDc = () => {
    void createChallanPdf([{ ...dc, paymentMode, codAmount, from: pickup.line, to: delivery.line }]).then(() => { setDcOpen(false); setNotice("Delivery Challan PDF created and downloaded"); }).catch(() => setNotice("Unable to create the Delivery Challan PDF"));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (documentMode === "invoice" && !invoices.length) {
      setNotice("Upload an invoice or switch to Delivery Challan");
      return;
    }
    if (paymentMode === "COD" && (!codAmount || Number(codAmount) <= 0)) {
      setNotice("Enter a valid amount to collect for COD");
      return;
    }
    if (!validPhone(pickupPerson.phone) || !validPhone(deliveryPerson.phone)) {
      setNotice("Enter valid 10-digit mobile numbers for the Consignor and Consignee");
      return;
    }
    if (pickupPinStatus.state === "error" || deliveryPinStatus.state === "error") {
      setNotice("Check the PIN codes before continuing");
      return;
    }
    if (!shipmentDetails.description || Number(shipmentDetails.weight) <= 0 || Number(shipmentDetails.pieces) < 1) {
      setNotice("Complete the shipment description, weight, and pieces");
      return;
    }
    if (!shipmentDetails.value || Number(shipmentDetails.value) <= 0) {
      setNotice("Enter the shipment value in INR");
      return;
    }
    if (Number(shipmentDetails.value) >= EWAY_THRESHOLD && !ewayBill) {
      setNotice("An E-Way bill is compulsory at or above ₹50,000");
      return;
    }
    const count = Number(shipmentDetails.pieces);
    const dimensions = boxDimensions;
    const dimensionBoxes = dimensions.reduce((sum, item) => sum + Number(item.boxCount), 0);
    if (!Number.isInteger(count) || count < 1 || dimensions.some((item) => Number(item.length) <= 0 || Number(item.width) <= 0 || Number(item.height) <= 0 || !Number.isInteger(Number(item.boxCount)) || Number(item.boxCount) < 1)) {
      setNotice("Enter positive dimensions and a whole box count for every row");
      return;
    }
    if (dimensionBoxes !== count) {
      setNotice(`Dimension rows describe ${dimensionBoxes} boxes; Pieces / boxes must be ${count}`);
      return;
    }
    setNotice("");
    setShowReview(true);
  };

  const parseBulkFile = async () => {
    if (!bulkFile) { setBulkNotice("Choose a .csv or .xlsx file first"); return; }
    setBulkBatchId(crypto.randomUUID());
    const text = await bulkFile.text();
    if (bulkFile.name.toLowerCase().endsWith(".csv")) {
      const parsed = makeBulkRows(csvRows(text));
      setBulkRows(parsed); setBulkNotice(`${parsed.length} unique shipment${parsed.length === 1 ? "" : "s"} ready for review`); return;
    }
    try {
      const parsed = await parseXlsx(bulkFile);
      setBulkRows(parsed); setBulkNotice(`${parsed.length} unique shipment${parsed.length === 1 ? "" : "s"} ready for review`);
    } catch {
      setBulkNotice("This XLSX could not be read. Please check the template columns and try again.");
    }
  };

  const downloadFailedRows = () => {
    const failed = bulkRows.filter((row) => row.errors.length);
    const lines = [bulkHeaders.join(","), ...failed.map((row) => [row.from, row.to, row.originPincode, row.destinationPincode, row.consignor, row.consignee, row.consignorPhone, row.consigneePhone, row.description, row.weight, row.pieces, row.shipmentValue, row.invoiceAvailable ? "yes" : "no", row.paymentMode, row.codAmount, row.ewayBillAvailable || row.ewayBill ? "yes" : "no", row.dcNumber, row.dcDate, row.dcSeller, row.dcBuyer, row.dcValue, row.dcReason, row.errors.join(" | ")].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))];
    downloadText("pss-failed-shipments.csv", lines.join("\n"), "text/csv");
  };

  const downloadBulkDcs = () => {
    const dcs = bulkRows.filter((row) => !row.invoiceAvailable && !row.errors.length).map((row) => ({ number: row.dcNumber || row.id, date: row.dcDate || new Date().toISOString().slice(0, 10), seller: row.dcSeller || row.from, buyer: row.dcBuyer || row.to, value: row.dcValue || row.shipmentValue, reason: row.dcReason || "Shipment without invoice", from: row.from, to: row.to, paymentMode: row.paymentMode, codAmount: row.codAmount }));
    if (dcs.length) void createChallanPdf(dcs).catch(() => setBulkNotice("Unable to create the bulk Delivery Challan PDF"));
  };

  const confirmSingle = async () => { if (singleSubmitting || !selectedCourier || !selectedSlot) return; setSingleSubmitting(true); const courier = couriers.find((item) => item.id === selectedCourier) || couriers[0]; const idempotencyKey = singleAttemptId || crypto.randomUUID(); setSingleAttemptId(idempotencyKey); const date = new Date().toISOString().slice(0, 10); const declaredWeight = Number(shipmentDetails.weight) || 1; const originAddress = { ...pickup, name: pickupPerson.name, phone: pickupPerson.phone }; const destinationAddress = { ...delivery, name: deliveryPerson.name, phone: deliveryPerson.phone }; setBookingNotice("Saving booking securely…"); try { const result = await pssApi<{ data: { id: string; status: string; provider_result?: { status?: string } } }>("/v1/shipments", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ description: shipmentDetails.description, total_weight_kg: declaredWeight, declared_value: Number(shipmentDetails.value) || 0, pieces: Number(shipmentDetails.pieces) || 1, origin: `${pickup.city}, ${pickup.state}`, destination: `${delivery.city}, ${delivery.state}`, origin_address: originAddress, destination_address: destinationAddress, consignee: deliveryPerson.name, provider: courier.provider === "delhivery" || courier.provider === "trackon" || courier.provider === "xpressbees" ? courier.provider : undefined, provider_account_id: courier.accountId || undefined, edd: selectedCourier === "dispatch_pending" ? undefined : courier.eta }) }); const serverId = result.data.id; if (invoices.length) { await Promise.all(invoices.map(async (file) => { const contentType = documentContentType(file); if (!contentType) throw new Error(`Unsupported invoice format: ${file.name}`); return pssApi("/v1/documents", { method: "POST", headers: { "Idempotency-Key": `${idempotencyKey}-document-${file.name}` }, body: JSON.stringify({ shipment_id: serverId, name: file.name, content_type: contentType, body_base64: await fileAsBase64(file) }) }); })); } await pssApi("/v1/pickups", { method: "POST", headers: { "Idempotency-Key": `${idempotencyKey}-pickup` }, body: JSON.stringify({ shipment_id: serverId, scheduled_date: date, window: selectedSlot, location: pickup.line || `${pickup.city}, ${pickup.state}`, notes: "Created from shipment booking" }) }); setSingleCompleted(true); setBookingNotice(result.data.provider_result?.status === "accepted" ? "Booking saved and sent to the courier." : "Booking saved to production. Courier dispatch is pending configuration."); } catch (error) { setBookingNotice(error instanceof Error ? error.message : "Unable to save booking."); } finally { setSingleSubmitting(false); } };
  const confirmBulkProduction = async () => {
    const validRows = bulkRows.filter((row) => !row.errors.length);
    if (bulkSubmitting || !validRows.length || validRows.some((row) => !row.courier || (row.invoiceAvailable && !row.invoice))) return;
    setBulkSubmitting(true);
    const batchId = bulkBatchId || crypto.randomUUID();
    setBulkBatchId(batchId);
    setBookingNotice("Saving bulk bookings securely…");
    try {
      const results = await Promise.allSettled(validRows.map(async (row) => {
        const selectedCourier = couriers.find((courier) => courier.id === row.courier);
        const shipment = await pssApi<{ data: { id: string } }>("/v1/shipments", {
          method: "POST",
          headers: { "Idempotency-Key": `${batchId}-${row.id}-shipment` },
          body: JSON.stringify({
            description: row.description || row.consignor || row.from,
            origin: row.from,
            destination: row.to,
            origin_address: { name: row.consignor || row.from, phone: row.consignorPhone, line: row.from, city: row.originCity, state: row.originState, pincode: row.originPincode, country: "India" },
            destination_address: { name: row.consignee || row.to, phone: row.consigneePhone, line: row.to, city: row.destinationCity, state: row.destinationState, pincode: row.destinationPincode, country: "India" },
            consignee: row.consignee || row.to,
            total_weight_kg: Number(row.weight) || 1,
            pieces: Number(row.pieces) || 1,
            declared_value: Number(row.shipmentValue) || 0,
            provider: selectedCourier?.provider || undefined,
            provider_account_id: selectedCourier?.accountId || undefined,
          }),
        });
        if (row.invoice) {
          const contentType = documentContentType(row.invoice);
          if (!contentType) throw new Error(`Unsupported invoice format: ${row.invoice.name}`);
          await pssApi("/v1/documents", { method: "POST", headers: { "Idempotency-Key": `${batchId}-${row.id}-invoice` }, body: JSON.stringify({ shipment_id: shipment.data.id, name: row.invoice.name, content_type: contentType, body_base64: await fileAsBase64(row.invoice) }) });
        }
        return shipment;
      }));
      const created = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - created;
      setBulkResult({ created, failed });
      setBulkCompleted(true);
      setBookingNotice(failed ? `${created} production booking${created === 1 ? " was" : "s were"} created; ${failed} row${failed === 1 ? " needs" : "s need"} retrying.` : `${created} production bookings were created with attached invoices uploaded.`);
    } finally {
      setBulkSubmitting(false);
    }
  };
  const resetBooking = () => { setPickup(emptyAddress); setDelivery(emptyAddress); setPickupPerson(emptyContact); setDeliveryPerson(emptyContact); setShipmentDetails({ description: "", weight: "", pieces: "", value: "" }); setInvoices([]); setBoxDimensions([{ length: "", width: "", height: "", boxCount: "" }]); setEwayBill(null); setDocumentMode("invoice"); setPaymentMode("Prepaid"); setCodAmount(""); setSelectedCourier(null); setSelectedSlot(null); setSingleAttemptId(""); setSingleSubmitting(false); setShowReview(false); setSingleCompleted(false); setBookingNotice(""); setNotice(""); };
  const milestoneStep = showReview ? 4 : selectedCourier && selectedSlot ? 3 : invoices.length || documentMode === "dc" ? 2 : 1;
  const milestones = ["Shipment details", "Documentation", "Courier & slot", "Review"];

  if (singleCompleted) {
    return <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center space-y-5 py-20 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Check className="h-7 w-7" /></span><div><h1 className="text-2xl font-semibold tracking-tight">Booking confirmed</h1><p className="mt-2 text-sm text-muted-foreground">The shipment was saved to the production operations API.</p></div><div className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-xs"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Courier</span><span className="font-semibold">{couriers.find((courier) => courier.id === selectedCourier)?.name}</span></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Pickup slot</span><span className="font-semibold">{selectedSlot}</span></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Price</span><span className="font-semibold">Provider quote pending</span></div></div><p role="status" className="text-xs text-primary">{bookingNotice}</p><button type="button" onClick={resetBooking} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Package className="h-4 w-4" /> Book another shipment</button></div>;
  }

if (bulkCompleted) return <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center space-y-5 py-20 text-center"><span className={`flex h-14 w-14 items-center justify-center rounded-full ${bulkResult.failed ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>{bulkResult.failed ? <TriangleAlert className="h-7 w-7" /> : <Check className="h-7 w-7" />}</span><div><h1 className="text-2xl font-semibold tracking-tight">{bulkResult.failed ? "Bulk booking needs attention" : "Bulk bookings confirmed"}</h1><p className="mt-2 text-sm text-muted-foreground">{bulkResult.created} booking{bulkResult.created === 1 ? "" : "s"} persisted through the production API; {bulkResult.failed} failed row{bulkResult.failed === 1 ? "" : "s"} can be retried safely.</p></div><p role="status" className="text-xs text-primary">{bookingNotice}</p><button type="button" onClick={() => { setBulkCompleted(false); setBulkSubmitting(false); setShowBulkReview(false); setBulkRows([]); setBulkFile(null); setBulkBatchId(""); setBulkResult({ created: 0, failed: 0 }); setBulkNotice(""); setBookingNotice(""); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="h-4 w-4" /> Upload another file</button></div>;

  if (showBulkReview) {
    const failedCount = bulkRows.filter((row) => row.errors.length).length;
    const readyRows = bulkRows.filter((row) => !row.errors.length);
    return (
      <div className="w-full space-y-6 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><button type="button" onClick={() => setShowBulkReview(false)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Back to upload</button><h1 className="text-2xl font-semibold tracking-tight">Review bulk shipments</h1><p className="mt-1 text-sm text-muted-foreground">Assign a courier to each unique from → to pair.</p></div><button type="button" onClick={downloadBulkDcs} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:bg-accent"><Download className="h-3.5 w-3.5" /> Download all DCs</button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-border bg-card p-3 shadow-xs"><p className="text-xs text-muted-foreground">Total unique</p><p className="mt-1 text-xl font-semibold">{bulkRows.length}</p></div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-xs text-emerald-700 dark:text-emerald-300">Ready</p><p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{readyRows.length}</p></div><div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3"><p className="text-xs text-destructive">Failed</p><p className="mt-1 text-xl font-semibold text-destructive">{failedCount}</p></div><div className="rounded-xl border border-border bg-card p-3 shadow-xs"><p className="text-xs text-muted-foreground">Needs attention</p><p className="mt-1 text-xl font-semibold">{readyRows.filter((row) => !row.courier || (row.invoiceAvailable && !row.invoice)).length}</p></div></div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Assign courier in bulk</p><p className="mt-1 text-xs text-muted-foreground">Apply one provider or dispatch-pending state to all valid shipments. Prices are shown only after a verified provider quote.</p></div><div className="relative w-full sm:w-72"><button type="button" aria-haspopup="listbox" aria-expanded={bulkCourierMenuOpen} onClick={() => setBulkCourierMenuOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"><span className={bulkAssignCourier ? "text-foreground" : "text-muted-foreground"}>{bulkAssignCourier ? `${couriers.find((courier) => courier.id === bulkAssignCourier)?.name} · live quote required` : "Select courier for all valid"}</span><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${bulkCourierMenuOpen ? "rotate-180" : ""}`} /></button>{bulkCourierMenuOpen && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"><button type="button" onClick={() => { setBulkAssignCourier(""); setBulkCourierMenuOpen(false); }} className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${!bulkAssignCourier ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>Select courier for all valid</button>{couriers.map((courier) => <button type="button" role="option" aria-selected={bulkAssignCourier === courier.id} key={courier.id} onClick={() => { setBulkAssignCourier(courier.id); setBulkCourierMenuOpen(false); setBulkRows((current) => current.map((row) => row.errors.length ? row : { ...row, courier: courier.id })); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${bulkAssignCourier === courier.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-accent"}`}><span>{courier.name}</span><span className="text-xs text-muted-foreground">Live quote required</span></button>)}</div>}</div></div>
        {failedCount > 0 && <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-destructive">{failedCount} booking{failedCount === 1 ? "" : "s"} failed validation</p><p className="mt-1 text-xs text-muted-foreground">These rows cannot be assigned because one or more required fields are invalid. Provider serviceability is checked by the production API when enabled.</p></div><button type="button" onClick={downloadFailedRows} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-background px-3 text-xs font-semibold text-destructive hover:bg-destructive/5"><Download className="h-3.5 w-3.5" /> Download failed rows</button></div>}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"><div className="hidden grid-cols-[1.3fr_1.3fr_1fr_180px] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid"><span>From</span><span>To</span><span>Payment</span><span>Courier</span></div><div className="divide-y divide-border">{bulkRows.map((row) => <div key={row.id} className={`grid gap-3 px-4 py-4 md:grid-cols-[1.3fr_1.3fr_1fr_180px] md:items-center ${row.errors.length ? "bg-destructive/3" : ""}`}><div><p className="text-sm font-semibold">{row.from || "Missing from address"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">PIN {row.originPincode || "—"}</p></div><div><p className="text-sm font-semibold">{row.to || "Missing to address"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">PIN {row.destinationPincode || "—"}</p></div><div><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${row.paymentMode === "COD" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{row.paymentMode}{row.paymentMode === "COD" && ` · ₹${row.codAmount}`}</span>{!row.invoiceAvailable && <p className="mt-2 text-[11px] text-violet-600">DC will be generated automatically</p>}</div><div>{row.errors.length ? <div><span className="inline-flex rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">Failed</span><p className="mt-2 text-[11px] leading-4 text-destructive">{row.errors.join(" · ")}</p></div> : <div className="relative"><button type="button" aria-label={`Courier for ${row.from} to ${row.to}`} aria-expanded={bulkRowCourierMenuOpen === row.id} onClick={() => setBulkRowCourierMenuOpen((open) => open === row.id ? null : row.id)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"><span className={row.courier ? "text-foreground" : "text-muted-foreground"}>{row.courier ? couriers.find((courier) => courier.id === row.courier)?.name : "Select courier"}</span><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${bulkRowCourierMenuOpen === row.id ? "rotate-180" : ""}`} /></button>{bulkRowCourierMenuOpen === row.id && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 w-full min-w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"><button type="button" onClick={() => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, courier: "" } : item)); setBulkRowCourierMenuOpen(null); }} className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${!row.courier ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>Select courier</button>{couriers.map((courier) => <button type="button" role="option" aria-selected={row.courier === courier.id} key={courier.id} onClick={() => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, courier: courier.id } : item)); setBulkRowCourierMenuOpen(null); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${row.courier === courier.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-accent"}`}><span>{courier.name}</span><span className="text-xs text-muted-foreground">{courier.rate}</span></button>)}</div>}</div>}{!row.errors.length && row.invoiceAvailable && <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-primary"><Upload className="h-3 w-3" />{row.invoice ? row.invoice.name : "Upload invoice"}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, invoice: event.target.files?.[0] || null } : item))} /></label>}</div></div>)}</div></div>
        {editingBulkRow && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setEditingBulkRow(null)}><div className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Edit shipment row</h2><p className="mt-1 text-xs text-muted-foreground">Correct the row, then validate it again before assigning a courier.</p></div><button type="button" aria-label="Close row editor" onClick={() => setEditingBulkRow(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button></div>{(() => { const row = bulkRows.find((item) => item.id === editingBulkRow); if (!row) return null; const setRow = (key: keyof BulkShipment, value: string) => setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, [key]: value } : item)); return <div className="mt-4 grid grid-cols-2 gap-3"><input className={field} placeholder="From" value={row.from} onChange={(event) => setRow("from", event.target.value)} /><input className={field} placeholder="To" value={row.to} onChange={(event) => setRow("to", event.target.value)} /><input className={field} placeholder="Origin PIN" value={row.originPincode} onChange={(event) => setRow("originPincode", event.target.value)} /><input className={field} placeholder="Destination PIN" value={row.destinationPincode} onChange={(event) => setRow("destinationPincode", event.target.value)} /><input className={`${field} col-span-2`} placeholder="Description" value={row.description} onChange={(event) => setRow("description", event.target.value)} /><input className={field} placeholder="Weight (kg)" value={row.weight} onChange={(event) => setRow("weight", event.target.value)} /><input className={field} placeholder="Pieces" value={row.pieces} onChange={(event) => setRow("pieces", event.target.value)} /><div className="col-span-2 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setEditingBulkRow(null)} className="rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">Done editing</button></div></div>; })()}</div></div>}
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{readyRows.length} valid shipment{readyRows.length === 1 ? "" : "s"} ready. Assign a courier and attach required invoices before confirming.</p><button type="button" onClick={() => void confirmBulkProduction()} disabled={bulkSubmitting || readyRows.length === 0 || readyRows.some((row) => !row.courier || (row.invoiceAvailable && !row.invoice))} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" /> {bulkSubmitting ? "Saving bulk bookings…" : "Confirm bulk bookings"}</button></div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="w-full space-y-6 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><button type="button" onClick={() => setShowReview(false)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Edit shipment</button><h1 className="text-2xl font-semibold tracking-tight">Choose a courier</h1><p className="mt-1 text-sm text-muted-foreground">Provider availability is live; pricing appears only after a verified quote.</p></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Production courier availability</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="font-semibold text-foreground">{pickup.city || "Pickup location"}</span><ArrowRight className="h-3.5 w-3.5 text-primary" /><span className="font-semibold text-foreground">{delivery.city || "Delivery location"}</span><span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{shipmentDetails.description} · {shipmentDetails.weight} kg · {shipmentDetails.pieces} pc · ₹{shipmentDetails.value}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${paymentMode === "COD" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{paymentMode}{paymentMode === "COD" && ` · ₹${codAmount}`}</span>{Number(shipmentDetails.value) >= EWAY_THRESHOLD && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600">E-Way bill attached</span>}<span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600">Documentation ready</span></div></div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {couriers.map((courier) => {
            const isSelected = selectedCourier === courier.id;
            return <button type="button" key={courier.id} onClick={() => { setSelectedCourier(courier.id); setSlotOpen(true); }} className={`group rounded-xl border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${isSelected ? "border-primary ring-4 ring-primary/10" : "border-border"}`}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${courier.accent}`}>{courier.name.slice(0, 2).toUpperCase()}</span><span><span className="block text-sm font-semibold text-foreground">{courier.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{courier.service}</span>{courier.accountName && <span className="mt-1 block text-[11px] text-muted-foreground">Account: {courier.accountName}</span>}</span></div><div className="text-right"><span className="block text-lg font-semibold tracking-tight text-foreground">{courier.rate}</span>{courier.accountName && <span className="mt-1 block text-[11px] font-semibold text-emerald-600">Confidence {courier.confidence.toFixed(0)}%</span>}</div></div><div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs"><span className="text-muted-foreground">Estimated delivery <span className="font-medium text-foreground">{courier.eta}</span></span><span className="font-semibold text-primary">{isSelected ? "Change slot" : "Select courier"} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span></div>{isSelected && selectedSlot && <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary">Pickup slot: {selectedSlot}</div>}</button>;
          })}
        </div>
        {providerUnavailable && <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><p className="font-semibold">Courier dispatch is pending configuration</p><p className="mt-1 text-xs leading-5">This booking will persist securely without selecting a provider. Courier choices appear only after their Worker capability checks pass.</p></div>}

        {selectedCourier && selectedSlot && <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Courier selection can be changed before final confirmation.</p><button type="button" onClick={() => void confirmSingle()} disabled={singleSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" /> {singleSubmitting ? "Saving booking…" : "Confirm production booking"}</button></div>}

        {slotOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setSlotOpen(false)}><div className="w-full max-w-md rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">Choose a pickup slot</h2></div><p className="text-xs text-muted-foreground">Select a preferred window for {couriers.find((courier) => courier.id === selectedCourier)?.name}.</p></div><button type="button" aria-label="Close" onClick={() => setSlotOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><span className="text-lg leading-none">×</span></button></div><div className="mt-4 grid gap-2">{pickupSlots.map((slot) => <button type="button" key={slot} onClick={() => { setSelectedSlot(slot); setSlotOpen(false); }} className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition hover:border-primary hover:bg-primary/5 ${selectedSlot === slot ? "border-primary bg-primary/5 font-semibold text-primary" : "border-border"}`}><span>{slot}</span>{selectedSlot === slot && <Check className="h-4 w-4" />}</button>)}</div><div className="mt-4 flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>This is a preferred pickup window. The courier will make every effort to collect within it, but the slot is not guaranteed.</span></div></div></div>}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">{milestones.map((label, index) => { const step = index + 1; return <div key={label} className="flex min-w-max items-center gap-1"><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${step < milestoneStep ? "bg-emerald-500/10 text-emerald-600" : step === milestoneStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step < milestoneStep ? <Check className="h-3 w-3" /> : step}</span><span className={`text-[11px] font-semibold ${step === milestoneStep ? "text-primary" : step < milestoneStep ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>{step < milestones.length && <span className={`mx-1 h-px w-5 ${step < milestoneStep ? "bg-emerald-500/50" : "bg-border"}`} />}</div>; })}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Documentation is required</div><button type="button" onClick={() => setBulkOpen(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"><Upload className="h-3.5 w-3.5" /> Bulk upload</button></div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><PartyFieldsCompact title="Consignor" tone="bg-amber-500/10 text-amber-600" address={pickup} setAddress={setPickup} person={pickupPerson} setPerson={setPickupPerson} pinStatus={pickupPinStatus} onPincodeChange={(value) => void lookupPincode("pickup", value)} savedPickups={savedPickups} selectedSavedPickupId={selectedSavedPickupId} onSelectSaved={reuseSavedPickup} onSave={savePickup} savedName={savedName} isRenaming={isRenamingSaved} onSavedNameChange={setSavedName} onRename={renameSavedPickup} onStartRename={() => setIsRenamingSaved(true)} onCancelRename={() => setIsRenamingSaved(false)} onDelete={deleteSavedPickup} /><PartyFieldsCompact title="Consignee" tone="bg-emerald-500/10 text-emerald-600" address={delivery} setAddress={setDelivery} person={deliveryPerson} setPerson={setDeliveryPerson} pinStatus={deliveryPinStatus} onPincodeChange={(value) => void lookupPincode("delivery", value)} savedPickups={savedConsignees} selectedSavedPickupId={selectedSavedConsigneeId} onSelectSaved={reuseSavedConsignee} onSave={saveConsignee} savedName={savedConsigneeName} isRenaming={isRenamingConsignee} onSavedNameChange={setSavedConsigneeName} onRename={renameSavedConsignee} onStartRename={() => setIsRenamingConsignee(true)} onCancelRename={() => setIsRenamingConsignee(false)} onDelete={deleteSavedConsignee} /></div>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><FileText className="h-3.5 w-3.5" /></span><div><h2 className="text-sm font-semibold">Shipment documentation</h2><p className="text-xs text-muted-foreground">An invoice or Delivery Challan is required to continue.</p></div></div>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-1"><button type="button" onClick={() => setDocumentMode("invoice")} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${documentMode === "invoice" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Upload invoice</button><button type="button" onClick={() => { setDocumentMode("dc"); setDcOpen(true); }} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${documentMode === "dc" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Create Delivery Challan</button></div>
          {documentMode === "invoice" ? <><button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/3 px-4 py-3 text-left hover:border-primary hover:bg-primary/5"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Upload className="h-4 w-4" /></span><span><span className="block text-sm font-medium">{invoices.length ? `Add invoice files (${invoices.length} attached)` : "Choose invoice files"}</span><span className="block text-xs text-muted-foreground">PDF, JPG or PNG · max 10 MB each</span></span></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></button>{invoices.length > 0 && <div className="mt-2 space-y-1.5">{invoices.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"><FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setInvoices((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="text-muted-foreground hover:text-destructive">Remove</button></div>)}</div>}</> : <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"><span className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-600" /><span><span className="block text-sm font-medium">Delivery Challan selected</span><span className="block text-xs text-muted-foreground">Open the form to edit or download it.</span></span></span><button type="button" onClick={() => setDcOpen(true)} className="text-xs font-semibold text-primary hover:underline">Edit DC</button></div>}
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); const invalid = files.find((file) => !isAllowedDocument(file)); if (invalid) { setNotice(`${invalid.name} must be a PDF, JPG, or PNG up to 10 MB`); return; } setInvoices((current) => [...current, ...files]); if (fileRef.current) fileRef.current.value = ""; }} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xs"><div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600"><Package className="h-3.5 w-3.5" /></span><h2 className="text-sm font-semibold">Shipment details</h2></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"><input required className={field} placeholder="What are you shipping?" value={shipmentDetails.description} onChange={(event) => update(setShipmentDetails, "description", event.target.value)} /><input required className={field} placeholder="Weight (kg)" type="number" min="0.1" step="0.1" value={shipmentDetails.weight} onChange={(event) => update(setShipmentDetails, "weight", event.target.value)} /><input required className={field} placeholder="Pieces / boxes" type="number" min="1" step="1" value={shipmentDetails.pieces} onChange={(event) => update(setShipmentDetails, "pieces", event.target.value)} /><input required className={field} placeholder="Shipment value (₹)" type="number" min="1" value={shipmentDetails.value} onChange={(event) => update(setShipmentDetails, "value", event.target.value)} /></div><div className="mt-4 rounded-lg border border-border/70 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold">Shipment dimensions</p><p className="mt-1 text-[11px] text-muted-foreground">Add each matching box group. The box-count total must equal Pieces / boxes.</p></div><Ruler className="h-4 w-4 text-primary" /></div><div className="mt-3 grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Length (cm)</span><span>Width (cm)</span><span>Height (cm)</span><span>Boxes</span></div><div className="mt-1 space-y-2">{boxDimensions.map((dimension, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2"><input required type="number" min="0.1" step="0.1" placeholder="Length" value={dimension.length} onChange={(event) => setBoxDimensions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, length: event.target.value } : item))} className={field} /><input required type="number" min="0.1" step="0.1" placeholder="Width" value={dimension.width} onChange={(event) => setBoxDimensions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, width: event.target.value } : item))} className={field} /><input required type="number" min="0.1" step="0.1" placeholder="Height" value={dimension.height} onChange={(event) => setBoxDimensions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, height: event.target.value } : item))} className={field} /><input required type="number" min="1" step="1" placeholder="Count" value={dimension.boxCount} onChange={(event) => setBoxDimensions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, boxCount: event.target.value } : item))} className={field} /><button type="button" aria-label="Remove dimension row" disabled={boxDimensions.length === 1} onClick={() => setBoxDimensions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-input text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">×</button></div>)}</div><div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => setBoxDimensions((current) => [...current, { length: "", width: "", height: "", boxCount: "" }])} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">Add dimension group</button><span className="text-[11px] text-muted-foreground">{boxDimensions.reduce((sum, item) => sum + (Number(item.boxCount) || 0), 0)} of {shipmentDetails.pieces || 0} boxes</span></div></div>{Number(shipmentDetails.value) >= EWAY_THRESHOLD && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"><div><p className="text-xs font-semibold text-amber-800 dark:text-amber-200">E-Way bill required</p><p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Required for shipment values at or above ₹50,000, regardless of invoice or DC.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-500/30 bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"><Upload className="h-3.5 w-3.5 text-primary" />{ewayBill ? ewayBill.name : "Upload E-Way bill"}<input type="file" required accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file && isAllowedDocument(file)) setEwayBill(file); else if (file) setNotice("E-Way bill must be a PDF, JPG, or PNG up to 10 MB"); }} /></label></div>}{Number(shipmentDetails.value) > 0 && Number(shipmentDetails.value) < EWAY_THRESHOLD && <p className="mt-2 text-[11px] text-muted-foreground">E-Way bill is not required below ₹50,000.</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">Payment</span><button type="button" onClick={() => { setPaymentMode("Prepaid"); setCodAmount(""); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${paymentMode === "Prepaid" ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground"}`}>Prepaid</button><button type="button" onClick={() => setPaymentMode("COD")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${paymentMode === "COD" ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground"}`}>COD</button>{paymentMode === "COD" && <input required className={`${field} ml-0 w-44`} placeholder="Amount to collect (₹)" type="number" min="1" value={codAmount} onChange={(event) => setCodAmount(event.target.value)} />}</div></section>
        <div className="flex flex-col gap-3 pt-8 -mb-8 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">You can review the booking before it is dispatched.</p><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"><Check className="h-4 w-4" /> Continue to review</button></div>
        {notice && <p role="status" className="text-right text-xs font-medium text-primary">{notice}</p>}
      </form>

      {pendingDelete && <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setPendingDelete(null)}><div role="dialog" aria-modal="true" aria-labelledby="delete-saved-title" className="w-full max-w-sm rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><TriangleAlert className="h-4 w-4" /></span><div><h2 id="delete-saved-title" className="text-sm font-semibold">Delete saved {pendingDelete} address?</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">This removes the saved shortcut permanently. Your current form fields will not be changed.</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">Cancel</button><button type="button" onClick={confirmDelete} className="rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90">Delete address</button></div></div></div>}
      {bulkOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setBulkOpen(false)}><div className="w-full max-w-2xl rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">Bulk shipment upload</h2></div><p className="text-xs text-muted-foreground">Upload one shipment per row. Valid rows are persisted through the production API after review.</p></div><button type="button" aria-label="Close bulk upload" onClick={() => setBulkOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button></div><div className="mt-5 rounded-xl border border-dashed border-primary/40 bg-primary/3 p-5 text-center"><input ref={bulkFileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => { setBulkFile(event.target.files?.[0] || null); setBulkRows([]); setBulkNotice(""); }} /><button type="button" onClick={() => bulkFileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"><FileText className="h-3.5 w-3.5 text-primary" />{bulkFile ? bulkFile.name : "Choose CSV or XLSX"}</button><p className="mt-2 text-[11px] text-muted-foreground">Required: from/to addresses, origin/destination city, state and PIN, contacts, description, weight, pieces, invoice status, payment mode.</p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={downloadBulkTemplate} className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"><Download className="h-3.5 w-3.5" /> Download template</button><button type="button" onClick={parseBulkFile} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="h-3.5 w-3.5" /> Validate file</button></div>{bulkNotice && <p className="mt-3 text-xs font-medium text-primary">{bulkNotice}</p>}{bulkRows.length > 0 && <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3"><div className="flex items-center justify-between text-xs"><span><span className="font-semibold text-foreground">{bulkRows.length}</span> unique shipments detected</span><span className="text-destructive">{bulkRows.filter((row) => row.errors.length).length} failed</span></div><div className="mt-3 flex justify-end"><button type="button" onClick={() => { setBulkOpen(false); setShowBulkReview(true); }} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Review shipments <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div></div>}</div></div>}

      {dcOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setDcOpen(false)}><div className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">Create Delivery Challan</h2></div><p className="text-xs text-muted-foreground">A simple document for shipments without an invoice.</p></div><button type="button" aria-label="Close" onClick={() => setDcOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button></div><div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1"><input required className={field} placeholder="Challan number" value={dc.number} onChange={(e) => update(setDc, "number", e.target.value)} /><input required className={field} type="date" value={dc.date} onChange={(e) => update(setDc, "date", e.target.value)} /><input required className={`${field} col-span-2`} placeholder="Seller / consignor name" value={dc.seller} onChange={(e) => update(setDc, "seller", e.target.value)} /><input required className={`${field} col-span-2`} placeholder="Buyer / consignee name" value={dc.buyer} onChange={(e) => update(setDc, "buyer", e.target.value)} /><input required className={field} placeholder="Shipment value (₹)" type="number" value={dc.value} onChange={(e) => update(setDc, "value", e.target.value)} /><input required className={field} placeholder="Reason for transport" value={dc.reason} onChange={(e) => update(setDc, "reason", e.target.value)} /></div><div className="mt-5 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setDcOpen(false)} className="rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">Cancel</button><button type="button" onClick={downloadDc} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Download className="h-3.5 w-3.5" /> Save & download DC</button></div></div></div>}
      {toast && <ConfirmationToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
