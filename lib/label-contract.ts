export const labelSizes = ["a4", "4x2", "4x2.5", "3x2"] as const;
export type LabelSize = (typeof labelSizes)[number];

export const labelSizeLabel: Record<LabelSize, string> = {
  a4: "A4",
  "4x2": "4 × 2 in",
  "4x2.5": "4 × 2.5 in",
  "3x2": "3 × 2 in",
};

export function sanitizeLabelReference(reference: string) {
  return reference.trim().replace(/[^A-Za-z0-9_-]+/g, "-") || "SHIPMENT";
}

export function labelFileName(reference: string, size: LabelSize) {
  return `${sanitizeLabelReference(reference)}-LABEL-${size === "a4" ? "A4" : size}.pdf`;
}

export function expectedStickerCount(boxes: number, mpsRequired = true) {
  const count = Math.max(1, Math.floor(Number(boxes) || 1));
  return count + (mpsRequired ? 1 : 0);
}
