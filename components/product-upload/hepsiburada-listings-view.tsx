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
  Activity,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { HepsiburadaProductEditModal, type HepsiburadaListingItem } from "./hepsiburada-product-edit-modal";
import { HepsiburadaTrackingModal } from "./hepsiburada-tracking-modal";
import * as XLSX from "xlsx";

type StatusTab = "all" | "active" | "sold_out" | "passive";

// Kart İçi Kaydırmalı Resim Görseli Bileşeni
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
  items: HepsiburadaListingItem[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  activeCount: number;
  soldOutCount: number;
  passiveCount: number;
}

export function HepsiburadaListingsView() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [listings, setListings] = useState<HepsiburadaListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [environment, setEnvironment] = useState<"prod" | "sit" | "">("");

  // Görünüm Modu: "grouped" (Model Koduna göre) | "flat" (Düz Liste)
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Çoklu Seçim
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filtreler
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");

  // Hızlı Fiyat / Stok Düzenleme State'leri
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<string>("");
  const [inlineStock, setInlineStock] = useState<string>("");
  const [inlineSaving, setInlineSaving] = useState(false);

  // Modallar
  const [editingListing, setEditingListing] = useState<HepsiburadaListingItem | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>("");

  const getNumericPrice = (p: any): number => {
    if (typeof p === "number") return p;
    if (p && typeof p.amount === "number") return p.amount;
    const n = parseFloat(String(p || 0));
    return isNaN(n) ? 0 : n;
  };

  const loadListings = useCallback(async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/hepsiburada/listings?limit=100");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Hepsiburada listelemeleri alınamadı");
      }

      setListings(data.listings || []);
      setTotalCount(data.total || (data.listings || []).length);
      setEnvironment(data.environment || "");

      if (isSync) {
        toast({
          title: "Hepsiburada Eşitlendi",
          description: `${data.listings?.length || 0} adet listeleme başarıyla güncellendi.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Hepsiburada API Hatası",
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

  // Model Kodunu SKU veya modelCode'dan akıllıca ayıkla
  const getModelCode = useCallback((item: HepsiburadaListingItem): string => {
    if ((item as any).modelCode) return (item as any).modelCode;
    if (item.productId) return item.productId;
    const sku = item.merchantSku || "";
    // Tire veya alt çizgi ile ayrılmışsa ilk ana gövdeyi al (örn: VRO-SYH -> VRO)
    const parts = sku.split(/[-_]/);
    if (parts.length > 1 && parts[0].length >= 2) {
      return parts[0];
    }
    return sku.slice(0, 10) || "DİĞER";
  }, []);

  // Gruplama Mantığı
  const modelGroups = useMemo<ModelGroup[]>(() => {
    const map = new Map<string, HepsiburadaListingItem[]>();

    listings.forEach((item) => {
      const groupKey = getModelCode(item);
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });

    const groups: ModelGroup[] = [];

    map.forEach((items, key) => {
      let totalStock = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let activeCount = 0;
      let soldOutCount = 0;
      let passiveCount = 0;

      items.forEach((item) => {
        const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
        const price = getNumericPrice(item.price);
        // null/undefined → aktif varsay; sadece açıkça false ise pasif say
        const isSalable = item.isSalable !== false || stock > 0;

        totalStock += stock;
        if (price > 0) {
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;
        }

        if (!isSalable) {
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
      const title = firstItem.productName || firstItem.title || (firstItem.merchantSku
        ? `Hepsiburada Model: ${key}`
        : "Hepsiburada Ürün Grubu");

      // Gruptaki tüm varyantları tara, ilk geçerli görseli model ana görseli yap
      let mainImage = "";
      for (const item of items) {
        const found = (item.images || []).find((img: string) => typeof img === "string" && img.trim().length > 0);
        if (found) {
          mainImage = found;
          break;
        }
      }
      if (!mainImage) {
        mainImage = (firstItem as any).imageUrl || "";
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
  }, [listings, getModelCode]);

  // Filtreleme
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const sku = (item.merchantSku || "").toLowerCase();
      const hbSku = (item.hepsiburadaSku || "").toLowerCase();
      const name = ((item as any).productName || (item as any).title || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      if (query && !sku.includes(query) && !hbSku.includes(query) && !name.includes(query)) {
        return false;
      }

      if (selectedGroupCode && getModelCode(item) !== selectedGroupCode) {
        return false;
      }

      const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
      // SIT test ortamında tüm fiyat/stok sıfır gelir — isSalable'a bakmadan tümünü göster
      // Prod'da isSalable: false ise gerçekten pasif
      const isSalable = environment === "sit"
        ? true  // SIT'te filtre uygulama, hepsini göster
        : (item.isSalable !== false || stock > 0);

      // "Tümü" sekmesinde sadece aktif ve stoğu bitenler listelenir, pasifler "Satışa Kapalı" sekmesinde yer alır
      if (activeTab === "all" && !isSalable) return false;
      if (activeTab === "active" && (!isSalable || stock <= 0)) return false;
      if (activeTab === "sold_out" && (!isSalable || stock > 0)) return false;
      if (activeTab === "passive" && isSalable) return false;

      return true;
    });
  }, [listings, searchTerm, selectedGroupCode, activeTab, getModelCode]);

  // Filtrelenmiş Model Grupları
  const filteredGroups = useMemo(() => {
    const codeSet = new Set(filteredListings.map((l) => l.merchantSku));
    return modelGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => codeSet.has(i.merchantSku)),
      }))
      .filter((g) => g.items.length > 0);
  }, [modelGroups, filteredListings]);

  // Sekme sayaçları
  const tabCounts = useMemo(() => {
    let active = 0;
    let soldOut = 0;
    let passive = 0;

    listings.forEach((item) => {
      const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
      // SIT test ortamında gerçek stok/fiyat yok — isSalable'a bakma
      const isSalable = environment === "sit"
        ? true
        : (item.isSalable !== false || stock > 0);
      if (!isSalable) passive++;
      else if (stock === 0) soldOut++;
      else active++;
    });

    const allActive = active + soldOut;
    return { active, soldOut, passive, allActive };
  }, [listings]);

  // Akordeon Aç / Kapa
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
  const toggleSelectCode = (sku: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredListings.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredListings.map((i) => i.merchantSku)));
    }
  };

  // Hızlı Satır İçi Düzenleme
  const handleStartInlineEdit = (item: HepsiburadaListingItem) => {
    setEditingSku(item.merchantSku);
    setInlinePrice(String(getNumericPrice(item.price)));
    setInlineStock(String(item.availableStock ?? 0));
  };

  const handleCancelInlineEdit = () => {
    setEditingSku(null);
  };

  const handleSaveInlineEdit = async (item: HepsiburadaListingItem) => {
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

    setInlineSaving(true);
    try {
      const res = await fetch("/api/hepsiburada/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            merchantSku: item.merchantSku,
            hepsiburadaSku: item.hepsiburadaSku,
            price: priceNum,
            availableStock: stockNum,
            dispatchTime: item.dispatchTime ?? 2,
            cargoCompany1: item.cargoCompany1 || "Aras Kargo",
            isSalable: stockNum > 0,
          },
        ]),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Güncelleme başarısız.");
      }

      toast({
        title: "Güncellendi",
        description: `${item.merchantSku} fiyatı ${priceNum.toLocaleString("tr-TR")} TL, stoğu ${stockNum} olarak güncellendi.`,
      });

      // Yerel state'i güncelle
      setListings((prev) =>
        prev.map((it) =>
          it.merchantSku === item.merchantSku
            ? { ...it, price: priceNum, availableStock: stockNum, isSalable: stockNum > 0 }
            : it
        )
      );
      setEditingSku(null);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setInlineSaving(false);
    }
  };

  // Pasife Al / Satıştan Kaldır
  const handleDeactivate = async (item: HepsiburadaListingItem) => {
    const confirmed = await confirm({
      title: "Ürünü Pasife Al",
      message: `"${item.merchantSku}" kodlu listelemeyi pasife alıp stoklarını sıfırlamak istediğinize emin misiniz?`,
      confirmText: "Evet, Pasife Al",
      cancelText: "Vazgeç",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/hepsiburada/listings?merchantSku=${encodeURIComponent(
          item.merchantSku
        )}&hepsiburadaSku=${encodeURIComponent(item.hepsiburadaSku || "")}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "İşlem başarısız");
      }

      toast({
        title: "Ürün Pasife Alındı",
        description: `${item.merchantSku} listelemesi pasif duruma getirildi.`,
      });

      loadListings();
    } catch (err: any) {
      toast({
        title: "İşlem Hatası",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Toplu Pasife Al
  const handleBulkDeactivate = async () => {
    if (selectedCodes.size === 0) return;

    const confirmed = await confirm({
      title: "Seçilenleri Toplu Pasife Al",
      message: `Seçilen ${selectedCodes.size} adet ürünü pasife almak istediğinize emin misiniz?`,
      confirmText: `Evet, ${selectedCodes.size} Ürünü Pasife Al`,
      cancelText: "Vazgeç",
      variant: "warning",
    });

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const selectedItems = listings.filter((l) => selectedCodes.has(l.merchantSku));
      const payload = selectedItems.map((item) => ({
        merchantSku: item.merchantSku,
        hepsiburadaSku: item.hepsiburadaSku,
        price: 0,
        availableStock: 0,
        dispatchTime: 1,
        cargoCompany1: item.cargoCompany1 || "Aras Kargo",
        isSalable: false,
      }));

      const res = await fetch("/api/hepsiburada/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Toplu pasife alma başarısız");
      }

      toast({
        title: "İşlem Başarılı",
        description: `${selectedCodes.size} ürün pasife alındı.`,
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

  // Modeli Pasife Al
  const handleModelDeactivate = async (group: ModelGroup) => {
    const confirmed = await confirm({
      title: "Modeli Satışa Kapat / Pasife Al",
      message: `"${group.title}" modelindeki toplam ${group.items.length} varyantın tümü Hepsiburada üzerinde pasife alınacaktır. Devam etmek istiyor musunuz?`,
      confirmText: "Evet, Modeli Pasife Al",
      cancelText: "Vazgeç",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const payload = group.items.map((item) => ({
        merchantSku: item.merchantSku,
        hepsiburadaSku: item.hepsiburadaSku,
        price: 0,
        availableStock: 0,
        dispatchTime: 1,
        cargoCompany1: item.cargoCompany1 || "Aras Kargo",
        isSalable: false,
      }));

      const res = await fetch("/api/hepsiburada/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Modeli pasife alma başarısız");
      }

      toast({
        title: "Model Pasife Alındı",
        description: `"${group.title}" modelindeki ${group.items.length} varyant pasife çekildi.`,
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

  // Excel İndirme
  const handleExportExcel = () => {
    if (filteredListings.length === 0) {
      toast({
        title: "İndirilecek Veri Yok",
        description: "Mevcut kriterlere uygun listeleme bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    const rows = filteredListings.map((item) => ({
      "Satıcı Stok Kodu (Merchant SKU)": item.merchantSku || "",
      "Hepsiburada SKU": item.hepsiburadaSku || "",
      "Fiyat (TL)": getNumericPrice(item.price),
      "Mevcut Stok": item.availableStock ?? 0,
      "Satışta mı?": item.isSalable ? "Evet" : "Hayır",
      "Kargo Firması": item.cargoCompany1 || "Aras Kargo",
      "Kargoya Veriliş Süresi (Gün)": item.dispatchTime ?? 2,
      "Çıkış Depo / Adres": item.shippingAddressLabel || "Varsayılan Depo",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hepsiburada_Listelemeler");
    XLSX.writeFile(workbook, `Hepsiburada_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Excel İndirildi",
      description: `${rows.length} adet listeleme Excel'e aktarıldı.`,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmDialog />

      {/* SIT Test Ortamı Uyarısı */}
      {environment === "sit" && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div>
            <span className="font-bold text-amber-600">SIT Test Ortamı</span>
            <span className="text-muted-foreground ml-2 text-xs">
              Mevcut API anahtarları test ortamına ait. Gerçek mağaza verilerinizi görmek için
              Hepsiburada İş Ortağı Paneli'nden prod API anahtarlarını alıp <code className="font-mono bg-muted px-1 rounded">HEPSIBURADA_ENV=prod</code> olarak ayarlayın.
              Şu an <strong className="text-amber-600">SIT</strong>'te {listings.length} test ürünü görünüyor.
            </span>
          </div>
        </div>
      )}

      {/* ─── ÜST BİLGİ & EŞİTLEME ÇUBUĞU (PAZARAMA TASARIM STANDARDI) ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-600 flex items-center justify-center font-black shadow-xs">
            <span className="text-sm">HB</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">Hepsiburada Ürün & Model Kataloğum</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-semibold border border-orange-500/20">
                {modelGroups.length} Model ({totalCount} Varyant)
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                environment === "sit"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              }`}>
                ● {environment === "sit" ? "SIT Test" : "Canlı"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aynı model kodundaki tüm renk varyantlarını tek çatı altında derli toplu yönetin, hızlı fiyat/stok güncelleyin.
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
            {syncing ? "Eşitleniyor..." : "Hepsiburada'dan Güncelle"}
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
                  ? "bg-orange-600 text-white shadow-xs"
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
              placeholder="Model adı, SKU veya HB barkodu ile ara..."
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="relative">
            <select
              value={selectedGroupCode}
              onChange={(e) => setSelectedGroupCode(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-input bg-muted/40 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                checked={selectedCodes.size === filteredListings.length && filteredListings.length > 0}
                onChange={toggleSelectAll}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>Tümünü Seç ({filteredListings.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── SEÇİLENLER İÇİN TOPLU İŞLEM ÇUBUĞU ─── */}
      {selectedCodes.size > 0 && (
        <div className="sticky top-4 z-20 bg-orange-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-2 duration-150">
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
              className="h-8 text-xs font-bold gap-1.5 bg-white text-orange-700 hover:bg-white/90 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Seçilenleri Pasife Al
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
      ) : filteredListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 text-orange-600">
            <Boxes className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">Henüz Listeleme Bulunamadı</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Arama kriterlerinize uyan bir ürün bulunamadı veya mağazada henüz listelenmiş ürün bulunmuyor.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ─── MODEL GRUPLU GÖRÜNÜM (PAZARAMA BİREBİR STANDARDI) ─── */
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const allSelected = group.items.every((i) => selectedCodes.has(i.merchantSku));

            return (
              <div
                key={group.key}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs transition-all hover:border-orange-500/30"
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
                              if (allSelected) next.delete(i.merchantSku);
                              else next.add(i.merchantSku);
                            });
                            return next;
                          });
                        }}
                        className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
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
                        <div className="w-full h-full rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
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
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 font-mono">
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
                      onClick={() => setEditingListing(group.items[0])}
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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

                {/* Grup İçi Varyant Kartları */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-background/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {group.items.map((item) => {
                        const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
                        const price = getNumericPrice(item.price);
                        const isSalable = item.isSalable ?? (stock > 0);
                        const isSelected = selectedCodes.has(item.merchantSku);
                        const isEditingThis = editingSku === item.merchantSku;

                        return (
                          <div
                            key={item.merchantSku}
                            className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? "border-orange-500 bg-orange-500/5 shadow-xs ring-1 ring-orange-500/20"
                                : "border-border bg-card hover:border-orange-500/30"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Ürün Görselleri */}
                              {item.images && item.images.length > 0 && (
                                <ProductImageSlider images={item.images} title={item.productName || item.title || item.merchantSku} />
                              )}

                              {/* Üst Kısım: Checkbox, SKU & Durum */}
                              <div className="flex items-start justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectCode(item.merchantSku)}
                                    className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                                  />
                                  <span className="font-mono text-xs font-bold text-foreground truncate max-w-[140px]">
                                    {item.merchantSku}
                                  </span>
                                </label>

                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    isSalable && stock > 0
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                      : !isSalable
                                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  }`}
                                >
                                  {isSalable && stock > 0 ? "Satışta" : !isSalable ? "Pasif" : "Tükendi"}
                                </span>
                              </div>

                              {item.hepsiburadaSku && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  HB SKU: {item.hepsiburadaSku}
                                </p>
                              )}

                              {/* Ürün Adı & Açıklama */}
                              {(item.productName || item.title) && (
                                <p className="text-xs text-foreground font-semibold line-clamp-2">
                                  {item.productName || item.title}
                                </p>
                              )}

                              {item.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}

                              {/* Satır İçi Düzenleme / Gösterim */}
                              {isEditingThis ? (
                                <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-orange-500/30">
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
                                      onClick={() => handleSaveInlineEdit(item)}
                                      disabled={inlineSaving}
                                      className="flex-1 h-7 text-xs font-bold gap-1 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                                    >
                                      <Save className="w-3 h-3" />
                                      {inlineSaving ? "..." : "Kaydet"}
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
                                <Edit className="w-3 h-3 text-orange-600" />
                                Hızlı Güncelle
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingListing(item)}
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                                title="Detaylı Düzenle"
                              >
                                Detay
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeactivate(item)}
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Pasife Al"
                              >
                                <Trash2 className="w-3 h-3" />
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
          {filteredListings.map((item) => {
            const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
            const price = getNumericPrice(item.price);
            const isSalable = item.isSalable ?? (stock > 0);
            const isSelected = selectedCodes.has(item.merchantSku);
            const isEditingThis = editingSku === item.merchantSku;

            return (
              <div
                key={item.merchantSku}
                className={`bg-card border rounded-2xl p-4 transition-all flex flex-col justify-between shadow-xs ${
                  isSelected
                    ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500/20"
                    : "border-border hover:border-orange-500/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCode(item.merchantSku)}
                        className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {item.merchantSku}
                      </span>
                    </label>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        isSalable && stock > 0
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : !isSalable
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {isSalable && stock > 0 ? "Satışta" : !isSalable ? "Pasif" : "Tükendi"}
                    </span>
                  </div>

                  {item.hepsiburadaSku && (
                    <p className="text-xs text-muted-foreground font-mono">
                      HB SKU: {item.hepsiburadaSku}
                    </p>
                  )}

                  {isEditingThis ? (
                    <div className="space-y-2 p-2.5 rounded-xl bg-muted/40 border border-orange-500/30">
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
                          onClick={() => handleSaveInlineEdit(item)}
                          disabled={inlineSaving}
                          className="flex-1 h-7 text-xs font-bold gap-1 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          {inlineSaving ? "..." : "Kaydet"}
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
                    onClick={() => handleStartInlineEdit(item)}
                    className="flex-1 h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-orange-600" />
                    Hızlı Güncelle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingListing(item)}
                    className="h-8 px-3 text-xs font-semibold cursor-pointer"
                  >
                    Detay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(item)}
                    className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODALLAR ─── */}
      {editingListing && (
        <HepsiburadaProductEditModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            setEditingListing(null);
            loadListings();
          }}
        />
      )}

      {trackingModalOpen && (
        <HepsiburadaTrackingModal
          initialTrackingId={selectedTrackingId}
          onClose={() => setTrackingModalOpen(false)}
        />
      )}
    </div>
  );
}
