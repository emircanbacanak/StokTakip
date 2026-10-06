"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
  Tag,
  Copy,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { TrendyolListing } from "@/lib/types/database";
import { TrendyolProductEditModal } from "./trendyol-product-edit-modal";
import { detectCategoryFromProduct } from "@/lib/trendyol-categories-static";
import { naturalSort } from "@/lib/utils";
import * as XLSX from "xlsx";

type StatusTab = "all" | "active" | "sold_out" | "pending" | "passive";

// Görsel Kaydırıcı Bileşeni (Sıfır gecikme, DOM içi önbellekli)
function ProductImageSlider({ images, title }: { images: string[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square max-h-[220px] bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground border border-border">
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
    <div className="relative w-full aspect-square max-h-[220px] rounded-xl overflow-hidden bg-neutral-100/60 dark:bg-neutral-900/60 border border-border group select-none flex items-center justify-center">
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
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/65 text-white text-[9px] font-bold z-10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

interface ModelGroup {
  key: string;
  title: string;
  groupCode: string;
  brandName: string;
  categoryName: string;
  items: TrendyolListing[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  activeCount: number;
  soldOutCount: number;
  passiveCount: number;
  pendingCount: number;
  mainImage: string;
}

export function TrendyolListingsView() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [listings, setListings] = useState<TrendyolListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Görünüm Modu: "grouped" (Model Gruplu) | "flat" (Düz Liste)
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Açık olan Model Grupları
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Çoklu Seçim (Checkbox) State'i
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filtreler (Varsayılan olarak sadece aktif 'Satışta' olanlar gelir)
  const [activeTab, setActiveTab] = useState<StatusTab>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");

  // Düzenleme Modalı
  const [editingListing, setEditingListing] = useState<TrendyolListing | null>(null);

  // Hızlı Inline Fiyat / Stok Düzenleme State'leri
  const [editingPrices, setEditingPrices] = useState<Record<string, { listPrice: number; salePrice: number }>>({});
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({});
  const [savingInline, setSavingInline] = useState<Record<string, boolean>>({});

  // Model Kodunu Belirle
  const getModelCode = useCallback((item: TrendyolListing): string => {
    return (
      (item as any).product_main_id ||
      (item as any).model_code ||
      (item as any).batch_id ||
      item.stock_code?.split("-").slice(0, 3).join("-") ||
      item.stock_code ||
      "GENEL"
    );
  }, []);

  // Ürünleri Yükle
  const loadListings = useCallback(async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setLoading(true);

    try {
      const url = isSync ? "/api/trendyol/products?sync=true" : "/api/trendyol/products";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Trendyol ürünleri alınamadı");
      }

      const list: TrendyolListing[] = data.listings || [];
      setListings(list);
      setTotalCount(list.length);

      // Fiyat ve Stok başlangıç değerlerini ata
      const prices: Record<string, { listPrice: number; salePrice: number }> = {};
      const stocks: Record<string, number> = {};
      list.forEach((item) => {
        prices[item.barcode] = {
          listPrice: item.list_price || item.sale_price || 0,
          salePrice: item.sale_price || 0,
        };
        stocks[item.barcode] = item.quantity || 0;
      });
      setEditingPrices(prices);
      setEditingStocks(stocks);

      if (isSync) {
        toast({
          title: "Trendyol Kataloğu Eşitlendi",
          description: `${list.length} adet ürün canlı Trendyol sisteminden başarıyla güncellendi.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Trendyol API Hatası",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Model Gruplaması (Pazarama ile birebir aynı akordeon yapısı)
  const modelGroups = useMemo<ModelGroup[]>(() => {
    const map = new Map<string, TrendyolListing[]>();

    listings.forEach((item) => {
      const groupCode = getModelCode(item);
      const modelTitle = item.title ? item.title.split(" - ")[0].trim() : groupCode;
      const key = groupCode;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    const groups: ModelGroup[] = [];
    map.forEach((items, key) => {
      const sortedItems = naturalSort(items, (i) => i.title);
      const first = sortedItems[0];
      const totalStock = sortedItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      const prices = sortedItems.map((i) => i.sale_price || 0).filter((p) => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : first.sale_price || 0;
      const maxPrice = prices.length ? Math.max(...prices) : first.sale_price || 0;
      const activeCount = sortedItems.filter((i) => i.trendyol_status === "approved" && (i.quantity || 0) > 0).length;
      const soldOutCount = sortedItems.filter((i) => i.trendyol_status === "approved" && (i.quantity || 0) === 0).length;
      const passiveCount = sortedItems.filter((i) => i.trendyol_status === "passive" || i.trendyol_status === "rejected").length;
      const pendingCount = sortedItems.filter((i) => i.trendyol_status === "pending" || i.trendyol_status === "draft").length;

      // Modelin ana görseli
      const mainImg = first.image_urls?.[0] || (first as any).images?.[0] || "";

      groups.push({
        key,
        title: first.title.split(" - ")[0].trim() || key,
        groupCode: key,
        brandName: first.brand_name || "Ahenk Tasarım",
        categoryName: detectCategoryFromProduct(first).name,
        items: sortedItems,
        totalStock,
        minPrice,
        maxPrice,
        activeCount,
        soldOutCount,
        passiveCount,
        pendingCount,
        mainImage: mainImg,
      });
    });

    return naturalSort(groups, (g) => g.title);
  }, [listings, getModelCode]);

  // Model Kodları Listesi (Dropdown için)
  const uniqueGroupCodes = useMemo(() => {
    const set = new Set<string>();
    modelGroups.forEach((g) => {
      if (g.groupCode) set.add(g.groupCode);
    });
    return naturalSort(Array.from(set));
  }, [modelGroups]);

  // Filtreleme (Durum sekmeleri ve Arama terimi)
  const filteredListings = useMemo<TrendyolListing[]>(() => {
    const list = listings.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const title = (item.title || "").toLowerCase();
        const barcode = (item.barcode || "").toLowerCase();
        const stockCode = (item.stock_code || "").toLowerCase();
        const group = getModelCode(item).toLowerCase();
        const brand = (item.brand_name || "").toLowerCase();
        if (
          !title.includes(q) &&
          !barcode.includes(q) &&
          !stockCode.includes(q) &&
          !group.includes(q) &&
          !brand.includes(q)
        ) {
          return false;
        }
      }

      if (selectedGroupCode && getModelCode(item).toLowerCase() !== selectedGroupCode.toLowerCase()) {
        return false;
      }

      if (activeTab === "active" && (item.trendyol_status !== "approved" || (item.quantity || 0) <= 0)) return false;
      if (activeTab === "sold_out" && (item.trendyol_status !== "approved" || (item.quantity || 0) > 0)) return false;
      if (activeTab === "pending" && item.trendyol_status !== "pending" && item.trendyol_status !== "draft") return false;
      if (activeTab === "passive" && item.trendyol_status !== "passive" && item.trendyol_status !== "rejected") return false;

      return true;
    });

    return naturalSort(list, (i) => i.title);
  }, [listings, searchTerm, selectedGroupCode, activeTab, getModelCode]);

  // Filtrelenmiş Model Grupları
  const filteredGroups = useMemo<ModelGroup[]>(() => {
    const validBarcodes = new Set(filteredListings.map((i) => i.barcode));
    return modelGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => validBarcodes.has(it.barcode)),
      }))
      .filter((g) => g.items.length > 0);
  }, [modelGroups, filteredListings]);

  // Grup Aç / Kapa (Varsayılan olarak tüm kartlar kapalıdır)
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(modelGroups.map((g) => g.key)));
  const collapseAll = () => setExpandedGroups(new Set());

  // Grup Seçim (Checkbox)
  const toggleSelectGroup = (items: TrendyolListing[]) => {
    const allSelected = items.every((it) => selectedBarcodes.has(it.barcode));
    setSelectedBarcodes((prev) => {
      const next = new Set(prev);
      items.forEach((it) => {
        if (allSelected) next.delete(it.barcode);
        else next.add(it.barcode);
      });
      return next;
    });
  };

  const toggleSelectBarcode = (barcode: string) => {
    setSelectedBarcodes((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBarcodes.size === filteredListings.length) {
      setSelectedBarcodes(new Set());
    } else {
      setSelectedBarcodes(new Set(filteredListings.map((i) => i.barcode)));
    }
  };

  // Sekme sayaçları
  const tabCounts = useMemo(() => {
    const active = listings.filter((l) => l.trendyol_status === "approved" && (l.quantity || 0) > 0).length;
    const soldOut = listings.filter((l) => l.trendyol_status === "approved" && (l.quantity || 0) === 0).length;
    const pending = listings.filter((l) => l.trendyol_status === "pending" || l.trendyol_status === "draft").length;
    const passive = listings.filter((l) => l.trendyol_status === "passive" || l.trendyol_status === "rejected").length;
    return { active, soldOut, pending, passive };
  }, [listings]);

  // Hızlı Inline Fiyat Kaydet
  const handleSavePrice = async (barcode: string, groupCode?: string, syncVariants = false) => {
    const prices = editingPrices[barcode];
    if (!prices || prices.salePrice <= 0 || prices.listPrice <= 0) {
      toast({ title: "Geçersiz Fiyat", description: "Lütfen geçerli bir fiyat girin.", variant: "destructive" });
      return;
    }

    setSavingInline((prev) => ({ ...prev, [`price-${barcode}`]: true }));
    try {
      const res = await fetch("/api/trendyol/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode,
          list_price: prices.listPrice,
          sale_price: prices.salePrice,
          updateByModelCode: syncVariants,
          modelCode: groupCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Fiyat güncellenemedi");

      toast({ title: "Fiyat Güncellendi", description: "Trendyol fiyatı başarıyla güncellendi." });
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSavingInline((prev) => ({ ...prev, [`price-${barcode}`]: false }));
    }
  };

  // Hızlı Inline Stok Kaydet
  const handleSaveStock = async (barcode: string, groupCode?: string, syncVariants = false) => {
    const stock = editingStocks[barcode];
    if (stock === undefined || stock < 0) {
      toast({ title: "Geçersiz Stok", description: "Stok 0 veya daha büyük olmalıdır.", variant: "destructive" });
      return;
    }

    setSavingInline((prev) => ({ ...prev, [`stock-${barcode}`]: true }));
    try {
      const res = await fetch("/api/trendyol/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode,
          quantity: stock,
          updateByModelCode: syncVariants,
          modelCode: groupCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Stok güncellenemedi");

      toast({ title: "Stok Güncellendi", description: "Trendyol stoğu başarıyla güncellendi." });
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSavingInline((prev) => ({ ...prev, [`stock-${barcode}`]: false }));
    }
  };

  // Ürünü veya Modeli Pasife Al / Sil
  const handleArchive = async (item: TrendyolListing, isModel = false, modelItems?: TrendyolListing[]) => {
    const title = isModel
      ? `"${item.title.split(" - ")[0].trim()}" Modelindeki Tüm Varyantları Pasife Al`
      : `"${item.title}" Ürününü Pasife Al`;

    const message = isModel
      ? `Bu modele ait toplam ${modelItems?.length || 1} varyantın tümü Trendyol satışından kaldırılacak ve arşive alınacaktır. Devam etmek istiyor musunuz?`
      : `"${item.title}" ürünü Trendyol satışından kaldırılacak ve arşive alınacaktır.`;

    const confirmed = await confirm({
      title,
      message,
      confirmText: "Evet, Pasife Al",
      cancelText: "Vazgeç",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      if (isModel && modelItems && modelItems.length > 0) {
        for (const it of modelItems) {
          await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(it.barcode)}&archive=true`, {
            method: "DELETE",
          });
        }
      } else {
        await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(item.barcode)}&archive=true`, {
          method: "DELETE",
        });
      }

      toast({
        title: "Pasife Alındı",
        description: isModel ? "Modeldeki tüm varyantlar pasife çekildi." : "Ürün pasife çekildi.",
      });
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  // Toplu Pasife Al
  const handleBulkArchive = async () => {
    if (selectedBarcodes.size === 0) return;
    const confirmed = await confirm({
      title: "Toplu Pasife Al",
      message: `Seçili ${selectedBarcodes.size} adet ürünü pasife almak / arşivlemek istediğinize emin misiniz?`,
      confirmText: "Evet, Pasife Al",
      cancelText: "Vazgeç",
      variant: "danger",
    });
    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      for (const barcode of Array.from(selectedBarcodes)) {
        await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(barcode)}&archive=true`, {
          method: "DELETE",
        });
      }
      toast({
        title: "İşlem Tamamlandı",
        description: `${selectedBarcodes.size} adet ürün pasife çekildi.`,
      });
      setSelectedBarcodes(new Set());
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Kopyalama
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopyalandı", description: `${label}: ${text}` });
  };

  // Excel İndirme
  const handleExportExcel = () => {
    if (filteredListings.length === 0) {
      toast({ title: "Veri Yok", description: "Dışa aktarılacak ürün bulunamadı." });
      return;
    }

    const rows = filteredListings.map((it) => ({
      Barkod: it.barcode,
      "Model Kodu": getModelCode(it),
      "Stok Kodu": it.stock_code,
      "Ürün Adı": it.title,
      Marka: it.brand_name,
      Kategori: detectCategoryFromProduct(it).name,
      "Piyasa Satış Fiyatı (Liste)": it.list_price,
      "Trendyol Satış Fiyatı": it.sale_price,
      Stok: it.quantity,
      "KDV %": it.vat_rate,
      Desi: it.desi,
      Durum: it.trendyol_status === "approved" ? "Onaylandı" : it.trendyol_status === "passive" ? "Pasif" : "Onay Bekliyor",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trendyol_Ürünler");
    XLSX.writeFile(workbook, `Trendyol_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmDialog />

      {/* ─── 1. ÜST BİLGİ & EŞİTLEME ÇUBUĞU (PAZARAMA STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black shadow-xs">
            <span className="text-sm">TY</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">Trendyol Ürün & Model Kataloğum</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                {tabCounts.active} Satışta {tabCounts.passive > 0 ? `• ${tabCounts.passive} Kapalı` : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aynı model kodundaki tüm renk varyantlarını tek çatı altında derli toplu yönetin, toplu güncelleyin veya silin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Görünüm Değiştirici */}
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              Model Gruplu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "flat"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Düz Liste
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadListings(true)}
            disabled={loading || syncing}
            className="gap-2 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-orange-600" : ""}`} />
            {syncing ? "Eşitleniyor..." : "Trendyol'dan Güncelle"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel İndir
          </Button>
        </div>
      </div>

      {/* ─── 2. FİLTRELER VE ARAMA (PAZARAMA STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Durum Sekmeleri & Aç/Kapa Düğmeleri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Satışta ({tabCounts.active})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sold_out")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sold_out"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Stoğu Bitenler ({tabCounts.soldOut})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "pending"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Onay Bekliyor ({tabCounts.pending})
            </button>
            {tabCounts.passive > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("passive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "passive"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Satışa Kapalı ({tabCounts.passive})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "all"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Tüm Kayıtlar ({listings.length})
            </button>
          </div>

          {viewMode === "grouped" && (
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="text-orange-600 hover:underline font-semibold cursor-pointer"
              >
                Tümünü Aç
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
              >
                Tümünü Daralt
              </button>
            </div>
          )}
        </div>

        {/* Arama & Model Kodu Seçimi & Tümünü Seç */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Model adı, barkod, renk veya stok kodu ile ara..."
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={selectedGroupCode}
              onChange={(e) => setSelectedGroupCode(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              <option value="">Tüm Modeller ({uniqueGroupCodes.length} Model)</option>
              {uniqueGroupCodes.map((gc) => (
                <option key={gc} value={gc}>
                  {gc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedBarcodes.size > 0 && selectedBarcodes.size === filteredListings.length}
                onChange={toggleSelectAll}
                className="rounded border-border w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              Tümünü Seç ({selectedBarcodes.size}/{filteredListings.length})
            </label>
          </div>
        </div>
      </div>

      {/* ─── 3. LİSTELEME ALANI ─── */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          <RefreshCw className="w-9 h-9 mx-auto animate-spin text-orange-600 mb-3" />
          <p className="text-sm font-bold text-foreground">Trendyol Ürünleri Yükleniyor...</p>
          <p className="text-xs text-muted-foreground mt-1">Canlı ürün ve model varyantları eşitleniyor.</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground space-y-3">
          <Package className="w-12 h-12 mx-auto opacity-30 text-orange-600" />
          <h3 className="text-base font-bold text-foreground">Ürün Bulunamadı</h3>
          <p className="text-xs max-w-md mx-auto">
            Arama kriterlerinize veya seçilen duruma uygun ürün bulunamadı.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ================= 1. MODEL BAZLI AÇILIR/KAPANIR AKORDEON GÖRÜNÜMÜ ================= */
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const allGroupSelected = group.items.every((it) => selectedBarcodes.has(it.barcode));
            const someGroupSelected = group.items.some((it) => selectedBarcodes.has(it.barcode));

            return (
              <div
                key={group.key}
                className="bg-card border border-border hover:border-orange-500/40 rounded-2xl overflow-hidden shadow-xs transition-all"
              >
                {/* MODEL ANA BAŞLIK KARTI */}
                <div
                  onClick={() => toggleGroup(group.key)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer bg-card hover:bg-muted/30 transition-colors select-none"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Model Checkbox */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 flex items-center justify-center"
                    >
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someGroupSelected && !allGroupSelected;
                        }}
                        onChange={() => toggleSelectGroup(group.items)}
                        className="rounded border-border w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>

                    {/* Model Görseli */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-border bg-neutral-100 dark:bg-neutral-900 shrink-0 flex items-center justify-center p-1 relative">
                      {group.mainImage ? (
                        <img
                          src={group.mainImage}
                          alt={group.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Model";
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold px-1 rounded-full">
                        {group.items.length}
                      </span>
                    </div>

                    {/* Model Başlık & Bilgileri */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 font-mono">
                          Model Kodu: {group.groupCode || group.key}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                          {group.brandName || "Ahenk Tasarım"}
                        </span>

                        {group.categoryName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {group.categoryName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                        {group.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground pt-0.5">
                        <span className="font-semibold text-foreground">
                          {group.items.length} Varyant / Renk
                        </span>
                        <span>•</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {group.minPrice === group.maxPrice
                            ? `${group.minPrice.toLocaleString("tr-TR")} ₺`
                            : `${group.minPrice.toLocaleString("tr-TR")} ₺ - ${group.maxPrice.toLocaleString("tr-TR")} ₺`}
                        </span>
                        <span>•</span>
                        <span>
                          Toplam Stok: <strong className="text-foreground">{group.totalStock.toLocaleString("tr-TR")} Adet</strong>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">
                          {group.activeCount} Satışta
                        </span>
                        {group.soldOutCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-semibold">
                              {group.soldOutCount} Stoğu Bitti
                            </span>
                          </>
                        )}
                        {group.pendingCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-semibold">
                              {group.pendingCount} Onay Bekliyor
                            </span>
                          </>
                        )}
                        {group.passiveCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-semibold">
                              {group.passiveCount} Satışa Kapalı
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Aksiyon Butonları & Açma Oku */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 shrink-0 self-end md:self-center"
                  >
                    {/* Tüm Modeli Düzenle */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditingListing(group.items[0])}
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                      title="Bu modele ait tüm varyantları ortak düzenle"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Modeli Düzenle
                    </Button>

                    {/* Modeli Sil / Pasife Al */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchive(group.items[0], true, group.items)}
                      className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="Bu modeldeki tüm varyantları pasife al"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Modeli Sil (Pasife Al)
                    </Button>

                    {/* Aç/Kapat Butonu */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* MODEL İÇİ VARYANTLAR LİSTESİ */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-border bg-muted/10 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.items.map((item) => {
                        const isChecked = selectedBarcodes.has(item.barcode);
                        const pState = editingPrices[item.barcode] || {
                          listPrice: item.list_price || 0,
                          salePrice: item.sale_price || 0,
                        };
                        const sState = editingStocks[item.barcode] ?? item.quantity ?? 0;
                        const isSavingPrice = savingInline[`price-${item.barcode}`];
                        const isSavingStock = savingInline[`stock-${item.barcode}`];

                        // Renk ismini ayıkla
                        const colorPart = item.title.includes(" - ")
                          ? item.title.split(" - ").slice(1).join(" - ").trim()
                          : item.title;

                        return (
                          <div
                            key={item.barcode}
                            className={`bg-card border rounded-xl p-4 space-y-3.5 transition-all relative ${
                              isChecked
                                ? "border-orange-500 shadow-xs ring-1 ring-orange-500/20"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            {/* Üst Bar: Checkbox + Durum Rozeti */}
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectBarcode(item.barcode)}
                                  className="rounded border-border w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                                  {colorPart}
                                </span>
                              </label>

                              {item.trendyol_status === "approved" ? (
                                item.quantity > 0 ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Satışta
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Stok Bitti
                                  </span>
                                )
                              ) : item.trendyol_status === "pending" || item.trendyol_status === "draft" ? (
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Onay Bekliyor
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Pasif
                                </span>
                              )}
                            </div>

                            {/* Görsel Galerisi Slider */}
                            <ProductImageSlider
                              images={item.image_urls || []}
                              title={item.title}
                            />

                            {/* Barkod ve Stok Kodu */}
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Barkod:</span>
                                <div className="flex items-center gap-1 font-mono text-foreground font-semibold">
                                  <span>{item.barcode}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(item.barcode, "Barkod")}
                                    className="hover:text-orange-600 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Stok Kodu:</span>
                                <div className="flex items-center gap-1 font-mono text-foreground font-semibold">
                                  <span>{item.stock_code}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(item.stock_code, "Stok Kodu")}
                                    className="hover:text-orange-600 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Hızlı Satış Fiyatı & Liste Fiyatı Düzenleme */}
                            <div className="pt-2 border-t border-border space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] text-muted-foreground font-medium">Piyasa Fiyatı:</span>
                                  <div className="relative mt-0.5">
                                    <Input
                                      type="number"
                                      value={pState.listPrice || ""}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value) || 0;
                                        setEditingPrices((prev) => ({
                                          ...prev,
                                          [item.barcode]: { ...pState, listPrice: v },
                                        }));
                                      }}
                                      className="h-7 text-xs pr-4 text-muted-foreground"
                                    />
                                    <span className="absolute right-1.5 top-1.5 text-[10px] text-muted-foreground">₺</span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-foreground font-bold">Satış Fiyatı:</span>
                                  <div className="relative mt-0.5">
                                    <Input
                                      type="number"
                                      value={pState.salePrice || ""}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value) || 0;
                                        setEditingPrices((prev) => ({
                                          ...prev,
                                          [item.barcode]: { ...pState, salePrice: v },
                                        }));
                                      }}
                                      className="h-7 text-xs pr-4 font-bold text-emerald-600 dark:text-emerald-400"
                                    />
                                    <span className="absolute right-1.5 top-1.5 text-[10px] text-emerald-600 font-bold">₺</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSavePrice(item.barcode, group.groupCode, false)}
                                  disabled={isSavingPrice}
                                  className="h-6 text-[10px] px-2 gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer flex-1"
                                >
                                  <Save className="w-3 h-3" />
                                  {isSavingPrice ? "..." : "Fiyatı Kaydet"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSavePrice(item.barcode, group.groupCode, true)}
                                  disabled={isSavingPrice}
                                  className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-orange-600 cursor-pointer"
                                  title="Bu fiyatı tüm varyantlara uygula"
                                >
                                  Tümüne Uygula
                                </Button>
                              </div>
                            </div>

                            {/* Hızlı Stok Düzenleme */}
                            <div className="pt-2 border-t border-border space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-medium">Stok Adedi:</span>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    value={sState}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value) || 0;
                                      setEditingStocks((prev) => ({ ...prev, [item.barcode]: v }));
                                    }}
                                    className="h-7 w-20 text-xs font-bold text-center"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSaveStock(item.barcode, group.groupCode, false)}
                                    disabled={isSavingStock}
                                    className="h-7 text-[10px] px-2 text-blue-600 hover:text-blue-700 cursor-pointer"
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Alt Aksiyon Butonları (Düzenle & Pasife Al) */}
                            <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingListing(item)}
                                className="h-7 text-xs flex-1 gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                                Düzenle
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchive(item, false)}
                                className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Bu varyantı pasife al"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= 2. DÜZ LİSTE GÖRÜNÜMÜ ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredListings.map((item) => {
            const isChecked = selectedBarcodes.has(item.barcode);
            const pState = editingPrices[item.barcode] || {
              listPrice: item.list_price || 0,
              salePrice: item.sale_price || 0,
            };
            const sState = editingStocks[item.barcode] ?? item.quantity ?? 0;
            const isSavingPrice = savingInline[`price-${item.barcode}`];
            const isSavingStock = savingInline[`stock-${item.barcode}`];

            return (
              <div
                key={item.barcode}
                className={`bg-card border rounded-2xl p-4 space-y-3 shadow-xs transition-all relative ${
                  isChecked
                    ? "border-orange-500 ring-1 ring-orange-500/20"
                    : "border-border hover:border-orange-500/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectBarcode(item.barcode)}
                    className="rounded border-border w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                    {getModelCode(item)}
                  </span>
                </div>

                <ProductImageSlider images={item.image_urls || []} title={item.title} />

                <h4 className="text-xs font-bold text-foreground line-clamp-2 min-h-[32px]">
                  {item.title}
                </h4>

                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Kategori:</span>
                    <span className="font-semibold text-foreground px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                      {detectCategoryFromProduct(item).name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Barkod:</span>
                    <span className="font-mono font-bold text-foreground">{item.barcode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Satış Fiyatı:</span>
                    <span className="font-bold text-emerald-600">{item.sale_price} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stok:</span>
                    <span className="font-bold text-foreground">{item.quantity} Adet</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingListing(item)}
                    className="h-7 text-xs flex-1 gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    Düzenle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchive(item, false)}
                    className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 4. TOPLU İŞLEM YÜZEN BARI (SEÇİLEN ÜRÜNLER İÇİN) ─── */}
      {selectedBarcodes.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 max-w-2xl mx-auto z-40 px-4">
          <div className="bg-card/95 backdrop-blur-md border border-orange-500/40 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground pl-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>{selectedBarcodes.size} ürün seçildi</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkArchive}
                disabled={bulkActionLoading}
                className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {bulkActionLoading ? "İşleniyor..." : "Toplu Pasife Al"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedBarcodes(new Set())}
                className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. DÜZENLEME MODALI ─── */}
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
    </div>
  );
}
