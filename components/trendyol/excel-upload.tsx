"use client";

/**
 * ExcelUpload — Trendyol toplu ürün yükleme
 *
 * • xlsx kütüphanesi ile Excel parse
 * • Rate-limit koruması (800ms varsayılan gecikme)
 * • Satır bazlı ilerleme takibi
 * • "Toptan sipariş vermeyin." öneki otomatik eklenir
 * • Hata satırları kırmızı, başarı satırları yeşil gösterilir
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet,
  Loader2, Upload, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitBatchToTrendyol, enforceDescriptionPrefix, type SubmitProductPayload } from "@/lib/trendyol-api-client";
import type { SubmitProductResult } from "@/lib/trendyol-api-client";

// ─── TİPLER ──────────────────────────────────────────────────────────────────
interface ParsedRow {
  rowIndex: number;
  title: string;
  description: string;
  brand_name: string;
  list_price: number;
  sale_price: number;
  vat_rate: number;
  quantity: number;
  image_urls: string[];
  cargo_company: string;
  desi: number;
  warranty_months: number;
}

interface RowResult extends ParsedRow {
  status: "pending" | "uploading" | "success" | "error";
  result?: SubmitProductResult;
  error?: string;
}

// ─── EXCEL ALAN MAPPING ───────────────────────────────────────────────────────
// Kullanıcı sütunları farklı adlandırabilir, yaygın varyantları kabul et
function getField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && v !== "") return String(v).trim();
  }
  return "";
}

function getNumField(row: Record<string, unknown>, ...keys: string[]): number {
  const v = getField(row, ...keys);
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// ─── BİLEŞEN ─────────────────────────────────────────────────────────────────
export function ExcelUpload() {
  const { toast } = useToast();
  const [rows, setRows] = useState<RowResult[]>([]);
  const [delayMs, setDelayMs] = useState(800);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // ── Şablon Excel indir ────────────────────────────────────────────────────
  const downloadTemplate = useCallback(async () => {
    // xlsx dinamik import (bundle size optimizasyonu)
    const XLSX = await import("xlsx");
    const headers = [
      "title", "description", "brand_name",
      "list_price", "sale_price", "vat_rate", "quantity",
      "image_url_1", "image_url_2",
      "cargo_company", "desi", "warranty_months",
    ];
    const example = [
      "Aura Vazo Dekorasyon", "Benzersiz tasarım", "Yok",
      "299", "249", "10", "5",
      "https://cdn.example.com/1.jpg", "",
      "TEX/PTT", "1", "0",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
    XLSX.writeFile(wb, "trendyol_toplu_yukleme_sablonu.xlsx");
  }, []);

  // ── Excel parse ───────────────────────────────────────────────────────────
  const parseExcel = useCallback(async (file: File) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (data.length === 0) {
      toast({ title: "Hata", description: "Excel dosyası boş", variant: "destructive" });
      return;
    }

    const parsed: RowResult[] = data.map((row, i) => {
      // Görsel URL'leri — image_url_1..8 veya image_urls sütunları
      const imageKeys = ["image_url_1","image_url_2","image_url_3","image_url_4",
                         "image_url_5","image_url_6","image_url_7","image_url_8"];
      const image_urls = [
        ...imageKeys.map((k) => getField(row, k)).filter(Boolean),
        ...getField(row, "image_urls").split(";").map((u) => u.trim()).filter(Boolean),
      ].slice(0, 8);

      const rawDesc = getField(row, "description", "açıklama", "Açıklama", "desc");
      const description = enforceDescriptionPrefix(rawDesc);

      return {
        rowIndex: i + 2, // Excel satır numarası (1 = header)
        title:           getField(row, "title", "baslik", "başlık", "Başlık", "ürün adı", "urun_adi"),
        description,
        brand_name:      getField(row, "brand_name", "marka", "Marka") || "Yok",
        list_price:      getNumField(row, "list_price", "liste_fiyati", "Liste Fiyatı"),
        sale_price:      getNumField(row, "sale_price", "satis_fiyati", "Satış Fiyatı"),
        vat_rate:        getNumField(row, "vat_rate", "kdv", "KDV") || 10,
        quantity:        Math.max(1, getNumField(row, "quantity", "stok", "Stok", "adet")),
        image_urls,
        cargo_company:   getField(row, "cargo_company", "kargo", "Kargo") || "TEX/PTT",
        desi:            getNumField(row, "desi", "Desi") || 1,
        warranty_months: getNumField(row, "warranty_months", "garanti", "Garanti"),
        status:          "pending" as const,
      };
    });

    setRows(parsed);
    setProgress(0);
    toast({
      title: `${parsed.length} satır yüklendi`,
      description: "Gönder butonuyla Trendyol'a yükleyebilirsiniz",
    });
  }, [toast]);

  // ── Dosya input / drag-drop ───────────────────────────────────────────────
  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Hata", description: "xlsx, xls veya csv dosyası seçin", variant: "destructive" });
      return;
    }
    parseExcel(file);
  }, [parseExcel, toast]);

  // ── Toplu gönder ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (rows.length === 0) return;
    setUploading(true);
    setProgress(0);

    // Satır durumlarını "uploading" yap
    setRows((prev) => prev.map((r) => ({ ...r, status: "uploading", result: undefined, error: undefined })));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    const payloads: SubmitProductPayload[] = rows.map((r) => ({
      title: r.title,
      description: r.description,
      brand_name: r.brand_name,
      list_price: r.list_price || r.sale_price,
      sale_price: r.sale_price,
      vat_rate: r.vat_rate,
      quantity: r.quantity,
      image_urls: r.image_urls,
      cargo_company: r.cargo_company,
      desi: r.desi,
      warranty_months: r.warranty_months,
    }));

    await submitBatchToTrendyol(payloads, supabaseUrl, anonKey, {
      delayMs,
      onProgress: (current, total, result) => {
        setProgress(Math.round((current / total) * 100));
        setRows((prev) => {
          const updated = [...prev];
          updated[current - 1] = {
            ...updated[current - 1],
            status: result.success ? "success" : "error",
            result,
            error: result.error,
          };
          return updated;
        });
      },
      onError: (index, error) => {
        setRows((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], status: "error", error };
          return updated;
        });
      },
    });

    setUploading(false);

    const successCount = rows.filter((_, i) => {
      // Final state'e göre say
      return true; // onProgress zaten güncelledi
    }).length;
    toast({ title: "Toplu yükleme tamamlandı", description: `Tüm satırlar işlendi` });
  }, [rows, delayMs, toast]);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Toplu Excel Yükleme</h2>
          <p className="text-sm text-muted-foreground">
            Excel dosyanızı yükleyin — Trendyol&apos;a rate-limit güvenli toplu gönderim
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Şablon İndir
        </Button>
      </div>

      {/* Drag-drop alanı */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
            : "border-border hover:border-orange-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => document.getElementById("excel-file-input")?.click()}
      >
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">Excel dosyasını sürükleyin veya tıklayın</p>
        <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv desteklenir</p>
        <input
          id="excel-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Ayarlar */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Yükleme Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="delay" className="text-xs shrink-0">
                İstekler arası gecikme (ms):
              </Label>
              <Input
                id="delay"
                type="number"
                min="200"
                step="100"
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value) || 800)}
                className="w-24 h-8 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Toplam tahmini süre: ~{Math.ceil((rows.length * delayMs) / 1000)} sn
            </div>
          </CardContent>
        </Card>
      )}

      {/* İlerleme çubuğu */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Yükleniyor… {progress}%</span>
            <span>{rows.filter((r) => r.status === "success").length} / {rows.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Satır listesi */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{rows.length} ürün hazır</p>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Yükleniyor…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Tümünü Trendyol&apos;a Gönder</>
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                  row.status === "success"
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : row.status === "error"
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    : row.status === "uploading"
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
                    : "bg-muted/30 border-border"
                }`}
              >
                {/* Durum ikonu */}
                <div className="shrink-0">
                  {row.status === "success" && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  {row.status === "error" && (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  {row.status === "uploading" && (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  )}
                  {row.status === "pending" && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                  )}
                </div>

                {/* Satır bilgisi */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    <span className="text-muted-foreground mr-2 text-xs">#{row.rowIndex}</span>
                    {row.title || <span className="text-muted-foreground italic">Başlık yok</span>}
                  </div>
                  {row.status === "success" && row.result?.barcode && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Barkod: <code className="font-mono">{row.result.barcode}</code>
                    </div>
                  )}
                  {row.status === "error" && (
                    <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {row.error ?? "Bilinmeyen hata"}
                    </div>
                  )}
                </div>

                {/* Fiyat */}
                <div className="shrink-0 text-xs text-muted-foreground">
                  ₺{row.sale_price?.toFixed(2) ?? "—"}
                </div>
              </div>
            ))}
          </div>

          {/* Özet */}
          {!uploading && rows.some((r) => r.status !== "pending") && (
            <div className="flex gap-4 text-sm pt-2 border-t">
              <span className="text-green-600">
                ✓ {rows.filter((r) => r.status === "success").length} başarılı
              </span>
              <span className="text-red-600">
                ✗ {rows.filter((r) => r.status === "error").length} hatalı
              </span>
              <span className="text-muted-foreground">
                ◷ {rows.filter((r) => r.status === "pending" || r.status === "uploading").length} bekliyor
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
