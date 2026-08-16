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
  // Ekstra malzeme flag'leri — kullanıcı toggle edebilir
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
  commissionRate: number;
  paymentTermFee: number;
  packagingCost: number;
  platformFeeBase: number;      // TL — "Bugün Kargoda" etiketi YOK → 10.99 TL
  platformFeeExpress: number;   // TL — "Bugün Kargoda" etiketi VAR → 4.99 TL
  useExpressPlatformFee: boolean; // true = Bugün Kargoda aktif

  // Kargo
  fastShipping: boolean;        // true = Tablo 1 (hızlı), false = Tablo 2 (yavaş)

  // Profesyonel Maliyetler
  advertisingRate: number;      // % — satış fiyatı üzerinden
  returnRate: number;           // % — iade oranı
  fixedCostPerOrder: number;    // TL — muhasebe, fatura vb. (monthlyFixedExpense / monthlyOrderTarget'tan otomatik hesaplanır)
  monthlyFixedExpense: number;  // TL — aylık toplam sabit gider (muhasebe vb.)
  monthlyOrderTarget: number;   // adet — aylık hedef sipariş adedi
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

  commissionRate: 16,  // Trendyol Ev Dekorasyon / Vazo kategorisi komisyonu (%16)
  paymentTermFee: 3,
  packagingCost: 15,
  platformFeeBase: 10.99,
  platformFeeExpress: 4.99,
  useExpressPlatformFee: false,

  fastShipping: true,

  advertisingRate: 8,
  returnRate: 5,
  fixedCostPerOrder: 10,
  monthlyFixedExpense: 600,
  monthlyOrderTarget: 60,
  organicSalesMode: true, // Organik Satış varsayılan %0 reklam

  candleholderCostPerUnit: 0,
  keychainCostPerUnit: 2,
  soapdishCostPerUnit: 0,

  profitMargin: 20, // KDV sonrası %20 net kâr marjı (fiyat üzerinden)
};

// ─── HESAPLAMA MANTIĞI ──────────────────────────────────────────────────────
//
// Trendyol gerçek para akışı:
//
//   Alıcı → KDV dahil satış fiyatını öder (P)
//
//   Trendyol kesintileri (P'nin tamamı üzerinden, KDV dahil):
//     - Komisyon  = P × komisyon%
//     - Vade farkı = P × vade%
//     - Platform hizmet bedeli = sabit TL (KDV dahil)
//
//   Satıcının nakit giderleri:
//     - Kargo (KDV dahil fatura)
//     - Üretim + paket + sabit gider + reklam + iade kaybı
//
//   Net kâr (KDV öncesi) = P - tüm giderler
//
// ─── KDV MANTIĞI (KDV Mükellefi Satıcı) ────────────────────────────────────
//
//   Satıcı P üzerinden KDV tahsil eder ve beyan eder:
//     Tahsil edilen KDV = P / 6   (= P × 20/120)
//
//   Alışlardan (kargo faturası + platform faturası) ödenen KDV mahsup edilir:
//     Mahsup KDV = kargo / 6 + platform / 6
//
//   Devlete ödenecek net KDV = tahsil − mahsup
//
//   Net kâr (KDV sonrası) = Net kâr (KDV öncesi) − devlete ödenecek KDV
//
// Not: Üretim maliyeti (hammadde, elektrik) üzerindeki KDV de mahsup
//      edilebilir ancak bu hesaplayıcıda takip edilmemektedir (muhafazakâr).

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
  // KDV hesabı (KDV mükellefi için)
  vatCollected: number;        // Müşteriden tahsil edilen KDV (satış fiyatı / 6)
  vatPaidOnInputs: number;     // Mahsup edilecek toplam KDV
  vatPaidShipping: number;     // Kargo faturasındaki KDV
  vatPaidPlatform: number;     // Platform faturasındaki KDV
  vatPaidCommission: number;   // Komisyon faturasındaki KDV
  vatPaidPaymentTerm: number;  // Vade farkı faturasındaki KDV
  vatPaidFilament: number;     // Filament alışındaki KDV
  vatPaidPackaging: number;    // Kutulama alışındaki KDV
  vatPayable: number;          // Devlete ödenecek net KDV
  netProfitAfterVat: number;   // KDV sonrası gerçek net kâr
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

function getActivePlatformFee(s: TrendyolSettings): number {
  const base = s.useExpressPlatformFee ? s.platformFeeExpress : s.platformFeeBase;
  return base * 1.20; // KDV dahil
}

function calcProductionCost(weightGrams: number, s: TrendyolSettings): number {
  const w = weightGrams * (1 + s.wastePercentage / 100);
  return (w / 1000) * s.filamentPricePerKg
       + w * s.electricityCostPerGram
       + w * s.depreciationCostPerGram;
}

/**
 * Önerilen satış fiyatını ve kâr dökümünü hesaplar.
 * Hedef: KDV sonrası net kâr = satış fiyatı × profitMargin %
 * Fiyat iteratif olarak calcAtFixedPrice üzerinden bulunur.
 */
