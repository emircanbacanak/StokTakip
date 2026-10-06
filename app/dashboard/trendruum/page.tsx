import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TrendruumTabs } from "@/components/trendruum/trendruum-tabs";

export default function TrendruumPage() {
  return (
    <DashboardLayout
      title="Trendruum Yönetimi"
      subtitle="Komisyon hesaplayıcı ve kargo fiyatları"
      maxWidth="max-w-7xl"
    >
      <TrendruumTabs />
    </DashboardLayout>
  );
}

