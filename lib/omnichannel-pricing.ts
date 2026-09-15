/**
 * Tüm Pazaryerleri Ortak Fiyatlandırma ve Kâr Hesaplama Motoru
 * (Trendyol, Hepsiburada, n11, Pazarama, Trendruum, İdefix)
 */

import { calcShippingCost as calcTrendyolShipping } from "@/lib/trendyol-cargo";
import { calcShippingCost as calcHepsiburadaShipping } from "@/lib/hepsiburada-cargo";
import { calcN11ShippingCost } from "@/lib/n11-cargo";
import { calcPazaramaShippingCost } from "@/lib/pazarama-cargo";
import { calcTrendruumShippingCost } from "@/lib/trendruum-cargo";
import { calcIdefixShippingCost } from "@/lib/idefix-cargo";

export const KDV_RATE = 0.20;

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
  advertisingRate: 0,
  returnRate: 12,
  fixedCostPerOrder: 33.33,
  organicSalesMode: true,
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

/** Pazaryeri için fiyat dökümü hesaplama */
export function calculateBreakdown(
  id: MarketplaceId,
  P: number,
  weightGrams: number,
  quantity: number,
  productionCost: number,
  settings: BaseSettings
): PriceBreakdown {
  const purchasePriceIncVat = productionCost;
  const purchasePriceExVat = purchasePriceIncVat / (1 + KDV_RATE);
  const purchaseVat = purchasePriceIncVat - purchasePriceExVat;

  const packagingCost = settings.packagingCost;
  const packagingCostExVat = packagingCost / (1 + KDV_RATE);
  const packagingVat = packagingCost - packagingCostExVat;

  const platformFeeIncVat = settings.useExpressPlatformFee ? settings.platformFeeExpress : settings.platformFeeBase;
  const platformFeeExVat = platformFeeIncVat / (1 + KDV_RATE);
  const platformVat = platformFeeIncVat - platformFeeExVat;

  const isOrganic = settings.organicSalesMode || (settings.advertisingRate === 0);
  const adRate = isOrganic ? 0 : (settings.advertisingRate || 0) / 100;
  const shippingIncVat = calcPlatformShipping(id, weightGrams, P, settings.fastShipping, settings.cargoCompany);
  const shippingExVat = shippingIncVat / (1 + KDV_RATE);
  const shippingVat = shippingIncVat - shippingExVat;

  const returnCost = (purchasePriceExVat + shippingIncVat + packagingCost) * (settings.returnRate / 100);

  const commission = P * (settings.commissionRate / 100);
  const commissionVat = (commission * KDV_RATE) / (1 + KDV_RATE);

  const paymentTerm = P * (settings.paymentTermFee / 100);
  const paymentTermVat = (paymentTerm * KDV_RATE) / (1 + KDV_RATE);

  const advertising = P * adRate;
  const advertisingVat = (advertising * KDV_RATE) / (1 + KDV_RATE);

  const fixedCost = settings.fixedCostPerOrder;

  const totalExpenses =
    purchasePriceIncVat +
    packagingCost +
    shippingIncVat +
    platformFeeIncVat +
    commission +
    paymentTerm +
    advertising +
    returnCost +
    fixedCost;

  const netProfit = P - totalExpenses;

  // KDV mükellefi hesabı
  const vatCollected = (P * KDV_RATE) / (1 + KDV_RATE);
  const vatPaidInputs =
    purchaseVat + packagingVat + shippingVat + platformVat + commissionVat + paymentTermVat + advertisingVat;
  const vatPayable = Math.max(0, vatCollected - vatPaidInputs);
  const netProfitAfterVat = netProfit - vatPayable;
  const netMarginAfterVat = P > 0 ? (netProfitAfterVat / P) * 100 : 0;

  // Barem kontrolü
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
    platformFee: platformFeeIncVat,
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
  const purchasePriceExVat = productionCost / (1 + KDV_RATE);
  const packagingCostExVat = settings.packagingCost / (1 + KDV_RATE);
  const platformFeeIncVat = settings.useExpressPlatformFee ? settings.platformFeeExpress : settings.platformFeeBase;
  const platformFeeExVat = platformFeeIncVat / (1 + KDV_RATE);
  const isOrganic = settings.organicSalesMode || (settings.advertisingRate === 0);
  const adRate = isOrganic ? 0 : (settings.advertisingRate || 0) / 100;
  const totalCutRate = (settings.commissionRate + settings.paymentTermFee) / 100 + adRate;
  const m = settings.profitMargin / 100;

  const calcExactPriceForShipping = (shippingIncVat: number) => {
    const shippingExVat = shippingIncVat / (1 + KDV_RATE);
    const returnCost = (purchasePriceExVat + shippingIncVat + settings.packagingCost) * (settings.returnRate / 100);
    const totalBaseExpensesExVat =
      purchasePriceExVat + packagingCostExVat + shippingExVat + platformFeeExVat + settings.fixedCostPerOrder + returnCost;
    const denom = (5 / 6) * (1 - totalCutRate) - m;
    if (denom <= 0) return Infinity;
    return totalBaseExpensesExVat / denom;
  };

  let recPrice = 200;

  if (id === "trendyol") {
    const sh199 = calcPlatformShipping(id, weightGrams, 199, settings.fastShipping, settings.cargoCompany);
    const p1 = calcExactPriceForShipping(sh199);
    const sh250 = calcPlatformShipping(id, weightGrams, 250, settings.fastShipping, settings.cargoCompany);
    const p2 = calcExactPriceForShipping(sh250);
    const sh350 = calcPlatformShipping(id, weightGrams, 350, settings.fastShipping, settings.cargoCompany);
    const p3 = calcExactPriceForShipping(sh350);

    if (p1 <= 199) recPrice = Math.ceil(p1);
    else if (p2 >= 200 && p2 < 350) recPrice = Math.ceil(p2);
    else recPrice = Math.ceil(p3);

    if (recPrice > 199 && recPrice <= 230) {
      const r199 = calculateBreakdown(id, 199, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, recPrice, weightGrams, quantity, productionCost, settings);
      if (r199.netProfitAfterVat > rRec.netProfitAfterVat) recPrice = 199;
    }
  } else if (id === "hepsiburada") {
    const sh199 = calcPlatformShipping(id, weightGrams, 199, settings.fastShipping);
    const p1 = calcExactPriceForShipping(sh199);
    const sh300 = calcPlatformShipping(id, weightGrams, 300, settings.fastShipping);
    const p2 = calcExactPriceForShipping(sh300);
    const sh450 = calcPlatformShipping(id, weightGrams, 450, settings.fastShipping);
    const p3 = calcExactPriceForShipping(sh450);

    if (p1 <= 200) recPrice = Math.ceil(p1);
    else if (p2 > 200 && p2 < 400) recPrice = Math.ceil(p2);
    else recPrice = Math.ceil(p3);

    if (recPrice > 199 && recPrice <= 230) {
      const r199 = calculateBreakdown(id, 199.90, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, recPrice, weightGrams, quantity, productionCost, settings);
      if (r199.netProfitAfterVat > rRec.netProfitAfterVat) recPrice = 199.90;
    } else if (recPrice >= 400 && recPrice <= 430) {
      const r399 = calculateBreakdown(id, 399.90, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, recPrice, weightGrams, quantity, productionCost, settings);
      if (r399.netProfitAfterVat > rRec.netProfitAfterVat) recPrice = 399.90;
    }
  } else if (id === "n11" || id === "pazarama" || id === "idefix") {
    const sh149 = calcPlatformShipping(id, weightGrams, 149, settings.fastShipping, settings.cargoCompany);
    const p1 = calcExactPriceForShipping(sh149);
    const sh200 = calcPlatformShipping(id, weightGrams, 200, settings.fastShipping, settings.cargoCompany);
    const p2 = calcExactPriceForShipping(sh200);
    const sh300 = calcPlatformShipping(id, weightGrams, 300, settings.fastShipping, settings.cargoCompany);
    const p3 = calcExactPriceForShipping(sh300);

    if (p1 <= 149) recPrice = Math.ceil(p1);
    else if (p2 >= 150 && p2 < 300) recPrice = Math.ceil(p2);
    else recPrice = Math.ceil(p3);

    if (recPrice > 149 && recPrice <= 180) {
      const r149 = calculateBreakdown(id, 149, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, recPrice, weightGrams, quantity, productionCost, settings);
      if (r149.netProfitAfterVat > rRec.netProfitAfterVat) recPrice = 149;
    }
  } else if (id === "trendruum") {
    const sh250 = calcPlatformShipping(id, weightGrams, 250, settings.fastShipping, settings.cargoCompany);
    const p1 = calcExactPriceForShipping(sh250);
    const sh350 = calcPlatformShipping(id, weightGrams, 350, settings.fastShipping, settings.cargoCompany);
    const p2 = calcExactPriceForShipping(sh350);

    if (p1 < 350) recPrice = Math.ceil(p1);
    else recPrice = Math.ceil(p2);

    if (recPrice > 349 && recPrice <= 380) {
      const r349 = calculateBreakdown(id, 349, weightGrams, quantity, productionCost, settings);
      const rRec = calculateBreakdown(id, recPrice, weightGrams, quantity, productionCost, settings);
      if (r349.netProfitAfterVat > rRec.netProfitAfterVat) recPrice = 349;
    }
  }

  return recPrice;
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

  // Üretim Maliyeti
  const costPerGram =
    (settings.filamentPricePerKg / 1000) * (1 + settings.wastePercentage / 100) +
    settings.electricityCostPerGram +
    settings.depreciationCostPerGram;
  const baseProduction = product.weightGrams * costPerGram * (product.quantity || 1);
  const extras =
    (product.isCandleholder ? settings.candleholderCostPerUnit : 0) +
    (product.isKeychain ? settings.keychainCostPerUnit : 0) +
    (product.isSoapdish ? settings.soapdishCostPerUnit : 0);
  const productionCost = baseProduction + extras;

  // Önerilen Satış Fiyatı
  const recommendedPrice = calculateRecommendedPrice(
    meta.id,
    product.weightGrams,
    product.quantity || 1,
    productionCost,
    settings
  );

  const recommendedBreakdown = calculateBreakdown(
    meta.id,
    recommendedPrice,
    product.weightGrams,
    product.quantity || 1,
    productionCost,
    settings
  );

  const customBreakdown =
    customSimulatedPrice && customSimulatedPrice > 0
      ? calculateBreakdown(
          meta.id,
          customSimulatedPrice,
          product.weightGrams,
          product.quantity || 1,
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
