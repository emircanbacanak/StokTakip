"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Search,
  RefreshCw,
  Edit2,
  Check,
  X,
  Tag,
  AlertCircle,
  ExternalLink,
  Power,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Save,
  Trash2,
  Boxes,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { N11ProductItem } from "@/lib/n11-api-client";
import * as XLSX from "xlsx";

type StatusTab = "all" | "active" | "sold_out" | "passive";

function ProductImageSlider({ images, title }: { images: string[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square max-h-[200px] bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground border border-border">
        <Eye className="w-7 h-7 opacity-30" />
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
    <div className="relative w-full aspect-square max-h-[200px] rounded-xl overflow-hidden bg-neutral-100/60 dark:bg-neutral-900/60 border border-border group select-none flex items-center justify-center">
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
  mainImage?: string;
  items: N11ProductItem[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  activeCount: number;
  soldOutCount: number;
  passiveCount: number;
}

export function N11ProductsClient() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [products, setProducts] = useState<N11ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Görünüm Modu
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Çoklu Seçim
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filtreler
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");

  // Hızlı Satır İçi Düzenleme
  const [editingStockCode, setEditingStockCode] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<string>("");
  const [inlineStock, setInlineStock] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const fetchProducts = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/n11/products?search=${encodeURIComponent(searchTerm)}&size=100`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "N11 ürünleri getirilemedi.");
      }
      setProducts(data.products || []);
      setTotalCount(data.totalElements || (data.products || []).length);

      if (showToast) {
        toast({
          title: "N11 Eşitlendi",
          description: `${data.products?.length || 0} adet ürün N11'den başarıyla güncellendi.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "N11 Ürün Hatası",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Model Kodunu StockCode'dan veya Title'dan akıllıca ayıkla
  const getModelCode = useCallback((p: N11ProductItem): string => {
    const code = p.stockCode || "";
    const parts = code.split(/[-_]/);
    if (parts.length > 1 && parts[0].length >= 2) {
      return parts[0];
    }
    return code.slice(0, 8) || "GENEL";
  }, []);

  // Gruplama Mantığı
  const modelGroups = useMemo<ModelGroup[]>(() => {
    const map = new Map<string, N11ProductItem[]>();

    products.forEach((p) => {
      const groupKey = getModelCode(p);
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(p);
    });

    const groups: ModelGroup[] = [];

    map.forEach((items, key) => {
      let totalStock = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let activeCount = 0;
      let soldOutCount = 0;
      let passiveCount = 0;

      items.forEach((p) => {
        const stock = p.quantity ?? 0;
        const price = p.salePrice || 0;
        const isActive = p.status === "Active";

        totalStock += stock;
        if (price > 0) {
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;
        }

        if (!isActive) {
          passiveCount++;
        } else if (stock === 0) {
          soldOutCount++;
        } else {
          activeCount++;
        }
      });

      if (minPrice === Infinity) minPrice = 0;
      if (maxPrice === -Infinity) maxPrice = 0;

      const firstItem = items[0];
      const title = firstItem.title || `N11 Model: ${key}`;
      const itemImgs = (firstItem as any).imageUrls || (firstItem as any).images || [];
      const firstImg = itemImgs[0];
      const mainImage = typeof firstImg === "string" ? firstImg : firstImg?.url || (firstItem as any).imageUrl || "";

      groups.push({
        key,
        title,
        groupCode: key,
        mainImage,
        items,
        totalStock,
        minPrice,
        maxPrice,
        activeCount,
        soldOutCount,
        passiveCount,
      });
    });

    return groups.sort((a, b) => b.totalStock - a.totalStock);
  }, [products, getModelCode]);

  // Filtrelenmiş Ürünler
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const title = (p.title || "").toLowerCase();
      const code = (p.stockCode || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();

      if (q && !title.includes(q) && !code.includes(q) && !barcode.includes(q)) {
        return false;
      }

      if (selectedGroupCode && getModelCode(p) !== selectedGroupCode) {
        return false;
      }

      const stock = p.quantity ?? 0;
      const isActive = p.status === "Active";

      // "Tümü" sekmesinde sadece aktif ve stoğu bitenler listelenir, pasifler "Satışa Kapalı" sekmesinde yer alır
      if (activeTab === "all" && !isActive) return false;
      if (activeTab === "active" && (!isActive || stock <= 0)) return false;
      if (activeTab === "sold_out" && (!isActive || stock > 0)) return false;
      if (activeTab === "passive" && isActive) return false;

      return true;
    });
  }, [products, searchTerm, selectedGroupCode, activeTab, getModelCode]);

  // Filtrelenmiş Gruplar
  const filteredGroups = useMemo(() => {
    const codeSet = new Set(filteredProducts.map((p) => p.stockCode));
    return modelGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => codeSet.has(i.stockCode)),
      }))
      .filter((g) => g.items.length > 0);
  }, [modelGroups, filteredProducts]);

  // Sekme sayaçları
  const tabCounts = useMemo(() => {
    let active = 0;
    let soldOut = 0;
    let passive = 0;

    products.forEach((p) => {
      const stock = p.quantity ?? 0;
      const isActive = p.status === "Active";
      if (!isActive) passive++;
      else if (stock === 0) soldOut++;
      else active++;
    });

    const allActive = active + soldOut;
    return { active, soldOut, passive, allActive };
  }, [products]);

  // Akordeon Aç / Kapat
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Çoklu seçim
  const toggleSelectCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredProducts.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredProducts.map((p) => p.stockCode)));
    }
  };

  // Satır içi düzenleme başlat
  const handleStartInlineEdit = (p: N11ProductItem) => {
    setEditingStockCode(p.stockCode);
    setInlinePrice(String(p.salePrice || ""));
    setInlineStock(String(p.quantity ?? 0));
  };

  const handleCancelInlineEdit = () => {
    setEditingStockCode(null);
  };

  const handleSaveInlineEdit = async (stockCode: string) => {
    const priceNum = parseFloat(inlinePrice);
    const stockNum = parseInt(inlineStock, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Geçersiz Fiyat", description: "Lütfen 0'dan büyük bir fiyat giriniz.", variant: "destructive" });
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      toast({ title: "Geçersiz Stok", description: "Lütfen 0 veya daha büyük bir stok giriniz.", variant: "destructive" });
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/n11/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              stockCode,
              salePrice: priceNum,
              listPrice: priceNum,
              quantity: stockNum,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Güncelleme Başlatıldı",
        description: `${stockCode} N11 üzerinde kuyruğa alındı.`,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.stockCode === stockCode
            ? { ...item, salePrice: priceNum, listPrice: priceNum, quantity: stockNum }
            : item
        )
      );
      setEditingStockCode(null);
    } catch (err: any) {
      toast({ title: "Güncelleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  // Durum değiştir (Aktif / Askıya Al)
  const handleToggleStatus = async (p: N11ProductItem) => {
    const newStatus = p.status === "Active" ? "Suspended" : "Active";
    setUpdating(true);
    try {
      const res = await fetch("/api/n11/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: p.stockCode,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Durum Güncellendi",
        description: `${p.stockCode} ürünü ${newStatus === "Active" ? "Satışa Açıldı" : "Satıştan Çekildi"}.`,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.stockCode === p.stockCode ? { ...item, status: newStatus } : item
        )
      );
    } catch (err: any) {
      toast({ title: "Durum Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  // Toplu Askıya Al
  const handleBulkDeactivate = async () => {
    if (selectedCodes.size === 0) return;

    const confirmed = await confirm({
      title: "Seçilenleri Toplu Satışa Kapat",
      message: `Seçilen ${selectedCodes.size} adet ürünü N11 üzerinde satışa kapatmak istediğinize emin misiniz?`,
      confirmText: `Evet, ${selectedCodes.size} Ürünü Satışa Kapat`,
      cancelText: "Vazgeç",
      variant: "warning",
    });

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      for (const code of Array.from(selectedCodes)) {
        await fetch("/api/n11/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockCode: code, status: "Suspended" }),
        });
      }

      toast({
        title: "İşlem Başarılı",
        description: `${selectedCodes.size} ürün satıştan çekildi.`,
      });

      setSelectedCodes(new Set());
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Modeli Pasife Al / Satıştan Kaldır
  const handleModelDeactivate = async (group: ModelGroup) => {
    const confirmed = await confirm({
      title: "Modeli Satışa Kapat / Pasife Al",
      message: `"${group.title}" modelindeki toplam ${group.items.length} varyantın tümü N11 üzerinde pasife alınacaktır. Devam etmek istiyor musunuz?`,
      confirmText: "Evet, Modeli Pasife Al",
      cancelText: "Vazgeç",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      for (const it of group.items) {
        await fetch("/api/n11/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockCode: it.stockCode, status: "Suspended" }),
        });
      }
      toast({
        title: "Model Pasife Alındı",
        description: `"${group.title}" modelindeki tüm varyantlar pasife çekildi.`,
      });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  // Excel İndir
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      toast({ title: "Veri Yok", description: "Dışa aktarılacak ürün bulunamadı." });
      return;
    }

    const rows = filteredProducts.map((p) => ({
      "Stok Kodu": p.stockCode,
      Barkod: p.barcode || "",
      "Ürün Başlığı": p.title,
      "Satış Fiyatı (TL)": p.salePrice || 0,
      "Piyasa Fiyatı (TL)": p.listPrice || p.salePrice || 0,
      Stok: p.quantity ?? 0,
      Durum: p.status === "Active" ? "Satışta" : "Pasif / Askıda",
      "Kategori ID": p.categoryId || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "N11_Ürünler");
    XLSX.writeFile(workbook, `N11_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Excel İndirildi",
      description: `${rows.length} adet N11 ürünü Excel'e aktarıldı.`,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmDialog />

      {/* ─── ÜST BİLGİ & EŞİTLEME ÇUBUĞU (PAZARAMA STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-black shadow-xs">
            <span className="text-sm">N11</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">N11 Ürün & Model Kataloğum</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-semibold border border-indigo-500/20">
                {modelGroups.length} Model ({totalCount} Ürün)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                ● Canlı REST
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              N11 mağazanızdaki ürünleri model bazında derli toplu yönetin, hızlı fiyat ve stok güncelleyin.
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
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
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
            onClick={() => fetchProducts(true)}
            disabled={loading}
            className="gap-2 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            {loading ? "Eşitleniyor..." : "N11'den Güncelle"}
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

      {/* ─── FİLTRELER VE ARAMA (PAZARAMA STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Durum Sekmeleri & Aç/Kapa Düğmeleri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Tümü ({tabCounts.allActive})
            </button>
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
          </div>

          {viewMode === "grouped" && (
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="text-indigo-600 hover:underline font-semibold cursor-pointer"
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
              placeholder="Model adı, stok kodu veya barkod ile ara..."
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="relative">
            <select
              value={selectedGroupCode}
              onChange={(e) => setSelectedGroupCode(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-input bg-muted/40 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tüm Modeller ({modelGroups.length})</option>
              {modelGroups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.groupCode} ({g.items.length} Varyant)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCodes.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={toggleSelectAll}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Tümünü Seç ({filteredProducts.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── SEÇİLENLER İÇİN TOPLU İŞLEM ÇUBUĞU ─── */}
      {selectedCodes.size > 0 && (
        <div className="sticky top-4 z-20 bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
              {selectedCodes.size}
            </span>
            <span className="text-xs font-semibold">ürün seçildi</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleBulkDeactivate}
              disabled={bulkActionLoading}
              className="h-8 text-xs font-bold gap-1.5 bg-white text-indigo-700 hover:bg-white/90 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" />
              Seçilenleri Satışa Kapat
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedCodes(new Set())}
              className="h-8 text-xs text-white hover:bg-white/10 cursor-pointer"
            >
              Seçimi Kaldır
            </Button>
          </div>
        </div>
      )}

      {/* ─── LİSTELEME İÇERİĞİ ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Boxes className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">Ürün Bulunamadı</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Arama kriterlerinize uyan bir N11 ürünü bulunamadı veya henüz ürün eklenmedi.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ─── MODEL GRUPLU GÖRÜNÜM ─── */
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const allSelected = group.items.every((i) => selectedCodes.has(i.stockCode));

            return (
              <div
                key={group.key}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs transition-all hover:border-indigo-500/30"
              >
                {/* Model Grup Başlığı */}
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
                        checked={allSelected}
                        onChange={() => {
                          setSelectedCodes((prev) => {
                            const next = new Set(prev);
                            group.items.forEach((i) => {
                              if (allSelected) next.delete(i.stockCode);
                              else next.add(i.stockCode);
                            });
                            return next;
                          });
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Model Görseli / İkonu */}
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
                        <div className="w-full h-full rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                          <Layers className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold px-1 rounded-full">
                        {group.items.length}
                      </span>
                    </div>

                    {/* Model Başlık & Bilgileri */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 font-mono">
                          Model Kodu: {group.groupCode || group.key}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                          Ahenk Tasarım
                        </span>

                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                          Vazo, Saksı
                        </span>
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
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!isExpanded) toggleGroup(group.key);
                        if (group.items.length > 0) {
                          handleStartInlineEdit(group.items[0]);
                        }
                      }}
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                      title="Bu modelin varyantlarını düzenle"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Modeli Düzenle
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleModelDeactivate(group)}
                      className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="Bu modeldeki tüm varyantları pasife al"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Modeli Sil (Pasife Al)
                    </Button>

                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Grup İçi Varyantlar */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-background/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {group.items.map((item) => {
                        const stock = item.quantity ?? 0;
                        const price = item.salePrice || 0;
                        const isActive = item.status === "Active";
                        const isSelected = selectedCodes.has(item.stockCode);
                        const isEditingThis = editingStockCode === item.stockCode;

                        const itemImgs = (item as any).imageUrls || item.images || [];
                        const images = itemImgs.map((img: any) => (typeof img === "string" ? img : img?.url)).filter(Boolean) as string[];
                        const cleanDesc = item.description ? item.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

                        return (
                          <div
                            key={item.stockCode}
                            className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                                : "border-border bg-card hover:border-indigo-500/30"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Ürün Görselleri */}
                              {images.length > 0 && (
                                <ProductImageSlider images={images} title={item.title || item.stockCode} />
                              )}

                              <div className="flex items-start justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectCode(item.stockCode)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                  />
                                  <span className="font-mono text-xs font-bold text-foreground truncate max-w-[150px]">
                                    {item.stockCode}
                                  </span>
                                </label>

                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    isActive && stock > 0
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                      : !isActive
                                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  }`}
                                >
                                  {isActive && stock > 0 ? "Satışta" : !isActive ? "Pasif" : "Tükendi"}
                                </span>
                              </div>

                              <p className="text-xs text-foreground font-semibold line-clamp-2">
                                {item.title}
                              </p>

                              {cleanDesc && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {cleanDesc}
                                </p>
                              )}

                              {item.barcode && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  Barkod: {item.barcode}
                                </p>
                              )}

                              {/* Satır İçi Düzenleme */}
                              {isEditingThis ? (
                                <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-indigo-500/30">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground">Fiyat (TL)</label>
                                      <Input
                                        type="number"
                                        value={inlinePrice}
                                        onChange={(e) => setInlinePrice(e.target.value)}
                                        className="h-8 text-xs font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground">Stok</label>
                                      <Input
                                        type="number"
                                        value={inlineStock}
                                        onChange={(e) => setInlineStock(e.target.value)}
                                        className="h-8 text-xs font-bold"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveInlineEdit(item.stockCode)}
                                      disabled={updating}
                                      className="flex-1 h-7 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                    >
                                      <Save className="w-3 h-3" />
                                      {updating ? "..." : "Kaydet"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelInlineEdit}
                                      className="h-7 text-xs cursor-pointer"
                                    >
                                      Vazgeç
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border">
                                  <div>
                                    <div className="text-sm font-extrabold text-foreground">
                                      {price.toLocaleString("tr-TR")} TL
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">Satış Fiyatı</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-foreground">{stock} adet</div>
                                    <div className="text-[10px] text-muted-foreground">Kullanılabilir</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Alt Aksiyonlar */}
                            <div className="flex items-center gap-1.5 pt-3 border-t border-border mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartInlineEdit(item)}
                                className="flex-1 h-7 text-xs font-semibold gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-indigo-600" />
                                Hızlı Güncelle
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleStatus(item)}
                                disabled={updating}
                                className={`h-7 px-2.5 text-xs font-semibold cursor-pointer ${
                                  isActive
                                    ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                }`}
                                title={isActive ? "Satışa Kapat" : "Satışa Aç"}
                              >
                                <Power className="w-3 h-3" />
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
        /* ─── DÜZ LİSTE GÖRÜNÜMÜ ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const stock = p.quantity ?? 0;
            const price = p.salePrice || 0;
            const isActive = p.status === "Active";
            const isSelected = selectedCodes.has(p.stockCode);
            const isEditingThis = editingStockCode === p.stockCode;

            return (
              <div
                key={p.stockCode}
                className={`bg-card border rounded-2xl p-4 transition-all flex flex-col justify-between shadow-xs ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                    : "border-border hover:border-indigo-500/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCode(p.stockCode)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {p.stockCode}
                      </span>
                    </label>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        isActive && stock > 0
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : !isActive
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {isActive && stock > 0 ? "Satışta" : !isActive ? "Pasif" : "Tükendi"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-foreground line-clamp-2">
                    {p.title}
                  </p>

                  {p.barcode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Barkod: {p.barcode}
                    </p>
                  )}

                  {isEditingThis ? (
                    <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-indigo-500/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">Fiyat (TL)</label>
                          <Input
                            type="number"
                            value={inlinePrice}
                            onChange={(e) => setInlinePrice(e.target.value)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">Stok</label>
                          <Input
                            type="number"
                            value={inlineStock}
                            onChange={(e) => setInlineStock(e.target.value)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleSaveInlineEdit(p.stockCode)}
                          disabled={updating}
                          className="flex-1 h-7 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          {updating ? "..." : "Kaydet"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelInlineEdit}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Vazgeç
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                      <div>
                        <div className="text-base font-extrabold text-foreground">
                          {price.toLocaleString("tr-TR")} TL
                        </div>
                        <div className="text-[10px] text-muted-foreground">Satış Fiyatı</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            stock > 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          }`}
                        >
                          Stok: {stock}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartInlineEdit(p)}
                    className="flex-1 h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    Hızlı Güncelle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(p)}
                    disabled={updating}
                    className={`h-8 px-3 text-xs font-semibold cursor-pointer ${
                      isActive
                        ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5 mr-1" />
                    {isActive ? "Kapat" : "Aç"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
