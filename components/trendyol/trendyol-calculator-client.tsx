"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Store, Settings, Calculator, TrendingUp, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrendyolProduct {
  id: string;
  productName: string;
  weightGrams: number;
  quantity: number;
  isCandleholder?: boolean;
  isKeychain?: boolean;
  isSoapdish?: boolean;
}


interface TrendyolSettings {
  // Üretim Maliyetleri
  filamentPricePerKg: number;
  electricityCostPerGram: number;
  depreciationCostPerGram: number;
  wastePercentage: number;

  // Trendyol Maliyetleri
  commissionRate: number;       // % — fiyattan kesilir
  paymentTermFee: number;       // % — fiyattan kesilir (vade farkı)
  packagingCost: number;        // TL/sipariş
  platformFeeBase: number;      // TL — platform hizmet bedeli (KDV hariç)

  // Kargo
  fastShipping: boolean;        // true = Tablo 1 (hızlı), false = Tablo 2 (yavaş)

  // Profesyonel Maliyetler
  advertisingRate: number;      // % — satış fiyatı üzerinden
  returnRate: number;           // % — iade oranı
  fixedCostPerOrder: number;    // TL — muhasebe, fatura vb.
  organicSalesMode: boolean;

  // Ekstra Malzemeler (ürün tipi başına sabit maliyet)
  candleholderCostPerUnit: number;
  keychainCostPerUnit: number;
  soapdishCostPerUnit: number;

  // Hedef
  profitMargin: number;         // % — net kâr / satış fiyatı (fiyat üzerinden)
}

const DEFAULT_TRENDYOL_SETTINGS: TrendyolSettings = {
  filamentPricePerKg: 650,
  electricityCostPerGram: 0.10,
  depreciationCostPerGram: 0.05,
  wastePercentage: 10,

  commissionRate: 15,
  paymentTermFee: 3,
  packagingCost: 15,
  platformFeeBase: 10.99,

  fastShipping: true,

  advertisingRate: 8,
  returnRate: 5,
  fixedCostPerOrder: 6,
  organicSalesMode: false,

  candleholderCostPerUnit: 0,
  keychainCostPerUnit: 2,
  soapdishCostPerUnit: 0,

  profitMargin: 30,
};

// ─── HESAPLAMA MANTIĞI ──────────────────────────────────────────────────────
//
// Trendyol gerçek para akışı:
//
//   Alıcı → KDV dahil satış fiyatını öder (P)
//   Trendyol faturası:
//     - Komisyon = (P / 1+KDV%) × komisyon%   ← KDV HARİÇ fiyat üzerinden
//     - Vade farkı = (P / 1+KDV%) × vade%     ← KDV HARİÇ fiyat üzerinden
//     - Platform hizmet bedeli = sabit TL (KDV hariç + KDV)
//   Satıcıya kalan = P - komisyon - vade - platform
//
//   Satıcının ödemeleri:
//     - Kargo (KDV dahil) — kargo firması faturası
//     - Üretim + paket + sabit gider + reklam + iade kaybı
//
// Kargo notu:
//   Trendyol anlaşmalı kargo fiyatları KDV HARİÇ listelenmiştir.
//   Satıcıya KDV dahil (×1.20) fatura edilir.
//
// KDV notu:
//   Satıcı KDV mükellefi ise kargodaki KDV'yi indirim konusu yapabilir.
//   Ama basit/küçük işletme için kargo KDV'si gerçek maliyet sayılır.
//   Bu hesaplayıcı KARGO KDV'Sİ DAHİL, nakit akış bazlı hesap yapar.

interface Breakdown {
  productionCost: number;
  packagingCost: number;
  shippingCost: number;        // KDV dahil
  platformFee: number;         // KDV dahil
  fixedCost: number;
  advertisingCost: number;
  returnCost: number;
  commission: number;          // KDV hariç fiyat üzerinden
  paymentTermFee: number;      // KDV hariç fiyat üzerinden
  totalExpenses: number;
  netProfit: number;
  netMarginOnCost: number;
  netMarginOnPrice: number;
}

interface PricingResult {
  recommendedPrice: number;  // barem optimizasyonu sonrası gerçek önerilen fiyat
  targetPrice: number;       // hedef kâr marjına göre hesaplanan fiyat, ₺5 yuvarlanmış
  exactTargetPrice: number;  // hedef kâr marjına göre kuruşuna kadar fiyat (yuvarlama yok)
  breakEvenPrice: number;
  breakdown: Breakdown;
}

