"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Search,
  RefreshCw,
  Edit2,
  Check,
  X,
  Power,
  Trash2,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Save,
  Boxes,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { TrendruumProduct } from "@/lib/trendruum-api-client";
import * as XLSX from "xlsx";

type StatusTab = "all" | "active" | "sold_out" | "passive";

// Görsel Kaydırıcı
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
        // eslint-disable-next-line @next/next/no-img-element
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
  items: TrendruumProduct[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  activeCount: number;
  soldOutCount: number;
  passiveCount: number;
}

export function TrendruumProductsClient() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [products, setProducts] = useState<TrendruumProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Görünüm Modu
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Çoklu Seçim
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filtreler
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");

  // Satır içi düzenleme
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<string>("");
  const [inlineStock, setInlineStock] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const fetchProducts = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trendruum/products?search=${encodeURIComponent(searchTerm)}&limit=100`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setProducts(data.products || []);
      setTotalCount(data.total || data.products?.length || 0);

      if (showToast) {
        toast({
          title: "Trendruum Eşitlendi",
          description: `${data.products?.length || 0} adet ürün Trendruum'dan güncellendi.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Trendruum Ürün Hatası",
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

  // Model Kodunu al — Trendruum API'de 'model_code' field'ı olarak gelir, API client normalize ediyor
  const getModelCode = useCallback((p: TrendruumProduct): string => {
    // API client model_code'u product_main_id'ye normalize ediyor
    const code = (p as any).model_code || p.product_main_id || (p as any).stock_code || "";
    if (code) return code.trim().toUpperCase();
    // Son çare: barkodu olduğu gibi kullan (her barkod ayrı ürün)
    return p.barcode || p.id?.toString() || "GENEL";
  }, []);

  // Gruplama Mantığı
  const modelGroups = useMemo<ModelGroup[]>(() => {
    const map = new Map<string, TrendruumProduct[]>();

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
        const stock = p.stock ?? 0;
        const price = p.price || 0;
        const isActive = p.status === "active";

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
      const title = firstItem.title || `${key}`;
      
      // Gruptaki tüm varyantları tara, ilk geçerli görseli model ana görseli yap
      let mainImage = "";
      for (const item of items) {
        const found = (item.images || []).find((img) => typeof img === "string" && img.trim().length > 0);
        if (found) {
          mainImage = found.startsWith("http")
            ? found
            : `https://tr-126.b-cdn.net/${found.replace(/^\//, "")}`;
          break;
        }
      }

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
      const barcode = (p.barcode || "").toLowerCase();

      if (q && !title.includes(q) && !barcode.includes(q)) {
        return false;
      }

      if (selectedGroupCode && getModelCode(p) !== selectedGroupCode) {
        return false;
      }

      const stock = p.stock ?? 0;
      const isActive = p.status === "active";

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
    const codeSet = new Set(filteredProducts.map((p) => p.barcode));
    return modelGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => codeSet.has(i.barcode)),
      }))
      .filter((g) => g.items.length > 0);
  }, [modelGroups, filteredProducts]);

  // Sekme sayaçları
  const tabCounts = useMemo(() => {
    let active = 0;
    let soldOut = 0;
    let passive = 0;

    products.forEach((p) => {
      const stock = p.stock ?? 0;
      const isActive = p.status === "active";
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
  const toggleSelectBarcode = (barcode: string) => {
    setSelectedBarcodes((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBarcodes.size === filteredProducts.length) {
      setSelectedBarcodes(new Set());
    } else {
      setSelectedBarcodes(new Set(filteredProducts.map((p) => p.barcode).filter(Boolean) as string[]));
    }
  };

  // Hızlı Satır İçi Düzenleme
  const handleStartInlineEdit = (p: TrendruumProduct) => {
    if (!p.barcode) return;
    setEditingBarcode(p.barcode);
    setInlinePrice(String(p.price || ""));
    setInlineStock(String(p.stock ?? 0));
  };

  const handleCancelInlineEdit = () => {
    setEditingBarcode(null);
  };

  const handleSaveInlineEdit = async (barcode: string) => {
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
      const res = await fetch("/api/trendruum/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItems: [{ barcode, stock: stockNum }],
          priceItems: [{ barcode, price: priceNum, compare_price: priceNum }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Güncelleme Başarılı",
        description: `${barcode} ürününün fiyat ve stok bilgisi güncellendi.`,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.barcode === barcode
            ? { ...item, price: priceNum, stock: stockNum }
            : item
        )
      );
      setEditingBarcode(null);
    } catch (err: any) {
      toast({ title: "Güncelleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  // Durum Değiştir
  const handleToggleStatus = async (p: TrendruumProduct) => {
    if (!p.barcode) return;
    const isCurrentlyActive = p.status === "active";
    const newStatus = isCurrentlyActive ? "passive" : "active";

    setUpdating(true);
    try {
      const res = await fetch("/api/trendruum/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ barcode: p.barcode, status: newStatus }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Durum Güncellendi",
        description: `${p.barcode} ürünü ${newStatus === "active" ? "Satışa Açıldı" : "Satıştan Çekildi"}.`,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.barcode === p.barcode ? { ...item, status: newStatus } : item
        )
      );
    } catch (err: any) {
      toast({ title: "Durum Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  // Modeli Pasife Al / Satıştan Kaldır
  const handleModelDeactivate = async (group: ModelGroup) => {
    const confirmed = await confirm({
      title: "Modeli Satışa Kapat / Pasife Al",
      message: `"${group.title}" modelindeki toplam ${group.items.length} varyantın tümü Trendruum üzerinde pasife alınacaktır. Devam etmek istiyor musunuz?`,
      confirmText: "Evet, Modeli Pasife Al",
      cancelText: "Vazgeç",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const items = group.items.map((it) => ({ barcode: it.barcode, status: "passive" }));
      const res = await fetch("/api/trendruum/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Model Pasife Alındı",
        description: `"${group.title}" modelindeki tüm varyantlar pasife çekildi.`,
      });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  // Toplu Satışa Kapat
  const handleBulkDeactivate = async () => {
    if (selectedBarcodes.size === 0) return;

    const confirmed = await confirm({
      title: "Seçilenleri Toplu Satışa Kapat",
      message: `Seçilen ${selectedBarcodes.size} adet ürünü Trendruum üzerinde satışa kapatmak istediğinize emin misiniz?`,
      confirmText: `Evet, ${selectedBarcodes.size} Ürünü Kapat`,
      cancelText: "Vazgeç",
      variant: "warning",
    });

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const items = Array.from(selectedBarcodes).map((barcode) => ({ barcode, status: "passive" }));
      const res = await fetch("/api/trendruum/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "İşlem Başarılı",
        description: `${selectedBarcodes.size} ürün satıştan çekildi.`,
      });

      setSelectedBarcodes(new Set());
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Excel İndir
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      toast({ title: "Veri Yok", description: "Dışa aktarılacak ürün bulunamadı." });
      return;
    }

    const rows = filteredProducts.map((p) => ({
      Barkod: p.barcode || "",
      "Ürün Başlığı": p.title,
      "Model Kodu": p.product_main_id || "",
      "Satış Fiyatı (TL)": p.price || 0,
      "Piyasa Fiyatı (TL)": p.compare_price || p.price || 0,
      Stok: p.stock ?? 0,
      Durum: p.status === "active" ? "Satışta" : "Pasif",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trendruum_Ürünler");
    XLSX.writeFile(workbook, `Trendruum_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Excel İndirildi",
      description: `${rows.length} adet Trendruum ürünü Excel'e aktarıldı.`,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmDialog />

      {/* ─── ÜST BİLGİ & EŞİTLEME ÇUBUĞU (PAZARAMA STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-black shadow-xs">
            <span className="text-sm">TR</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">Trendruum Ürün & Model Kataloğum</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-semibold border border-purple-500/20">
                {modelGroups.length} Model ({totalCount} Ürün)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                ● Canlı OAuth
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trendruum mağazanızdaki ürünleri model ve renk bazında derli toplu yönetin, anlık fiyat ve stok aktarın.
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
              <Layers className="w-3.5 h-3.5 text-purple-600" />
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            {loading ? "Eşitleniyor..." : "Trendruum'dan Güncelle"}
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
                  ? "bg-purple-600 text-white shadow-xs"
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
                className="text-purple-600 hover:underline font-semibold cursor-pointer"
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
              placeholder="Model adı veya barkod ile ara..."
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="relative">
            <select
              value={selectedGroupCode}
              onChange={(e) => setSelectedGroupCode(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-input bg-muted/40 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                checked={selectedBarcodes.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={toggleSelectAll}
                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <span>Tümünü Seç ({filteredProducts.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── SEÇİLENLER İÇİN TOPLU İŞLEM ÇUBUĞU ─── */}
      {selectedBarcodes.size > 0 && (
        <div className="sticky top-4 z-20 bg-purple-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
              {selectedBarcodes.size}
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
              className="h-8 text-xs font-bold gap-1.5 bg-white text-purple-700 hover:bg-white/90 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" />
              Seçilenleri Satışa Kapat
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedBarcodes(new Set())}
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
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 text-purple-600">
            <Boxes className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">Ürün Bulunamadı</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Arama kriterlerinize uyan bir Trendruum ürünü bulunamadı.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ─── MODEL GRUPLU GÖRÜNÜM ─── */
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const allSelected = group.items.every((i) => selectedBarcodes.has(i.barcode || ""));

            return (
              <div
                key={group.key}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs transition-all hover:border-purple-500/30"
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
                          setSelectedBarcodes((prev) => {
                            const next = new Set(prev);
                            group.items.forEach((i) => {
                              if (i.barcode) {
                                if (allSelected) next.delete(i.barcode);
                                else next.add(i.barcode);
                              }
                            });
                            return next;
                          });
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
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
                        <div className="w-full h-full rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
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
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-mono">
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
                        handleStartInlineEdit(group.items[0]);
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
                        const stock = item.stock ?? 0;
                        const price = item.price || 0;
                        const isActive = item.status === "active";
                        const isSelected = item.barcode ? selectedBarcodes.has(item.barcode) : false;
                        const isEditingThis = editingBarcode === item.barcode;
                        // API client medias→images dönüşümünü zaten yaptı
                        const images = item.images && item.images.length > 0 ? item.images : [];
                        const itemTitle = item.title || "";

                        return (
                          <div
                            key={item.barcode || item.id}
                            className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/20"
                                : "border-border bg-card hover:border-purple-500/30"
                            }`}
                          >
                            <div className="space-y-3">
                              {images.length > 0 && (
                                <ProductImageSlider images={images} title={itemTitle} />
                              )}

                              <div className="flex items-start justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => item.barcode && toggleSelectBarcode(item.barcode)}
                                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                                  />
                                  <span className="font-mono text-xs font-bold text-foreground truncate max-w-[150px]">
                                    {item.barcode}
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
                                {itemTitle}
                              </p>

                              {item.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}

                              {/* Satır İçi Düzenleme */}
                              {isEditingThis ? (
                                <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-purple-500/30">
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
                                      onClick={() => item.barcode && handleSaveInlineEdit(item.barcode)}
                                      disabled={updating}
                                      className="flex-1 h-7 text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
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
                                <Edit2 className="w-3 h-3 text-purple-600" />
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
            const stock = p.stock ?? 0;
            const price = p.price || 0;
            const isActive = p.status === "active";
            const isSelected = selectedBarcodes.has(p.barcode || "");
            const isEditingThis = editingBarcode === p.barcode;
            const images = p.images || [];

            return (
              <div
                key={p.barcode || p.id}
                className={`bg-card border rounded-2xl p-4 transition-all flex flex-col justify-between shadow-xs ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/20"
                    : "border-border hover:border-purple-500/30"
                }`}
              >
                <div className="space-y-3">
                  {images.length > 0 && (
                    <ProductImageSlider images={images} title={p.title || ""} />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => p.barcode && toggleSelectBarcode(p.barcode)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {p.barcode}
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

                  {isEditingThis ? (
                    <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-purple-500/30">
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
                          onClick={() => p.barcode && handleSaveInlineEdit(p.barcode)}
                          disabled={updating}
                          className="flex-1 h-7 text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
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
                    <Edit2 className="w-3.5 h-3.5 text-purple-600" />
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
