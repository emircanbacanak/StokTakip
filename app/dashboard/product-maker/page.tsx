"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Trash2,
  Edit3,
  Check,
  X,
  ExternalLink,
  Plus,
  Layers,
  Clock,
  Weight,
  Sparkles,
  FolderDown,
  FileArchive,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  AlertCircle,
  SlidersHorizontal,
  Store,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

export interface FilamentInfo {
  type: string;
  color?: string;
  usedG: number;
  usedM?: string;
}

export interface MakerProduct {
  id: string;
  makerWorldId: string;
  url: string;
  title: string;
  designer: string;
  designerAvatar?: string;
  coverUrl: string;
  images: string[];
  totalWeightGram: number;
  filaments: FilamentInfo[];
  printTimeMinutes: number;
  tags: string[];
  summary: string;
  platesCount: number;
  scrapedAt: string;
  price?: number;
  stock?: number;
  customSku?: string;
}

export default function ProductMakerPage() {
  const router = useRouter();
  const [linksText, setLinksText] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [currentScrapingUrl, setCurrentScrapingUrl] = useState("");
  const [products, setProducts] = useState<MakerProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Düzenleme modalı
  const [editingProduct, setEditingProduct] = useState<MakerProduct | null>(null);

  // Resim önizleme modalı
  const [previewImages, setPreviewImages] = useState<{ title: string; urls: string[] } | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // İşlem durumları
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isExportingToDb, setIsExportingToDb] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Trendyol Yükleme Ekranına Gönder / Aktar
  const handleSendToTrendyol = (item: MakerProduct) => {
    try {
      const allImgs = item.images && item.images.length > 0 ? item.images : (item.coverUrl ? [item.coverUrl] : []);
      const imagesList = item.coverUrl && !allImgs.includes(item.coverUrl)
        ? [item.coverUrl, ...allImgs]
        : allImgs;

      const descHtml = item.summary
        ? `<p><strong>${item.title}</strong></p><p>${item.summary.replace(/\n/g, '<br/>')}</p><p><em>Orijinal Tasarımcı: ${item.designer} | 3D Baskı Teknolojisi</em></p>`
        : `<p><strong>${item.title}</strong></p><p>3D Yazıcı ile yüksek hassasiyet ve dayanıklı filament kullanılarak üretilmiştir.</p><p><em>Orijinal Tasarımcı: ${item.designer}</em></p>`;

      const payload = {
        title: item.title,
        description: descHtml,
        images: imagesList,
        weightGrams: item.totalWeightGram || 0,
        price: item.price ? item.price.toString() : (item.totalWeightGram ? Math.max(150, Math.round(item.totalWeightGram * 4.5)).toString() : "199"),
        stock: item.stock ? item.stock.toString() : "10",
        modelCode: item.customSku || `MW-${item.makerWorldId || Math.floor(100000 + Math.random() * 900000)}`,
        material: "Plastik",
        source: "makerworld",
        designer: item.designer,
      };

      sessionStorage.setItem("trendyol_prefill_data", JSON.stringify(payload));
      showNotification("success", `"${item.title}" Trendyol yükleme ekranına aktarılıyor...`);
      setTimeout(() => {
        router.push("/dashboard/product-upload?tab=single&mp=trendyol");
      }, 300);
    } catch (e) {
      showNotification("error", "Trendyol'a aktarılırken bir hata oluştu.");
    }
  };

  // Link ayrıştırma
  const parseLinks = (text: string) => {
    // Metin içinde doğrudan url'ler varsa onları ayıkla
    const urlMatches = text.match(/https?:\/\/[^\s"',]+/gi);
    if (urlMatches && urlMatches.length > 0) {
      return Array.from(new Set(urlMatches));
    }

    return text
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  };

  // Scraping Başlat
  const handleStartScrape = async () => {
    const linkList = parseLinks(linksText);
    if (!linkList.length) {
      showNotification("error", "Lütfen en az bir adet MakerWorld linki yapıştırın.");
      return;
    }

    setIsScraping(true);
    setScrapeProgress(0);
    const newItems: MakerProduct[] = [];
    const errors: string[] = [];

    for (let i = 0; i < linkList.length; i++) {
      const link = linkList[i];
      setCurrentScrapingUrl(link);
      setScrapeProgress(Math.round((i / linkList.length) * 100));

      try {
        const res = await fetch("/api/makerworld/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ links: [link] }),
        });

        const data = await res.json();
        if (data.success && data.products && data.products.length > 0) {
          const item = data.products[0];
          item.price = item.price || (item.totalWeightGram ? Math.max(150, Math.round(item.totalWeightGram * 4.5)) : 199);
          item.stock = 10;
          item.customSku = `MW-${item.makerWorldId}`;
          newItems.push(item);
        } else if (data.errors && data.errors.length > 0) {
          errors.push(`${link}: ${data.errors[0].error}`);
        } else {
          errors.push(`${link}: Bilgi alınamadı.`);
        }
      } catch (err: any) {
        errors.push(`${link}: ${err.message || "Bağlantı hatası"}`);
      }

      setScrapeProgress(Math.round(((i + 1) / linkList.length) * 100));
    }

    setIsScraping(false);
    setCurrentScrapingUrl("");

    if (newItems.length > 0) {
      setProducts((prev) => [...newItems, ...prev]);
      setSelectedIds(new Set(newItems.map((p) => p.id)));
      setLinksText("");
      showNotification("success", `${newItems.length} adet ürün başarıyla MakerWorld'den çekildi!`);
    }

    if (errors.length > 0) {
      showNotification("error", `${errors.length} linkte hata oluştu: ${errors[0]}`);
    }
  };

  // Örnek link doldur
  const handleFillExamples = () => {
    setLinksText(`https://makerworld.com/en/models/14207\nhttps://makerworld.com/en/models/105342`);
  };

  // Seçim işlemleri
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Tekli silme
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showNotification("info", "Ürün listeden kaldırıldı.");
  };

  // Seçilenleri silme
  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    if (!confirm(`${selectedIds.size} adet seçili ürünü listeden silmek istediğinize emin misiniz?`)) return;
    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    showNotification("info", "Seçili ürünler silindi.");
  };

  // Yerinde ürün güncelleme
  const handleUpdateProduct = (updated: MakerProduct) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProduct(null);
    showNotification("success", "Ürün bilgileri güncellendi.");
  };

  // Fotoğrafları Sunucu Klasörüne Kaydet
  const handleSaveToFolder = async (targetProducts?: MakerProduct[]) => {
    const listToSave = targetProducts || products.filter((p) => selectedIds.has(p.id));
    if (!listToSave.length) {
      showNotification("error", "Lütfen klasöre kaydedilecek en az bir ürün seçin.");
      return;
    }

    setIsSavingFolder(true);
    try {
      const res = await fetch("/api/makerworld/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save_to_folder",
          products: listToSave,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("success", `✅ Fotoğraflar ve bilgiler kaydedildi! Konum: ${data.baseDirectory}`);
      } else {
        showNotification("error", data.error || "Klasöre kaydetme başarısız.");
      }
    } catch (e: any) {
      showNotification("error", "İndirme isteği başarısız oldu: " + e.message);
    } finally {
      setIsSavingFolder(false);
    }
  };

  // ZIP Olarak İndir
  const handleDownloadZip = async (targetProducts?: MakerProduct[]) => {
    const listToSave = targetProducts || products.filter((p) => selectedIds.has(p.id));
    if (!listToSave.length) {
      showNotification("error", "Lütfen ZIP olarak indirilecek en az bir ürün seçin.");
      return;
    }

    setIsDownloadingZip(true);
    try {
      const res = await fetch("/api/makerworld/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "zip",
          products: listToSave,
        }),
      });

      if (!res.ok) throw new Error("ZIP oluşturulamadı.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MakerWorld_Urunler_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showNotification("success", "ZIP arşivi başarıyla indirildi.");
    } catch (e: any) {
      showNotification("error", "ZIP indirme hatası: " + e.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Ürünleri Ana Stok & Katalog Tablosuna Aktar
  const handleExportToProductsDb = async () => {
    const listToExport = products.filter((p) => selectedIds.has(p.id));
    if (!listToExport.length) {
      showNotification("error", "Lütfen kataloğa eklenecek ürünleri seçin.");
      return;
    }

    setIsExportingToDb(true);
    let addedCount = 0;
    const errors: string[] = [];

    let supabase: any = null;
    try {
      supabase = createClient();
    } catch {
      supabase = null;
    }

    if (!supabase) {
      setIsExportingToDb(false);
      showNotification("error", "Supabase bağlantısı yapılandırılmamış (.env ayarlarını kontrol edin).");
      return;
    }

    for (const item of listToExport) {
      try {
        const newProductId = crypto.randomUUID();
        const payload = {
          id: newProductId,
          name: item.title,
          description: `Tasarımcı: ${item.designer} | MakerWorld ID: ${item.makerWorldId}${item.summary ? `\n\n${item.summary}` : ""}`,
          image_url: item.coverUrl || (item.images && item.images[0]) || null,
          weight_grams: Number(item.totalWeightGram) || 0,
          has_sizes: false,
          price: item.price ? Number(item.price) : null,
        };

        const { error } = await supabase.from("products").insert([payload]);
        if (error) {
          errors.push(`${item.title}: ${error.message}`);
        } else {
          addedCount++;

          // Eğer ürünün birden fazla resmi varsa, bunları da product_images tablosuna ekleyelim
          if (item.images && item.images.length > 0) {
            const extraImages = item.images.filter((img) => img !== payload.image_url);
            if (extraImages.length > 0) {
              const imagesPayload = extraImages.map((url, idx) => ({
                product_id: newProductId,
                url,
                sort_order: idx + 1,
              }));
              await supabase.from("product_images").insert(imagesPayload);
            }
          }
        }
      } catch (err: any) {
        errors.push(`${item.title}: ${err.message}`);
      }
    }

    setIsExportingToDb(false);

    if (addedCount > 0) {
      showNotification("success", `🎉 ${addedCount} ürün başarıyla Stok & Katalog tablonuza eklendi!`);
    }
    if (errors.length > 0) {
      showNotification("error", `Bazı ürünler eklenemedi: ${errors[0]}`);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Üst Başlık Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Ürün Oluşturucu (MakerWorld Scraper)
              </h1>
            </div>
            <p className="text-emerald-100 text-sm max-w-2xl">
              MakerWorld ürün linklerini yapıştırın; ürün adı, fotoğrafları, model filament gramajları ve baskı süreleri anında otomatik çekilsin, klasöre kaydedilsin ve kataloğunuza eklensin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/25 hover:bg-white/30 text-white border-0 px-3 py-1.5 text-xs">
              ⚡ Canlı API Scraper
            </Badge>
            <Badge className="bg-emerald-950/40 text-emerald-200 border-0 px-3 py-1.5 text-xs">
              ⚖️ Gramaj & Süre Analizli
            </Badge>
          </div>
        </div>

        {/* Dekoratif efektler */}
        <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-40 -top-10 h-32 w-32 rounded-full bg-teal-400/20 blur-xl" />
      </div>

      {/* Bildirim Alanı */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : notification.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Link Giriş & İşlem Paneli */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4 text-emerald-500" />
              MakerWorld Ürün Linkleri (Tekli veya Çoklu)
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFillExamples}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                Örnek Linkler
              </Button>
              {linksText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLinksText("")}
                  className="text-xs h-7 text-red-500 hover:text-red-600"
                >
                  Temizle
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            placeholder="https://makerworld.com/en/models/14207&#10;https://makerworld.com/en/models/105342"
            rows={4}
            className="font-mono text-xs focus-visible:ring-emerald-500 resize-y"
            disabled={isScraping}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted-foreground">
              {linksText ? `${parseLinks(linksText).length} adet link tespit edildi` : "Alt alta veya virgülle ayırarak birden fazla link yapıştırabilirsiniz."}
            </div>

            <Button
              onClick={handleStartScrape}
              disabled={isScraping || !linksText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium px-6 shadow-md shadow-emerald-600/20"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Ürünler Çekiliyor... ({scrapeProgress}%)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Ürünleri Araştır ve Çek
                </>
              )}
            </Button>
          </div>

          {/* Scrape Progress Bar */}
          {isScraping && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${scrapeProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-md">Taranıyor: {currentScrapingUrl}</span>
                <span className="font-semibold text-emerald-600">{scrapeProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Hızlı İstatistik & Eylem Kartı */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
              Çalışma Alanı & Özet
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/50 rounded-xl p-3 border border-border/50 text-center">
                <div className="text-2xl font-bold text-foreground">{products.length}</div>
                <div className="text-xs text-muted-foreground">Çekilen Ürün</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedIds.size}
                </div>
                <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Seçili Ürün</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1.5">
              <div className="flex justify-between">
                <span>Toplam Görsel Sayısı:</span>
                <span className="font-medium text-foreground">
                  {products.reduce((acc, p) => acc + (p.images?.length || 1), 0)} adet
                </span>
              </div>
              <div className="flex justify-between">
                <span>Toplam Filament Ağırlığı:</span>
                <span className="font-medium text-foreground">
                  {products.reduce((acc, p) => acc + (p.totalWeightGram || 0), 0)} gram
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              onClick={() => handleSaveToFolder()}
              disabled={isSavingFolder || !selectedIds.size}
            >
              <FolderDown className="h-4 w-4 text-emerald-500" />
              {isSavingFolder ? "Klasöre Kaydediliyor..." : "Fotoğrafları Klasöre Kaydet (PC)"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => handleDownloadZip()}
              disabled={isDownloadingZip || !selectedIds.size}
            >
              <FileArchive className="h-4 w-4 text-blue-500" />
              {isDownloadingZip ? "ZIP Paketleniyor..." : "Seçilenleri ZIP İndir"}
            </Button>

            <Button
              size="sm"
              className="w-full justify-start gap-2 text-xs bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-xs font-semibold"
              onClick={() => {
                const selected = products.filter((p) => selectedIds.has(p.id));
                if (selected.length > 0) {
                  handleSendToTrendyol(selected[0]);
                }
              }}
              disabled={!selectedIds.size}
            >
              <Store className="h-4 w-4" />
              Trendyol'a Yükle {selectedIds.size > 1 ? `(${selectedIds.size} seçili)` : ""}
            </Button>

            <Button
              size="sm"
              className="w-full justify-start gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExportToProductsDb}
              disabled={isExportingToDb || !selectedIds.size}
            >
              <Plus className="h-4 w-4" />
              {isExportingToDb ? "Ekleniyor..." : "Kataloğa / Ürünlerime Ekle"}
            </Button>
          </div>
        </div>
      </div>

      {/* Gerçek Zamanlı Ürün Listesi */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Liste Üst Toolbar */}
        <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="h-8 gap-2 text-xs"
              disabled={!products.length}
            >
              {selectedIds.size === products.length && products.length > 0 ? (
                <>
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  Seçimi Kaldır
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 text-muted-foreground" />
                  Tümünü Seç ({products.length})
                </>
              )}
            </Button>

            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="h-8 gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Seçilenleri Sil ({selectedIds.size})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {products.length} ürün listeleniyor
            </span>
          </div>
        </div>

        {/* Tablo veya Boş Durum */}
        {products.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Layers className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-foreground">Henüz ürün çekilmedi</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Yukarıdaki alana MakerWorld ürün linklerini yapıştırıp <b>"Ürünleri Araştır ve Çek"</b> butonuna basarak anında ürünleri getirebilirsiniz.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillExamples}
              className="text-xs gap-1.5 text-emerald-600 border-emerald-500/30"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Örnek Linklerle Dene
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4 w-20">Kapak</th>
                  <th className="py-3 px-4">Ürün Adı & Tasarımcı</th>
                  <th className="py-3 px-4 w-36">Gramaj & Filament</th>
                  <th className="py-3 px-4 w-28">Baskı Süresi</th>
                  <th className="py-3 px-4 w-28">Fiyat (TL)</th>
                  <th className="py-3 px-4 w-24">Stok</th>
                  <th className="py-3 px-4 w-36 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-emerald-500/5 dark:bg-emerald-500/10" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Kapak Görseli */}
                      <td className="py-3 px-4">
                        <div
                          className="relative h-14 w-14 rounded-lg overflow-hidden border border-border bg-muted group cursor-pointer"
                          onClick={() => {
                            setPreviewImages({
                              title: item.title,
                              urls: item.images?.length ? item.images : [item.coverUrl],
                            });
                            setActiveImageIndex(0);
                          }}
                        >
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                              Yok
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                          {item.images?.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                              +{item.images.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ürün Adı & Tasarımcı & Link */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground line-clamp-1 flex items-center gap-2">
                            <span>{item.title}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>👤 {item.designer}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-muted-foreground">ID: {item.makerWorldId}</span>
                            <span>•</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                            >
                              MakerWorld <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          {/* Etiketler */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1.5">
                                  #{tag}
                                </Badge>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Gramaj & Filamentler */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <Weight className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{item.totalWeightGram || 0} g</span>
                          </div>

                          {item.filaments && item.filaments.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {item.filaments.slice(0, 2).map((fil, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span
                                    className="w-2 h-2 rounded-full border border-border"
                                    style={{ backgroundColor: fil.color || "#000" }}
                                  />
                                  <span>{fil.type}</span>
                                  <span className="font-mono">{fil.usedG}g</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Tek Renk / Standart</span>
                          )}
                        </div>
                      </td>

                      {/* Baskı Süresi */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>
                            {item.printTimeMinutes
                              ? `${Math.floor(item.printTimeMinutes / 60)}s ${item.printTimeMinutes % 60}dk`
                              : "Belirtilmemiş"}
                          </span>
                        </div>
                      </td>

                      {/* Satış Fiyatı */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setProducts((prev) =>
                                prev.map((p) => (p.id === item.id ? { ...p, price: val } : p))
                              );
                            }}
                            className="h-8 w-20 text-xs font-semibold"
                          />
                          <span className="text-xs text-muted-foreground">₺</span>
                        </div>
                      </td>

                      {/* Stok */}
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={item.stock || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setProducts((prev) =>
                              prev.map((p) => (p.id === item.id ? { ...p, stock: val } : p))
                            );
                          }}
                          className="h-8 w-16 text-xs text-center"
                        />
                      </td>

                      {/* Eylemler */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                            title="Trendyol'a Yükle / Aktar"
                            onClick={() => handleSendToTrendyol(item)}
                          >
                            <Store className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            title="Fotoğrafları Klasöre Kaydet"
                            onClick={() => handleSaveToFolder([item])}
                          >
                            <FolderDown className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                            title="ZIP İndir"
                            onClick={() => handleDownloadZip([item])}
                          >
                            <FileArchive className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Düzenle"
                            onClick={() => setEditingProduct(item)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            title="Sil"
                            onClick={() => handleDeleteProduct(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Düzenleme Modalı */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-500" />
                Ürün Bilgilerini Düzenle
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ürün başlığı, gramajı, fiyatı ve stok adedini güncelleyin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Ürün Adı</label>
                <Input
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Satış Fiyatı (₺)</label>
                  <Input
                    type="number"
                    value={editingProduct.price || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Stok Adedi</label>
                  <Input
                    type="number"
                    value={editingProduct.stock || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Toplam Gramaj (g)</label>
                  <Input
                    type="number"
                    value={editingProduct.totalWeightGram || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        totalWeightGram: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Özel SKU / Stok Kodu</label>
                  <Input
                    value={editingProduct.customSku || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, customSku: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Açıklama</label>
                <Textarea
                  value={editingProduct.summary || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, summary: e.target.value })}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                İptal
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleUpdateProduct(editingProduct)}
              >
                Kaydet ve Kapat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Resim Önizleme & Yönetim Galerisi */}
      {previewImages && (
        <Dialog open={!!previewImages} onOpenChange={() => setPreviewImages(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-sm font-semibold truncate max-w-lg">
                  🖼️ {previewImages.title} ({previewImages.urls.length} Fotoğraf)
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Görselleri inceleyin, ana kapak fotoğrafı yapın veya istemediklerinizi listeden kaldırın.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Büyük Görsel & İşlem Butonları */}
              <div className="relative h-96 w-full rounded-xl overflow-hidden bg-black/90 flex items-center justify-center group">
                {previewImages.urls.length > 0 ? (
                  <img
                    src={previewImages.urls[activeImageIndex]}
                    alt="Önizleme"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground text-sm">Görsel kalmadı.</div>
                )}

                {previewImages.urls.length > 0 && (
                  <>
                    <span className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-sm">
                      {activeImageIndex + 1} / {previewImages.urls.length}
                    </span>

                    {/* Resim Eylem Araç Çubuğu */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1 bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => {
                          const targetUrl = previewImages.urls[activeImageIndex];
                          setProducts((prev) =>
                            prev.map((p) =>
                              p.title === previewImages.title ? { ...p, coverUrl: targetUrl } : p
                            )
                          );
                          showNotification("success", "Bu görsel ana kapak fotoğrafı yapıldı!");
                        }}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Kapak Fotoğrafı Yap
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const targetUrl = previewImages.urls[activeImageIndex];
                          const nextUrls = previewImages.urls.filter((_, idx) => idx !== activeImageIndex);
                          setPreviewImages({
                            ...previewImages,
                            urls: nextUrls,
                          });
                          setActiveImageIndex(Math.max(0, activeImageIndex - 1));
                          setProducts((prev) =>
                            prev.map((p) => {
                              if (p.title === previewImages.title) {
                                const newImgs = p.images.filter((u) => u !== targetUrl);
                                const newCover = p.coverUrl === targetUrl ? newImgs[0] || "" : p.coverUrl;
                                return { ...p, images: newImgs, coverUrl: newCover };
                              }
                              return p;
                            })
                          );
                          showNotification("info", "Fotoğraf listeden kaldırıldı.");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Bu Resmi Kaldır
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Küçük Resim Şeridi */}
              {previewImages.urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {previewImages.urls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        idx === activeImageIndex
                          ? "border-emerald-500 scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Küçük ${idx}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