// ─── KARGO SERVİSİ ───────────────────────────────────────────────────────────
// Tüm kargo iş kuralları lib/trendyol-cargo.ts dosyasında tanımlıdır.
// Bu bileşen yalnızca calcShippingCost ve checkPriceOptimization'ı kullanır.
import {
  calcShippingCost,
  checkPriceOptimization,
  type NetProfitInput,
} from "@/lib/trendyol-cargo";
import { calculateProductCost, DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types/database";

/** Gramaj → desi (ağırlık desisi, minimum 1) */
function gramsToDesi(grams: number): number {
  return Math.max(1, Math.ceil(grams / 1000));
}

/** Bileşen içi kısayol: weightGrams + price + fastShipping → KDV dahil kargo (TL) */
function calcShipping(weightGrams: number, price: number, fastShipping: boolean): number {
  return calcShippingCost(weightGrams, price, fastShipping);
}

function calcProductionCost(weightGrams: number, s: TrendyolSettings): number {
  const w = weightGrams * (1 + s.wastePercentage / 100);
  return (w / 1000) * s.filamentPricePerKg
       + w * s.electricityCostPerGram
       + w * s.depreciationCostPerGram;
}

/**
 * Önerilen satış fiyatını ve kâr dökümünü hesaplar.
 *
 * Hedef: net kâr = satış fiyatı × (profitMargin / 100)  ← fiyat üzerinden kâr
 *   P − totalCutRate×P − baseCost = P × m
 *   P × (1 − totalCutRate − m) = baseCost
 *   P = baseCost / (1 − totalCutRate − m)
 */
function calcTrendyolPrice(productionCost: number, weightGrams: number, s: TrendyolSettings): PricingResult {
  const platformFee = s.platformFeeBase * 1.20;
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  const vatDivisor = 1 + 0.20;

  const cutRateOnGross = (s.commissionRate + s.paymentTermFee) / 100; // brüt fiyat üzerinden
  const totalCutRate = cutRateOnGross + adRate;
  const m = s.profitMargin / 100; // fiyat üzerinden hedef kâr oranı
  const denominator = 1 - totalCutRate - m;

  const desi = gramsToDesi(weightGrams);

  // ── Barem altı çözüm (desi < 10 ise): Kargo sabittir, ₺199 tavanında ──
  let priceUnder200 = Infinity;
  if (desi < 10) {
    const sh = calcShipping(weightGrams, 199, s.fastShipping); // barem altı kargo ücreti sabittir
    const rc = (productionCost + sh + packagingCost) * (s.returnRate / 100);
    const bc = productionCost + sh + packagingCost + platformFee + fixedCost + rc;
    const p = bc / denominator;
    if (p <= 199) priceUnder200 = p;
  }

  // ── Barem üstü çözüm: 200 TL'den başla ──────────────────────────────────
  let priceOver200 = 200;
  for (let i = 0; i < 20; i++) {
    const sh = calcShipping(weightGrams, priceOver200, s.fastShipping);
    const rc = (productionCost + sh + packagingCost) * (s.returnRate / 100);
    const bc = productionCost + sh + packagingCost + platformFee + fixedCost + rc;
    const np = bc / denominator;
    if (Math.abs(np - priceOver200) < 0.5) { priceOver200 = np; break; }
    priceOver200 = np;
  }

  // ── En düşük fiyatı seç (hedef kârı daha az fiyatla veren) ──────────────
  const price = priceUnder200 <= priceOver200 ? priceUnder200 : priceOver200;

  // Başabaş
  let bePrice = 150;
  for (let i = 0; i < 20; i++) {
    const beShipping = calcShipping(weightGrams, bePrice, s.fastShipping);
    const beReturnCost = (productionCost + beShipping + packagingCost) * (s.returnRate / 100);
    const beCost = productionCost + beShipping + packagingCost + platformFee + fixedCost + beReturnCost;
    const newBe = beCost / (1 - totalCutRate);
    if (Math.abs(newBe - bePrice) < 0.5) { bePrice = newBe; break; }
    bePrice = newBe;
  }

  // Yuvarlanmış fiyat — hedef marjı tam sağlayana dek ₺5 adımla ilerlet
  let roundedPrice = Math.ceil(price / 5) * 5;
  // Yuvarlamadan sonra kargo bandı değişmiş olabilir; gerçek kârı kontrol et
  for (let i = 0; i < 40; i++) {
    const rShippingCheck = calcShipping(weightGrams, roundedPrice, s.fastShipping);
    const rReturnCheck = (productionCost + rShippingCheck + packagingCost) * (s.returnRate / 100);
    const rBaseCheck = productionCost + rShippingCheck + packagingCost + platformFee + fixedCost + rReturnCheck;
    const rTotalExp = rBaseCheck + roundedPrice * (s.commissionRate / 100) + roundedPrice * (s.paymentTermFee / 100) + roundedPrice * adRate;
    const rMargin = (roundedPrice - rTotalExp) / roundedPrice;
    if (rMargin >= m - 0.001) break; // hedef marja ulaştık (küçük tolerans)
    roundedPrice += 5;
  }

  // ── Barem optimizasyonu: ₺199 hedef marjı sağlıyorsa ve hala uygun ise onu seç ──────────────────────
  const targetPrice = roundedPrice; // hedef kâr marjı fiyatı (barem öncesi)
  if (desi < 10 && roundedPrice > 199) {
    const s199 = calcShipping(weightGrams, 199, s.fastShipping);
    const ret199 = (productionCost + s199 + packagingCost) * (s.returnRate / 100);
    const base199 = productionCost + s199 + packagingCost + platformFee + fixedCost + ret199;
    const exp199 = base199 + 199 * (s.commissionRate / 100) + 199 * (s.paymentTermFee / 100) + 199 * adRate;
    const profit199 = 199 - exp199;
    const margin199 = 199 > 0 ? profit199 / 199 : 0;

    if (margin199 >= m) {
      roundedPrice = 199;
    } else {
      const sR = calcShipping(weightGrams, roundedPrice, s.fastShipping);
      const retR = (productionCost + sR + packagingCost) * (s.returnRate / 100);
      const baseR = productionCost + sR + packagingCost + platformFee + fixedCost + retR;
      const expR = baseR + roundedPrice * (s.commissionRate / 100) + roundedPrice * (s.paymentTermFee / 100) + roundedPrice * adRate;
      const profitR = roundedPrice - expR;

      if (profit199 > profitR) {
        roundedPrice = 199;
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const rShipping = calcShipping(weightGrams, roundedPrice, s.fastShipping);
  const rReturnCost = (productionCost + rShipping + packagingCost) * (s.returnRate / 100);
  const rBaseCost = productionCost + rShipping + packagingCost + platformFee + fixedCost + rReturnCost;
  // Komisyon ve vade: brüt satış fiyatı üzerinden (Trendyol KDV dahil fiyattan keser)
  const rCommission = roundedPrice * (s.commissionRate / 100);
  const rPaymentTermFee = roundedPrice * (s.paymentTermFee / 100);
  const rAdvertisingCost = roundedPrice * adRate;
  const rTotalExpenses = rBaseCost + rCommission + rPaymentTermFee + rAdvertisingCost;
  const rNetProfit = roundedPrice - rTotalExpenses;

  return {
    recommendedPrice: roundedPrice,
    targetPrice,
    exactTargetPrice: price,
    breakEvenPrice: Math.ceil(bePrice / 5) * 5,
    breakdown: {
      productionCost,
      packagingCost,
      shippingCost: rShipping,
      platformFee,
      fixedCost,
      advertisingCost: rAdvertisingCost,
      returnCost: rReturnCost,
      commission: rCommission,
      paymentTermFee: rPaymentTermFee,
      totalExpenses: rTotalExpenses,
      netProfit: rNetProfit,
      netMarginOnCost: rBaseCost > 0 ? (rNetProfit / rBaseCost) * 100 : 0,
      netMarginOnPrice: roundedPrice > 0 ? (rNetProfit / roundedPrice) * 100 : 0,
    },
  };
}

// ─── BAREM OPTİMİZASYONU ────────────────────────────────────────────────────
//
// Fikir: Trendyol barem sistemi kargo maliyetini fiyata göre değiştirir.
//   < 200 TL  → ucuz kargo  (barem altı)
//   200–349 TL → pahalı kargo (barem üstü)
//   350+ TL   → anlaşmalı kargo
//
// Bazen 199 TL'de satmak, 240 TL'de satmaktan DAHA KÂRLIDIr çünkü:
//   - Kargo farkı ~31 TL
//   - Komisyon farkı 240×0.20 - 199×0.20 = 8.20 TL
//   - Toplam avantaj ~39 TL
//   Ama fiyat 41 TL düşük → 199 yine de daha az kâr.
//   Kritik nokta: Hangi fiyat aralığında NET KÂR en yüksek?
//
// Fonksiyon: Belirli bir sabit fiyat noktasında NET KÂRI hesapla.
// Bu sayede 3 barem bandını karşılaştırabilir, "optimal tavan fiyat"ı buluruz.

interface BaremScenario {
  label: string;           // "Barem Altı (max ₺199)"
  band: "under200" | "200to350" | "over350";
  price: number;           // Seçilen satış fiyatı
  exactTargetPrice?: number; // Hedef % için tam hesaplanan fiyat
  shipping: number;
  netProfit: number;
  netMarginOnPrice: number;
  totalExpenses: number;
  isOptimal: boolean;
  priceDiff: number;       // Önerilen fiyata göre fark
  profitDiff: number;      // Önerilen kârına göre fark
}

/**
 * Verilen sabit fiyat noktasında kârı hesaplar (fiyat dışarıdan verilir).
 * Barem optimizasyonu için kullanılır.
 */
function calcAtFixedPrice(price: number, productionCost: number, weightGrams: number, s: TrendyolSettings): {
  shipping: number; netProfit: number; netMarginOnPrice: number; totalExpenses: number;
} {
  const platformFee = s.platformFeeBase * 1.20;
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  const shipping = calcShipping(weightGrams, price, s.fastShipping); // KDV dahil
  const returnCost = (productionCost + shipping + packagingCost) * (s.returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
  const commission = price * (s.commissionRate / 100);   // brüt fiyat üzerinden
  const paymentTermFee = price * (s.paymentTermFee / 100);
  const advertisingCost = price * adRate;
  const totalExpenses = baseCost + commission + paymentTermFee + advertisingCost;
  const netProfit = price - totalExpenses;
  return { shipping, netProfit, netMarginOnPrice: price > 0 ? (netProfit / price) * 100 : 0, totalExpenses };
}

/**
 * Her barem bandı için net kârı karşılaştırır.
 * Barem altı max (₺199) ile barem üstü farklı fiyat noktalarını karşılaştırır.
 * Eşdeğer fiyat: barem üstünde 199 ile aynı kârı veren minimum fiyat.
 */
function calcBaremOptimization(productionCost: number, weightGrams: number, s: TrendyolSettings, recommendedPrice: number): BaremScenario[] {
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  const totalCutRate = (s.commissionRate + s.paymentTermFee) / 100 + adRate; // brüt fiyat üzerinden

  const under200Max = 199;
  const band200Max = 349;

  const scenarios: Omit<BaremScenario, "isOptimal" | "priceDiff" | "profitDiff">[] = [];

  const calcExactPrice = (shippingPrice: number) => {
    const shipping = calcShipping(weightGrams, shippingPrice, s.fastShipping);
    const platformFee = s.platformFeeBase * 1.20;
    const packagingCost = s.packagingCost;
    const fixedCost = s.fixedCostPerOrder;
    const returnCost = (productionCost + shipping + packagingCost) * (s.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    return baseCost / (1 - totalCutRate);
  };

  // 1) Barem altı: ₺199 tavan
  const r199 = calcAtFixedPrice(under200Max, productionCost, weightGrams, s);
  const exactUnder200 = calcExactPrice(under200Max);
  scenarios.push({ label: "Barem Altı (₺199)", band: "under200", price: under200Max, exactTargetPrice: exactUnder200, ...r199 });

  // 2) Barem üstü: 350+ bandı için tam % hedef fiyat
  const exactOver = calcExactPrice(350);
  if (exactOver >= 350) {
    const rHigh = calcAtFixedPrice(exactOver, productionCost, weightGrams, s);
    scenarios.push({ label: `Barem Üstü (₺${exactOver.toFixed(2)})`, band: "over350", price: exactOver, exactTargetPrice: exactOver, ...rHigh });
  }

  // 4) Önerilen fiyat (hesaplayıcının seçtiği nokta)
  if (recommendedPrice >= 200) {
    const clampedRec = Math.min(recommendedPrice, band200Max);
    const rRec = calcAtFixedPrice(clampedRec, productionCost, weightGrams, s);
    scenarios.push({ label: `Önerilen (₺${clampedRec})`, band: clampedRec < 350 ? "200to350" : "over350", price: clampedRec, exactTargetPrice: clampedRec, ...rRec });
  }

  // 5) 350+ bandı varsa
  if (recommendedPrice >= 350) {
    const r3 = calcAtFixedPrice(recommendedPrice, productionCost, weightGrams, s);
    scenarios.push({ label: `350+ (₺${recommendedPrice})`, band: "over350", price: recommendedPrice, exactTargetPrice: recommendedPrice, ...r3 });
  }

  const maxProfit = Math.max(...scenarios.map(sc => sc.netProfit));
  const net199Profit = r199.netProfit;

  return scenarios.map(sc => ({
    ...sc,
    isOptimal: Math.abs(sc.netProfit - maxProfit) < 0.01,
    priceDiff: sc.price - under200Max,
    profitDiff: sc.netProfit - net199Profit,
  }));
}

// ─── BİLEŞEN ────────────────────────────────────────────────────────────────

export function TrendyolCalculatorClient() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TrendyolSettings>(DEFAULT_TRENDYOL_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [productName, setProductName] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [products, setProducts] = useState<TrendyolProduct[]>([]);
  const [catalogSuggestions, setCatalogSuggestions] = useState<Product[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("trendyolSettings");
    if (saved) {
      try { setSettings({ ...DEFAULT_TRENDYOL_SETTINGS, ...JSON.parse(saved) }); }
      catch { /* ignore */ }
    }
  }, []);
  // Ayarlar artık otomatik değil, manuel "Kaydet" butonu ile kaydedilir
  useEffect(() => {
    const saved = localStorage.getItem("trendyolProducts");
    if (saved) {
      try { setProducts(JSON.parse(saved)); }
      catch { /* ignore */ }
    }
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!suggRef.current) return;
      if (!suggRef.current.contains(e.target as Node)) setSuggestionsOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  useEffect(() => {
    localStorage.setItem("trendyolProducts", JSON.stringify(products));
  }, [products]);

  // Fetch product name suggestions from product catalog (Supabase)
  useEffect(() => {
    const q = productName.trim();
    if (q.length < 2) { setCatalogSuggestions([]); return; }

    let canceled = false;
    const t = setTimeout(async () => {
      let sb: ReturnType<typeof createSupabaseClient> | null = null;
      try { sb = createSupabaseClient(); } catch { sb = null; }
      if (!sb) return;
      try {
        const { data, error } = await sb.from("products").select("*").ilike("name", `${q}%`).limit(10).order("name");
        if (error) return;
        if (canceled) return;
        setCatalogSuggestions(data ?? []);
        setSuggestionsOpen(true);
      } catch { /* ignore */ }
    }, 220);

    return () => { canceled = true; clearTimeout(t); };
  }, [productName]);

  function pickSuggestion(p: Product) {
    // common weight fields fallback
    const w = (p as any).weight_grams ?? (p as any).weightGrams ?? (p as any).weight ?? (p as any).gramaj ?? (p as any).default_weight_grams ?? 0;
    setProductName((p as any).name ?? (p as any).product_name ?? "");
    setWeightGrams(w ? String(w) : "");
    setSuggestionsOpen(false);
  }

  const upd = (patch: Partial<TrendyolSettings>) => setSettings(s => ({ ...s, ...patch }));

  const removeProduct = (id: string) => setProducts(p => p.filter(x => x.id !== id));

  function detectProductTypeFlags(name: string) {
    const lower = name.toLowerCase();
    return {
      isCandleholder: lower.includes("mumluk") || lower.includes("candleholder"),
      isKeychain: lower.includes("anahtarlık") || lower.includes("anahtarlik") || lower.includes("keychain") || lower.includes("key chain") || lower.includes("anahtar"),
      isSoapdish: lower.includes("sabunluk") || lower.includes("soapdish") || lower.includes("soap dish") || lower.includes("sabun"),
    };
  }

  function getProductTypeFlags(product: TrendyolProduct) {
    const fromName = detectProductTypeFlags(product.productName || "");
    return {
      isCandleholder: Boolean((product as any).is_candleholder || (product as any).isCandleholder || fromName.isCandleholder),
      isKeychain: Boolean((product as any).is_keychain || (product as any).isKeychain || fromName.isKeychain),
      isSoapdish: Boolean((product as any).is_soapdish || (product as any).isSoapdish || fromName.isSoapdish),
    };
  }

  function getProductionCostSuffix(product: TrendyolProduct) {
    const { isCandleholder, isKeychain, isSoapdish } = getProductTypeFlags(product);
    const extras: string[] = [];
    if (isKeychain) extras.push("Anahtar zinciri");
    if (isCandleholder) extras.push("Pilli mum");
    if (isSoapdish) extras.push("Sabunluk Pompası");
    return extras.length ? ` (+ ${extras.join(" + ")})` : "";
  }

  const addProduct = () => {
    if (!productName.trim() || !weightGrams || parseFloat(weightGrams) <= 0) {
      toast({ title: "Hata", description: "Ürün adı ve gramaj girin", variant: "destructive" });
      return;
    }
    const typeFlags = detectProductTypeFlags(productName.trim());
    setProducts(prev => [...prev, {
      id: Date.now().toString(),
      productName: productName.trim(),
      weightGrams: parseFloat(weightGrams),
      quantity: parseInt(quantity) || 1,
      ...typeFlags,
    }]);
    setProductName(""); setWeightGrams(""); setQuantity("1");
  };

  const costSettingsForCalc = {
    ...DEFAULT_COST_SETTINGS,
    filament_price_per_kg: settings.filamentPricePerKg,
    electricity_cost_per_gram: settings.electricityCostPerGram,
    depreciation_cost_per_gram: settings.depreciationCostPerGram,
    waste_percentage: settings.wastePercentage,
    candleholder_cost_per_unit: settings.candleholderCostPerUnit,
    candleholder_enabled: true,
    keychain_cost_per_unit: settings.keychainCostPerUnit,
    keychain_enabled: true,
    soapdish_cost_per_unit: settings.soapdishCostPerUnit,
    soapdish_enabled: true,
  } as any;

  const totals = products.reduce((acc, p) => {
    const { isCandleholder, isKeychain, isSoapdish } = getProductTypeFlags(p);
    const costCalc = calculateProductCost(p.weightGrams, costSettingsForCalc, isCandleholder, isKeychain, isSoapdish);
    const pc = costCalc.totalCost;
    const pr = calcTrendyolPrice(pc, p.weightGrams, settings);
    return {
      qty: acc.qty + p.quantity,
      productionCost: acc.productionCost + pc * p.quantity,
      revenue: acc.revenue + pr.recommendedPrice * p.quantity,
      netProfit: acc.netProfit + pr.breakdown.netProfit * p.quantity,
    };
  }, { qty: 0, productionCost: 0, revenue: 0, netProfit: 0 });

  // Ayar inputu yardımcısı
  const numInput = (
    id: string, label: string, field: keyof TrendyolSettings,
    step = "1", note?: string
  ) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step={step}
        value={(settings[field] as number) ?? ""}
        onChange={e => upd({ [field]: parseFloat(e.target.value) || 0 })}
      />
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trendyol Hesaplayıcı</h1>
            <p className="text-sm text-muted-foreground">Pazaryeri satış fiyatı hesaplama</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Sol: Ürün ekleme + liste ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Ürün Ekleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Ürün Ekle</CardTitle>
                <CardDescription>Trendyol'da satacağınız ürünleri ekleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="productName">Ürün Adı</Label>
                    <div className="relative" ref={suggRef}>
                      <Input id="productName" value={productName}
                        onChange={e => setProductName(e.target.value)}
                        placeholder="Örn: Aura Vazo"
                        onFocus={() => { if (catalogSuggestions.length) setSuggestionsOpen(true); }}
                        onKeyDown={e => e.key === "Enter" && addProduct()} />

                      {suggestionsOpen && catalogSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded shadow-md max-h-60 overflow-auto">
                          {catalogSuggestions.map((p) => (
                            <button key={(p as any).id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted/50"
                              onClick={() => pickSuggestion(p)}>
                              <div className="text-sm font-medium">{(p as any).name ?? (p as any).product_name}</div>
                              <div className="text-xs text-muted-foreground">{((p as any).weight_grams ?? (p as any).weightGrams ?? (p as any).weight) ? `${((p as any).weight_grams ?? (p as any).weightGrams ?? (p as any).weight)} gr` : ""}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="weightGrams">Gramaj (gr)</Label>
                    <Input id="weightGrams" type="number" value={weightGrams}
                      onChange={e => setWeightGrams(e.target.value)}
                      placeholder="40"
                      onKeyDown={e => e.key === "Enter" && addProduct()} />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Adet</Label>
                    <Input id="quantity" type="number" value={quantity} min="1"
                      onChange={e => setQuantity(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addProduct()} />
                  </div>
                </div>
                
                <Button onClick={addProduct} className="w-full">
                  <Package className="w-4 h-4 mr-2" />Ürün Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Ürün Listesi */}
            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Fiyat Hesaplamaları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products.map(product => {
                      const { isCandleholder, isKeychain, isSoapdish } = getProductTypeFlags(product);
                      const costCalc = calculateProductCost(product.weightGrams, costSettingsForCalc, isCandleholder, isKeychain, isSoapdish);
                      const pc = costCalc.totalCost;
                      const pr = calcTrendyolPrice(pc, product.weightGrams, settings);
                      const bd = pr.breakdown;
                      const cargoRatio = (bd.shippingCost / pr.recommendedPrice) * 100;

                      // Fiyat optimizasyon kontrolü (200–215 TL arası için)
                      const optInput: NetProfitInput = {
                        satisFiyati: pr.recommendedPrice,
                        productionCost: pc,
                        weightGrams: product.weightGrams,
                        packagingCost: settings.packagingCost,
                        platformFee: settings.platformFeeBase * 1.20,
                        fixedCost: settings.fixedCostPerOrder,
                        returnRate: settings.returnRate,
                        commissionRate: settings.commissionRate,
                        paymentTermFee: settings.paymentTermFee,
                        advertisingRate: settings.organicSalesMode ? 0 : settings.advertisingRate,
                        fastShipping: settings.fastShipping,
                      };
                      const optimization = checkPriceOptimization(optInput);

                      return (
                        <div key={product.id} className="border rounded-lg p-4 space-y-3">
                          {/* Başlık */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{product.productName}</h3>
                              <p className="text-sm text-muted-foreground">{product.weightGrams} gr × {product.quantity} adet</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeProduct(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50">Sil</Button>
                          </div>

                          {/* Ana Fiyat Kartları */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2 text-center">
                              <p className="text-xs text-red-600 font-semibold">Başabaş</p>
                              <p className="font-bold text-red-700 dark:text-red-300 text-base">₺{pr.breakEvenPrice}</p>
                              <p className="text-xs text-red-500">altı zarar</p>
                            </div>
                            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2 text-center">
                              <p className="text-xs text-orange-600 font-semibold">Üretim Maliyeti</p>
                              <p className="font-bold text-orange-700 dark:text-orange-300 text-base">₺{pc.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">kargo hariç</p>
                            </div>
                            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 text-center">
                              <p className="text-xs text-green-600 font-semibold">Önerilen Fiyat</p>
                              <p className="font-bold text-green-700 dark:text-green-300 text-lg">₺{pr.recommendedPrice}</p>
                              <p className="text-xs text-green-500">%{settings.profitMargin} net kâr (fiyattan)</p>
                            </div>
                          </div>

                          {/* Kâr Uyarısı */}
                          {bd.netProfit < 15 && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400">⚠️ Düşük Karlılık</p>
                              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                Net kâr ₺{bd.netProfit.toFixed(2)} — set satış veya fiyat artışı öneririz.
                              </p>
                            </div>
                          )}

                          {/* ⚡ Fiyat Optimizasyon Uyarısı (200–215 TL bandı) */}
                          {optimization.shouldOptimize && (
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3">
                              <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                                {optimization.message}
                              </p>
                              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center bg-white/60 dark:bg-gray-900/40 rounded p-1.5">
                                  <p className="text-muted-foreground">Mevcut (₺{pr.recommendedPrice})</p>
                                  <p className="font-bold text-red-600">₺{optimization.currentNetProfit.toFixed(2)}</p>
                                </div>
                                <div className="text-center text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-lg">→</div>
                                <div className="text-center bg-white/60 dark:bg-gray-900/40 rounded p-1.5">
                                  <p className="text-muted-foreground">₺199.90'da</p>
                                  <p className="font-bold text-emerald-600">₺{optimization.optimizedNetProfit.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Fiyat Stratejisi */}
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-bold text-blue-800 dark:text-blue-200">💡 Fiyat Bantları</p>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="text-center bg-white/60 dark:bg-gray-900/40 rounded p-1.5">
                                <p className="text-red-600 font-semibold">🔴 Riskli</p>
                                <p className="font-bold text-red-700">₺{pr.breakEvenPrice}–₺{Math.ceil(pr.breakEvenPrice * 1.10 / 5) * 5}</p>
                              </div>
                              <div className="text-center bg-white/60 dark:bg-gray-900/40 rounded p-1.5">
                                <p className="text-amber-600 font-semibold">🟡 Sağlıklı</p>
                                <p className="font-bold text-amber-700">₺{Math.ceil(pr.breakEvenPrice * 1.10 / 5) * 5 + 5}–₺{Math.ceil(pr.breakEvenPrice * 1.25 / 5) * 5}</p>
                              </div>
                              <div className="text-center bg-white/60 dark:bg-gray-900/40 rounded p-1.5">
                                <p className="text-green-600 font-semibold">🟢 İdeal</p>
                                <p className="font-bold text-green-700">₺{Math.ceil(pr.breakEvenPrice * 1.25 / 5) * 5 + 5}+</p>
                              </div>
                            </div>
                            {cargoRatio > 20 && (
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                ⚠️ Kargo oranı yüksek (%{cargoRatio.toFixed(0)}) — set satış kargo maliyetini düşürür.
                              </p>
                            )}
                          </div>

                          {/* ── BAREM OPTİMİZASYONU ── */}
                          {(() => {
                            // targetPrice = hedef kâr marjına göre hesaplanan fiyat (barem öncesi)
                            // recommendedPrice = barem optimizasyonu sonrası gerçek öneri (₺199 olabilir)
                            const baseRecommended = pr.recommendedPrice;
                            const scenarios = calcBaremOptimization(pc, product.weightGrams, settings, baseRecommended);
                            const under200sc = scenarios.find(s => s.band === "under200");
                            const equivSc = scenarios.find(s => s.label.startsWith("Eşdeğer"));
                            if (!under200sc) return null;
                            const net199 = under200sc.netProfit;
                            const optimal = scenarios.find(s => s.isOptimal);
                            // En iyi senaryo varsayılır; yoksa barem altı
                            const displayRecommended = optimal ?? under200sc;
                            const baremAltiBetter = under200sc.isOptimal;
                            // Barem altı zarar mı ediyor?
                            const under200InLoss = net199 < 0;
                            // Eşdeğer fiyat: 199'da zarar varsa "zarar sıfırlanma noktası",
                            // yoksa "aynı kâr noktası" anlamına gelir
                            const equivLabel = under200InLoss
                              ? `Barem altı zaten zarar (₺${net199.toFixed(2)})`
                              : `₺199 ile aynı kâr noktası: ₺${equivSc?.price ?? "—"}`;

                            return (
                              <div className={`rounded-lg border-2 p-3 space-y-3 ${baremAltiBetter
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600"
                                : "bg-slate-50 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700"}`}>

                                {/* Başlık */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    📊 Barem Optimizasyonu
                                  </p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${baremAltiBetter
                                    ? "bg-emerald-500 text-white"
                                    : under200InLoss
                                      ? "bg-red-500 text-white"
                                      : "bg-blue-500 text-white"}`}>
                                    {baremAltiBetter
                                      ? "⬇️ Düşük fiyat daha kârlı"
                                      : under200InLoss
                                        ? "🚫 Barem altı kârsız"
                                        : "⬆️ Yüksek fiyat daha kârlı"}
                                  </span>
                                </div>

                                {/* Senaryo Kartları */}
                                <div className="space-y-1.5">
                                  {scenarios.map((sc, idx) => {
                                    const isEquiv = sc.label.startsWith("Eşdeğer");
                                    const isUnder200 = sc.band === "under200";
                                    const isZarar = sc.netProfit < 0;
                                    return (
                                      <div key={idx} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border transition-colors
                                        ${sc.isOptimal
                                          ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 dark:border-emerald-600 shadow-sm"
                                          : isZarar
                                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 opacity-80"
                                            : isEquiv
                                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                                              : "bg-white/80 dark:bg-gray-900/40 border-border"}`}>
                                        <span className="text-base w-5 text-center shrink-0">
                                          {sc.isOptimal ? "✅" : isZarar ? "❌" : isEquiv ? "⚖️" : isUnder200 ? "📦" : "📫"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-semibold ${
                                            sc.isOptimal ? "text-emerald-800 dark:text-emerald-200"
                                            : isZarar ? "text-red-700 dark:text-red-300"
                                            : isEquiv ? "text-amber-800 dark:text-amber-200"
                                            : "text-foreground"}`}>
                                            {sc.label}
                                          </p>
                                          <p className="text-muted-foreground text-[11px] mt-0.5">
                                            Kargo: <span className="font-medium">₺{sc.shipping.toFixed(2)}</span>
                                            {sc.exactTargetPrice !== undefined && (
                                              <span className="ml-2">Tam hedef: ₺{sc.exactTargetPrice.toFixed(2)}</span>
                                            )}
                                            {isEquiv && !under200InLoss && (
                                              <span className="text-amber-600 dark:text-amber-400 ml-1">← bu fiyatın altı 199'dan daha az kârlı</span>
                                            )}
                                            {isEquiv && under200InLoss && (
                                              <span className="text-red-500 ml-1">← zarar sıfırlanma noktası</span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="font-bold text-sm">₺{sc.price}</p>
                                          <p className={`font-semibold text-[11px] ${sc.netProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>
                                            {sc.netProfit > 0 ? "Kâr" : "Zarar"}: ₺{sc.netProfit.toFixed(2)}
                                            <span className="opacity-75 ml-0.5">(%{sc.netMarginOnPrice.toFixed(1)})</span>
                                            {!isUnder200 && (
                                              <span className={`ml-1 text-[10px] ${sc.profitDiff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                ({sc.profitDiff >= 0 ? "+" : ""}₺{sc.profitDiff.toFixed(2)})
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Açıklama */}
                                <div className={`rounded p-2.5 text-[11px] space-y-1 ${
                                  under200InLoss
                                    ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
                                    : baremAltiBetter
                                      ? "bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
                                      : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200"}`}>
                                  {under200InLoss ? (
                                    <>
                                      <p>🚫 <strong>₺199</strong>'da satmak zarar (₺{net199.toFixed(2)}). Barem altı bu ürün için uygun değil.</p>
                                      {equivSc && <p>⚖️ Barem üstünde en az <strong>₺{equivSc.price}</strong>'dan satmalısın (başabaş noktası).</p>}
                                      <p>✅ Önerilen <strong>₺{displayRecommended.price}</strong> → kâr ₺{displayRecommended.netProfit.toFixed(2)} (%{displayRecommended.netMarginOnPrice.toFixed(1)}).</p>
                                    </>
                                  ) : pr.recommendedPrice <= 199 ? (
                                    <>
                                      <p>✅ %{settings.profitMargin} kâr hedefin için <strong>₺{pr.exactTargetPrice.toFixed(2)}</strong>'den satman yeterli — barem altı kargo (₺{under200sc.shipping.toFixed(2)}) sayesinde.</p>
                                      <p className="opacity-75">💡 ₺199'a çıkarsan kârın %{under200sc.netMarginOnPrice.toFixed(1)}'e (₺{net199.toFixed(2)}) yükselir.</p>
                                    </>
                                  ) : baremAltiBetter ? (
                                    <>
                                      <p>✅ <strong>₺199</strong>'da sat — düşük kargo (₺{under200sc.shipping.toFixed(2)}), net kâr daha yüksek.</p>
                                      <p className="opacity-75">💡 %{settings.profitMargin} kâr hedefin için en az <strong>₺{pr.exactTargetPrice.toFixed(2)}</strong>'den satman gerekir (kargo ₺{scenarios.find(s => s.label.startsWith("Önerilen"))?.shipping.toFixed(2) ?? "—"}).</p>
                                      {equivSc && <p>⚖️ Barem üstünde <strong>₺{equivSc.price}</strong> üstünde olursa önerilen fiyat daha kârlı.</p>}
                                    </>
                                  ) : (
                                    <>
                                      <p>⚖️ {equivLabel}</p>
                                      <p>📈 Önerilen <strong>₺{optimal?.price ?? 0}</strong> — Kargo: ₺{(optimal?.shipping ?? 0).toFixed(2)} → kâr ₺{(optimal?.netProfit ?? 0).toFixed(2)} (%{(optimal?.netMarginOnPrice ?? 0).toFixed(1)}) ({(optimal?.profitDiff ?? 0) >= 0 ? "+" : ""}₺{(optimal?.profitDiff ?? 0).toFixed(2)})</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Detaylı Döküm */}
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 py-1">
                              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                              Detaylı Maliyet Dökümü
                            </summary>
                            <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Giderler</p>
                              <Row label={`Üretim Maliyeti${getProductionCostSuffix(product)}`} value={`₺${bd.productionCost.toFixed(2)}`} />
                              <Row label="Kutulama" value={`₺${bd.packagingCost.toFixed(2)}`} />
                              <Row label="Kargo (KDV dahil)" value={`₺${bd.shippingCost.toFixed(2)}`} color="text-amber-600" />
                              <Row label="Platform Hizmet Bedeli (KDV dahil)" value={`₺${bd.platformFee.toFixed(2)}`} />
                              <Row label="Sabit Gider" value={`₺${bd.fixedCost.toFixed(2)}`} />
                              <Row label={`İade Maliyeti (%${settings.returnRate})`} value={`₺${bd.returnCost.toFixed(2)}`} color="text-orange-600" />
                              <div className="border-t my-1" />
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Trendyol Kesintileri</p>
                              <Row label={`Komisyon (%${settings.commissionRate})`} value={`−₺${bd.commission.toFixed(2)}`} color="text-red-600" />
                              <Row label={`Vade Farkı (%${settings.paymentTermFee})`} value={`−₺${bd.paymentTermFee.toFixed(2)}`} color="text-red-600" />
                              {!settings.organicSalesMode && (
                                <Row label={`Reklam (%${settings.advertisingRate})`} value={`−₺${bd.advertisingCost.toFixed(2)}`} color="text-orange-600" />
                              )}
                              {settings.organicSalesMode && (
                                <Row label="Reklam (Organik %0)" value="₺0.00" color="text-green-600" />
                              )}
                              <div className="border-t-2 mt-2 pt-2" />
                              <Row label="Toplam Gider" value={`₺${bd.totalExpenses.toFixed(2)}`} bold />
                              <Row label="Satış Fiyatı" value={`₺${pr.recommendedPrice}`} bold />
                              <Row
                                label="Net Kâr"
                                value={`₺${bd.netProfit.toFixed(2)}`}
                                bold
                                color={bd.netProfit >= 15 ? "text-emerald-600" : "text-red-600"}
                              />
                              <Row label="Kâr/Maliyet" value={`%${bd.netMarginOnCost.toFixed(1)}`} color="text-emerald-600" />
                              <Row label="Kâr/Fiyat" value={`%${bd.netMarginOnPrice.toFixed(1)}`} color="text-blue-600" />
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Sağ: Ayarlar + Özet ── */}
          <div className="space-y-6">

            {/* Ayarlar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Settings className="w-5 h-5" />Trendyol Ayarları</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(v => !v)}>
                    {showSettings ? "Gizle" : "Düzenle"}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showSettings && (
                <CardContent className="space-y-5">

                  {/* Üretim */}
                  <section className="space-y-3">
                    <p className="text-sm font-semibold">Üretim Maliyetleri</p>
                    {numInput("f1", "Filament (TL/kg)", "filamentPricePerKg", "1")}
                    {numInput("f2", "Elektrik (TL/gr)", "electricityCostPerGram", "0.01")}
                    {numInput("f3", "Yıpranma (TL/gr)", "depreciationCostPerGram", "0.01")}
                    {numInput("f4", "Fire Oranı (%)", "wastePercentage", "0.1")}
                  </section>

                  <div className="border-t" />

                  {/* Trendyol */}
                  <section className="space-y-3">
                    <p className="text-sm font-semibold">Trendyol Maliyetleri</p>
                    {numInput("t1", "Komisyon (%)", "commissionRate", "0.1", "Kategori komisyon oranınız")}
                    {numInput("t2", "Vade Farkı (%)", "paymentTermFee", "0.1", "Genellikle %3")}
                    {numInput("t3", "Platform Bedeli (TL, KDV hariç)", "platformFeeBase", "0.01", "Varsayılan: 10.99 TL → KDV ile 13.19 TL")}
                    {numInput("t4", "Kutulama (TL/sipariş)", "packagingCost", "0.5")}
                    {numInput("t5", "Hedef Net Kâr (%)", "profitMargin", "1", "Satış fiyatının bu yüzdesi net kâr olarak kalır")}
                  </section>

                  <div className="border-t" />

                  {/* Kargo */}
                  <section className="space-y-3">
                    <p className="text-sm font-semibold">Kargo</p>
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <input type="checkbox" id="fastShipping" checked={settings.fastShipping}
                        onChange={e => upd({ fastShipping: e.target.checked })} className="w-4 h-4" />
                      <Label htmlFor="fastShipping" className="cursor-pointer">
                        Hızlı Teslimat (Tablo 1) — termin 1 gün veya Hızlı/Bugün Kargoda etiketi
                      </Label>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        ℹ️ Fiyat &lt; 350 TL ve desi &lt; 10 için barem destek fiyatı uygulanır. Üstü için 22 Mayıs 2026 tarihli büyük kargo tablosu kullanılır. Tüm fiyatlar KDV dahil (%20).
                      </p>
                    </div>
                  </section>

                  <div className="border-t" />

                  {/* Profesyonel */}
                  <section className="space-y-3">
                    <p className="text-sm font-semibold text-orange-600">Profesyonel Maliyetler</p>
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-2">
                      <input type="checkbox" id="organicMode" checked={settings.organicSalesMode}
                        onChange={e => upd({ organicSalesMode: e.target.checked })} className="w-4 h-4" />
                      <Label htmlFor="organicMode" className="cursor-pointer text-green-700 font-semibold">🌱 Organik Satış (%0 reklam)</Label>
                    </div>
                    {!settings.organicSalesMode && numInput("p1", "Reklam (%)", "advertisingRate", "0.1", "Satış fiyatının yüzdesi")}
                    {numInput("p2", "İade Oranı (%)", "returnRate", "0.1", "Üretim+kargo+paket kaybı bu oran kadar eklenir")}
                    {numInput("p3", "Sabit Gider (TL/sipariş)", "fixedCostPerOrder", "0.5", "Muhasebe, e-fatura, vergi payı")}
                  </section>

                  <div className="border-t" />

                  {/* Ekstra Malzemeler */}
                  <section className="space-y-3">
                    <p className="text-sm font-semibold text-violet-600">Ekstra Malzeme Giderleri</p>
                    <div className="space-y-3">
                      <div className="space-y-2 p-3 border rounded-lg">
                        <Label htmlFor="m1" className="text-sm font-semibold">Pilli mum Ücreti (TL/adet)</Label>
                        {numInput("m1", "", "candleholderCostPerUnit", "0.1")}
                        <p className="text-xs text-muted-foreground">Pilli mum içeren ürünler için otomatik olarak eklenir.</p>
                      </div>
                      <div className="space-y-2 p-3 border rounded-lg">
                        <Label htmlFor="m2" className="text-sm font-semibold">Anahtar zinciri Ücreti (TL/adet)</Label>
                        {numInput("m2", "", "keychainCostPerUnit", "0.1")}
                        <p className="text-xs text-muted-foreground">Anahtar zinciri içeren ürünler için otomatik olarak eklenir.</p>
                      </div>
                      <div className="space-y-2 p-3 border rounded-lg">
                        <Label htmlFor="m3" className="text-sm font-semibold">Sabunluk Pompası Ücreti (TL/adet)</Label>
                        {numInput("m3", "", "soapdishCostPerUnit", "0.1")}
                        <p className="text-xs text-muted-foreground">Sabunluk pompası gerektiren ürünler için otomatik olarak eklenir.</p>
                      </div>
                    </div>
                  </section>

                  <div className="border-t pt-2 space-y-2">
                    <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        localStorage.setItem("trendyolSettings", JSON.stringify(settings));
                        toast({ title: "✅ Ayarlar kaydedildi", description: "Bir sonraki ziyarette de geçerli olacak." });
                      }}>
                      💾 Kaydet
                    </Button>
                    <Button variant="outline" size="sm" className="w-full"
                      onClick={() => setSettings(DEFAULT_TRENDYOL_SETTINGS)}>
                      Varsayılana Dön
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Bilgi Kartı */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="pt-5">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-blue-900 dark:text-blue-100">
                    <p className="font-semibold text-sm">Hesaplama Nasıl Çalışır?</p>
                    <ul className="space-y-1">
                      <li>• <strong>Net Kâr:</strong> Satış fiyatı − (tüm giderler + kesintiler)</li>
                      <li>• <strong>Hedef Marj:</strong> Kâr / Toplam Maliyet oranı</li>
                      <li>• <strong>Başabaş:</strong> Kâr = 0 olan en düşük fiyat</li>
                      <li>• <strong>Komisyon + Vade:</strong> Satış fiyatı (KDV dahil) üzerinden kesilir</li>
                      <li>• <strong>Kargo:</strong> KDV hariç girilir, hesaplamada ×1.20 uygulanır</li>
                      <li>• <strong>Platform bedeli:</strong> 10.99 TL + %20 KDV = 13.19 TL</li>
                      <li>• <strong>İade maliyeti:</strong> İade olan siparişteki üretim + kargo + paket kaybı</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Özet */}
            {products.length > 0 && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                    <TrendingUp className="w-5 h-5" />Toplam Özet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Toplam Ürün" value={`${totals.qty} adet`} />
                  <Row label="Üretim Maliyeti" value={`₺${totals.productionCost.toFixed(2)}`} />
                  <Row label="Önerilen Gelir" value={`₺${totals.revenue.toFixed(2)}`} />
                  <div className="border-t pt-2 mt-2">
                    <Row label="Net Kâr (toplam)"
                      value={`₺${totals.netProfit.toFixed(2)}`}
                      bold
                      color={totals.netProfit > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Küçük yardımcı satır bileşeni
function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={color ?? ""}>{value}</span>
    </div>
  );
}
