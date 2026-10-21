"use client";

import SupportTicketCreation from "@/components/block/supportTicketCreation";
import { DelhiverySurface, DelhiveryTabs } from "@/components/ui/delhivery-surface";

export default function SupportTicketCreationPage() {
  return (
    <DelhiverySurface eyebrow="Support" title="Support" description="Open, review, and follow up on support requests from one place.">
      <DelhiveryTabs tabs={["Open", "Resolved", "Closed"]} active="Open" />
      <SupportTicketCreation />
    </DelhiverySurface>
  );
}
