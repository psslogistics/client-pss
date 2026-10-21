"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type WarehousePickerRecord = {
  id: string;
  name?: string;
  label?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_name?: string;
  phone?: string;
  contact?: string;
};

type WarehousePickerProps = {
  warehouses: WarehousePickerRecord[];
  value: string;
  inputClassName: string;
  onSelect: (warehouse: WarehousePickerRecord) => void;
  onClear: () => void;
};

const warehouseLabel = (warehouse: WarehousePickerRecord) => warehouse.name ?? warehouse.label ?? warehouse.address ?? warehouse.id;

const warehouseSearchText = (warehouse: WarehousePickerRecord) => [warehouseLabel(warehouse), warehouse.address, warehouse.city, warehouse.state, warehouse.pincode, warehouse.contact_name, warehouse.phone, warehouse.contact].filter(Boolean).join(" ").toLowerCase();

export default function WarehousePicker({ warehouses, value, inputClassName, onSelect, onClear }: WarehousePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = warehouses.find((warehouse) => warehouse.id === value);
  const selectedLabel = selected ? warehouseLabel(selected) : "";
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return warehouses;
    return warehouses.filter((warehouse) => warehouseSearchText(warehouse).includes(normalized));
  }, [query, warehouses]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const startSearch = () => {
    setQuery("");
    setOpen(true);
  };

  const clearSelection = () => {
    setQuery("");
    onClear();
    setOpen(false);
  };

  return <div ref={rootRef} className="relative">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input aria-label="Search saved pickup location" value={open ? query : selectedLabel} onFocus={startSearch} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search warehouse, city, or PIN…" className={cn(inputClassName, "w-full pl-9 pr-9")} autoComplete="off" />
      {(selected || query) && <button type="button" aria-label="Clear pickup location search" onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /></button>}
      {!selected && !query && <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
    </div>
    {open && <div role="listbox" aria-label="Saved pickup locations" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
      <button type="button" onClick={clearSelection} className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted">Enter a new pickup location</button>
      {filtered.map((warehouse) => { const label = warehouseLabel(warehouse); const detail = [warehouse.city, warehouse.state, warehouse.pincode].filter(Boolean).join(" · "); return <button type="button" role="option" aria-selected={value === warehouse.id} key={warehouse.id} onClick={() => { onSelect(warehouse); setQuery(""); setOpen(false); }} className="flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted"><span className="min-w-0"><span className="block truncate font-medium">{label}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{[detail, warehouse.address].filter(Boolean).join(" · ") || "Saved pickup location"}</span></span>{value === warehouse.id && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />}</button>; })}
      {!filtered.length && <p className="px-2.5 py-3 text-xs text-muted-foreground">No saved pickup locations match “{query}”.</p>}
    </div>}
  </div>;
}
