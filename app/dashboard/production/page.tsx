import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProductionClient } from "@/components/production/production-client";

export default function ProductionPage() {
  return (
    <DashboardLayout title="Üretim Takibi" subtitle="Üretim süreçlerini takip edin">
      <ProductionClient />
    </DashboardLayout>
  );
}
