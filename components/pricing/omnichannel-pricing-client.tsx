"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins,
  Package,
  Truck,
  TrendingUp,
  Percent,
  Copy,
  ExternalLink,
  Crown,
  Check,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
  Flame,
  Zap,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import {
  MARKETPLACES,
  DEFAULT_BASE_SETTINGS,
  type BaseSettings,
  type MarketplaceId,
  type PricingProductInput,
  calculatePlatformAll,
  type PlatformCalculationResult,
} from "@/lib/omnichannel-pricing";
import { CARGO_COMPANIES as TRENDYOL_CARGO } from "@/lib/trendyol-cargo";
import { HEPSIBURADA_COMPANIES } from "@/lib/hepsiburada-cargo";
import { N11_CARGO_COMPANIES } from "@/lib/n11-cargo";
import { PAZARAMA_CARGO_COMPANIES } from "@/lib/pazarama-cargo";
import { TRENDRUUM_CARGO_COMPANIES } from "@/lib/trendruum-cargo";
import { IDEFIX_CARGO_COMPANIES } from "@/lib/idefix-cargo";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types/database";

interface SavedProductItem {
  id: string;
  name: string;
  weightGrams: number;
  quantity: number;
  width?: number;
  height?: number;
  depth?: number;
  isCandleholder?: boolean;
  isKeychain?: boolean;
  isSoapdish?: boolean;
}

const CARGO_OPTIONS_MAP: Record<MarketplaceId, { id: string; label: string }[]> = {
  trendyol: TRENDYOL_CARGO,
  hepsiburada: HEPSIBURADA_COMPANIES,
  n11: N11_CARGO_COMPANIES,
  pazarama: PAZARAMA_CARGO_COMPANIES,
  trendruum: TRENDRUUM_CARGO_COMPANIES,
  idefix: IDEFIX_CARGO_COMPANIES,
};

