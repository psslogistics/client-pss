"use client";

import { useState } from "react";
import SupportTicketCreation from "@/components/block/supportTicketCreation";
import { DelhiverySurface, DelhiveryTabs } from "@/components/ui/delhivery-surface";

export default function SupportTicketCreationPage() {
  const [activeStatus, setActiveStatus] = useState("Open");
  return (
    <DelhiverySurface eyebrow="Support" title="Support" description="Open, review, and follow up on support requests from one place.">
      <DelhiveryTabs tabs={["Open", "Resolved", "Closed"]} active={activeStatus} onChange={setActiveStatus} />
      <SupportTicketCreation statusFilter={activeStatus} />
    </DelhiverySurface>
  );
}
