/**
 * Ortak Fiyatlandırma ve Çoklu Pazaryeri Hesaplama Modülü
 *
 * 6 Pazaryeri (Trendyol, Hepsiburada, n11, Pazarama, Trendruum, İdefix)
 * için birebir kendi sayfalarındaki formül ve Türkiye vergi/kargo mevzuatıyla
 * %100 özdeş hesaplama yapar.
 */

import { calcShippingCost as calcTrendyolShipping } from "./trendyol-cargo";
import { calcShippingCost as calcHepsiburadaShipping } from "./hepsiburada-cargo";
import { calcN11ShippingCost } from "./n11-cargo";
import { calcPazaramaShippingCost } from "./pazarama-cargo";
import { calcTrendruumShippingCost } from "./trendruum-cargo";
import { calcIdefixShippingCost } from "./idefix-cargo";

export type MarketplaceId =
  | "trendyol"
  | "hepsiburada"
  | "n11"
  | "pazarama"
  | "trendruum"
  | "idefix";

export interface MarketplaceMeta {
  id: MarketplaceId;
  name: string;
  storageKey: string;
  badgeLabel: string;
  gradientClass: string;
  accentColor: string;
  borderHoverClass: string;
  dashboardUrl: string;
  defaultCommission: number;
  defaultPaymentTerm: number;
  defaultPlatformFee: number;
}

export const MARKETPLACES: MarketplaceMeta[] = [
  {
    id: "trendyol",
    name: "Trendyol",
    storageKey: "trendyolSettings",
    badgeLabel: "Trendyol",
    gradientClass: "from-orange-500 to-amber-600",
    accentColor: "#f97316",
    borderHoverClass: "hover:border-orange-500",
    dashboardUrl: "/dashboard/trendyol",
    defaultCommission: 16,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 10.99,
  },
  {
    id: "hepsiburada",
    name: "Hepsiburada",
    storageKey: "hepsiburadaSettings",
    badgeLabel: "Hepsiburada",
    gradientClass: "from-orange-600 to-red-600",
    accentColor: "#ea580c",
    borderHoverClass: "hover:border-orange-600",
    dashboardUrl: "/dashboard/hepsiburada",
    defaultCommission: 16,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 10.99,
  },
  {
    id: "n11",
    name: "n11",
    storageKey: "n11Settings",
    badgeLabel: "n11",
    gradientClass: "from-red-500 to-rose-600",
    accentColor: "#ef4444",
    borderHoverClass: "hover:border-red-500",
    dashboardUrl: "/dashboard/n11",
    defaultCommission: 15,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 9.99,
  },
  {
    id: "pazarama",
    name: "Pazarama",
    storageKey: "pazaramaSettings",
    badgeLabel: "Pazarama",
    gradientClass: "from-blue-600 to-cyan-600",
    accentColor: "#2563eb",
    borderHoverClass: "hover:border-blue-600",
    dashboardUrl: "/dashboard/pazarama",
    defaultCommission: 14,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 7.99,
  },
  {
    id: "trendruum",
    name: "Trendruum",
    storageKey: "trendruumSettings",
    badgeLabel: "Trendruum",
    gradientClass: "from-purple-600 to-indigo-600",
    accentColor: "#9333ea",
    borderHoverClass: "hover:border-purple-600",
    dashboardUrl: "/dashboard/trendruum",
    defaultCommission: 15,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 5.99,
  },
  {
    id: "idefix",
    name: "İdefix",
    storageKey: "idefixSettings",
    badgeLabel: "İdefix",
    gradientClass: "from-red-600 to-red-800",
    accentColor: "#dc2626",
    borderHoverClass: "hover:border-red-700",
    dashboardUrl: "/dashboard/idefix",
    defaultCommission: 14,
    defaultPaymentTerm: 0,
    defaultPlatformFee: 6.99,
  },
];

export interface BaseSettings {
  filamentPricePerKg: number;
  electricityCostPerGram: number;
  depreciationCostPerGram: number;
  wastePercentage: number;
  commissionRate: number;
  paymentTermFee: number;
  packagingCost: number;
  platformFeeBase: number;
  platformFeeExpress: number;
  useExpressPlatformFee: boolean;
  fastShipping: boolean;
  cargoCompany?: string;
  advertisingRate: number;
  returnRate: number;
  monthlyFixedExpense: number;
  monthlyOrderTarget: number;
  fixedCostPerOrder: number;
  organicSalesMode: boolean;
  candleholderCostPerUnit: number;
  keychainCostPerUnit: number;
  soapdishCostPerUnit: number;
  profitMargin: number;
}

