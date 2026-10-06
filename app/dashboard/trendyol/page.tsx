import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TrendyolTabs } from "@/components/trendyol/trendyol-tabs";

export default function TrendyolPage() {
  return (
    <DashboardLayout
      title="Trendyol Yönetimi"
      subtitle="Komisyon hesaplayıcı ve anlaşmalı kargo fiyatları"
      maxWidth="max-w-7xl"
    >
      <TrendyolTabs />
    </DashboardLayout>
  );
}

