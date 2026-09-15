import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { OmnichannelPricingClient } from "@/components/pricing/omnichannel-pricing-client";

export default function PricingPage() {
  return (
    <DashboardLayout
      title="Fiyatlandırma"
      subtitle="Tek ekrandan tüm pazaryerleri için maliyet, kargo, komisyon ve satış fiyatı belirleme"
      maxWidth="max-w-7xl"
    >
      <OmnichannelPricingClient />
    </DashboardLayout>
  );
}
