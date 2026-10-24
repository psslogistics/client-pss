import { redirect } from "next/navigation";

export default function LegacyRateCalculatorRoute() {
  redirect("/dashboard/rateCheck");
}
