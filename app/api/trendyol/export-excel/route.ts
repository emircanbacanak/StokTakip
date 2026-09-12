import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * POST /api/trendyol/export-excel
 * Filtrelenen ürünleri gerçek .xlsx dosyası olarak tarayıcıya indirir.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || [];
    const filename = body.filename || `Trendyol_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dışa aktarılacak ürün verisi bulunamadı." }, { status: 400 });
    }

    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

    // Sütun genişliklerini ayarla
    worksheet["!cols"] = [
      { wch: 45 }, // Ürün Adı
      { wch: 18 }, // Barkod
      { wch: 20 }, // Model Kodu
      { wch: 20 }, // Stok Kodu
      { wch: 18 }, // Marka
      { wch: 15 }, // Kategori
      { wch: 15 }, // Satış Fiyatı
      { wch: 15 }, // Piyasa Fiyatı
      { wch: 12 }, // Komisyon
      { wch: 15 }, // Müşteri Fiyatı
      { wch: 10 }, // Stok
      { wch: 12 }, // Termin
      { wch: 10 }, // KDV
      { wch: 10 }, // Desi
      { wch: 15 }, // Durum
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    console.error("Excel export error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Excel dosyası oluşturulamadı." },
      { status: 500 }
    );
  }
}
