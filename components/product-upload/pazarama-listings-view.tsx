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
  Truck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
  Tag,
  Boxes,
  ExternalLink,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { PazaramaListing } from "@/lib/pazarama-api";
import { PazaramaProductEditModal } from "./pazarama-product-edit-modal";
import { PazaramaTrendyolSyncModal } from "./pazarama-trendyol-sync-modal";
import { naturalSort } from "@/lib/utils";
import * as XLSX from "xlsx";

type StatusTab = "all" | "active" | "sold_out" | "pending" | "passive";

// Görsel Kaydırıcı Bileşeni
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
  items: PazaramaListing[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  activeCount: number;
  soldOutCount: number;
  passiveCount: number;
  pendingCount: number;
  mainImage: string;
}

export function PazaramaListingsView() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [listings, setListings] = useState<PazaramaListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Görünüm Modu: "grouped" (Model Koduna göre alt alta açılır) | "flat" (Düz Liste)
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Açık olan Model Grupları
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Çoklu Seçim (Checkbox) State'i
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Trendyol Eşitleme Modalı
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Filtreler
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");

  // Düzenleme Modalı
  const [editingListing, setEditingListing] = useState<PazaramaListing | null>(null);

  // Hızlı Inline Fiyat / Stok Düzenleme State'leri
  const [editingPrices, setEditingPrices] = useState<Record<string, { listPrice: number; salePrice: number }>>({});
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({});
  const [savingInline, setSavingInline] = useState<Record<string, boolean>>({});

  // Ürünleri Yükle
  const loadListings = useCallback(async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/pazarama/products?size=250");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pazarama ürünleri alınamadı");
      }

      const fetchedListings: PazaramaListing[] = data.listings || [];
      setListings(fetchedListings);
      setTotalCount(data.totalCount || fetchedListings.length);

      // Varsayılan olarak modeller kapalı gelir, kullanıcı tıkladığında açılır
      // setExpandedGroups(new Set());

      if (isSync) {
        toast({
          title: "Pazarama Eşitlendi",
          description: `${fetchedListings.length} adet Pazarama listelemesi güncellendi.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Pazarama API Hatası",
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

  // Tekil veya Model Bazlı Satıştan Kaldır / Aç
  const handleDeactivate = async (item: PazaramaListing, syncVariants = false, modelItems?: PazaramaListing[]) => {
    const isDeactivating = item.isActive !== false;
    const actionText = isDeactivating ? "Satıştan Kaldır (Pasife Al)" : "Satışa Aç";

    const confirmed = await confirm({
      title: `${actionText} Onayı`,
      message: syncVariants && (item.groupCode || item.modelTitle)
        ? `"${item.modelTitle || item.groupCode}" modeline ait TÜM varyant ürünleri ${actionText.toLowerCase()}mak istediğinize emin misiniz?`
        : `"${item.code}" barkodlu ürünü ${actionText.toLowerCase()}mak istediğinize emin misiniz?`,
      confirmText: `Evet, ${actionText}`,
      cancelText: "Vazgeç",
      variant: isDeactivating ? "danger" : "warning",
    });

    if (!confirmed) return;

    try {
      const newStatus: 1 | 10 = isDeactivating ? 10 : 1;
      const targetItems = syncVariants && modelItems && modelItems.length > 0
        ? modelItems.map((m) => ({ code: m.code, productStatus: newStatus }))
        : undefined;

      const res = await fetch("/api/pazarama/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: item.code,
          productStatus: newStatus,
          groupCode: item.groupCode || item.modelTitle,
          syncAllVariants: syncVariants,
          items: targetItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "İşlem gerçekleştirilemedi");
      }

      toast({
        title: `İşlem Başarılı`,
        description: data.message || `Ürün durumu güncellendi.`,
      });

      loadListings();
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Toplu Satıştan Kaldır / Satışa Aç (Çoklu Checkbox ile)
  const handleBulkStatusChange = async (targetStatus: 1 | 10) => {
    if (selectedCodes.size === 0) return;

    const actionText = targetStatus === 10 ? "Satıştan Kaldır (Pasife Al)" : "Satışa Aç";
    const confirmed = await confirm({
      title: `Toplu ${actionText} Onayı`,
      message: `Seçtiğiniz ${selectedCodes.size} adet ürünü Pazarama'da ${actionText.toLowerCase()}mak istediğinize emin misiniz?`,
      confirmText: `Evet, ${actionText}`,
      cancelText: "Vazgeç",
      variant: targetStatus === 10 ? "danger" : "warning",
    });

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/pazarama/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Array.from(selectedCodes).map((code) => ({
            code,
            productStatus: targetStatus,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Toplu işlem gerçekleştirilemedi");
      }

      toast({
        title: "Toplu İşlem Başarılı",
        description: data.message || `${selectedCodes.size} adet ürün güncellendi.`,
      });

      setSelectedCodes(new Set());
      loadListings();
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Hızlı Inline Fiyat Kaydet
  const handleSavePrice = async (code: string, groupCode?: string, syncVariants = false) => {
    const prices = editingPrices[code];
    if (!prices || prices.salePrice <= 0 || prices.listPrice <= 0) {
      toast({ title: "Geçersiz Fiyat", description: "Lütfen geçerli bir fiyat girin.", variant: "destructive" });
      return;
    }

    setSavingInline((prev) => ({ ...prev, [`price-${code}`]: true }));
    try {
      const res = await fetch("/api/pazarama/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          listPrice: prices.listPrice,
          salePrice: prices.salePrice,
          groupCode,
          syncAllVariants: syncVariants,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Fiyat güncellenemedi");

      toast({ title: "Fiyat Güncellendi", description: data.message });
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSavingInline((prev) => ({ ...prev, [`price-${code}`]: false }));
    }
  };

  // Hızlı Inline Stok Kaydet
  const handleSaveStock = async (code: string, groupCode?: string, syncVariants = false) => {
    const stock = editingStocks[code];
    if (stock === undefined || stock < 0) {
      toast({ title: "Geçersiz Stok", description: "Stok 0 veya daha büyük olmalıdır.", variant: "destructive" });
      return;
    }

    setSavingInline((prev) => ({ ...prev, [`stock-${code}`]: true }));
    try {
      const res = await fetch("/api/pazarama/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          stockCount: stock,
          groupCode,
          syncAllVariants: syncVariants,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Stok güncellenemedi");

      toast({ title: "Stok Güncellendi", description: data.message });
      loadListings();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSavingInline((prev) => ({ ...prev, [`stock-${code}`]: false }));
    }
  };

  // Filtreleme (Doğal ve alfabetik sıralı)
  const filteredListings = useMemo<PazaramaListing[]>(() => {
    const list = listings.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const title = (item.name || "").toLowerCase();
        const code = (item.code || "").toLowerCase();
        const stockCode = (item.stockCode || "").toLowerCase();
        const group = (item.groupCode || "").toLowerCase();
        const modelT = (item.modelTitle || "").toLowerCase();
        const brand = (item.brandName || "").toLowerCase();
        if (
          !title.includes(q) &&
          !code.includes(q) &&
          !stockCode.includes(q) &&
          !group.includes(q) &&
          !modelT.includes(q) &&
          !brand.includes(q)
        ) {
          return false;
        }
      }

      if (
        selectedGroupCode &&
        (item.groupCode || "").toLowerCase() !== selectedGroupCode.toLowerCase() &&
        (item.modelTitle || "").toLowerCase() !== selectedGroupCode.toLowerCase()
      ) {
        return false;
      }

      const isPassive = item.productStatus === 10 || item.state === 10;
      // "Tümü" sekmesinde sadece aktif, stoğu biten ve onay bekleyen ürünler listelenir, pasifler "Satışa Kapalı" sekmesinde yer alır
      if (activeTab === "all" && isPassive) return false;
      if (activeTab === "active" && (!item.approved || item.isUnderReview || (item.stockCount || 0) <= 0 || item.isActive === false)) return false;
      if (activeTab === "sold_out" && (!item.approved || item.isUnderReview || (item.stockCount || 0) > 0)) return false;
      if (activeTab === "pending" && (item.approved && !item.isUnderReview && item.state !== 1 && item.state !== 19)) return false;
      if (activeTab === "passive" && !isPassive) return false;

      return true;
    });

    return naturalSort(list, (i) => i.name);
  }, [listings, searchTerm, selectedGroupCode, activeTab]);

  // Model Gruplaması (Kullanıcının istediği: "Aura Vazo altında tüm renkleri açılsın", boyut ve renkler sıralı)
  const modelGroups = useMemo<ModelGroup[]>(() => {
    const map = new Map<string, PazaramaListing[]>();

    filteredListings.forEach((item) => {
      const key = item.modelTitle || item.groupCode || item.name.split(" - ")[0].trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    const groups: ModelGroup[] = [];
    map.forEach((items, key) => {
      const sortedItems = naturalSort(items, (i) => i.name);
      const first = sortedItems[0];
      const totalStock = sortedItems.reduce((acc, curr) => acc + (curr.stockCount || 0), 0);
      const prices = sortedItems.map((i) => i.salePrice || 0).filter((p) => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : first.salePrice || 0;
      const maxPrice = prices.length ? Math.max(...prices) : first.salePrice || 0;
      const activeCount = sortedItems.filter((i) => i.approved && !i.isUnderReview && (i.stockCount || 0) > 0 && i.isActive !== false).length;
      const soldOutCount = sortedItems.filter((i) => i.approved && !i.isUnderReview && (i.stockCount || 0) === 0).length;
      const passiveCount = sortedItems.filter((i) => i.productStatus === 10 || i.state === 10).length;
      const pendingCount = sortedItems.filter((i) => !i.approved || i.isUnderReview || i.state === 1 || i.state === 19).length;

      // Tüm görseller
      const allImgs: string[] = [];
      sortedItems.forEach((i) => {
        if (i.images && i.images.length) {
          i.images.forEach((img) => {
            if (!allImgs.includes(img)) allImgs.push(img);
          });
        }
      });

      groups.push({
        key,
        title: first.modelTitle || key,
        groupCode: first.groupCode || "",
        brandName: first.brandName || "",
        categoryName: first.categoryName || "",
        items: sortedItems,
        totalStock,
        minPrice,
        maxPrice,
        activeCount,
        soldOutCount,
        passiveCount,
        pendingCount,
        mainImage: allImgs[0] || "",
      });
    });

    // Modelleri doğal alfabetik sıraya göre sırala (Aura Vazo 15cm -> 20cm -> 25cm -> Vero...)
    return naturalSort(groups, (g) => g.title);
  }, [filteredListings]);

  // Benzersiz Model Kodları Listesi (Doğal sıralı)
  const uniqueGroupCodes = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.modelTitle) set.add(l.modelTitle);
      else if (l.groupCode) set.add(l.groupCode);
    });
    return naturalSort(Array.from(set));
  }, [listings]);

  // Akordeon Aç / Kapat
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(modelGroups.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Modeldeki tüm ürünleri seç / kaldır
  const toggleSelectGroup = (items: PazaramaListing[]) => {
    const allSelected = items.every((i) => selectedCodes.has(i.code));
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      items.forEach((i) => {
        if (allSelected) next.delete(i.code);
        else next.add(i.code);
      });
      return next;
    });
  };

  // Tekil ürün seç / kaldır
  const toggleSelectCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Tüm filtrelenmiş ürünleri seç / kaldır
  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredListings.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredListings.map((i) => i.code)));
    }
  };

  // Sekme sayaçları (Pazarama Satıcı Paneliyle %100 birebir uyumlu)
  const tabCounts = useMemo(() => {
    const active = listings.filter((l) => l.approved && !l.isUnderReview && (l.stockCount || 0) > 0 && l.productStatus !== 10).length;
    const soldOut = listings.filter((l) => l.approved && !l.isUnderReview && (l.stockCount || 0) === 0).length;
    const pending = listings.filter((l) => !l.approved || l.isUnderReview || l.state === 1 || l.state === 19).length;
    const passive = listings.filter((l) => l.productStatus === 10 || l.state === 10).length;
    const allActive = active + soldOut + pending;
    return { active, soldOut, pending, passive, allActive };
  }, [listings]);

  // Excel İndirme
  const handleExportExcel = () => {
    if (filteredListings.length === 0) {
      toast({ title: "Veri Yok", description: "Dışa aktarılacak ürün bulunamadı." });
      return;
    }

    const rows = filteredListings.map((it) => ({
      Barkod: it.code,
      "Model Adı": it.modelTitle || "",
      "Model Kodu": it.groupCode || "",
      "Stok Kodu": it.stockCode || "",
      "Ürün Adı": it.name,
      Marka: it.brandName || "",
      Kategori: it.categoryName || "",
      "Liste Fiyatı": it.listPrice,
      "Satış Fiyatı": it.salePrice,
      Stok: it.stockCount,
      "KDV %": it.vatRate,
      Desi: it.desi,
      Durum: it.stateText,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pazarama_Ürünler");
    XLSX.writeFile(workbook, `Pazarama_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmDialog />

      {/* ÜST BİLGİ & EŞİTLEME ÇUBUĞU */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black shadow-xs">
            <span className="text-sm">PZ</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">Pazarama Ürün & Model Kataloğum</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                {modelGroups.length} Model ({totalCount} Varyant)
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
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "grouped"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Model Gruplu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
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
            size="sm"
            onClick={() => setSyncModalOpen(true)}
            className="gap-2 text-xs font-bold bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Trendyol ile Eşitle
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadListings(true)}
            disabled={loading || syncing}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-blue-600" : ""}`} />
            {syncing ? "Eşitleniyor..." : "Pazarama'dan Güncelle"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel İndir
          </Button>
        </div>
      </div>

      {/* FİLTRELER VE ARAMA */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Durum Sekmeleri & Aç/Kapa Düğmeleri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Tümü ({tabCounts.allActive})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "passive"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Satışa Kapalı ({tabCounts.passive})
              </button>
            )}
          </div>

          {viewMode === "grouped" && (
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="text-blue-600 hover:underline font-semibold"
              >
                Tümünü Aç
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground font-semibold"
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
                checked={selectedCodes.size > 0 && selectedCodes.size === filteredListings.length}
                onChange={toggleSelectAll}
                className="rounded border-border w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              Tümünü Seç ({selectedCodes.size}/{filteredListings.length})
            </label>
          </div>
        </div>
      </div>

      {/* LİSTELEME ALANI */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          <RefreshCw className="w-9 h-9 mx-auto animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-bold text-foreground">Pazarama Ürünleri Yükleniyor...</p>
          <p className="text-xs text-muted-foreground mt-1">71 adet ürün ve model varyantları eşitleniyor.</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground space-y-3">
          <Package className="w-12 h-12 mx-auto opacity-30 text-blue-600" />
          <h3 className="text-base font-bold text-foreground">Ürün Bulunamadı</h3>
          <p className="text-xs max-w-md mx-auto">
            Arama kriterlerinize veya seçilen duruma uygun ürün bulunamadı.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ================= 1. MODEL BAZLI AÇILIR/KAPANIR AKORDEON GÖRÜNÜMÜ ================= */
        <div className="space-y-4">
          {modelGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const allGroupSelected = group.items.every((it) => selectedCodes.has(it.code));
            const someGroupSelected = group.items.some((it) => selectedCodes.has(it.code));

            return (
              <div
                key={group.key}
                className="bg-card border border-border hover:border-blue-500/40 rounded-2xl overflow-hidden shadow-xs transition-all"
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
                        className="rounded border-border w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono">
                          Model Kodu: {group.groupCode || group.key}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                          {group.brandName || "Ahenk Tasarım"}
                        </span>

                        {group.categoryName && (
                          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
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
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                      title="Bu modele ait tüm renk ve varyantları ortak düzenle"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Modeli Düzenle
                    </Button>

                    {/* Modeli Satıştan Kaldır / Satışa Aç */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(group.items[0], true, group.items)}
                      className={`h-8 text-xs gap-1.5 ${
                        group.activeCount > 0
                          ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                      title="Bu modeldeki tüm varyantları tek tıkla satışa kapatır veya açar"
                    >
                      {group.activeCount > 0 ? (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Modeli Sil (Pasife Al)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Modeli Satışa Aç
                        </>
                      )}
                    </Button>

                    {/* Aç/Kapa Oku */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-1"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* AÇILIR VARYANT LİSTESİ */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-muted/15 p-3 sm:p-4 space-y-3">
                    <div className="text-xs font-bold text-muted-foreground px-1 flex items-center justify-between">
                      <span>Bu modele ait {group.items.length} adet renk ve stok varyantı:</span>
                      <span className="text-[11px] font-normal">
                        Fiyat ve stok alanlarını doğrudan kutudan değiştirip "Kaydet"e basabilirsiniz.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {group.items.map((item) => {
                        const inlinePrices = editingPrices[item.code] || {
                          listPrice: item.listPrice,
                          salePrice: item.salePrice,
                        };
                        const inlineStock =
                          editingStocks[item.code] !== undefined
                            ? editingStocks[item.code]
                            : item.stockCount;

                        const isPriceSaving = savingInline[`price-${item.code}`];
                        const isStockSaving = savingInline[`stock-${item.code}`];
                        const isSelected = selectedCodes.has(item.code);

                        return (
                          <div
                            key={item.code}
                            className={`bg-card border rounded-xl p-3 sm:p-3.5 shadow-2xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 ${
                              isSelected
                                ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            {/* Sol: Checkbox + Görsel + Bilgiler */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectCode(item.code)}
                                className="rounded border-border w-4 h-4 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                              />

                              {/* Görsel */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-neutral-100 dark:bg-neutral-900 shrink-0 p-1 flex items-center justify-center">
                                {item.images && item.images[0] ? (
                                  <img
                                    src={item.images[0]}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Resim";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>

                              {/* Ürün İsmi & Barkod & Stok Kodu */}
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                                      item.approved && !item.isUnderReview && (item.stockCount || 0) > 0 && item.isActive !== false
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                                        : (item.stockCount || 0) === 0
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200"
                                        : item.isUnderReview || !item.approved
                                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200"
                                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200"
                                    }`}
                                  >
                                    {item.stateText}
                                  </span>

                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    Barkod: <strong className="text-foreground font-semibold">{item.code}</strong>
                                  </span>

                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    Stok Kodu: <strong className="text-foreground font-semibold">{item.stockCode || "-"}</strong>
                                  </span>
                                </div>

                                <p className="text-xs font-semibold text-foreground truncate max-w-xl">
                                  {item.name}
                                </p>
                              </div>
                            </div>

                            {/* Sağ: Hızlı Inline Fiyat & Stok Kutuları ve Butonlar */}
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                              {/* Liste Fiyatı */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Liste:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={inlinePrices.listPrice}
                                  onChange={(e) =>
                                    setEditingPrices((prev) => ({
                                      ...prev,
                                      [item.code]: {
                                        ...inlinePrices,
                                        listPrice: parseFloat(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="h-7 w-20 text-xs font-semibold"
                                />
                              </div>

                              {/* Satış Fiyatı */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-emerald-600 font-bold">Satış:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={inlinePrices.salePrice}
                                  onChange={(e) =>
                                    setEditingPrices((prev) => ({
                                      ...prev,
                                      [item.code]: {
                                        ...inlinePrices,
                                        salePrice: parseFloat(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="h-7 w-20 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSavePrice(item.code, item.groupCode, false)}
                                  disabled={isPriceSaving}
                                  className="h-7 px-2 text-[10px] gap-1"
                                  title="Fiyatı Kaydet"
                                >
                                  {isPriceSaving ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                                </Button>
                              </div>

                              {/* Stok */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Stok:</span>
                                <Input
                                  type="number"
                                  value={inlineStock}
                                  onChange={(e) =>
                                    setEditingStocks((prev) => ({
                                      ...prev,
                                      [item.code]: parseInt(e.target.value, 10) || 0,
                                    }))
                                  }
                                  className="h-7 w-16 text-xs font-semibold"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSaveStock(item.code, item.groupCode, false)}
                                  disabled={isStockSaving}
                                  className="h-7 px-2 text-[10px] gap-1"
                                  title="Stoğu Kaydet"
                                >
                                  {isStockSaving ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                                </Button>
                              </div>

                              {/* Varyant Aksiyonları */}
                              <div className="flex items-center gap-1 pl-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingListing(item)}
                                  className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-500/10 font-semibold"
                                  title="Detaylı Düzenle"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Düzenle
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeactivate(item, false)}
                                  className={`h-7 px-2 text-xs font-semibold ${
                                    item.isActive !== false
                                      ? "text-rose-600 hover:bg-rose-500/10"
                                      : "text-emerald-600 hover:bg-emerald-500/10"
                                  }`}
                                  title={item.isActive !== false ? "Satıştan Kaldır" : "Satışa Aç"}
                                >
                                  {item.isActive !== false ? <Trash2 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                </Button>
                              </div>
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
        <div className="grid grid-cols-1 gap-4">
          {filteredListings.map((item) => {
            const inlinePrices = editingPrices[item.code] || {
              listPrice: item.listPrice,
              salePrice: item.salePrice,
            };
            const inlineStock =
              editingStocks[item.code] !== undefined
                ? editingStocks[item.code]
                : item.stockCount;

            const isPriceSaving = savingInline[`price-${item.code}`];
            const isStockSaving = savingInline[`stock-${item.code}`];
            const isSelected = selectedCodes.has(item.code);

            return (
              <div
                key={item.code}
                className={`bg-card border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4 ${
                  isSelected ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30" : "border-border hover:border-blue-500/40"
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Görsel + Checkbox */}
                  <div className="w-full sm:w-44 shrink-0 relative">
                    <div className="absolute top-2 left-2 z-20 bg-background/90 rounded-md p-1 border border-border shadow-xs">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCode(item.code)}
                        className="rounded border-border w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <ProductImageSlider images={item.images || []} title={item.name} />
                  </div>

                  {/* Detaylar */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.stateText && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.approved && item.isActive !== false
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                                : item.isActive === false
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200"
                            }`}
                          >
                            {item.stateText}
                          </span>
                        )}

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono">
                          Model: {item.modelTitle || item.groupCode}
                        </span>

                        {item.brandName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                            {item.brandName}
                          </span>
                        )}

                        {item.categoryName && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {item.categoryName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                        {item.name}
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Barkod:</span>
                          <span className="font-mono font-semibold text-foreground">{item.code}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Stok Kodu:</span>
                          <span className="font-mono text-foreground">{item.stockCode || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">KDV Oranı:</span>
                          <span className="font-semibold text-foreground">%{item.vatRate ?? 20}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Desi:</span>
                          <span className="font-semibold text-foreground">{item.desi ?? 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* HIZLI INLINE FİYAT & STOK ALANI */}
                    <div className="bg-muted/30 border border-border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground">Liste Fiyatı (TL)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={inlinePrices.listPrice}
                          onChange={(e) =>
                            setEditingPrices((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...inlinePrices,
                                listPrice: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-600">Satış Fiyatı (TL)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={inlinePrices.salePrice}
                          onChange={(e) =>
                            setEditingPrices((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...inlinePrices,
                                salePrice: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          className="h-8 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground">Stok Adedi</label>
                        <Input
                          type="number"
                          value={inlineStock}
                          onChange={(e) =>
                            setEditingStocks((prev) => ({
                              ...prev,
                              [item.code]: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSavePrice(item.code, item.groupCode, false)}
                          disabled={isPriceSaving}
                          className="h-8 flex-1 text-[11px] gap-1 px-2 font-semibold"
                        >
                          {isPriceSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Fiyat
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveStock(item.code, item.groupCode, false)}
                          disabled={isStockSaving}
                          className="h-8 flex-1 text-[11px] gap-1 px-2 font-semibold"
                        >
                          {isStockSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Stok
                        </Button>
                      </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivate(item, false)}
                        className={`h-8 text-xs gap-1.5 ${
                          item.isActive !== false ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                        }`}
                      >
                        {item.isActive !== false ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            Satıştan Kaldır
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Satışa Aç
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setEditingListing(item)}
                        className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Detaylı Düzenle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= YAPIŞKAN TOPLU İŞLEM ÇUBUĞU (BULK ACTION BAR) ================= */}
      {selectedCodes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white dark:bg-neutral-800/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-white/15 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-xl w-[92%] sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedCodes.size}
            </span>
            <span className="text-xs font-semibold">Ürün Seçildi</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <div className="flex items-center gap-2">
            {/* Toplu Satıştan Kaldır (Sil) */}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => handleBulkStatusChange(10)}
              disabled={bulkActionLoading}
              className="h-8 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Seçilenleri Satıştan Kaldır
            </Button>

            {/* Toplu Satışa Aç */}
            <Button
              type="button"
              size="sm"
              onClick={() => handleBulkStatusChange(1)}
              disabled={bulkActionLoading}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Satışa Aç
            </Button>

            {/* Seçimi Temizle */}
            <button
              type="button"
              onClick={() => setSelectedCodes(new Set())}
              className="text-[11px] text-neutral-300 hover:text-white underline ml-1 cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI */}
      {editingListing && (
        <PazaramaProductEditModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            loadListings();
          }}
        />
      )}

      {/* TRENDYOL BAZLI EŞİTLEME MODALI */}
      <PazaramaTrendyolSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSuccess={() => {
          loadListings(true);
        }}
      />
    </div>
  );
}
