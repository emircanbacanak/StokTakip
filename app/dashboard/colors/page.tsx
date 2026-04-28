import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ColorsClient } from "@/components/products/colors-client";

export default function ColorsPage() {
  return (
    <DashboardLayout title="Renkler" subtitle="Renk listesini yönetin">
      <ColorsClient />
    </DashboardLayout>
  );
}
