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
  commissionRate: 16,
  paymentTermFee: 3,
  packagingCost: 15,
  platformFeeBase: 10.99,
  fastShipping: true,
  advertisingRate: 8,
  returnRate: 5,
  fixedCostPerOrder: 10,
  organicSalesMode: true,
  profitMargin: 20,
  candleholderCostPerUnit: 0,
  keychainCostPerUnit: 2,
  soapdishCostPerUnit: 0,
};

function gramsToDesi(grams: number): number {
  return Math.max(1, Math.ceil(grams / 1000));
}

export interface TrendyolPricingResult {
  recommendedPrice: number;
  targetPrice: number;
  exactTargetPrice: number;
  breakEvenPrice: number;
}

/**
 * Belirli bir kargo maliyeti için kesin matematiksel fiyatı hesaplar.
 * Formül: P = (BaseCost - FixedVatInputs) / [ (5/6)*(1 - totalCutRate) - m ]
 */
function calcPriceForShipping(
  shipping: number,
  productionCost: number,
  weightGrams: number,
  settings: TrendyolPricingSettings,
  targetMargin: number
): number {
  const platformFee = settings.platformFeeBase * 1.20; // KDV hariç girildiği için * 1.20 ile KDV dahil tutar bulunur
  const packagingCost = settings.packagingCost;
  const fixedCost = settings.fixedCostPerOrder;
  const returnCost = (productionCost + shipping + packagingCost) * (settings.returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;

  const adRate = settings.organicSalesMode ? 0 : settings.advertisingRate / 100;
  const totalCutRate = (settings.commissionRate + settings.paymentTermFee) / 100 + adRate;

  const wastedGrams = weightGrams * (1 + settings.wastePercentage / 100);
  const filamentCost = (wastedGrams / 1000) * settings.filamentPricePerKg;
  const electricityCost = wastedGrams * settings.electricityCostPerGram;

  const VAT_RATE = 0.20;
  const fixedVatInputs = (shipping + platformFee + filamentCost + electricityCost + packagingCost) * VAT_RATE / (1 + VAT_RATE);

  const denominator = (5 / 6) * (1 - totalCutRate) - targetMargin;
  if (denominator <= 0) return Infinity;

  return (baseCost - fixedVatInputs) / denominator;
}

export function calcTrendyolPrice(
  productionCost: number,
  weightGrams: number,
  settings: TrendyolPricingSettings
): TrendyolPricingResult {
  const desi = gramsToDesi(weightGrams);
  const m = settings.profitMargin / 100;

  // 1) Barem Altı (< 200 TL) Hedef ve Başabaş Fiyatı
  let priceUnder200 = Infinity;
  let breakEvenUnder200 = Infinity;
  if (desi < 10) {
    const shippingUnder200 = calcShippingCost(weightGrams, 199, settings.fastShipping);
    const p1 = calcPriceForShipping(shippingUnder200, productionCost, weightGrams, settings, m);
    if (p1 <= 199) priceUnder200 = p1;
    const be1 = calcPriceForShipping(shippingUnder200, productionCost, weightGrams, settings, 0);
    if (be1 <= 199) breakEvenUnder200 = be1;
  }

  // 2) Barem Üstü (200-349 TL) Hedef ve Başabaş Fiyatı
  let price200to350 = Infinity;
  let breakEven200to350 = Infinity;
  if (desi < 10) {
    const shipping200to350 = calcShippingCost(weightGrams, 250, settings.fastShipping);
    const p2 = calcPriceForShipping(shipping200to350, productionCost, weightGrams, settings, m);
    if (p2 >= 200 && p2 < 350) price200to350 = p2;
    const be2 = calcPriceForShipping(shipping200to350, productionCost, weightGrams, settings, 0);
    if (be2 >= 200 && be2 < 350) breakEven200to350 = be2;
  }

  // 3) Standart Kargo (>= 350 TL veya desi >= 10)
  const shippingStandart = calcShippingCost(weightGrams, 350, settings.fastShipping);
  const p3 = calcPriceForShipping(shippingStandart, productionCost, weightGrams, settings, m);
  const be3 = calcPriceForShipping(shippingStandart, productionCost, weightGrams, settings, 0);

  // En uygun hedef fiyat seçimi
  let exactTargetPrice = p3;
  if (isFinite(priceUnder200)) {
    exactTargetPrice = priceUnder200;
  } else if (isFinite(price200to350)) {
    exactTargetPrice = price200to350;
  }

  let breakEvenPriceVal = be3;
  if (isFinite(breakEvenUnder200)) {
    breakEvenPriceVal = breakEvenUnder200;
  } else if (isFinite(breakEven200to350)) {
    breakEvenPriceVal = breakEven200to350;
  }

  let targetPriceRounded = Math.ceil(exactTargetPrice);
  let recommendedPrice = targetPriceRounded;

  // Barem Optimizasyonu: 199 TL tavanı önerisi
  if (desi < 10 && targetPriceRounded > 199) {
    const bd199 = calcTrendyolBreakdownAtPrice(199, productionCost, weightGrams, settings);
    const bdTarget = calcTrendyolBreakdownAtPrice(targetPriceRounded, productionCost, weightGrams, settings);
    if (bd199.netProfitAfterVat > bdTarget.netProfitAfterVat) {
      recommendedPrice = 199;
    }
  }

  return {
    recommendedPrice,
    targetPrice: targetPriceRounded,
    exactTargetPrice,
    breakEvenPrice: Math.ceil(breakEvenPriceVal),
  };
}

/**
 * Verilen sabit satış fiyatı için Trendyol'a özgü detaylı maliyet ve KDV dökümünü hesaplar.
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
  // KDV Hesabı (KDV Mükellefi)
  vatCollected: number;
  vatPaidOnInputs: number;
  vatPaidShipping: number;
  vatPaidPlatform: number;
  vatPaidCommission: number;
  vatPaidPaymentTerm: number;
  vatPaidAdvertising: number;
  vatPaidFilament: number;
  vatPaidElectricity: number;
  vatPaidPackaging: number;
  vatPayable: number;
  netProfitAfterVat: number;
  netMarginAfterVat: number;
} {
  const platformFee = settings.platformFeeBase * 1.20; // KDV hariç girildiği için * 1.20 ile KDV dahil tutar bulunur
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

  // KDV hesabı (%20 KDV)
  const wastedGrams = weightGrams * (1 + settings.wastePercentage / 100);
  const filamentCost = (wastedGrams / 1000) * settings.filamentPricePerKg;
  const electricityCost = wastedGrams * settings.electricityCostPerGram;

  const VAT_RATE = 0.20;
  const vatCollected = (price * VAT_RATE) / (1 + VAT_RATE);

  const vatPaidShipping = (shipping * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidPlatform = (platformFee * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidCommission = (commission * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidPaymentTerm = (paymentTermFee * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidAdvertising = (advertisingCost * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidFilament = (filamentCost * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidElectricity = (electricityCost * VAT_RATE) / (1 + VAT_RATE);
  const vatPaidPackaging = (packagingCost * VAT_RATE) / (1 + VAT_RATE);

  const vatPaidOnInputs =
    vatPaidShipping +
    vatPaidPlatform +
    vatPaidCommission +
    vatPaidPaymentTerm +
    vatPaidAdvertising +
    vatPaidFilament +
    vatPaidElectricity +
    vatPaidPackaging;

  const vatPayable = Math.max(0, vatCollected - vatPaidOnInputs);
  const netProfitAfterVat = netProfit - vatPayable;
  const netMarginAfterVat = price > 0 ? (netProfitAfterVat / price) * 100 : 0;

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
    vatCollected,
    vatPaidOnInputs,
    vatPaidShipping,
    vatPaidPlatform,
    vatPaidCommission,
    vatPaidPaymentTerm,
    vatPaidAdvertising,
    vatPaidFilament,
    vatPaidElectricity,
    vatPaidPackaging,
    vatPayable,
    netProfitAfterVat,
    netMarginAfterVat,
  };
}

