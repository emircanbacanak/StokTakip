"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Edit,
  Archive,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
  Copy,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { TrendyolListing, TrendyolStatus } from "@/lib/types/database";
import { TrendyolProductEditModal } from "./trendyol-product-edit-modal";
import * as XLSX from "xlsx";

type ActiveTab = "all" | "active" | "pending" | "passive";
type BuyboxFilter = "all" | "in_buybox" | "out_buybox";
type SortOption =
  | "date-desc"
  | "date-asc"
  | "price-asc"
  | "price-desc"
  | "stock-desc"
  | "stock-asc"
  | "title-asc"
  | "title-desc";

const STATUS_CONFIG: Record<
  TrendyolStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  approved: {
    label: "Onaylandı",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  pending: {
    label: "Onay Bekliyor",
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  draft: {
    label: "Taslak",
    icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
    cls: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  rejected: {
    label: "Reddedildi",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    cls: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  passive: {
    label: "Arşivde / Pasif",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
};

// Tarayıcı Uyumlu Blob Excel İndirme Fonksiyonu
function downloadExcelFile(rows: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

  // Excel dosyasını ArrayBuffer olarak üret ve Blob'a dönüştür
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 500);
}

// Kart İçi Kaydırmalı Resim Galerisi Bileşeni
function ProductImageSlider({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[3/3.8] max-h-[280px] bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground border border-border">
        <Eye className="w-8 h-8 opacity-30" />
      </div>
    );
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full aspect-[3/3.8] max-h-[280px] min-h-[220px] rounded-xl overflow-hidden bg-neutral-100/60 dark:bg-neutral-900/60 border border-border group select-none flex items-center justify-center">
      {/* Tüm görseller DOM'da hazır tutulur - böylece geçiş 0ms gecikmeyle anında gerçekleşir */}
      {images.map((imgSrc, i) => (
        <img
          key={i}
          src={imgSrc}
          alt={`${title} - Görsel ${i + 1}`}
          loading="eager"
          className={`absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-150 ease-out ${
            i === currentIndex ? "opacity-100 z-[1]" : "opacity-0 pointer-events-none z-0"
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x400?text=Görsel+Yok";
          }}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
            title="Önceki Görsel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
            title="Sonraki Görsel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold z-10">
            {currentIndex + 1} / {images.length}
          </div>

          <div className="absolute bottom-2 inset-x-0 flex justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xs pointer-events-auto">
              {images.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === i
                      ? "bg-emerald-500 ring-2 ring-white scale-125 shadow-sm"
                      : "bg-orange-500 hover:bg-orange-400 ring-1 ring-black/20"
                  }`}
                  title={`Görsel ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ProductListingsView() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [listings, setListings] = useState<TrendyolListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingListing, setEditingListing] = useState<TrendyolListing | null>(null);

  // 1. Üst Sekmeler
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  // 2. Buybox Radio Filtresi
  const [buyboxFilter, setBuyboxFilter] = useState<BuyboxFilter>("all");

  // 3. Form Filtreleri
  const [filterBarcode, setFilterBarcode] = useState("");
  const [filterTitle, setFilterTitle] = useState("");
  const [filterModelCode, setFilterModelCode] = useState("");
  const [filterStockCode, setFilterStockCode] = useState("");
  const [filterGiftPackage, setFilterGiftPackage] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");

  // Detaylı Filtreler
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMinStock, setFilterMinStock] = useState("");
  const [filterMaxStock, setFilterMaxStock] = useState("");

  // 4. Sıralama & Sayfalama
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Ürünleri Yükle
  const loadListings = useCallback(
    async (syncWithTrendyol = false) => {
      if (syncWithTrendyol) setSyncing(true);
      else setLoading(true);

      try {
        const url = `/api/trendyol/products${syncWithTrendyol ? "?sync=true" : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Ürünler yüklenemedi");

        setListings(data.listings || []);
        if (syncWithTrendyol) {
          toast({
            title: "Başarılı",
            description: `${data.listings?.length || 0} ürün Trendyol'dan eşitlendi.`,
          });
        }
      } catch (err) {
        console.error("Listings load error:", err);
        toast({
          title: "Hata",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Kategoriler ve Markalar Listesi (Dinamik)
  const categories = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.category_id) set.add(l.category_id);
      else set.add("Vazo");
    });
    return Array.from(set);
  }, [listings]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.brand_name) set.add(l.brand_name);
    });
    return Array.from(set);
  }, [listings]);

  // Sayı İstatistikleri
  const counts = useMemo(() => {
    const active = listings.filter((l) => l.trendyol_status === "approved").length;
    const pending = listings.filter((l) => l.trendyol_status === "pending" || l.trendyol_status === "draft").length;
    const passiveList = listings.filter((l) => l.trendyol_status === "passive");
    const passive = passiveList.length;
    // Trendyol Satıcı Paneli mantığı: Ana Ürün Kartı (contentId/model) sayısı
    const passiveCards = new Set(passiveList.map((l) => l.trendyol_product_id || l.title)).size;
    const total = active; // Trendyol panelinde Aktif = 73
    return { total, active, pending, passive, passiveCards };
  }, [listings]);

  // Kopyalama Yardımcısı
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopyalandı", description: `${label}: ${text}` });
  };

  // Filtreleri Temizle
  const handleClearFilters = () => {
    setFilterBarcode("");
    setFilterTitle("");
    setFilterModelCode("");
    setFilterStockCode("");
    setFilterGiftPackage("all");
    setFilterCategory("all");
    setFilterBrand("all");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMinStock("");
    setFilterMaxStock("");
    setBuyboxFilter("all");
    setCurrentPage(1);
    setJumpPageInput("1");
    toast({ title: "Filtreler Temizlendi" });
  };

  // Ürünü Arşive Al (Hızlı Aksiyon)
  const handleArchive = async (item: TrendyolListing) => {
    const confirmed = await confirm({
      title: "Ürünü Pasife Al",
      message: `"${item.title}" ürününü pasife almak / arşivlemek istediğinize emin misiniz?`,
      confirmText: "Evet, Pasife Al",
      cancelText: "Vazgeç",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/trendyol/products?barcode=${item.barcode}&archive=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "İşlem başarısız");

      toast({ title: "Ürün Arşive Alındı", description: "Ürün pasife çekildi." });
      loadListings();
    } catch (err) {
      toast({
        title: "Hata",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Filtrelenmiş ve Sıralanmış Liste (Sadece filtreye uyan ürünler!)
  const processedListings = useMemo(() => {
    return listings
      .filter((item) => {
        // 1. Üst Sekme Filtresi
        if (activeTab === "all" || activeTab === "active") {
          if (item.trendyol_status !== "approved") return false;
        } else if (activeTab === "pending") {
          if (item.trendyol_status !== "pending" && item.trendyol_status !== "draft") return false;
        } else if (activeTab === "passive") {
          if (item.trendyol_status !== "passive") return false;
        }

        // 2. Buybox Filtresi
        if (buyboxFilter === "in_buybox") return false;

        // 3. Metin Filtreleri
        if (filterBarcode.trim() && !item.barcode?.toLowerCase().includes(filterBarcode.toLowerCase().trim())) {
          return false;
        }
        if (filterTitle.trim() && !item.title?.toLowerCase().includes(filterTitle.toLowerCase().trim())) {
          return false;
        }
        if (filterModelCode.trim()) {
          const mc = ((item as any).model_code || (item as any).batch_id || item.stock_code || "").toLowerCase();
          if (!mc.includes(filterModelCode.toLowerCase().trim())) {
            return false;
          }
        }
        if (filterStockCode.trim() && !item.stock_code?.toLowerCase().includes(filterStockCode.toLowerCase().trim())) {
          return false;
        }

        // 4. Dropdown Filtreleri
        if (filterBrand !== "all" && item.brand_name !== filterBrand) return false;

        // 5. Detaylı Sayısal Filtreler
        if (filterMinPrice && (item.sale_price || 0) < Number(filterMinPrice)) return false;
        if (filterMaxPrice && (item.sale_price || 0) > Number(filterMaxPrice)) return false;
        if (filterMinStock && (item.quantity || 0) < Number(filterMinStock)) return false;
        if (filterMaxStock && (item.quantity || 0) > Number(filterMaxStock)) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date-desc": {
            const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : new Date(a.created_at || 0).getTime();
            const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : new Date(b.created_at || 0).getTime();
            return timeB - timeA;
          }
          case "date-asc": {
            const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : new Date(a.created_at || 0).getTime();
            const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : new Date(b.created_at || 0).getTime();
            return timeA - timeB;
          }
          case "price-asc":
            return (a.sale_price || 0) - (b.sale_price || 0);
          case "price-desc":
            return (b.sale_price || 0) - (a.sale_price || 0);
          case "stock-desc":
            return (b.quantity || 0) - (a.quantity || 0);
          case "stock-asc":
            return (a.quantity || 0) - (b.quantity || 0);
          case "title-asc":
            return (a.title || "").localeCompare(b.title || "");
          case "title-desc":
            return (b.title || "").localeCompare(a.title || "");
          default:
            return 0;
        }
      });
  }, [
    listings,
    activeTab,
    buyboxFilter,
    filterBarcode,
    filterTitle,
    filterModelCode,
    filterStockCode,
    filterBrand,
    filterMinPrice,
    filterMaxPrice,
    filterMinStock,
    filterMaxStock,
    sortBy,
  ]);

  // Sayfalama Hesaplaması
  const totalPages = Math.max(1, Math.ceil(processedListings.length / pageSize));
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedListings.slice(start, start + pageSize);
  }, [processedListings, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setJumpPageInput(String(page));
  };

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Excel Dışa Aktarma: KESİNLİKLE SADECE FİLTRELENMİŞ ÜRÜNLERİ .XLSX OLARAK İNDİRİR
  const handleExportFilteredExcel = async () => {
    if (processedListings.length === 0) {
      toast({
        title: "İndirilecek Ürün Yok",
        description: "Mevcut filtre kriterlerine uygun ürün bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const rows = processedListings.map((item) => ({
        "Ürün Adı": item.title,
        "Barkod": item.barcode,
        "Model Kodu": (item as any).model_code || (item as any).batch_id || item.stock_code,
        "Stok Kodu (SKU)": item.stock_code,
        "Marka": item.brand_name || "ahenk tasarım",
        "Kategori": "Vazo",
        "Trendyol Satış Fiyatı (TL)": item.sale_price,
        "Piyasa Fiyatı (TL)": item.list_price || item.sale_price,
        "Komisyon Oranı": "%21",
        "Müşterinin Gördüğü Fiyat": item.sale_price,
        "Stok": item.quantity,
        "Termin Süresi (Gün)": 0,
        "KDV Oranı (%)": item.vat_rate || 20,
        "Desi": item.desi || 2,
        "Durum": STATUS_CONFIG[item.trendyol_status]?.label || item.trendyol_status,
        "Trendyol Ürün ID": item.trendyol_product_id,
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Trendyol_Filtrelenen_Urunler_${processedListings.length}Adet_${dateStr}.xlsx`;

      // 1. Sunucu API rotasından gerçek .xlsx indir
      const res = await fetch("/api/trendyol/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows, filename }),
      });

      if (!res.ok) {
        throw new Error("Excel dosyası sunucudan indirilemedi.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.style.display = "none";
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();

      setTimeout(() => {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast({
        title: "Excel İndirildi",
        description: `Filtrelenen ${rows.length} adet ürün "${filename}" adıyla Excel dosyası olarak indirildi.`,
      });
    } catch (err) {
      console.error("Excel download error:", err);
      toast({
        title: "Excel İndirme Hatası",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Dinamik Başlık
  const subheaderTitle = useMemo(() => {
    switch (activeTab) {
      case "active":
        return `Aktif Ürünler - ${buyboxFilter === "all" ? "Tümü" : buyboxFilter === "in_buybox" ? "Buybox Dahil Olanlar" : "Buybox Dahil Olmayanlar"}`;
      case "passive":
        return "Pasif Ürünler";
      case "pending":
        return "Onay Sürecindeki Ürünler";
      case "all":
      default:
        return "Tüm Ürünler - Tümü";
    }
  }, [activeTab, buyboxFilter]);



  return (
    <div className="space-y-4">
      {/* ─── 1. BÖLÜM: TRENDYOL SATICI PANELİ ÜST SEKME ÇUBUĞU ─── */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Üst Sekmeler */}
        <div className="flex flex-wrap items-center border-b border-border bg-muted/10 px-4 pt-3 pb-0 gap-2">
          {/* Tüm Ürünler */}
          <button
            onClick={() => {
              setActiveTab("all");
              setCurrentPage(1);
            }}
            className={`flex flex-col items-center pb-3 px-6 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === "all"
                ? "border-orange-500 text-orange-600 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Tüm Ürünler</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs mt-0.5 opacity-80">{counts.total} Ürün(ler)</span>
          </button>

          {/* Aktif Ürünler */}
          <button
            onClick={() => {
              setActiveTab("active");
              setCurrentPage(1);
            }}
            className={`flex flex-col items-center pb-3 px-6 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === "active"
                ? "border-orange-500 text-orange-600 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Aktif Ürünler</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs mt-0.5 opacity-80">{counts.active} Ürün(ler)</span>
          </button>

          {/* Onay Sürecindeki Ürünler */}
          <button
            onClick={() => {
              setActiveTab("pending");
              setCurrentPage(1);
            }}
            className={`flex flex-col items-center pb-3 px-6 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === "pending"
                ? "border-orange-500 text-orange-600 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Onay Sürecindeki Ürünler</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs mt-0.5 opacity-80">{counts.pending} Ürün(ler)</span>
          </button>

          {/* Pasif Ürünler */}
          <button
            onClick={() => {
              setActiveTab("passive");
              setCurrentPage(1);
            }}
            className={`flex flex-col items-center pb-3 px-6 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === "passive"
                ? "border-orange-500 text-orange-600 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Pasif Ürünler</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs mt-0.5 opacity-80">
              {counts.passiveCards === counts.passive
                ? `${counts.passive} Ürün(ler)`
                : `${counts.passiveCards} Ürün (${counts.passive} Varyant)`}
            </span>
          </button>

          {/* Canlı Eşitleme Butonu Sağda */}
          <div className="ml-auto pb-3">
            <Button
              onClick={() => loadListings(true)}
              disabled={syncing || loading}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Eşitleniyor..." : "Canlı Eşitle"}
            </Button>
          </div>
        </div>

        {/* Alt Satır: Buybox Radio Filtreleri */}
        <div className="px-5 py-3 bg-card border-b border-border flex items-center gap-6 text-xs select-none">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="radio"
              name="buybox_radio"
              checked={buyboxFilter === "all"}
              onChange={() => setBuyboxFilter("all")}
              className="accent-orange-500 w-4 h-4 cursor-pointer"
            />
            <span className={buyboxFilter === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
              Tümü ({counts.active})
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="radio"
              name="buybox_radio"
              checked={buyboxFilter === "in_buybox"}
              onChange={() => setBuyboxFilter("in_buybox")}
              className="accent-orange-500 w-4 h-4 cursor-pointer"
            />
            <span className={buyboxFilter === "in_buybox" ? "font-bold text-foreground" : "text-muted-foreground"}>
              Buybox Dahil Olanlar (0)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="radio"
              name="buybox_radio"
              checked={buyboxFilter === "out_buybox"}
              onChange={() => setBuyboxFilter("out_buybox")}
              className="accent-orange-500 w-4 h-4 cursor-pointer"
            />
            <span className={buyboxFilter === "out_buybox" ? "font-bold text-foreground" : "text-muted-foreground"}>
              Buybox Dahil Olmayanlar ({counts.active})
            </span>
          </label>
        </div>

        {/* ─── FİLTRELEME ALANLARI ─── */}
        <div className="p-5 space-y-3.5 bg-card">
          {/* Satır 1: Barkod, Ürün Adı, Model Kodu, Stok Kodu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              value={filterBarcode}
              onChange={(e) => {
                setFilterBarcode(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Barkod"
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Input
              value={filterTitle}
              onChange={(e) => {
                setFilterTitle(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ürün Adı"
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Input
              value={filterModelCode}
              onChange={(e) => {
                setFilterModelCode(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Model Kodu"
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Input
              value={filterStockCode}
              onChange={(e) => {
                setFilterStockCode(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Stok Kodu"
              className="h-9 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Satır 2: Hediye Paketi, Kategori, Marka + Aksiyonlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Hediye Paketi */}
            <select
              value={filterGiftPackage}
              onChange={(e) => {
                setFilterGiftPackage(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs rounded-xl bg-background border border-input px-3 text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="all">Hediye Paketi: Tümü</option>
              <option value="true">Hediye Paketi Yapılabilir</option>
              <option value="false">Hediye Paketi İstemiyorum</option>
            </select>

            {/* Kategori */}
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs rounded-xl bg-background border border-input px-3 text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="all">Kategori: Tümü</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Marka */}
            <select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs rounded-xl bg-background border border-input px-3 text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="all">Marka: Tümü</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Buton Grubu: Detaylı Aç, Temizle, Filtrele */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDetailedFilters((prev) => !prev)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                {showDetailedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Detaylı Filtreyi {showDetailedFilters ? "Kapat" : "Aç"}
              </button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs font-semibold px-3 rounded-xl"
              >
                Temizle
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCurrentPage(1);
                  toast({
                    title: "Filtrelendi",
                    description: `${processedListings.length} adet ürün listelendi.`,
                  });
                }}
                className="h-9 text-xs font-bold px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Filtrele
              </Button>
            </div>
          </div>

          {/* Detaylı Filtre Açılır Bölümü */}
          {showDetailedFilters && (
            <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Min Fiyat (₺)</label>
                <Input
                  type="number"
                  value={filterMinPrice}
                  onChange={(e) => {
                    setFilterMinPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="0.00"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Max Fiyat (₺)</label>
                <Input
                  type="number"
                  value={filterMaxPrice}
                  onChange={(e) => {
                    setFilterMaxPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="10000"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Min Stok</label>
                <Input
                  type="number"
                  value={filterMinStock}
                  onChange={(e) => {
                    setFilterMinStock(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="0"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Max Stok</label>
                <Input
                  type="number"
                  value={filterMaxStock}
                  onChange={(e) => {
                    setFilterMaxStock(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="99999"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. BÖLÜM: ALT BAŞLIK & TABLO ÖZELLEŞTİR & EXCEL & SAYFALAMA ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 border-b border-border">
        {/* Sol: Başlık & Sıralama Seçenekleri */}
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-base font-bold text-foreground">
            {subheaderTitle}
            <span className="text-xs text-muted-foreground font-normal ml-2">
              ({processedListings.length} ürün)
            </span>
          </h2>

          {/* Sıralama Seçenekleri Dropdown */}
          <div className="relative inline-flex items-center">
            <label className="absolute -top-2 left-2 px-1 bg-background text-[10px] font-bold text-muted-foreground z-10">
              Oluşturulma Tarihi / Sıralama
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 pt-1 pb-0 text-xs font-semibold rounded-xl bg-background border border-input pl-3 pr-8 focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="date-desc">Yeniden Eskiye (En Yeni)</option>
              <option value="date-asc">Eskiden Yeniye (En Eski)</option>
              <option value="price-asc">Fiyat: Artan (En Düşük Fiyat)</option>
              <option value="price-desc">Fiyat: Azalan (En Yüksek Fiyat)</option>
              <option value="stock-desc">Stok: Azalan (En Çok Stok)</option>
              <option value="stock-asc">Stok: Artan (En Az Stok)</option>
              <option value="title-asc">Ürün Adı: A - Z</option>
              <option value="title-desc">Ürün Adı: Z - A</option>
            </select>
          </div>
        </div>

        {/* Sağ: Excel ile İndir & Sayfa Boyutu & Sayfaya Git & Sayfa Numaraları */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Excel İle İndir: SADECE FİLTRELENENLERİ İNDİRİR */}
          <button
            onClick={handleExportFilteredExcel}
            className="h-8 px-3 rounded-lg border border-input bg-card hover:bg-muted font-bold text-foreground flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/40"
            title="Sadece ekranda filtrelenen sonuçları Excel (.xlsx) olarak indir"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel İle İndir ({processedListings.length})</span>
          </button>

          {/* Her Sayfada */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Her Sayfada</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 text-xs font-bold rounded-lg border border-input bg-card px-2 cursor-pointer"
            >
              <option value={12}>12 Ürün(ler)</option>
              <option value={20}>20 Ürün(ler)</option>
              <option value={50}>50 Ürün(ler)</option>
              <option value={100}>100 Ürün(ler)</option>
            </select>
          </div>

          {/* Sayfaya Git */}
          <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1">
            <span className="text-muted-foreground">Sayfaya Git</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-12 h-8 text-xs font-bold text-center rounded-lg border border-input bg-card"
            />
          </form>

          {/* Sayfalama Düğmeleri */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-input bg-card hover:bg-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                p = currentPage - 3 + i;
                if (p > totalPages) p = totalPages - (4 - i);
              }
              if (p < 1) p = 1;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    currentPage === p
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-card border border-input hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-input bg-card hover:bg-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. BÖLÜM: LİSTELEME (TABLO VEYA KART GÖRÜNÜMÜ) ─── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : processedListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 text-orange-600">
            <Package className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">Kriterlere Uygun Ürün Bulunamadı</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Arama veya filtre kriterlerinizi değiştirerek tekrar deneyebilirsiniz.
          </p>
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-4 text-xs">
            Filtreleri Temizle
          </Button>
        </div>
      ) : (
        /* ─── KART GÖRÜNÜMÜ (SLIDER) ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5">
          {paginatedListings.map((item) => {
            const statusConfig = STATUS_CONFIG[item.trendyol_status] || STATUS_CONFIG.draft;
            const images = item.image_urls || [];

            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
              >
                {/* Görsel Galerisi */}
                <div className="p-3 pb-0">
                  <ProductImageSlider images={images} title={item.title} />
                </div>

                {/* İçerik */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Durum Rozeti & Marka */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.cls}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[120px]">
                        {item.brand_name || "Ahenk Tasarımlar"}
                      </span>
                    </div>

                    {/* Başlık */}
                    <h4
                      className="font-bold text-xs text-foreground line-clamp-2 leading-relaxed group-hover:text-orange-600 transition-colors cursor-pointer"
                      onClick={() => setEditingListing(item)}
                      title={item.title}
                    >
                      {item.title}
                    </h4>

                    {/* Kod Bilgileri */}
                    <div className="bg-muted/40 rounded-xl p-2.5 text-[11px] space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Barkod:</span>
                        <span className="font-bold text-foreground select-all">{item.barcode}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Model Kodu:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400 select-all truncate max-w-[140px]">
                          {(item as any).model_code || (item as any).batch_id || item.stock_code}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Stok Kodu:</span>
                        <span className="font-semibold text-foreground select-all truncate max-w-[140px]">
                          {item.stock_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fiyat & Stok */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-foreground">
                        ₺{(item.sale_price || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </div>
                      {item.list_price && item.list_price > item.sale_price && (
                        <div className="text-[10px] text-muted-foreground line-through">
                          ₺{item.list_price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          (item.quantity || 0) > 5
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : (item.quantity || 0) > 0
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        Stok: {item.quantity || 0}
                      </span>
                    </div>
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      onClick={() => setEditingListing(item)}
                      size="sm"
                      className="flex-1 h-8 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Düzenle
                    </Button>

                    {item.trendyol_status !== "passive" && (
                      <Button
                        onClick={() => handleArchive(item)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-orange-600 hover:border-orange-500/30 rounded-xl cursor-pointer"
                        title="Ürünü Arşive Al"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── DÜZENLEME MODALI ─── */}
      {editingListing && (
        <TrendyolProductEditModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            setEditingListing(null);
            loadListings();
          }}
        />
      )}



      {/* ─── ONAY POP-UP MODALI ─── */}
      <ConfirmDialog />
    </div>
  );
}
