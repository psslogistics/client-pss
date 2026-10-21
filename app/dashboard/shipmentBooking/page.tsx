import ShipmentBooking from "@/components/block/shipmentBooking";
import { DelhiverySurface, DelhiveryTabs } from "@/components/ui/delhivery-surface";

export default function ShipmentBookingPage() {
  return (
    <DelhiverySurface eyebrow="Shipment operations" title="B2B Orders" description="Create, review, and submit Delhivery B2B shipments from the PSS panel.">
      <DelhiveryTabs tabs={["Create order", "Manifested", "In transit", "Returned", "Delivered"]} active="Create order" />
      <ShipmentBooking />
    </DelhiverySurface>
  );
}