export function OmnichannelPricingClient() {
  const { toast } = useToast();

  // 1. Ürün Giriş Bilgileri
  const [productName, setProductName] = useState("Örnek Ürün");
  const [weightGrams, setWeightGrams] = useState<string>("100");
  const [quantity, setQuantity] = useState<string>("1");
  const [width, setWidth] = useState<string>("20");
  const [height, setHeight] = useState<string>("15");
  const [depth, setDepth] = useState<string>("10");
  const [flags, setFlags] = useState<{ isCandleholder: boolean; isKeychain: boolean; isSoapdish: boolean }>({
    isCandleholder: false,
    isKeychain: false,
    isSoapdish: false,
  });

  // Global Simülasyon
  const [globalSimulatedPrice, setGlobalSimulatedPrice] = useState<string>("");
  const [platformSimulatedPrices, setPlatformSimulatedPrices] = useState<Record<MarketplaceId, string>>({
    trendyol: "",
    hepsiburada: "",
    n11: "",
    pazarama: "",
    trendruum: "",
    idefix: "",
  });

  // Kaydedilen Ürünler
  const [savedProducts, setSavedProducts] = useState<SavedProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Katalog Önerileri (Supabase)
  const [catalogSuggestions, setCatalogSuggestions] = useState<Product[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggRef = useRef<HTMLDivElement | null>(null);

  // Her Pazaryerinin Ayarları
  const [platformSettings, setPlatformSettings] = useState<Record<MarketplaceId, BaseSettings>>({
    trendyol: { ...DEFAULT_BASE_SETTINGS, commissionRate: 16 },
    hepsiburada: { ...DEFAULT_BASE_SETTINGS, commissionRate: 16 },
    n11: { ...DEFAULT_BASE_SETTINGS, commissionRate: 15 },
    pazarama: { ...DEFAULT_BASE_SETTINGS, commissionRate: 14 },
    trendruum: { ...DEFAULT_BASE_SETTINGS, commissionRate: 15 },
    idefix: { ...DEFAULT_BASE_SETTINGS, commissionRate: 14 },
  });

  // Kart Detaylarının Açık/Kapalı Durumu (Hangi ayarlarla hesaplandı?)
  const [expandedCardIds, setExpandedCardIds] = useState<Record<MarketplaceId, boolean>>({
    trendyol: false,
    hepsiburada: false,
    n11: false,
    pazarama: false,
    trendruum: false,
    idefix: false,
  });

  const toggleCardExpand = (id: MarketplaceId) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Ayar İnceleme / Düzenleme Modalı
  const [selectedModalMp, setSelectedModalMp] = useState<MarketplaceId | null>(null);
  const [modalSettingsForm, setModalSettingsForm] = useState<BaseSettings | null>(null);

  const openSettingsModal = (mpId: MarketplaceId) => {
    setSelectedModalMp(mpId);
    setModalSettingsForm({ ...platformSettings[mpId] });
  };

  const saveModalSettings = () => {
    if (!selectedModalMp || !modalSettingsForm) return;
    setPlatformSettings((prev) => {
      const updated = {
        ...prev,
        [selectedModalMp]: { ...modalSettingsForm },
      };
      const mp = MARKETPLACES.find((m) => m.id === selectedModalMp);
      if (mp) {
        localStorage.setItem(mp.storageKey, JSON.stringify(modalSettingsForm));
      }
      return updated;
    });
    toast({
      title: "Ayarlar Kaydedildi",
      description: `${selectedModalMp.toUpperCase()} hesaplama ayarları güncellendi.`,
    });
    setSelectedModalMp(null);
  };

  // LocalStorage'dan ayarları yükle
  const loadSettingsFromStorage = () => {
    const loaded: Record<MarketplaceId, BaseSettings> = { ...platformSettings };
    for (const mp of MARKETPLACES) {
      const saved = localStorage.getItem(mp.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const isOrganic = parsed.organicSalesMode !== undefined
            ? Boolean(parsed.organicSalesMode)
            : false;

          loaded[mp.id] = {
            ...DEFAULT_BASE_SETTINGS,
            ...parsed,
            organicSalesMode: isOrganic,
            advertisingRate: isOrganic ? 0 : (parsed.advertisingRate ?? 8),
            commissionRate: parsed.commissionRate ?? mp.defaultCommission,
            paymentTermFee: parsed.paymentTermFee ?? mp.defaultPaymentTerm ?? 0,
            platformFeeBase: parsed.platformFeeBase ?? mp.defaultPlatformFee,
          };
        } catch {
          // ignore
        }
      }
    }
    setPlatformSettings(loaded);
  };

  useEffect(() => {
    loadSettingsFromStorage();
    // Kaydedilen ürünleri yükle
    const saved = localStorage.getItem("omnichannelSavedProducts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedProducts(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Kaydedilen ürünleri sakla
  useEffect(() => {
    if (savedProducts.length > 0) {
      localStorage.setItem("omnichannelSavedProducts", JSON.stringify(savedProducts));
    }
  }, [savedProducts]);

  // Katalogdan ürün arama
  useEffect(() => {
    const q = productName.trim();
    if (q.length < 2) {
      setCatalogSuggestions([]);
      return;
    }

    let canceled = false;
    const t = setTimeout(async () => {
      let sb: ReturnType<typeof createClient> | null = null;
      try {
        sb = createClient();
      } catch {
        sb = null;
      }
      if (!sb) return;
      try {
        const { data, error } = await sb
          .from("products")
          .select("*")
          .ilike("name", `${q}%`)
          .limit(10)
          .order("name");
        if (error || canceled) return;
        if (data) setCatalogSuggestions(data as Product[]);
      } catch {
        // ignore
      }
    }, 200);

    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [productName]);

  // Dışarı tıklandığında önerileri kapat
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!suggRef.current) return;
      if (!suggRef.current.contains(e.target as Node)) setSuggestionsOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const pickSuggestion = (p: Product) => {
    setProductName(p.name);
    if ((p as any).weight_grams || (p as any).weight) {
      setWeightGrams(String((p as any).weight_grams ?? (p as any).weight));
    }
    setSuggestionsOpen(false);
  };

  // Kargo Şirketi Güncelleme
  const updatePlatformCargo = (mpId: MarketplaceId, company: string) => {
    setPlatformSettings((prev) => {
      const updated = {
        ...prev,
        [mpId]: {
          ...prev[mpId],
          cargoCompany: company,
        },
      };
      // LocalStorage'a da kaydet ki kendi sayfasında da güncellensin
      const mp = MARKETPLACES.find((m) => m.id === mpId);
      if (mp) {
        const saved = localStorage.getItem(mp.storageKey);
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(mp.storageKey, JSON.stringify({ ...parsed, cargoCompany: company }));
      }
      return updated;
    });
    toast({
      title: "Kargo Tercihi Güncellendi",
      description: `${mpId.toUpperCase()} için kargo şirketi "${company}" olarak ayarlandı.`,
    });
  };

  // Pazaryeri sayfasına yönlendirme URL'si oluşturucu
  const buildMarketplaceUrl = (mpId: MarketplaceId, mpDashboardUrl: string, recPrice: number) => {
    const params = new URLSearchParams();
    if (productName.trim()) params.set("name", productName.trim());
    if (weightGrams) params.set("weight", weightGrams);
    if (quantity) params.set("qty", quantity);
    if (flags.isCandleholder) params.set("candle", "1");
    if (flags.isKeychain) params.set("keychain", "1");
    if (flags.isSoapdish) params.set("soap", "1");

    const customP = platformSimulatedPrices[mpId] || globalSimulatedPrice;
    if (customP && !isNaN(parseFloat(customP)) && parseFloat(customP) > 0) {
      params.set("simPrice", parseFloat(customP).toFixed(2));
      params.set("price", parseFloat(customP).toFixed(2));
    } else if (recPrice && !isNaN(recPrice) && recPrice > 0) {
      params.set("price", recPrice.toFixed(2));
    }

    const currentCargo = platformSettings[mpId]?.cargoCompany;
    if (currentCargo && currentCargo !== "auto") {
      params.set("cargo", currentCargo);
    }

    return `${mpDashboardUrl}?${params.toString()}`;
  };

  // Ürünü Listeye Ekle
  const addCurrentProductToList = () => {
    const wt = parseFloat(weightGrams) || 100;
    const qty = parseInt(quantity) || 1;
    const item: SavedProductItem = {
      id: Date.now().toString(),
      name: productName.trim() || `Ürün ${savedProducts.length + 1}`,
      weightGrams: wt,
      quantity: qty,
      width: parseFloat(width) || 20,
      height: parseFloat(height) || 15,
      depth: parseFloat(depth) || 10,
      isCandleholder: flags.isCandleholder,
      isKeychain: flags.isKeychain,
      isSoapdish: flags.isSoapdish,
    };
    setSavedProducts((prev) => [item, ...prev]);
    setSelectedProductId(item.id);
    toast({
      title: "Ürün Kaydedildi",
      description: `"${item.name}" fiyatlandırma listesine eklendi.`,
    });
  };

  // Kayıtlı Ürünü Seç
  const selectSavedProduct = (item: SavedProductItem) => {
    setSelectedProductId(item.id);
    setProductName(item.name);
    setWeightGrams(String(item.weightGrams));
    setQuantity(String(item.quantity));
    if (item.width) setWidth(String(item.width));
    if (item.height) setHeight(String(item.height));
    if (item.depth) setDepth(String(item.depth));
    setFlags({
      isCandleholder: !!item.isCandleholder,
      isKeychain: !!item.isKeychain,
      isSoapdish: !!item.isSoapdish,
    });
  };

  const removeSavedProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProductId === id) setSelectedProductId(null);
  };

  // Fiyatı Panoya Kopyala
  const copyPrice = (price: number, platformName: string) => {
    navigator.clipboard.writeText(price.toFixed(2));
    toast({
      title: "Fiyat Kopyalandı",
      description: `${platformName} için ₺${price.toFixed(2)} panoya kopyalandı.`,
    });
  };

  // 2. Aktif Ürün Bilgisi
  const currentProduct: PricingProductInput = useMemo(() => {
    return {
      productName,
      weightGrams: Math.max(1, parseFloat(weightGrams) || 100),
      quantity: Math.max(1, parseInt(quantity) || 1),
      isCandleholder: flags.isCandleholder,
      isKeychain: flags.isKeychain,
      isSoapdish: flags.isSoapdish,
    };
  }, [productName, weightGrams, quantity, flags]);

  // 3. Tüm Pazaryerleri İçin Hesaplama
  const calculations: PlatformCalculationResult[] = useMemo(() => {
    const globalPriceNum = parseFloat(globalSimulatedPrice) || 0;

    return MARKETPLACES.map((mp) => {
      const settings = platformSettings[mp.id] || DEFAULT_BASE_SETTINGS;
      const platformSpecificPrice = parseFloat(platformSimulatedPrices[mp.id]) || 0;
      const simulatedPrice = platformSpecificPrice > 0 ? platformSpecificPrice : globalPriceNum > 0 ? globalPriceNum : null;

      return calculatePlatformAll(mp, currentProduct, settings, simulatedPrice);
    });
  }, [currentProduct, platformSettings, globalSimulatedPrice, platformSimulatedPrices]);

  // En Kârlı Pazaryeri
  const mostProfitable = useMemo(() => {
    if (!calculations.length) return null;
    return [...calculations].sort((a, b) => {
      const profitA = a.customBreakdown ? a.customBreakdown.netProfitAfterVat : a.recommendedBreakdown.netProfitAfterVat;
      const profitB = b.customBreakdown ? b.customBreakdown.netProfitAfterVat : b.recommendedBreakdown.netProfitAfterVat;
      return profitB - profitA;
    })[0];
  }, [calculations]);

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <div className="container mx-auto p-4 lg:p-6 pb-24 lg:pb-8 max-w-7xl space-y-6">

        {/* ── Üst Başlık ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Tüm Pazaryerleri Fiyatlandırma</h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">
                  6 Pazaryeri Aktif
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tek ekrandan tüm pazaryerleri için kargo, komisyon ve net kâr hesaplayın; satış fiyatlarınızı anında belirleyin.
              </p>
            </div>
          </div>

          {/* Hızlı Eylemler */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSettingsFromStorage}
              className="text-xs font-semibold gap-1.5 h-9"
              title="Pazaryerlerinin kendi sayfalarında kaydettiğiniz güncel komisyon ve kargo ayarlarını yeniden yükler"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ayarları Yenile
            </Button>
          </div>
        </div>

        {/* ── Ürün Girişi ve Simülasyon Kartı ── */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-base font-bold">Ürün Bilgileri & Parametreler</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                Girdiğiniz gramaj ve özellikler anında 6 platformda bağımsız olarak hesaplanır
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Ürün Adı */}
              <div className="lg:col-span-2 relative" ref={suggRef}>
                <Label htmlFor="product-name" className="text-xs font-semibold">
                  Ürün Adı
                </Label>
                <Input
                  id="product-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onFocus={() => {
                    if (catalogSuggestions.length) setSuggestionsOpen(true);
                  }}
                  placeholder="Örn: Suna Vazo, Aura Mumluk..."
                  className="mt-1 h-9 text-sm"
                />
                {suggestionsOpen && catalogSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-56 overflow-auto divide-y">
                    {catalogSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3.5 py-2 hover:bg-muted/60 transition-colors text-xs flex items-center justify-between"
                        onClick={() => pickSuggestion(p)}
                      >
                        <span className="font-semibold text-foreground">{p.name}</span>
                        {((p as any).weight_grams ?? (p as any).weight) && (
                          <span className="text-muted-foreground">{((p as any).weight_grams ?? (p as any).weight)} gr</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Gramaj */}
              <div>
                <Label htmlFor="product-weight" className="text-xs font-semibold">
                  Gramaj (gr)
                </Label>
                <Input
                  id="product-weight"
                  type="number"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  placeholder="100"
                  className="mt-1 h-9 text-sm font-semibold"
                />
              </div>

              {/* Adet */}
              <div>
                <Label htmlFor="product-quantity" className="text-xs font-semibold">
                  Set İçi Adet
                </Label>
                <Input
                  id="product-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="mt-1 h-9 text-sm"
                />
              </div>

              {/* Listeye Ekle Butonu */}
              <div className="flex items-end">
                <Button onClick={addCurrentProductToList} className="w-full h-9 text-xs font-semibold gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Listeye Kaydet
                </Button>
              </div>
            </div>

            {/* Boyutlar ve Ekstra Malzemeler */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-2 border-t">
              <div className="lg:col-span-5 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">En (cm)</Label>
                  <Input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Boy (cm)</Label>
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Yükseklik (cm)</Label>
                  <Input
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
              </div>

              {/* Ekstra Malzeme Toggle'ları */}
              <div className="lg:col-span-7 flex flex-wrap items-center gap-2 pt-3 sm:pt-0">
                <span className="text-xs text-muted-foreground mr-1">Ekstra Malzemeler:</span>
                <label className={`flex items-center gap-1.5 cursor-pointer text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  flags.isCandleholder ? "bg-amber-50 border-amber-400 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200" : "bg-card border-border text-muted-foreground"
                }`}>
                  <input
                    type="checkbox"
                    checked={flags.isCandleholder}
                    onChange={(e) => setFlags((f) => ({ ...f, isCandleholder: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span>🕯️ Pilli Mum</span>
                </label>

                <label className={`flex items-center gap-1.5 cursor-pointer text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  flags.isKeychain ? "bg-blue-50 border-blue-400 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200" : "bg-card border-border text-muted-foreground"
                }`}>
                  <input
                    type="checkbox"
                    checked={flags.isKeychain}
                    onChange={(e) => setFlags((f) => ({ ...f, isKeychain: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span>🔑 Anahtarlık</span>
                </label>

                <label className={`flex items-center gap-1.5 cursor-pointer text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  flags.isSoapdish ? "bg-emerald-50 border-emerald-400 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200" : "bg-card border-border text-muted-foreground"
                }`}>
                  <input
                    type="checkbox"
                    checked={flags.isSoapdish}
                    onChange={(e) => setFlags((f) => ({ ...f, isSoapdish: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span>🧴 Sabunluk Pompası</span>
                </label>
              </div>
            </div>

            {/* Kayıtlı Ürünler Hızlı Barı */}
            {savedProducts.length > 0 && (
              <div className="pt-2 border-t flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Hızlı Seçim:</span>
                {savedProducts.map((p) => {
                  const isSelected = selectedProductId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectSavedProduct(p)}
                      className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs cursor-pointer border transition-all shrink-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                          : "bg-muted/40 hover:bg-muted border-border text-foreground"
                      }`}
                    >
                      <span>{p.name} ({p.weightGrams}g)</span>
                      <button
                        onClick={(e) => removeSavedProduct(p.id, e)}
                        className="opacity-40 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Ortak Simülasyon Çubuğu ── */}
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground">Toplu Satış Fiyatı Simülasyonu</div>
              <div className="text-[11px] text-muted-foreground">
                Tüm pazaryerlerinde aynı fiyattan satsaydınız ne kadar net kâr kalacağını tek seferde görün:
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-44">
              <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">₺</span>
              <Input
                type="number"
                placeholder="Örn: 249.90"
                value={globalSimulatedPrice}
                onChange={(e) => setGlobalSimulatedPrice(e.target.value)}
                className="pl-7 h-9 text-sm font-bold bg-background"
              />
            </div>
            {globalSimulatedPrice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGlobalSimulatedPrice("")}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Sıfırla
              </Button>
            )}
          </div>
        </div>

        {/* ── 6 Pazaryeri Kartları Grid'i ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {calculations.map((res) => {
            const mp = res.marketplace;
            const cargoOptions = CARGO_OPTIONS_MAP[mp.id] || [];
            const activeBreakdown = res.customBreakdown || res.recommendedBreakdown;
            const isSimulated = !!res.customBreakdown;
            const isTopEarner = mostProfitable?.marketplace.id === mp.id;
            const isExpanded = !!expandedCardIds[mp.id];
            const wasteMultiplier = 1 + (res.settings.wastePercentage || 0) / 100;
            const rawPerGram = (res.settings.filamentPricePerKg || 400) / 1000;
            const costPerGram = rawPerGram * wasteMultiplier;

            return (
              <Card
                key={mp.id}
                className={`border-2 transition-all duration-200 relative overflow-hidden shadow-sm hover:shadow-md ${
                  isTopEarner
                    ? "border-emerald-500/70 bg-gradient-to-b from-emerald-50/20 to-transparent dark:from-emerald-950/10"
                    : "border-border hover:border-foreground/30"
                }`}
              >
                {/* En Kârlı Rozeti */}
                {isTopEarner && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3" />
                    En Kârlı
                  </div>
                )}

                {/* Kart Başlığı */}
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${mp.gradientClass} flex items-center justify-center text-white font-black text-xs shadow-md`}>
                        {mp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-1.5">
                          {mp.name}
                        </CardTitle>
                        <span className="text-[11px] text-muted-foreground">
                          Komisyon: %{res.settings.commissionRate} + %{res.settings.paymentTermFee} vade
                        </span>
                      </div>
                    </div>

                    <Link
                      href={buildMarketplaceUrl(mp.id, mp.dashboardUrl, activeBreakdown.price)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 p-1 hover:bg-muted rounded-lg"
                      title={`${mp.name} sayfasına git ve otomatik hesapla`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Kargo Şirketi Seçimi */}
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                      <Truck className="w-3 h-3 text-muted-foreground" />
                      Kargo:
                    </span>
                    <select
                      value={res.settings.cargoCompany || "auto"}
                      onChange={(e) => updatePlatformCargo(mp.id, e.target.value)}
                      className="text-xs font-semibold bg-background border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[190px] truncate"
                    >
                      {cargoOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Fiyat ve Kâr Odak Alanı */}
                  <div className="p-3.5 rounded-xl border bg-card/80 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {isSimulated ? "Simüle Fiyat" : "Önerilen Satış Fiyatı"}
                      </div>
                      <div className="text-2xl font-black tracking-tight text-foreground mt-0.5">
                        ₺{activeBreakdown.price.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        KDV Hariç: ₺{(activeBreakdown.price / 1.20).toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Net Kâr (KDV Sonrası)
                      </div>
                      <div className={`text-xl font-black mt-0.5 ${
                        activeBreakdown.netProfitAfterVat > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        ₺{activeBreakdown.netProfitAfterVat.toFixed(2)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-1.5 py-0 ${
                          activeBreakdown.netMarginAfterVat >= 20
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                            : activeBreakdown.netMarginAfterVat > 0
                            ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        %{activeBreakdown.netMarginAfterVat.toFixed(1)} Marj
                      </Badge>
                    </div>
                  </div>

                  {/* Kargo & Barem Rozeti */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground">Kargo:</span>
                      <span className="text-muted-foreground truncate">{activeBreakdown.baremLabel}</span>
                    </div>
                    <span className="font-black text-foreground shrink-0">
                      ₺{activeBreakdown.shippingIncVat.toFixed(2)}
                    </span>
                  </div>

                  {/* Gider Detayları (Komisyon, Platform, Maliyet) */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Komisyon + Vade:</span>
                      <span className="font-medium text-foreground">
                        ₺{(activeBreakdown.commission + activeBreakdown.paymentTerm).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Platform Hizmet Bedeli:</span>
                      <span className="font-medium text-foreground">
                        ₺{activeBreakdown.platformFee.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Üretim + Kutu Maliyeti:</span>
                      <span className="font-medium text-foreground">
                        ₺{(activeBreakdown.productionCost + activeBreakdown.packagingCost).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>İade Payı + Sabit Gider:</span>
                      <span className="font-medium text-foreground">
                        ₺{(activeBreakdown.returnCost + activeBreakdown.fixedCost).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t font-semibold text-foreground">
                      <span>Toplam Kesinti & Maliyet:</span>
                      <span className="font-black">₺{activeBreakdown.totalExpenses.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Hangi Ayarlarla Hesaplandı? Açılır Bölüm */}
                  <div className="pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => toggleCardExpand(mp.id)}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground group"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-45 transition-transform" />
                        Hangi Ayarlarla Hesaplandı?
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 rounded-xl bg-muted/30 border text-xs space-y-2.5 animate-in fade-in-50 duration-150">
                        {/* 1. Üretim & Hammadde */}
                        <div>
                          <div className="flex items-center justify-between pb-1 border-b border-border/60 mb-1.5">
                            <span className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                              🧵 Üretim & Hammadde:
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSettingsModal(mp.id)}
                              className="h-5 px-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            >
                              <Settings className="w-2.5 h-2.5 mr-1" />
                              Düzenle
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Filament:</span>{" "}
                              <strong className="text-foreground">₺{res.settings.filamentPricePerKg}/kg</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fire Oranı:</span>{" "}
                              <strong className="text-foreground">%{res.settings.wastePercentage}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gram Maliyeti:</span>{" "}
                              <strong className="text-foreground">₺{costPerGram.toFixed(3)}/gr</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Ürün Gramajı:</span>{" "}
                              <strong className="text-foreground">{currentProduct.weightGrams} gr</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Elektrik+Amort.:</span>{" "}
                              <strong className="text-foreground">
                                ₺{(res.settings.electricityCostPerGram + res.settings.depreciationCostPerGram).toFixed(2)}/gr
                              </strong>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-border/40 font-semibold flex justify-between text-foreground">
                              <span>Net Üretim Maliyeti:</span>
                              <span className="font-black">₺{activeBreakdown.productionCost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Paketleme & Sabit Giderler */}
                        <div className="pt-2 border-t border-border/60">
                          <span className="font-bold text-foreground block mb-1 text-[11px]">
                            📦 Paketleme & Operasyon:
                          </span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Kutulama/Paket:</span>{" "}
                              <strong className="text-foreground">₺{res.settings.packagingCost.toFixed(2)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sabit Gider:</span>{" "}
                              <strong className="text-foreground">₺{res.settings.fixedCostPerOrder.toFixed(2)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">İade Oranı:</span>{" "}
                              <strong className="text-foreground">%{res.settings.returnRate}</strong>{" "}
                              <span className="text-muted-foreground">(₺{activeBreakdown.returnCost.toFixed(2)})</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reklam:</span>{" "}
                              <strong className="text-foreground">
                                {res.settings.organicSalesMode || res.settings.advertisingRate === 0
                                  ? "%0 (Organik)"
                                  : `%${res.settings.advertisingRate}`}
                              </strong>{" "}
                              <span className="text-muted-foreground">
                                ({activeBreakdown.advertising > 0 ? `₺${activeBreakdown.advertising.toFixed(2)}` : "₺0.00"})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Pazaryeri & Kargo Kesintileri */}
                        <div className="pt-2 border-t border-border/60">
                          <span className="font-bold text-foreground block mb-1 text-[11px]">
                            🏢 Pazaryeri & Kargo:
                          </span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Komisyon:</span>{" "}
                              <strong className="text-foreground">%{res.settings.commissionRate}</strong>{" "}
                              <span className="text-muted-foreground">(₺{activeBreakdown.commission.toFixed(2)})</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vade Farkı:</span>{" "}
                              <strong className="text-foreground">%{res.settings.paymentTermFee}</strong>{" "}
                              <span className="text-muted-foreground">(₺{activeBreakdown.paymentTerm.toFixed(2)})</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hizmet Bedeli:</span>{" "}
                              <strong className="text-foreground">₺{activeBreakdown.platformFee.toFixed(2)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Kargo Şirketi:</span>{" "}
                              <strong className="text-foreground">
                                {res.settings.cargoCompany === "auto" ? "Otomatik" : res.settings.cargoCompany}
                              </strong>
                            </div>
                            <div className="col-span-2 text-indigo-600 dark:text-indigo-400 font-medium">
                              🚚 Kargo: {activeBreakdown.baremLabel} (₺{activeBreakdown.shippingIncVat.toFixed(2)})
                            </div>
                          </div>
                        </div>

                        {/* 4. Hedeflenen Kâr & Vergi */}
                        <div className="pt-2 border-t border-border/60 bg-background/60 p-2 rounded-lg space-y-1 text-[11px]">
                          <div className="flex justify-between font-bold text-foreground">
                            <span>🎯 Hedef Kâr Marjı:</span>
                            <span>%{res.settings.profitMargin}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Devlete Net KDV:</span>
                            <span>
                              ₺{Math.max(0, (activeBreakdown.price - activeBreakdown.totalExpenses) - activeBreakdown.netProfitAfterVat).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 pt-0.5 border-t border-border/40">
                            <span>💰 KDV Sonrası Net Kâr:</span>
                            <span>₺{activeBreakdown.netProfitAfterVat.toFixed(2)} (%{activeBreakdown.netMarginAfterVat.toFixed(1)})</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Özel Fiyat Simülatörü Girişi */}
                  <div className="pt-2 border-t flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Özel Fiyat Dene (TL)"
                      value={platformSimulatedPrices[mp.id]}
                      onChange={(e) =>
                        setPlatformSimulatedPrices((prev) => ({
                          ...prev,
                          [mp.id]: e.target.value,
                        }))
                      }
                      className="h-8 text-xs font-semibold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPrice(activeBreakdown.price, mp.name)}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 shrink-0"
                      title="Fiyatı Kopyala"
                    >
                      <Copy className="w-3 h-3" />
                      Kopyala
                    </Button>
                  </div>

                  {/* Pazaryerinde Aç ve Otomatik Hesapla Butonu */}
                  <div className="pt-2 border-t">
                    <Button
                      asChild
                      className="w-full h-8 text-xs font-bold gap-1.5 shadow-sm text-white"
                      style={{
                        backgroundColor: mp.accentColor,
                      }}
                    >
                      <Link href={buildMarketplaceUrl(mp.id, mp.dashboardUrl, activeBreakdown.price)}>
                        <ExternalLink className="w-3.5 h-3.5" />
                        {mp.name}&apos;da Aç ve Hesapla
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Karşılaştırmalı Özet Tablosu ── */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-base font-bold">Tüm Pazaryerleri Karşılaştırma Tablosu</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {currentProduct.weightGrams} gr / {currentProduct.quantity} Adet
              </Badge>
            </div>
            <CardDescription>
              Aynı ürünün tüm platformlardaki kargo ücreti, komisyon kesintisi, önerilen fiyatı ve net kâr karşılaştırması
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b bg-muted/50 font-semibold text-muted-foreground">
                    <th className="py-3 px-4">Pazaryeri</th>
                    <th className="py-3 px-3">Kargo Tercihi</th>
                    <th className="py-3 px-3">Kargo Ücreti</th>
                    <th className="py-3 px-3">Komisyon</th>
                    <th className="py-3 px-3">Hizmet Bedeli</th>
                    <th className="py-3 px-3">Toplam Maliyet</th>
                    <th className="py-3 px-3 font-bold text-foreground">Önerilen Satış Fiyatı</th>
                    <th className="py-3 px-3 font-bold text-foreground">Net Kâr (KDV Sonrası)</th>
                    <th className="py-3 px-3">Kâr Marjı</th>
                    <th className="py-3 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calculations.map((res) => {
                    const mp = res.marketplace;
                    const b = res.customBreakdown || res.recommendedBreakdown;
                    const isTop = mostProfitable?.marketplace.id === mp.id;

                    return (
                      <tr key={mp.id} className={`hover:bg-muted/40 transition-colors ${isTop ? "bg-emerald-50/30 dark:bg-emerald-950/20" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{mp.name}</span>
                            {isTop && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">
                                👑 En Kârlı
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {res.settings.cargoCompany === "auto" ? "Otomatik" : res.settings.cargoCompany || "Standart"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          ₺{b.shippingIncVat.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          %{res.settings.commissionRate} (₺{b.commission.toFixed(2)})
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          ₺{b.platformFee.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-medium">
                          ₺{b.totalExpenses.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-foreground text-sm">
                          ₺{b.price.toFixed(2)}
                        </td>
                        <td className={`py-3 px-3 font-extrabold text-sm ${
                          b.netProfitAfterVat > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          ₺{b.netProfitAfterVat.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            b.netMarginAfterVat >= 20
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                          }`}>
                            %{b.netMarginAfterVat.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:text-primary"
                              title={`${mp.name} sayfasında otomatik hesapla`}
                            >
                              <Link href={buildMarketplaceUrl(mp.id, mp.dashboardUrl, b.price)}>
                                <ExternalLink className="w-3 h-3" />
                                Aç
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSettingsModal(mp.id)}
                              className="h-7 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                              title="Hesaplama Ayarlarını Gör / Değiştir"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                              Ayarlar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyPrice(b.price, mp.name)}
                              className="h-7 px-2 text-xs font-semibold gap-1"
                              title="Fiyatı Kopyala"
                            >
                              <Copy className="w-3 h-3" />
                              Kopyala
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Ayarlar İnceleme & Düzenleme Modalı ── */}
        <Dialog open={!!selectedModalMp} onOpenChange={(open) => !open && setSelectedModalMp(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                {selectedModalMp?.toUpperCase()} Hesaplama Ayarları
              </DialogTitle>
              <DialogDescription>
                Bu pazaryerine özel hammadde, kargo, komisyon ve paketleme parametreleri.
              </DialogDescription>
            </DialogHeader>

            {modalSettingsForm && selectedModalMp && (
              <div className="space-y-4 py-2">
                {/* 1. Üretim & Hammadde */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    🧵 Üretim & Filament
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Filament Fiyatı (TL / kg)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.filamentPricePerKg}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            filamentPricePerKg: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fire Oranı (%)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.wastePercentage}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            wastePercentage: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Elektrik Maliyeti (TL / gr)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={modalSettingsForm.electricityCostPerGram}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            electricityCostPerGram: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Amortisman (TL / gr)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={modalSettingsForm.depreciationCostPerGram}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            depreciationCostPerGram: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Paketleme & Operasyon */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    📦 Paketleme & Operasyon
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Kutulama & Paketleme (TL)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.packagingCost}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            packagingCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Sipariş Başı Sabit Gider (TL)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.fixedCostPerOrder}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            fixedCostPerOrder: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">İade Oranı (%)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.returnRate}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            returnRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Organik / Reklamlı Satış Toggle */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/70 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-green-800 dark:text-green-300">
                        <input
                          type="checkbox"
                          checked={modalSettingsForm.organicSalesMode}
                          onChange={(e) => {
                            const isOrg = e.target.checked;
                            setModalSettingsForm({
                              ...modalSettingsForm,
                              organicSalesMode: isOrg,
                              advertisingRate: isOrg ? 0 : 8,
                            });
                          }}
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                        />
                        <span>🌱 Organik Satış Modu (%0 Reklam Kesintisi)</span>
                      </label>
                      {modalSettingsForm.organicSalesMode ? (
                        <Badge className="bg-green-600 text-white text-[10px]">Aktif (%0)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Kapalı</Badge>
                      )}
                    </div>

                    {!modalSettingsForm.organicSalesMode && (
                      <div className="animate-in fade-in-50">
                        <Label className="text-xs">Pazaryeri İçi Reklam Kesintisi (%)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={modalSettingsForm.advertisingRate}
                          onChange={(e) =>
                            setModalSettingsForm({
                              ...modalSettingsForm,
                              advertisingRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-xs mt-1"
                          placeholder="Örn: 8"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Satış fiyatından düşülecek sponsorlu ürün / reklam bütçesi oranı.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Pazaryeri Kesintileri & Hedef Kâr */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    🏢 Komisyon & Hedef Kâr
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Komisyon (%)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.commissionRate}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            commissionRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Vade Farkı (%)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.paymentTermFee}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            paymentTermFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hizmet Bedeli (TL)</Label>
                      <Input
                        type="number"
                        value={modalSettingsForm.platformFeeBase}
                        onChange={(e) =>
                          setModalSettingsForm({
                            ...modalSettingsForm,
                            platformFeeBase: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Label className="text-xs font-bold text-foreground">Hedef Kâr Marjı (%)</Label>
                    <Input
                      type="number"
                      value={modalSettingsForm.profitMargin}
                      onChange={(e) =>
                        setModalSettingsForm({
                          ...modalSettingsForm,
                          profitMargin: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedModalMp(null)}>
                Vazgeç
              </Button>
              <Button size="sm" onClick={saveModalSettings} className="gap-1.5">
                <Check className="w-4 h-4" />
                Kaydet ve Hesapla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