function calcTrendyolPrice(productionCostTotal: number, weightGramsTotal: number, s: TrendyolSettings, quantity: number = 1): PricingResult {
  const platformFee = getActivePlatformFee(s);
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  const totalCutRate = (s.commissionRate + s.paymentTermFee) / 100 + adRate;
  const m = s.profitMargin / 100;  // Hedef: netProfitAfterVat = price * m
  const filamentCostForVat = (weightGramsTotal * (1 + s.wastePercentage / 100) / 1000) * s.filamentPricePerKg;
  const desi = gramsToDesi(weightGramsTotal);

  // Herhangi bir fiyatta KDV sonrası net kâr tutarını hesapla
  function netProfitAfterVatAt(p: number): number {
    const r = calcAtFixedPrice(p, productionCostTotal, weightGramsTotal, s);
    return r.netProfitAfterVat;
  }

  // Başabaş: KDV sonrası kâr = 0 → iteratif
  let bePrice = 100;
  for (let i = 0; i < 30; i++) {
    const sh = calcShipping(weightGramsTotal, bePrice, s.fastShipping);
    const rc = (productionCostTotal + sh + packagingCost) * (s.returnRate / 100);
    const baseCost = productionCostTotal + sh + packagingCost + platformFee + fixedCost + rc;
    const vatNetRate = (1 - (s.commissionRate + s.paymentTermFee) / 100) / 6;
    const fixedVat = (platformFee + filamentCostForVat + packagingCost + sh) / 6;
    const np = (baseCost - fixedVat) / (1 - totalCutRate - vatNetRate);
    if (Math.abs(np - bePrice) < 0.5) { bePrice = np; break; }
    bePrice = np;
  }

  // ── Barem altı: 199 TL tavanında hedef kârı ulaşılıyor mu? ──
  // Hedef: netProfitAfterVat >= price * m
  let priceUnder200 = Infinity;
  if (desi < 10) {
    const targetProfitAt199 = 199 * m;
    const actualProfitAt199 = netProfitAfterVatAt(199);
    if (actualProfitAt199 >= targetProfitAt199 - 0.01) {
      // 199'da hedef kâr yeterli — hassas arama
      let lo = 50;
      let hi = 199;
      for (let i = 0; i < 50; i++) {
        const mid = Math.ceil((lo + hi) / 2);
        const midProfit = netProfitAfterVatAt(mid);
        const targetProfit = mid * m;
        if (midProfit >= targetProfit - 0.01) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
        if (hi - lo < 1) break;
      }
      priceUnder200 = hi;
      if (netProfitAfterVatAt(priceUnder200) < priceUnder200 * m - 0.01) {
        priceUnder200 += 1;
      }
      if (priceUnder200 > 199) priceUnder200 = 199;
    }
  }

  // ── Barem üstü: 200-350 bandı — hedef kârı sağlayan net minimum fiyat ──
  let priceOver200 = 200;
  for (let i = 0; i < 300; i++) {
    const targetProfit = priceOver200 * m;
    const actualProfit = netProfitAfterVatAt(priceOver200);
    if (actualProfit >= targetProfit - 0.01) break;
    priceOver200 += 1;
  }

  const price = (isFinite(priceUnder200) && priceUnder200 <= priceOver200) ? priceUnder200 : priceOver200;

  // Net Fiyat (Yuvarlama yok — 1 TL hassasiyetli tam fiyat)
  let roundedPrice = Math.ceil(price);
  for (let i = 0; i < 30; i++) {
    const targetProfit = roundedPrice * m;
    const actualProfit = netProfitAfterVatAt(roundedPrice);
    if (actualProfit >= targetProfit - 0.01) break;
    roundedPrice += 1;
  }

  // ── Barem optimizasyonu: 199'da daha mı kârlı? ──
  const targetPrice = roundedPrice;
  if (desi < 10 && roundedPrice > 199) {
    const r199 = calcAtFixedPrice(199, productionCostTotal, weightGramsTotal, s);
    const rRec = calcAtFixedPrice(roundedPrice, productionCostTotal, weightGramsTotal, s);
    if (r199.netProfitAfterVat > rRec.netProfitAfterVat) {
      roundedPrice = 199;
    }
  }

  // Breakdown — tamamen calcAtFixedPrice ile tutarlı
  const finalResult = calcAtFixedPrice(roundedPrice, productionCostTotal, weightGramsTotal, s);
  const rShipping = finalResult.shipping;
  const rReturnCost = (productionCostTotal + rShipping + packagingCost) * (s.returnRate / 100);
  const rBaseCost = productionCostTotal + rShipping + packagingCost + platformFee + fixedCost + rReturnCost;
  
  // Kesintiler (KDV dahil Trendyol faturaları)
  const rCommission = roundedPrice * (s.commissionRate / 100);
  const rPaymentTermFee = roundedPrice * (s.paymentTermFee / 100);
  const rAdvertisingCost = roundedPrice * adRate;
  
  const rTotalExpenses = finalResult.totalExpenses;
  const rNetProfit = finalResult.netProfit;

  // KDV mahsup kalemleri — calcAtFixedPrice ile tutarlı
  const vatCollected       = roundedPrice / 6;
  
  const vatPaidShipping    = rShipping / 6;
  const vatPaidPlatform    = platformFee / 6;
  const rCommissionForVat  = rCommission / 6;      // KDV dahil tutardan / 6
  const rPaymentTermForVat = rPaymentTermFee / 6;  // KDV dahil tutardan / 6
  const vatPaidFilament    = filamentCostForVat / 6;
  const vatPaidPackaging   = packagingCost / 6;
  const vatPaidOnInputs    = vatPaidShipping + vatPaidPlatform + rCommissionForVat + rPaymentTermForVat + vatPaidFilament + vatPaidPackaging;
  const vatPayable         = Math.max(0, vatCollected - vatPaidOnInputs);
  const netProfitAfterVat  = finalResult.netProfitAfterVat;

  return {
    recommendedPrice: roundedPrice,
    targetPrice,
    exactTargetPrice: price,
    breakEvenPrice: Math.ceil(bePrice),
    breakdown: {
      productionCost: productionCostTotal,
      packagingCost,
      shippingCost: rShipping,
      platformFee,
      fixedCost,
      advertisingCost: rAdvertisingCost,
      returnCost: rReturnCost,
      commission: rCommission,
      paymentTermFee: rPaymentTermFee,
      totalExpenses: rTotalExpenses,
      netProfit: rNetProfit,                   // sipariş bazı toplam kâr
      netMarginOnCost: rBaseCost > 0 ? (rNetProfit / rBaseCost) * 100 : 0,
      netMarginOnPrice: roundedPrice > 0 ? (rNetProfit / roundedPrice) * 100 : 0,
      vatCollected,
      vatPaidOnInputs,
      vatPaidShipping,
      vatPaidPlatform,
      vatPaidCommission: rCommissionForVat,
      vatPaidPaymentTerm: rPaymentTermForVat,
      vatPaidFilament,
      vatPaidPackaging,
      vatPayable,
      netProfitAfterVat,
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
 * Verilen sabit fiyat noktasında KDV sonrası kârı hesaplar.
 * Barem optimizasyonu ve simülatör için kullanılır.
 */
function calcAtFixedPrice(price: number, productionCostTotal: number, weightGramsTotal: number, s: TrendyolSettings): {
  shipping: number; netProfit: number; netProfitAfterVat: number; netMarginOnPrice: number; netMarginAfterVat: number; totalExpenses: number;
} {
  const platformFee = getActivePlatformFee(s);
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  
  const shipping = calcShipping(weightGramsTotal, price, s.fastShipping);
  const returnCost = (productionCostTotal + shipping + packagingCost) * (s.returnRate / 100);
  const baseCost = productionCostTotal + shipping + packagingCost + platformFee + fixedCost + returnCost;
  
  // Trendyol Kesintileri (KDV dahil satış fiyatı üzerinden kesilir)
  const commission = price * (s.commissionRate / 100);
  const paymentTermFee = price * (s.paymentTermFee / 100);
  const advertisingCost = price * adRate;
  const withholding = (price / 1.20) * 0.01; // %1 E-ticaret stopajı
  
  const totalExpenses = baseCost + commission + paymentTermFee + advertisingCost + withholding;
  const netProfit = price - totalExpenses;
  
  // KDV hesabı
  const filamentCost = (weightGramsTotal * (1 + s.wastePercentage / 100) / 1000) * s.filamentPricePerKg;
  const VAT_RATE = 0.20;  // Devlet sabit %20 KDV
  
  // Tahsil edilen KDV (satış fiyatından)
  const vatCollected = price * VAT_RATE / (1 + VAT_RATE);  // = price / 6
  
  // Mahsup edilecek KDV (giderlerin KDV'si)
  // Kargo, Platform, Komisyon, Vade, Reklam, Filament, Kutu — hepsi KDV'li faturalardır
  const vatPaidShipping = shipping * VAT_RATE / (1 + VAT_RATE);
  const vatPaidPlatform = platformFee * VAT_RATE / (1 + VAT_RATE);
  const vatPaidCommission = commission * VAT_RATE / (1 + VAT_RATE);       // Komisyon / 6
  const vatPaidPaymentTerm = paymentTermFee * VAT_RATE / (1 + VAT_RATE);   // Vade / 6
  const vatPaidAdvertising = advertisingCost * VAT_RATE / (1 + VAT_RATE);  // Reklam / 6
  const vatPaidFilament = filamentCost * VAT_RATE / (1 + VAT_RATE);
  const vatPaidPackaging = packagingCost * VAT_RATE / (1 + VAT_RATE);
  
  const vatPaidOnInputs = vatPaidShipping + vatPaidPlatform + vatPaidCommission + vatPaidPaymentTerm + vatPaidAdvertising + vatPaidFilament + vatPaidPackaging;
  const vatPayable = Math.max(0, vatCollected - vatPaidOnInputs);
  const netProfitAfterVat = netProfit - vatPayable;
  
  return {
    shipping,
    netProfit,
    netProfitAfterVat,
    netMarginOnPrice: price > 0 ? (netProfit / price) * 100 : 0,
    netMarginAfterVat: price > 0 ? (netProfitAfterVat / price) * 100 : 0,
    totalExpenses,
  };
}

/**
 * Her barem bandı için KDV sonrası net kârı karşılaştırır.
 */
function calcBaremOptimization(productionCost: number, weightGrams: number, s: TrendyolSettings, recommendedPrice: number): BaremScenario[] {
  const adRate = s.organicSalesMode ? 0 : s.advertisingRate / 100;
  const totalCutRate = (s.commissionRate + s.paymentTermFee) / 100 + adRate;
  const vatNetRate = (1 - (s.commissionRate + s.paymentTermFee) / 100) / 6;
  const filamentCost = (weightGrams * (1 + s.wastePercentage / 100) / 1000) * s.filamentPricePerKg;
  const platformFee = getActivePlatformFee(s);
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const fixedVatDeductions = (platformFee + filamentCost + packagingCost) / 6;

  const under200Max = 199;
  const band200Max = 349;

  const scenarios: Omit<BaremScenario, "isOptimal" | "priceDiff" | "profitDiff">[] = [];

  // Başabaş fiyatı: KDV sonrası kâr = 0
  const calcExactPrice = (shippingPrice: number) => {
    const shipping = calcShipping(weightGrams, shippingPrice, s.fastShipping);
    const returnCost = (productionCost + shipping + packagingCost) * (s.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    const cargoVatDeduction = shipping / 6;
    return (baseCost - fixedVatDeductions - cargoVatDeduction) / (1 - totalCutRate - vatNetRate);
  };

  // 1) Barem altı: ₺199 tavan
  const r199 = calcAtFixedPrice(under200Max, productionCost, weightGrams, s);
  const exactUnder200 = calcExactPrice(under200Max);
  scenarios.push({ label: "Barem Altı (₺199)", band: "under200", price: under200Max, exactTargetPrice: exactUnder200, shipping: r199.shipping, netProfit: r199.netProfitAfterVat, netMarginOnPrice: r199.netMarginAfterVat, totalExpenses: r199.totalExpenses });

  // 2) Barem üstü: 350+ bandı
  const exactOver = calcExactPrice(350);
  if (exactOver >= 350) {
    const rHigh = calcAtFixedPrice(exactOver, productionCost, weightGrams, s);
    scenarios.push({ label: `Barem Üstü (₺${exactOver.toFixed(2)})`, band: "over350", price: exactOver, exactTargetPrice: exactOver, shipping: rHigh.shipping, netProfit: rHigh.netProfitAfterVat, netMarginOnPrice: rHigh.netMarginAfterVat, totalExpenses: rHigh.totalExpenses });
  }

  // 3) Önerilen fiyat
  if (recommendedPrice >= 200) {
    const clampedRec = Math.min(recommendedPrice, band200Max);
    const rRec = calcAtFixedPrice(clampedRec, productionCost, weightGrams, s);
    scenarios.push({ label: `Önerilen (₺${clampedRec})`, band: clampedRec < 350 ? "200to350" : "over350", price: clampedRec, exactTargetPrice: clampedRec, shipping: rRec.shipping, netProfit: rRec.netProfitAfterVat, netMarginOnPrice: rRec.netMarginAfterVat, totalExpenses: rRec.totalExpenses });
  }

  // 4) 350+ bandı
  if (recommendedPrice >= 350) {
    const r3 = calcAtFixedPrice(recommendedPrice, productionCost, weightGrams, s);
    scenarios.push({ label: `350+ (₺${recommendedPrice})`, band: "over350", price: recommendedPrice, exactTargetPrice: recommendedPrice, shipping: r3.shipping, netProfit: r3.netProfitAfterVat, netMarginOnPrice: r3.netMarginAfterVat, totalExpenses: r3.totalExpenses });
  }

  const maxProfit = Math.max(...scenarios.map(sc => sc.netProfit));
  const net199Profit = r199.netProfitAfterVat;

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
  // Ürün başına harici fiyat simülatörü: productId → fiyat string
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [catalogSuggestions, setCatalogSuggestions] = useState<Product[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pendingFlags, setPendingFlags] = useState<{ isCandleholder: boolean; isKeychain: boolean; isSoapdish: boolean }>({ isCandleholder: false, isKeychain: false, isSoapdish: false });
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
    const w = (p as any).weight_grams ?? (p as any).weightGrams ?? (p as any).weight ?? (p as any).gramaj ?? (p as any).default_weight_grams ?? 0;
    setProductName((p as any).name ?? (p as any).product_name ?? "");
    setWeightGrams(w ? String(w) : "");
    // Supabase'den gelen flag'leri pending state'e aktar — addProduct'ta kullanılacak
    setPendingFlags({
      isCandleholder: Boolean((p as any).is_candleholder),
      isKeychain: Boolean((p as any).is_keychain),
      isSoapdish: Boolean((p as any).is_soapdish),
    });
    setSuggestionsOpen(false);
  }

  const upd = (patch: Partial<TrendyolSettings>) => setSettings(s => {
    const next = { ...s, ...patch };
    // Aylık gider veya hedef sipariş değiştiğinde fixedCostPerOrder otomatik güncellenir
    if ('monthlyFixedExpense' in patch || 'monthlyOrderTarget' in patch) {
      const mo = (next.monthlyOrderTarget ?? 0) > 0 ? (next.monthlyOrderTarget ?? 1) : 1;
      next.fixedCostPerOrder = parseFloat(((next.monthlyFixedExpense ?? 0) / mo).toFixed(2));
    }
    return next;
  });

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
    // Ad üzerinden algıla + Supabase'den gelen flag'leri birleştir (OR mantığı)
    const fromName = detectProductTypeFlags(productName.trim());
    const typeFlags = {
      isCandleholder: pendingFlags.isCandleholder || fromName.isCandleholder,
      isKeychain: pendingFlags.isKeychain || fromName.isKeychain,
      isSoapdish: pendingFlags.isSoapdish || fromName.isSoapdish,
    };
    setProducts(prev => [...prev, {
      id: Date.now().toString(),
      productName: productName.trim(),
      weightGrams: parseFloat(weightGrams),
      quantity: parseInt(quantity) || 1,
      ...typeFlags,
    }]);
    setProductName(""); setWeightGrams(""); setQuantity("1");
    setPendingFlags({ isCandleholder: false, isKeychain: false, isSoapdish: false });
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
    const qty = p.quantity;
    const extraPerUnit =
      (isCandleholder ? (costSettingsForCalc.candleholder_cost_per_unit ?? 0) : 0) +
      (isKeychain ? (costSettingsForCalc.keychain_cost_per_unit ?? 0) : 0) +
      (isSoapdish ? (costSettingsForCalc.soapdish_cost_per_unit ?? 0) : 0);
    const pc = qty > 1
      ? calculateProductCost(p.weightGrams * qty, costSettingsForCalc, false, false, false).totalCost + extraPerUnit * qty
      : calculateProductCost(p.weightGrams, costSettingsForCalc, isCandleholder, isKeychain, isSoapdish).totalCost;
    const pr = calcTrendyolPrice(pc, p.weightGrams * qty, settings, qty);

    // Gerçek satış fiyatı girilmişse onu kullan
    const actualPriceStr = customPrices[p.id] ?? "";
    const actualPriceVal = parseFloat(actualPriceStr);
    const hasActual = !isNaN(actualPriceVal) && actualPriceVal > 0;
    const activeRevenue = hasActual ? actualPriceVal : pr.recommendedPrice;

    // Aktif fiyat üzerinden net kâr ve KDV
    const activeSim = hasActual ? calcAtFixedPrice(actualPriceVal, pc, p.weightGrams * qty, settings) : null;
    const activeNetProfit = hasActual ? activeSim!.netProfit : pr.breakdown.netProfit;
    const netProfitAfterVat = hasActual ? activeSim!.netProfitAfterVat : pr.breakdown.netProfitAfterVat;
    const vatPayable = hasActual
      ? (activeSim!.netProfit - activeSim!.netProfitAfterVat)
      : pr.breakdown.vatPayable;

    return {
      qty: acc.qty + 1,
      setCount: acc.setCount + qty,
      productionCost: acc.productionCost + pr.breakdown.productionCost,
      revenue: acc.revenue + activeRevenue,
      netProfit: acc.netProfit + activeNetProfit,
      netProfitAfterVat: acc.netProfitAfterVat + netProfitAfterVat,
      vatPayable: acc.vatPayable + vatPayable,
    };
  }, { qty: 0, setCount: 0, productionCost: 0, revenue: 0, netProfit: 0, netProfitAfterVat: 0, vatPayable: 0 });

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
                    <Label htmlFor="quantity">Set İçi Adet</Label>
                    <Input id="quantity" type="number" value={quantity} min="1"
                      onChange={e => setQuantity(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addProduct()} />
                  </div>
                </div>
                
                {/* Ekstra Malzeme Toggle'ları */}
                <div className="flex flex-wrap gap-3 p-2 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground w-full mb-1">Ekstra malzeme (maliyet ayarlardan alınır):</p>
                  {[
                    { key: "isCandleholder" as const, label: "🕯️ Pilli Mum", cost: settings.candleholderCostPerUnit },
                    { key: "isKeychain" as const, label: "🔑 Anahtarlık", cost: settings.keychainCostPerUnit },
                    { key: "isSoapdish" as const, label: "🧴 Sabunluk Pompası", cost: settings.soapdishCostPerUnit },
                  ].map(({ key, label, cost }) => (
                    <label key={key} className={`flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded border transition-colors
                      ${pendingFlags[key] ? "bg-orange-100 border-orange-400 dark:bg-orange-950/40 dark:border-orange-600" : "bg-background border-border"}`}>
                      <input type="checkbox" checked={pendingFlags[key]}
                        onChange={e => setPendingFlags(f => ({ ...f, [key]: e.target.checked }))}
                        className="w-3 h-3" />
                      {label}
                      {cost > 0 && <span className="text-muted-foreground">(+₺{cost})</span>}
                    </label>
                  ))}
                </div>

                <Button onClick={addProduct} className="w-full">
                  <Package className="w-4 h-4 mr-2" />Ürün Ekle
                </Button>              </CardContent>
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
                      const qty = product.quantity;

                      // Set üretim maliyeti: filament/elektrik toplam gramaj üzerinden,
                      // ekstra malzemeler (mum, anahtarlık, pompa) qty kadar
                      const costCalcUnit = calculateProductCost(product.weightGrams, costSettingsForCalc, isCandleholder, isKeychain, isSoapdish);
                      const costCalcTotal = qty > 1
                        ? calculateProductCost(product.weightGrams * qty, costSettingsForCalc, false, false, false)
                        : costCalcUnit;
                      // Ekstra malzeme maliyeti qty ile çarp
                      const extraPerUnit =
                        (isCandleholder ? (costSettingsForCalc.candleholder_cost_per_unit ?? 0) : 0) +
                        (isKeychain ? (costSettingsForCalc.keychain_cost_per_unit ?? 0) : 0) +
                        (isSoapdish ? (costSettingsForCalc.soapdish_cost_per_unit ?? 0) : 0);
                      const pc = qty > 1
                        ? costCalcTotal.totalCost + extraPerUnit * qty
                        : costCalcUnit.totalCost;

                      const pr = calcTrendyolPrice(pc, product.weightGrams * qty, settings, qty);

                      // Gerçek satış fiyatı girilmişse tüm breakdown o fiyat üzerinden hesaplanır
                      const actualPriceStr = customPrices[product.id] ?? "";
                      const actualPriceVal = parseFloat(actualPriceStr);
                      const hasActualPrice = !isNaN(actualPriceVal) && actualPriceVal > 0;
                      const activePrice = hasActualPrice ? actualPriceVal : pr.recommendedPrice;

                      const activeSim = hasActualPrice
                        ? calcAtFixedPrice(actualPriceVal, pc, product.weightGrams * qty, settings)
                        : null;

                      // bd: her zaman aktif fiyat üzerinden breakdown
                      const bd = hasActualPrice ? (() => {
                        const platformFee = getActivePlatformFee(settings);
                        const shipping = activeSim!.shipping;
                        const commission = actualPriceVal * (settings.commissionRate / 100);
                        const paymentTermFee = actualPriceVal * (settings.paymentTermFee / 100);
                        const advertisingCost = actualPriceVal * (settings.organicSalesMode ? 0 : settings.advertisingRate / 100);
                        const filamentCostForVat = (product.weightGrams * qty * (1 + settings.wastePercentage / 100) / 1000) * settings.filamentPricePerKg;
                        const VAT_RATE = 0.20;  // Devlet sabit %20
                        const vatCollected = actualPriceVal * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidShipping    = shipping * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidPlatform    = platformFee * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidCommission  = commission * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidPaymentTerm = paymentTermFee * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidAdvertising = advertisingCost * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidFilament    = filamentCostForVat * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidPackaging   = settings.packagingCost * VAT_RATE / (1 + VAT_RATE);
                        const vatPaidOnInputs    = vatPaidShipping + vatPaidPlatform + vatPaidCommission + vatPaidPaymentTerm + vatPaidAdvertising + vatPaidFilament + vatPaidPackaging;
                        const vatPayable = Math.max(0, vatCollected - vatPaidOnInputs);
                        return {
                          ...pr.breakdown,
                          shippingCost: shipping,
                          platformFee,
                          commission,
                          paymentTermFee,
                          advertisingCost,
                          totalExpenses: activeSim!.totalExpenses,
                          netProfit: activeSim!.netProfit,
                          netMarginOnCost: pr.breakdown.productionCost > 0 ? (activeSim!.netProfit / activeSim!.totalExpenses) * 100 : 0,
                          netMarginOnPrice: actualPriceVal > 0 ? (activeSim!.netProfit / actualPriceVal) * 100 : 0,
                          vatCollected,
                          vatPaidOnInputs,
                          vatPaidShipping,
                          vatPaidPlatform,
                          vatPaidCommission,
                          vatPaidPaymentTerm,
                          vatPaidFilament,
                          vatPaidPackaging,
                          vatPayable,
                          netProfitAfterVat: activeSim!.netProfitAfterVat,
                        };
                      })() : pr.breakdown;

                      const cargoRatio = (bd.shippingCost / activePrice) * 100;

                      // Fiyat optimizasyon kontrolü (200–215 TL arası için)
                      const optInput: NetProfitInput = {
                        satisFiyati: activePrice,
                        productionCost: pc,
                        weightGrams: product.weightGrams,
                        packagingCost: settings.packagingCost,
                        platformFee: (settings.useExpressPlatformFee ? settings.platformFeeExpress : settings.platformFeeBase) * 1.20,
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
                              <p className="text-sm text-muted-foreground">
                                {product.quantity > 1
                                  ? `${product.weightGrams} gr × ${product.quantity} adet = ${product.weightGrams * product.quantity} gr (${product.quantity}'li set)`
                                  : `${product.weightGrams} gr`}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeProduct(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50">Sil</Button>
                          </div>

                          {/* Ekstra Malzeme Toggle'ları — listede de değiştirilebilir */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "isCandleholder" as const, label: "🕯️ Pilli Mum", cost: settings.candleholderCostPerUnit },
                              { key: "isKeychain" as const, label: "🔑 Anahtarlık", cost: settings.keychainCostPerUnit },
                              { key: "isSoapdish" as const, label: "🧴 Pompa", cost: settings.soapdishCostPerUnit },
                            ].map(({ key, label, cost }) => {
                              const active = Boolean(product[key]);
                              return (
                                <button key={key} type="button"
                                  onClick={() => setProducts(prev => prev.map(p =>
                                    p.id === product.id ? { ...p, [key]: !active } : p
                                  ))}
                                  className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1
                                    ${active
                                      ? "bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-950/40 dark:border-orange-600 dark:text-orange-200"
                                      : "bg-muted/30 border-border text-muted-foreground"}`}>
                                  {label}
                                  {active && cost > 0 && <span className="font-semibold">+₺{cost}</span>}
                                  {!active && <span className="opacity-50">+₺{cost}</span>}
                                </button>
                              );
                            })}
                          </div>

                          {/* Ana Fiyat Kartları */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2 text-center">
                              <p className="text-xs text-red-600 font-semibold">Başabaş</p>
                              <p className="font-bold text-red-700 dark:text-red-300 text-base">₺{pr.breakEvenPrice}</p>
                              <p className="text-xs text-red-500">altı zarar</p>
                            </div>
                            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2 text-center">
                              <p className="text-xs text-orange-600 font-semibold">
                                {qty > 1 ? `Set Üretim (${qty}×)` : "Üretim Maliyeti"}
                              </p>
                              <p className="font-bold text-orange-700 dark:text-orange-300 text-base">₺{pc.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                {qty > 1
                                  ? `${qty} × ₺${(pc / qty).toFixed(2)}`
                                  : [isCandleholder && "🕯️", isKeychain && "🔑", isSoapdish && "🧴"].filter(Boolean).join(" ") || "kargo hariç"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 text-center">
                              <p className="text-xs text-green-600 font-semibold">
                                {hasActualPrice ? "Gerçek Satış Fiyatın" : product.quantity > 1 ? `${product.quantity}'li Set Fiyatı` : "Önerilen Fiyat"}
                              </p>
                              <p className="font-bold text-green-700 dark:text-green-300 text-lg">₺{activePrice}</p>
                              {hasActualPrice
                                ? <p className="text-xs text-blue-500">Öneri: ₺{pr.recommendedPrice}</p>
                                : <p className="text-xs text-green-500">%{settings.profitMargin} net kâr (fiyattan)</p>
                              }
                              <p className="text-xs text-purple-600 font-semibold mt-0.5">KDV sonrası: ₺{bd.netProfitAfterVat.toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Set içi adet > 1 ise özet */}
                          {product.quantity > 1 && (
                            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                              <div className="text-center">
                                <p className="text-muted-foreground">Set Üretim Maliyeti</p>
                                <p className="font-bold text-orange-700 dark:text-orange-300">₺{bd.productionCost.toFixed(2)}</p>
                                <p className="text-muted-foreground">{product.quantity} × ₺{pc.toFixed(2)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Set Satış Fiyatı</p>
                                <p className="font-bold text-blue-700 dark:text-blue-300">₺{activePrice}</p>
                                <p className="text-muted-foreground">tek sipariş</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Set Kârı</p>
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">₺{bd.netProfit.toFixed(2)}</p>
                                <p className="text-xs text-purple-600">KDV sonrası: ₺{bd.netProfitAfterVat.toFixed(2)}</p>
                              </div>
                            </div>
                          )}

                          {/* Kâr Uyarısı */}
                          {bd.netProfitAfterVat < 10 && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400">⚠️ Düşük Karlılık</p>
                              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                KDV sonrası net kâr ₺{bd.netProfitAfterVat.toFixed(2)} — set satış veya fiyat artışı öneririz.
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
                            const scenarios = calcBaremOptimization(pc, product.weightGrams * qty, settings, baseRecommended);
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

                          {/* ── Gerçek Satış Fiyatı ── */}
                          {(() => {
                            const customPriceStr = customPrices[product.id] ?? "";
                            const customPriceVal = parseFloat(customPriceStr);
                            const hasCustom = !isNaN(customPriceVal) && customPriceVal > 0;

                            const sim = hasCustom ? activeSim : null;

                            const priceDiff = hasCustom ? customPriceVal - pr.recommendedPrice : 0;
                            const profitDiff = sim ? sim.netProfit - (hasActualPrice ? pr.breakdown.netProfit : bd.netProfit) : 0;
                            const commissionAtCustom = hasCustom ? customPriceVal * (settings.commissionRate / 100) : 0;
                            const commissionAtRecommended = pr.recommendedPrice * (settings.commissionRate / 100);
                            const commissionDiff = commissionAtCustom - commissionAtRecommended;
                            const simVatPayable = hasCustom ? bd.vatPayable : 0;
                            const simNetProfitAfterVat = hasCustom ? bd.netProfitAfterVat : 0;

                            return (
                              <div className="mt-3 pt-3 border-t-2 border-dashed border-purple-300 dark:border-purple-700">
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                                  💰 Gerçek Satış Fiyatım
                                  <span className="font-normal text-muted-foreground">— girince tüm hesap bu fiyata göre güncellenir</span>
                                </p>
                                <div className="flex gap-2 items-center mb-3">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₺</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-400"
                                      placeholder={`Örn: ${pr.recommendedPrice + 50}`}
                                      value={customPriceStr}
                                      onChange={e => setCustomPrices(prev => ({ ...prev, [product.id]: e.target.value }))}
                                    />
                                  </div>
                                  {hasCustom && (
                                    <button
                                      type="button"
                                      onClick={() => setCustomPrices(prev => ({ ...prev, [product.id]: "" }))}
                                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded-lg"
                                    >
                                      Temizle
                                    </button>
                                  )}
                                </div>

                                {sim && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className={`rounded-lg p-2.5 text-center border ${sim.netProfit > 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-700"}`}>
                                        <p className="text-muted-foreground mb-0.5">Net Kâr</p>
                                        <p className={`font-bold text-base ${sim.netProfit > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700"}`}>₺{sim.netProfit.toFixed(2)}</p>
                                        <p className={`text-[11px] font-semibold mt-0.5 ${profitDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{profitDiff >= 0 ? "+" : ""}₺{profitDiff.toFixed(2)}</p>
                                      </div>
                                      <div className={`rounded-lg p-2.5 text-center border ${simNetProfitAfterVat > 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-700"}`}>
                                        <p className="text-muted-foreground mb-0.5">Net Kâr (KDV sonrası)</p>
                                        <p className={`font-bold text-base ${simNetProfitAfterVat > 0 ? "text-purple-700 dark:text-purple-300" : "text-red-700"}`}>₺{simNetProfitAfterVat.toFixed(2)}</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">KDV: −₺{simVatPayable.toFixed(2)}</p>
                                      </div>
                                      <div className="rounded-lg p-2.5 text-center border border-border bg-muted/20">
                                        <p className="text-muted-foreground mb-0.5">Kâr Marjı</p>
                                        <p className="font-bold text-base text-blue-700 dark:text-blue-300">%{sim.netMarginOnPrice.toFixed(1)}</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">hedef %{settings.profitMargin}</p>
                                      </div>
                                      <div className="rounded-lg p-2.5 text-center border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                                        <p className="text-muted-foreground mb-0.5">Komisyon</p>
                                        <p className="font-bold text-base text-red-700 dark:text-red-300">₺{commissionAtCustom.toFixed(2)}</p>
                                        <p className={`text-[11px] font-semibold mt-0.5 ${commissionDiff >= 0 ? "text-red-600" : "text-emerald-600"}`}>{commissionDiff >= 0 ? "+" : ""}₺{commissionDiff.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="bg-muted/20 rounded-lg p-3 space-y-1.5 text-xs border border-border">
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Fiyat farkı (önerilen vs senin)</span>
                                        <span className={`font-semibold ${priceDiff >= 0 ? "text-blue-600" : "text-orange-600"}`}>{priceDiff >= 0 ? "+" : ""}₺{priceDiff.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Kargo (barem etkisi dahil)</span>
                                        <span className="font-semibold text-amber-600">₺{sim.shipping.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Vade farkı (%{settings.paymentTermFee})</span>
                                        <span className="font-semibold text-red-600">−₺{(customPriceVal * settings.paymentTermFee / 100).toFixed(2)}</span>
                                      </div>
                                      {!settings.organicSalesMode && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Reklam (%{settings.advertisingRate})</span>
                                          <span className="font-semibold text-orange-600">−₺{(customPriceVal * settings.advertisingRate / 100).toFixed(2)}</span>
                                        </div>
                                      )}
                                      <div className="border-t pt-1.5 flex items-center justify-between font-semibold">
                                        <span>Toplam Gider</span>
                                        <span>₺{sim.totalExpenses.toFixed(2)}</span>
                                      </div>
                                    </div>
                                    {customPriceVal < pr.breakEvenPrice && (
                                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 rounded-lg p-2.5 text-xs text-red-700 dark:text-red-300 font-semibold">
                                        ⛔ Bu fiyat başabaş noktasının (₺{pr.breakEvenPrice}) altında — ZARAR EDERSİN
                                      </div>
                                    )}
                                    {customPriceVal >= pr.breakEvenPrice && sim.netProfit < bd.netProfit && (
                                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                        ⚠️ Bu fiyatta daha az kazanıyorsun (₺{Math.abs(profitDiff).toFixed(2)} eksik).
                                      </div>
                                    )}
                                    {sim.netProfit > bd.netProfit && (
                                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 rounded-lg p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                                        ✅ Bu fiyatta ₺{profitDiff.toFixed(2)} daha fazla kazanıyorsun
                                        {priceDiff > 0 && profitDiff < priceDiff && <span> — ₺{priceDiff.toFixed(2)} fiyat farkının sadece ₺{profitDiff.toFixed(2)}'si net kâra dönüşüyor</span>}
                                      </div>
                                    )}
                                  </div>
                                )}
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
                              <Row label={`Platform Bedeli${settings.useExpressPlatformFee ? " 🚀 Bugün Kargoda" : ""} (KDV dahil)`} value={`₺${bd.platformFee.toFixed(2)}`} />
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
                              <Row label="Satış Fiyatı" value={`₺${activePrice}`} bold />
                              <Row label="Net Kâr" value={`₺${bd.netProfit.toFixed(2)}`} bold color={bd.netProfit >= 15 ? "text-emerald-600" : "text-red-600"} />
                              <Row label="Kâr/Maliyet" value={`%${bd.netMarginOnCost.toFixed(1)}`} color="text-emerald-600" />
                              <Row label="Kâr/Fiyat" value={`%${bd.netMarginOnPrice.toFixed(1)}`} color="text-blue-600" />
                              <div className="border-t my-1" />
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">KDV Hesabı (Mükellefi)</p>
                              <Row label="Tahsil Edilen KDV" value={`₺${bd.vatCollected.toFixed(2)}`} color="text-slate-500" />
                              <details className="mt-1">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground pl-1 mb-0.5">
                                  Mahsup Kalemleri (−₺{bd.vatPaidOnInputs.toFixed(2)})
                                </summary>
                                <div className="pl-2 mt-0.5 space-y-0.5">
                                  <Row label="  └ Kargo KDV'si" value={`−₺${bd.vatPaidShipping.toFixed(2)}`} color="text-slate-400" />
                                  <Row label="  └ Platform KDV'si" value={`−₺${bd.vatPaidPlatform.toFixed(2)}`} color="text-slate-400" />
                                  <Row label="  └ Komisyon KDV'si" value={`−₺${bd.vatPaidCommission.toFixed(2)}`} color="text-slate-400" />
                                  <Row label="  └ Vade Farkı KDV'si" value={`−₺${bd.vatPaidPaymentTerm.toFixed(2)}`} color="text-slate-400" />
                                  <Row label="  └ Filament KDV'si" value={`−₺${bd.vatPaidFilament.toFixed(2)}`} color="text-slate-400" />
                                  <Row label="  └ Kutulama KDV'si" value={`−₺${bd.vatPaidPackaging.toFixed(2)}`} color="text-slate-400" />
                                </div>
                              </details>
                              <Row label="Toplam Mahsup" value={`−₺${bd.vatPaidOnInputs.toFixed(2)}`} color="text-slate-500" bold />
                              <Row label="Devlete Ödenecek KDV" value={`−₺${bd.vatPayable.toFixed(2)}`} color="text-purple-600" bold />
                              <Row label="Net Kâr (KDV sonrası)" value={`₺${bd.netProfitAfterVat.toFixed(2)}`} bold color={bd.netProfitAfterVat >= 10 ? "text-emerald-600" : "text-red-600"} />
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
                    {numInput("t1", "Trendyol Komisyonu (%)", "commissionRate", "0.1", "Hakediş raporunda yazıyorsa o oranı gir")}
                    {numInput("t2", "Vade Farkı (%)", "paymentTermFee", "0.1", "Genellikle %3")}

                    {/* Platform Bedeli — Bugün Kargoda toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Platform Hizmet Bedeli (KDV hariç)</p>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input type="checkbox" checked={settings.useExpressPlatformFee}
                            onChange={e => upd({ useExpressPlatformFee: e.target.checked })}
                            className="w-3.5 h-3.5" />
                          <span className={settings.useExpressPlatformFee ? "text-green-700 font-semibold" : "text-muted-foreground"}>
                            🚀 Bugün Kargoda
                          </span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="t3a" className="text-xs text-muted-foreground">Normal (10.99 TL)</Label>
                          <Input id="t3a" type="number" step="0.01"
                            value={settings.platformFeeBase}
                            onChange={e => upd({ platformFeeBase: parseFloat(e.target.value) || 0 })}
                            className={!settings.useExpressPlatformFee ? "border-orange-400" : ""} />
                          <p className="text-xs text-muted-foreground mt-0.5">KDV dahil: ₺{(settings.platformFeeBase * 1.20).toFixed(2)}</p>
                        </div>
                        <div>
                          <Label htmlFor="t3b" className="text-xs text-muted-foreground">Bugün Kargoda (4.99 TL)</Label>
                          <Input id="t3b" type="number" step="0.01"
                            value={settings.platformFeeExpress}
                            onChange={e => upd({ platformFeeExpress: parseFloat(e.target.value) || 0 })}
                            className={settings.useExpressPlatformFee ? "border-green-400" : ""} />
                          <p className="text-xs text-muted-foreground mt-0.5">KDV dahil: ₺{(settings.platformFeeExpress * 1.20).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aktif: <strong>₺{((settings.useExpressPlatformFee ? settings.platformFeeExpress : settings.platformFeeBase) * 1.20).toFixed(2)}</strong> KDV dahil
                      </p>
                    </div>

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
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sabit Gider Hesabı</p>
                      <div>
                        <Label htmlFor="p3a">Aylık Sabit Gider (TL)</Label>
                        <Input
                          id="p3a"
                          type="number"
                          step="50"
                          value={settings.monthlyFixedExpense ?? ""}
                          onChange={e => upd({ monthlyFixedExpense: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Muhasebeci, e-fatura, vergi vb. aylık toplam gider</p>
                      </div>
                      <div>
                        <Label htmlFor="p3b">Aylık Satış Hedefiniz (adet)</Label>
                        <Input
                          id="p3b"
                          type="number"
                          step="1"
                          min="1"
                          value={settings.monthlyOrderTarget ?? ""}
                          onChange={e => upd({ monthlyOrderTarget: parseInt(e.target.value) || 1 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Hedef sipariş adedi — arttıkça sipariş başına maliyet düşer</p>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-3 py-2">
                        <span className="text-xs text-muted-foreground">Sipariş başına sabit gider</span>
                        <span className="text-sm font-bold text-orange-600">
                          ₺{((settings.monthlyOrderTarget ?? 0) > 0
                            ? (settings.monthlyFixedExpense ?? 0) / (settings.monthlyOrderTarget ?? 1)
                            : (settings.monthlyFixedExpense ?? 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
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
                  <Row label="Ürün / Set" value={`${totals.qty} kalem (${totals.setCount} adet)`} />
                  <Row label="Üretim Maliyeti" value={`₺${totals.productionCost.toFixed(2)}`} />
                  <Row label="Toplam Gelir" value={`₺${totals.revenue.toFixed(2)}`} />
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <Row label="Net Kâr (KDV öncesi)"
                      value={`₺${totals.netProfit.toFixed(2)}`}
                      color={totals.netProfit > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"} />
                    <Row label="Devlete KDV"
                      value={`−₺${totals.vatPayable.toFixed(2)}`}
                      color="text-purple-600" />
                    <Row label="Net Kâr (KDV sonrası)"
                      value={`₺${totals.netProfitAfterVat.toFixed(2)}`}
                      bold
                      color={totals.netProfitAfterVat > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"} />
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
