import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProductsClient } from "@/components/products/products-client";

export default function ProductsPage() {
  return (
    <DashboardLayout title="Stok Durumu" subtitle="Ürün ve renk bazlı üretim takibi">
      <ProductsClient />
    </DashboardLayout>
  );
}