export const DEFAULT_BASE_SETTINGS: BaseSettings = {
  filamentPricePerKg: 500,
  electricityCostPerGram: 0.05,
  depreciationCostPerGram: 0.05,
  wastePercentage: 0,
  commissionRate: 16,
  paymentTermFee: 0,
  packagingCost: 15,
  platformFeeBase: 10.99,
  platformFeeExpress: 4.99,
  useExpressPlatformFee: false,
  fastShipping: true,
  cargoCompany: "auto",
  advertisingRate: 8,
  returnRate: 12,
  monthlyFixedExpense: 2000,
  monthlyOrderTarget: 60,
  fixedCostPerOrder: 33.33,
  organicSalesMode: false,
  candleholderCostPerUnit: 0,
  keychainCostPerUnit: 2,
  soapdishCostPerUnit: 0,
  profitMargin: 10,
};

export interface PricingProductInput {
  productName: string;
  weightGrams: number;
  quantity: number;
  isCandleholder?: boolean;
  isKeychain?: boolean;
  isSoapdish?: boolean;
}

export interface PriceBreakdown {
  price: number;
  shippingIncVat: number;
  shippingExVat: number;
  commission: number;
  paymentTerm: number;
  platformFee: number;
  advertising: number;
  returnCost: number;
  fixedCost: number;
  productionCost: number;
  packagingCost: number;
  totalExpenses: number;
  netProfit: number;
  netProfitAfterVat: number;
  netMarginAfterVat: number;
  baremLabel: string;
  isBarem: boolean;
}

export interface PlatformCalculationResult {
  marketplace: MarketplaceMeta;
  settings: BaseSettings;
  productionCost: number;
  packagingCost: number;
  recommendedPrice: number;
  recommendedBreakdown: PriceBreakdown;
  customBreakdown: PriceBreakdown | null;
}

const VAT_RATE = 0.20;

function gramsToDesi(grams: number): number {
  return Math.max(1, Math.ceil(grams / 1000));
}

function getActivePlatformFee(s: BaseSettings): number {
  const base = s.useExpressPlatformFee ? s.platformFeeExpress : s.platformFeeBase;
  return (base || 0) * 1.20; // KDV hariç girildiği için * 1.20 ile KDV dahil tutar
}

/** Pazaryerine göre kargo maliyeti hesaplama fonksiyonu */
export function calcPlatformShipping(
  id: MarketplaceId,
  weightGrams: number,
  price: number,
  fastShipping: boolean,
  cargoCompany?: string
): number {
  switch (id) {
    case "trendyol":
      return calcTrendyolShipping(weightGrams, price, fastShipping, cargoCompany);
    case "hepsiburada":
      return calcHepsiburadaShipping(weightGrams, price, fastShipping, cargoCompany);
    case "n11":
      return calcN11ShippingCost(weightGrams, price, fastShipping, cargoCompany);
    case "pazarama":
      return calcPazaramaShippingCost(weightGrams, price, fastShipping, cargoCompany);
    case "trendruum":
      return calcTrendruumShippingCost(weightGrams, price, fastShipping, cargoCompany);
    case "idefix":
      return calcIdefixShippingCost(weightGrams, price, fastShipping, cargoCompany);
    default:
      return 60;
  }
}

/**
 * Belirli bir kargo maliyeti için kesin matematiksel fiyatı hesaplar.
 * Formül: P = (BaseCost - FixedVatInputs) / [ (5/6)*(1 - totalCutRate) - m ]
 */
