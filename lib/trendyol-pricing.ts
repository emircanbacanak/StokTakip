/**
 * Ortak Trendyol satış fiyatı hesaplama yardımcıları.
 */
import { calcShippingCost } from "./trendyol-cargo";

export interface TrendyolPricingSettings {
  filamentPricePerKg: number;
  electricityCostPerGram: number;
  depreciationCostPerGram: number;
  wastePercentage: number;
  commissionRate: number;
  paymentTermFee: number;
  packagingCost: number;
  platformFeeBase: number;
  fastShipping: boolean;
  advertisingRate: number;
  returnRate: number;
  fixedCostPerOrder: number;
  organicSalesMode: boolean;
  profitMargin: number;
  // Ekstra malzeme sabit ücretleri (ürün tipi başına)
  candleholderCostPerUnit?: number;
  keychainCostPerUnit?: number;
  soapdishCostPerUnit?: number;
}

export const DEFAULT_TRENDYOL_PRICING_SETTINGS: TrendyolPricingSettings = {
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
  profitMargin: 30,
  candleholderCostPerUnit: 0,
  keychainCostPerUnit: 2,
  soapdishCostPerUnit: 0,
};

function gramsToDesi(grams: number): number {
  return Math.max(1, Math.ceil(grams / 1000));
}

function calcProductionCost(weightGrams: number, settings: TrendyolPricingSettings): number {
  const wasted = weightGrams * (1 + settings.wastePercentage / 100);
  return (wasted / 1000) * settings.filamentPricePerKg
    + wasted * settings.electricityCostPerGram
    + wasted * settings.depreciationCostPerGram;
}

export interface TrendyolPricingResult {
  recommendedPrice: number;
  targetPrice: number;
  exactTargetPrice: number;
  breakEvenPrice: number;
}

export function calcTrendyolPrice(
  productionCost: number,
  weightGrams: number,
  settings: TrendyolPricingSettings
): TrendyolPricingResult {
  const platformFee = settings.platformFeeBase * 1.20;
  const packagingCost = settings.packagingCost;
  const fixedCost = settings.fixedCostPerOrder;
  const adRate = settings.organicSalesMode ? 0 : settings.advertisingRate / 100;
  const cutRateOnGross = (settings.commissionRate + settings.paymentTermFee) / 100; // brüt fiyat üzerinden
  const totalCutRate = cutRateOnGross + adRate;
  const m = settings.profitMargin / 100; // fiyat üzerinden hedef kâr oranı
  const denominator = 1 - totalCutRate - m;
  const desi = gramsToDesi(weightGrams);

  let priceUnder200 = Infinity;
  if (desi < 10) {
    const shipping = calcShippingCost(weightGrams, 199, settings.fastShipping);
    const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    const computed = baseCost / denominator;
    if (computed <= 199) priceUnder200 = computed;
  }

  let priceOver200 = 200;
  for (let i = 0; i < 20; i += 1) {
    const shipping = calcShippingCost(weightGrams, priceOver200, settings.fastShipping);
    const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    const nextPrice = baseCost / denominator;
    if (Math.abs(nextPrice - priceOver200) < 0.5) {
      priceOver200 = nextPrice;
      break;
    }
    priceOver200 = nextPrice;
  }

  const price = priceUnder200 <= priceOver200 ? priceUnder200 : priceOver200;
  let roundedPrice = Math.ceil(price / 5) * 5;

  for (let i = 0; i < 40; i += 1) {
    const shipping = calcShippingCost(weightGrams, roundedPrice, settings.fastShipping);
    const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    const totalExpenses = baseCost + roundedPrice * cutRateOnGross + roundedPrice * adRate;
    const margin = roundedPrice > 0 ? (roundedPrice - totalExpenses) / roundedPrice : 0;
    if (margin >= m - 0.001) break; // hedef marja ulaştık
    roundedPrice += 5;
  }

  if (desi < 10 && roundedPrice > 199) {
    const shipping199 = calcShippingCost(weightGrams, 199, settings.fastShipping);
    const returnCost199 = (productionCost + shipping199 + packagingCost) * (settings.returnRate / 100);
    const base199 = productionCost + shipping199 + packagingCost + platformFee + fixedCost + returnCost199;
    const total199 = base199 + 199 * cutRateOnGross + 199 * adRate;
    const profit199 = 199 - total199;
    const margin199 = 199 > 0 ? profit199 / 199 : 0;

    if (margin199 >= m) {
      roundedPrice = 199;
    } else {
      const shippingRounded = calcShippingCost(weightGrams, roundedPrice, settings.fastShipping);
      const returnCostRounded = (productionCost + shippingRounded + packagingCost) * (settings.returnRate / 100);
      const baseRounded = productionCost + shippingRounded + packagingCost + platformFee + fixedCost + returnCostRounded;
      const totalRounded = baseRounded + roundedPrice * cutRateOnGross + roundedPrice * adRate;
      const profitRounded = roundedPrice - totalRounded;
      if (profit199 > profitRounded) {
        roundedPrice = 199;
      }
    }
  }

  let breakEven = 150;
  for (let i = 0; i < 20; i += 1) {
    const shipping = calcShippingCost(weightGrams, breakEven, settings.fastShipping);
    const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
    const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
    const nextBe = baseCost / (1 - totalCutRate);
    if (Math.abs(nextBe - breakEven) < 0.5) {
      breakEven = nextBe;
      break;
    }
    breakEven = nextBe;
  }

  return {
    recommendedPrice: roundedPrice,
    targetPrice: Math.ceil(price / 5) * 5,
    exactTargetPrice: price,
    breakEvenPrice: Math.ceil(breakEven / 5) * 5,
  };
}

/**
 * Verilen sabit satış fiyatı için Trendyol'a özgü maliyet dökümünü hesaplar.
 */
export function calcTrendyolBreakdownAtPrice(
  price: number,
  productionCost: number,
  weightGrams: number,
  settings: TrendyolPricingSettings
): {
  shipping: number;
  packagingCost: number;
  platformFee: number;
  fixedCost: number;
  returnCost: number;
  baseCost: number;
  commission: number;
  paymentTermFee: number;
  advertisingCost: number;
  totalExpenses: number;
  netProfit: number;
  netMarginOnPrice: number;
} {
  const platformFee = settings.platformFeeBase * 1.20;
  const packagingCost = settings.packagingCost;
  const fixedCost = settings.fixedCostPerOrder;
  const adRate = settings.organicSalesMode ? 0 : settings.advertisingRate / 100;

  const shipping = calcShippingCost(weightGrams, price, settings.fastShipping);
  const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;

  const commission = price * (settings.commissionRate / 100);
  const paymentTermFee = price * (settings.paymentTermFee / 100);
  const advertisingCost = price * adRate;

  const totalExpenses = baseCost + commission + paymentTermFee + advertisingCost;
  const netProfit = price - totalExpenses;
  const netMarginOnPrice = price > 0 ? (netProfit / price) * 100 : 0;

  return {
    shipping,
    packagingCost,
    platformFee,
    fixedCost,
    returnCost,
    baseCost,
    commission,
    paymentTermFee,
    advertisingCost,
    totalExpenses,
    netProfit,
    netMarginOnPrice,
  };
}
