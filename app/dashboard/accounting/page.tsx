import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AccountingClient } from "@/components/accounting/accounting-client";

export default function AccountingPage() {
  return (
    <DashboardLayout
      title="Muhasebe ve Maliyet Analizi"
      subtitle="Gelir, gider, üretim maliyetleri ve kârlılık takibi"
      maxWidth="max-w-7xl"
    >
      <AccountingClient />
    </DashboardLayout>
  );
}

