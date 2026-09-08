"use client";

import { useState } from "react";
import OperationsManagement from "@/components/block/operationsManagement";

export default function NdrExceptionsPage() {
  const [tab, setTab] = useState<"ndr" | "exceptions">("ndr");
  return <div className="space-y-4"><div className="inline-flex rounded-lg bg-muted p-1"><button onClick={() => setTab("ndr")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "ndr" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>NDR</button><button onClick={() => setTab("exceptions")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "exceptions" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Exceptions</button></div><OperationsManagement mode={tab} /></div>;
}
