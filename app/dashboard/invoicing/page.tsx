import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InvoicingClient } from "@/components/invoicing/invoicing-client";

export default function InvoicingPage() {
  return (
    <DashboardLayout 
      title="Fatura Yönetimi" 
      subtitle="Teslim edilmiş ama fatura kesilmemiş siparişleri görüntüleyin"
    >
      <InvoicingClient />
    </DashboardLayout>
  );
}
