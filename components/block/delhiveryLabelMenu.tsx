"use client";

import { Download, Loader2, Tag } from "lucide-react";
import { useState } from "react";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";

const sizes = ["sm", "md", "a4", "std"] as const;
type LabelSize = (typeof sizes)[number];
type LabelOption = { size: LabelSize; contentType: string; artifact: unknown; copies: number };

const artifactBase64s = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(artifactBase64s);
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const direct = ["content_base64", "base64", "data"].flatMap((key) => typeof record[key] === "string" ? [record[key]] : []);
  return direct.length ? direct : Object.values(record).flatMap(artifactBase64s);
};

const artifactUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) return value.map(artifactUrl).find(Boolean);
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["download_url", "downloadUrl", "file_url", "fileUrl", "url", "link"]) {
    const found = artifactUrl(record[key]);
    if (found) return found;
  }
  return Object.values(record).map(artifactUrl).find(Boolean);
};

const artifactContentType = (value: unknown): string => {
  if (!value || typeof value !== "object") return "application/octet-stream";
  const record = value as Record<string, unknown>;
  for (const key of ["content_type", "contentType", "mime_type", "mimeType"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  return Object.values(record).map(artifactContentType).find((type) => type !== "application/octet-stream") ?? "application/octet-stream";
};

const artifactCopies = (value: unknown) => {
  if (!value || typeof value !== "object") return 1;
  const record = value as Record<string, unknown>;
  const copies = Number(record.copies);
  return Number.isFinite(copies) && copies > 0 ? copies : Array.isArray(record.artifacts) ? record.artifacts.length : 1;
};

const saveBase64 = (name: string, value: string, contentType: string) => {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const imageToPdf = async (name: string, values: string[], contentType: string) => {
  const images = await Promise.all(values.map((value) => new Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const type = contentType.toLowerCase();
      if (type.includes("png") || type.includes("jpeg") || type.includes("jpg")) {
        resolve({ dataUrl: `data:${contentType};base64,${value}`, width: image.naturalWidth, height: image.naturalHeight, format: type.includes("jpeg") || type.includes("jpg") ? "JPEG" : "PNG" });
        return;
      }
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Unable to prepare the Delhivery label image.")); return; }
      context.drawImage(image, 0, 0); resolve({ dataUrl: canvas.toDataURL("image/png"), width: image.naturalWidth, height: image.naturalHeight, format: "PNG" });
    };
    image.onerror = () => reject(new Error("Unable to read the Delhivery label image."));
    image.src = `data:${contentType};base64,${value}`;
  })));
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const margin = 8; const availableWidth = 210 - margin * 2; const availableHeight = 297 - margin * 2;
  images.forEach((image, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale; const height = image.height * scale;
    pdf.addImage(image.dataUrl, image.format, (210 - width) / 2, (297 - height) / 2, width, height, undefined, "NONE");
  });
  pdf.save(name);
};

export function DelhiveryLabelMenu({ shipmentId, reference, onNotice, compact = true }: { shipmentId: string; reference: string; onNotice?: (message: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LabelOption[]>([]);

  const loadOptions = async () => {
    if (loading) return;
    setOpen(true); setLoading(true); onNotice?.("Checking label formats with Delhivery…");
    try {
      const results = await Promise.all(sizes.map(async (size) => {
        try {
          const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(shipmentId)}/label?size=${size}`);
          const artifact = result.data?.artifact;
          if (!artifact || (!artifactBase64s(artifact).length && !artifactUrl(artifact))) return undefined;
          const option: LabelOption = { size, contentType: artifactContentType(artifact), artifact: artifact as unknown, copies: artifactCopies(artifact) };
          return option;
        } catch { return undefined; }
      }));
      const available = results.filter((option): option is LabelOption => option !== undefined);
      setOptions(available); onNotice?.(available.length ? "Delhivery label formats are ready to download." : "Delhivery has not published a label for this shipment yet.");
    } finally { setLoading(false); }
  };

  const download = async (option: LabelOption) => {
    const values = artifactBase64s(option.artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).filter((value) => value.length > 100);
    const type = option.contentType || artifactContentType(option.artifact);
    try {
      // Provider PDFs are authoritative. Keep Delhivery's original page layout,
      // sticker division, barcodes, and compression byte-for-byte.
      if (values.length && type.toLowerCase().includes("pdf")) {
        saveBase64(`delhivery-label-${reference}-${option.size}.pdf`, values[0], type);
      } else if (values.length) {
        await imageToPdf(`delhivery-label-${reference}-${option.size}.pdf`, values.slice(0, Math.max(1, option.copies)), type);
      } else if (artifactUrl(option.artifact)) {
        const link = document.createElement("a"); link.href = artifactUrl(option.artifact)!; link.download = `delhivery-label-${reference}-${option.size}`; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
      } else throw new Error("Delhivery returned no downloadable label content.");
      setOpen(false); onNotice?.(`Delhivery ${option.size} label downloaded.`);
    } catch (error) { onNotice?.(`Label download failed: ${getPssErrorDetails(error, "The Delhivery label could not be downloaded.").message}`); }
  };

  return <div className="relative inline-flex">
    <button type="button" aria-label={`Download label for ${reference}`} aria-expanded={open} onClick={() => { if (open) setOpen(false); else void loadOptions(); }} className={cn("inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground", compact ? "size-8" : "gap-1.5 px-2.5 py-2 text-xs font-semibold")} title="Download Delhivery label"><Tag className="size-3.5" />{!compact && <span>Label</span>}</button>
    {open && <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
      <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">Delhivery label size</p>
      {loading ? <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Loading formats…</p> : options.length ? options.map((option) => <button key={option.size} type="button" onClick={() => void download(option)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-accent"><Download className="size-3.5" />{option.size.toUpperCase()}{option.copies > 1 ? ` · ${option.copies} copies` : ""}</button>) : <p className="px-3 py-2 text-xs text-muted-foreground">No label formats available.</p>}
    </div>}
  </div>;
}