function calcPriceForShippingComp(
  shipping: number,
  productionCost: number,
  weightGramsTotal: number,
  s: BaseSettings,
  targetMargin: number
): number {
  const platformFee = getActivePlatformFee(s); // KDV dahil
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const returnCost = (productionCost + shipping + packagingCost) * (s.returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;

  const isOrganic = s.organicSalesMode || (s.advertisingRate === 0);
  const adRate = isOrganic ? 0 : (s.advertisingRate || 0) / 100;
  const totalCutRate = (s.commissionRate + s.paymentTermFee) / 100 + adRate;

  const wastedGrams = weightGramsTotal * (1 + (s.wastePercentage || 0) / 100);
  const filamentCost = (wastedGrams / 1000) * (s.filamentPricePerKg || 500);
  const electricityCost = wastedGrams * (s.electricityCostPerGram || 0.05);

  const fixedVatInputs = (shipping + platformFee + filamentCost + electricityCost + packagingCost) * (VAT_RATE / (1 + VAT_RATE));

  const denominator = (5 / 6) * (1 - totalCutRate) - targetMargin;
  if (denominator <= 0) return Infinity;

  return (baseCost - fixedVatInputs) / denominator;
}

/** Pazaryeri için fiyat dökümü hesaplama */
export function calculateBreakdown(
  id: MarketplaceId,
  P: number,
  weightGrams: number,
  quantity: number,
  productionCost: number,
  settings: BaseSettings
): PriceBreakdown {
  const totalWeight = weightGrams * (quantity || 1);
  const shippingIncVat = calcPlatformShipping(id, totalWeight, P, settings.fastShipping, settings.cargoCompany);
  const shippingExVat = shippingIncVat / (1 + VAT_RATE);

  const platformFee = getActivePlatformFee(settings);
  const packagingCost = settings.packagingCost;
  const fixedCost = settings.fixedCostPerOrder;
  const returnCost = (productionCost + shippingIncVat + packagingCost) * (settings.returnRate / 100);

  const commission = P * (settings.commissionRate / 100);
  const paymentTerm = P * (settings.paymentTermFee / 100);

  const isOrganic = settings.organicSalesMode || (settings.advertisingRate === 0);
  const adRate = isOrganic ? 0 : (settings.advertisingRate || 0) / 100;
  const advertising = P * adRate;

  const totalExpenses =
    productionCost +
    packagingCost +
    shippingIncVat +
    platformFee +
    commission +
    paymentTerm +
    advertising +
    returnCost +
    fixedCost;

  const netProfit = P - totalExpenses;

  // KDV Mükellefi Hesabı (Devlete Net KDV ve KDV Sonrası Net Kâr)
  const vatCollected = (P * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidShipping = (shippingIncVat * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidPlatform = (platformFee * VAT_RATE) / (1 + VAT_RATE);
  const commissionForVat = (commission * VAT_RATE) / (1 + VAT_RATE);
  const paymentTermForVat = (paymentTerm * VAT_RATE) / (1 + VAT_RATE);
  const advertisingForVat = (advertising * VAT_RATE) / (1 + VAT_RATE);

  const wastedGrams = totalWeight * (1 + (settings.wastePercentage || 0) / 100);
  const filamentCostForVat = (wastedGrams / 1000) * (settings.filamentPricePerKg || 500);
  const electricityCostForVat = wastedGrams * (settings.electricityCostPerGram || 0.05);

  const vatPaidFilament = (filamentCostForVat * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidElectricity = (electricityCostForVat * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidPackaging = (packagingCost * VAT_RATE) / (1 + VAT_RATE);

  const vatPaidInputs =
    vatPaidShipping +
    vatPaidPlatform +
    commissionForVat +
    paymentTermForVat +
    advertisingForVat +
    vatPaidFilament +
    vatPaidElectricity +
    vatPaidPackaging;

  const vatPayable = Math.max(0, vatCollected - vatPaidInputs);
  const netProfitAfterVat = netProfit - vatPayable;
  const netMarginAfterVat = P > 0 ? (netProfitAfterVat / P) * 100 : 0;

  // Barem kontrolü & Etiketi
  let isBarem = false;
  let baremLabel = "Standart Tarife";

  if (id === "trendyol") {
    isBarem = P < 350;
    baremLabel = isBarem ? (P < 200 ? "🟢 Barem 1 (<200 TL)" : "🔵 Barem 2 (200-350 TL)") : "📦 Standart Desi (350 TL+)";
  } else if (id === "hepsiburada") {
    isBarem = P < 400 && settings.fastShipping;
    baremLabel = isBarem ? (P < 200 ? "🟢 Sabit Barem (₺43.99)" : "🔵 Sabit Barem (₺75.99)") : "📦 Standart Desi (400 TL+)";
  } else if (id === "n11") {
    isBarem = P < 300;
    baremLabel = isBarem ? (P < 150 ? "🟢 Şartlı Barem (<150 TL)" : "🔵 Şartlı Barem (150-300 TL)") : "📦 Standart Desi (300 TL+)";
  } else if (id === "pazarama") {
    isBarem = P < 300;
    baremLabel = isBarem ? (P < 150 ? "🟢 Barem (<150 TL)" : "🔵 Barem (150-300 TL)") : "📦 Standart Desi (300 TL+)";
  } else if (id === "trendruum") {
    isBarem = P < 350;
    baremLabel = isBarem ? "🟢 50 TL Barem Desteği (<350 TL)" : "📦 Normal Tarife (350 TL+)";
  } else if (id === "idefix") {
    isBarem = P < 300;
    baremLabel = isBarem ? (P < 150 ? "🟢 50 TL Barem Desteği" : "🔵 20 TL Barem Desteği") : "📦 Normal Tarife (300 TL+)";
  }

  return {
    price: P,
    shippingIncVat,
    shippingExVat,
    commission,
    paymentTerm,
    platformFee,
    advertising,
    returnCost,
    fixedCost,
    productionCost,
    packagingCost,
    totalExpenses,
    netProfit,
    netProfitAfterVat,
    netMarginAfterVat,
    baremLabel,
    isBarem,
  };
}

/** Pazaryeri için önerilen en ideal satış fiyatını hesapla */
export function calculateRecommendedPrice(
  id: MarketplaceId,
  weightGrams: number,
  quantity: number,
  productionCost: number,
  settings: BaseSettings
): number {
  const totalWeight = weightGrams * (quantity || 1);
  const desi = gramsToDesi(totalWeight);
  const m = (settings.profitMargin || 10) / 100;

  let exactTargetPrice = Infinity;
  let targetPrice = 200;
  let recommendedPrice = 200;

  if (id === "trendyol") {
    let priceUnder200 = Infinity;
    let price200to350 = Infinity;

    if (desi < 10) {
      const sh199 = calcPlatformShipping(id, totalWeight, 199, settings.fastShipping, settings.cargoCompany);
      const p1 = calcPriceForShippingComp(sh199, productionCost, totalWeight, settings, m);
      if (p1 <= 199) priceUnder200 = p1;

      const sh250 = calcPlatformShipping(id, totalWeight, 250, settings.fastShipping, settings.cargoCompany);
      const p2 = calcPriceForShippingComp(sh250, productionCost, totalWeight, settings, m);
      if (p2 >= 200 && p2 < 350) price200to350 = p2;
    }

    const sh350 = calcPlatformShipping(id, totalWeight, 350, settings.fastShipping, settings.cargoCompany);
    const p3 = calcPriceForShippingComp(sh350, productionCost, totalWeight, settings, m);

    if (isFinite(priceUnder200)) exactTargetPrice = priceUnder200;
    else if (isFinite(price200to350)) exactTargetPrice = price200to350;
    else exactTargetPrice = p3;

    targetPrice = Math.ceil(exactTargetPrice);
    recommendedPrice = targetPrice;

    if (desi < 10 && targetPrice > 199) {
      const r199 = calculateBreakdown(id, 199, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, targetPrice, weightGrams, quantity, productionCost, settings);
      if (r199.netProfitAfterVat > rRec.netProfitAfterVat) {
        recommendedPrice = 199;
      }
    }
  } else if (id === "hepsiburada") {
    let priceUnder200 = Infinity;
    let price200to350 = Infinity;

    if (desi < 10) {
      const sh199 = calcPlatformShipping(id, totalWeight, 199, settings.fastShipping, settings.cargoCompany);
      const p1 = calcPriceForShippingComp(sh199, productionCost, totalWeight, settings, m);
      if (p1 <= 199) priceUnder200 = p1;

      const sh250 = calcPlatformShipping(id, totalWeight, 250, settings.fastShipping, settings.cargoCompany);
      const p2 = calcPriceForShippingComp(sh250, productionCost, totalWeight, settings, m);
      if (p2 >= 200 && p2 < 350) price200to350 = p2;
    }

    const sh350 = calcPlatformShipping(id, totalWeight, 350, settings.fastShipping, settings.cargoCompany);
    const p3 = calcPriceForShippingComp(sh350, productionCost, totalWeight, settings, m);

    if (isFinite(priceUnder200)) exactTargetPrice = priceUnder200;
    else if (isFinite(price200to350)) exactTargetPrice = price200to350;
    else exactTargetPrice = p3;

    targetPrice = Math.ceil(exactTargetPrice);
    recommendedPrice = targetPrice;

    if (desi < 10 && targetPrice > 199) {
      const r199 = calculateBreakdown(id, 199, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, targetPrice, weightGrams, quantity, productionCost, settings);
      if (r199.netProfitAfterVat > rRec.netProfitAfterVat) {
        recommendedPrice = 199;
      }
    }
  } else if (id === "n11" || id === "pazarama" || id === "idefix") {
    let priceUnder150 = Infinity;
    let price150to300 = Infinity;

    if (desi < 10) {
      const sh149 = calcPlatformShipping(id, totalWeight, 149, settings.fastShipping, settings.cargoCompany);
      const p1 = calcPriceForShippingComp(sh149, productionCost, totalWeight, settings, m);
      if (p1 <= 149) priceUnder150 = p1;

      const sh200 = calcPlatformShipping(id, totalWeight, 200, settings.fastShipping, settings.cargoCompany);
      const p2 = calcPriceForShippingComp(sh200, productionCost, totalWeight, settings, m);
      if (p2 >= 150 && p2 < 300) price150to300 = p2;
    }

    const sh300 = calcPlatformShipping(id, totalWeight, 300, settings.fastShipping, settings.cargoCompany);
    const p3 = calcPriceForShippingComp(sh300, productionCost, totalWeight, settings, m);

    if (isFinite(priceUnder150)) exactTargetPrice = priceUnder150;
    else if (isFinite(price150to300)) exactTargetPrice = price150to300;
    else exactTargetPrice = p3;

    targetPrice = Math.ceil(exactTargetPrice);
    recommendedPrice = targetPrice;

    if (desi < 10 && targetPrice > 149) {
      const r149 = calculateBreakdown(id, 149, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, targetPrice, weightGrams, quantity, productionCost, settings);
      if (r149.netProfitAfterVat > rRec.netProfitAfterVat) {
        recommendedPrice = 149;
      }
    }
  } else if (id === "trendruum") {
    let priceUnder350 = Infinity;

    if (desi < 10) {
      const sh250 = calcPlatformShipping(id, totalWeight, 250, settings.fastShipping, settings.cargoCompany);
      const p1 = calcPriceForShippingComp(sh250, productionCost, totalWeight, settings, m);
      if (p1 < 350) priceUnder350 = p1;
    }

    const sh350 = calcPlatformShipping(id, totalWeight, 350, settings.fastShipping, settings.cargoCompany);
    const p2 = calcPriceForShippingComp(sh350, productionCost, totalWeight, settings, m);

    if (isFinite(priceUnder350)) exactTargetPrice = priceUnder350;
    else exactTargetPrice = p2;

    targetPrice = Math.ceil(exactTargetPrice);
    recommendedPrice = targetPrice;

    if (desi < 10 && targetPrice > 349) {
      const r349 = calculateBreakdown(id, 349, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, targetPrice, weightGrams, quantity, productionCost, settings);
      if (r349.netProfitAfterVat > rRec.netProfitAfterVat) {
        recommendedPrice = 349;
      }
    }
  }

  return isFinite(recommendedPrice) ? recommendedPrice : 200;
}

/** Tek bir pazaryeri için tam hesaplama paketi */
export function calculatePlatformAll(
  meta: MarketplaceMeta,
  product: PricingProductInput,
  customSettings?: Partial<BaseSettings>,
  customSimulatedPrice?: number | null
): PlatformCalculationResult {
  const settings: BaseSettings = {
    ...DEFAULT_BASE_SETTINGS,
    commissionRate: meta.defaultCommission,
    paymentTermFee: meta.defaultPaymentTerm,
    platformFeeBase: meta.defaultPlatformFee,
    ...(customSettings || {}),
  };

  // Üretim Maliyeti (Gramaj × (Filament + Elektrik + Yıpranma) + Ekstra Malzemeler)
  const qty = product.quantity || 1;
  const wastedGrams = product.weightGrams * (1 + (settings.wastePercentage || 0) / 100);
  const filamentCost = (wastedGrams / 1000) * (settings.filamentPricePerKg || 500);
  const electricityCost = wastedGrams * (settings.electricityCostPerGram || 0.05);
  const depreciationCost = wastedGrams * (settings.depreciationCostPerGram || 0.05);

  const unitProduction = filamentCost + electricityCost + depreciationCost;
  const extraPerUnit =
    (product.isCandleholder ? settings.candleholderCostPerUnit || 0 : 0) +
    (product.isKeychain ? settings.keychainCostPerUnit || 0 : 0) +
    (product.isSoapdish ? settings.soapdishCostPerUnit || 0 : 0);

  const productionCost = unitProduction * qty + extraPerUnit * qty;

  // Önerilen Satış Fiyatı
  const recommendedPrice = calculateRecommendedPrice(
    meta.id,
    product.weightGrams,
    qty,
    productionCost,
    settings
  );

  const recommendedBreakdown = calculateBreakdown(
    meta.id,
    recommendedPrice,
    product.weightGrams,
    qty,
    productionCost,
    settings
  );

  const customBreakdown =
    customSimulatedPrice && customSimulatedPrice > 0
      ? calculateBreakdown(
          meta.id,
          customSimulatedPrice,
          product.weightGrams,
          qty,
          productionCost,
          settings
        )
      : null;

  return {
    marketplace: meta,
    settings,
    productionCost,
    packagingCost: settings.packagingCost,
    recommendedPrice,
    recommendedBreakdown,
    customBreakdown,
  };
}
