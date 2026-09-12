import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProductUploadHub } from "@/components/product-upload/product-upload-hub";

export default function ProductUploadPage() {
  return (
    <DashboardLayout
      title="Ürün Yükleme & Pazaryeri Yönetimi"
      subtitle="Pazar yerlerine tekil veya toplu ürün yükleyin, mevcut ürünlerinizi güncelleyin ve yönetin"
    >
      <ProductUploadHub />
    </DashboardLayout>
  );
}
