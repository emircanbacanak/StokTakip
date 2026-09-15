/**
 * Hepsiburada Kargo Servisi
 * 
 * Barem Kampanyalı Sabit Fiyatlar (KDV HARİÇ):
 * - 0 - 200 TL arası siparişlerde: 43,99 TL + KDV (%20 KDV ile 52,79 TL)
 * - 200 - 399,99 TL arası siparişlerde: 75,99 TL + KDV (%20 KDV ile 91,19 TL)
 * 
 * Koşullar:
 * - 0 ya da 1 gün terminli ürünlerde geçerlidir.
 * - Son 7 günlük teslim performansı en az %90 olmalıdır.
 * - Herhangi bir desi sınırı yoktur (barem içinde desi fark etmeksizin sabit fiyat uygulanır).
 * - 400 TL ve üzeri ya da termin > 1 gün durumunda desi bazlı standart tarife uygulanır.
 */

// ─── VERİ MODELLERİ ──────────────────────────────────────────────────────────

export type CargoCompany =
  | "HepsiJET"
  | "Aras"
  | "Sürat"
  | "PTT"
  | "Yurtiçi"
  | "KolayGelsin";

export const HEPSIBURADA_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ HepsiJET / Otomatik" },
  { id: "HepsiJET", label: "HepsiJET" },
  { id: "Aras", label: "Aras Kargo" },
  { id: "Sürat", label: "Sürat Kargo" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "Yurtiçi", label: "Yurtiçi Kargo" },
  { id: "KolayGelsin", label: "Kolay Gelsin" },
];

export type CargoTable = 1 | 2; // 1 = Kampanyalı (termin ≤1 gün), 2 = Standart (termin >1 gün)
export type BaremBand = "under200" | "200to400";
export type PricingMode = "barem" | "standart";

export interface CargoInput {
  satisFiyati: number;   // TL
  desi: number;          // hesaplanmış efektif desi
  kargoFirmasi?: CargoCompany;
  terminSuresiGun: number;
}

export interface CargoResult {
  mode: PricingMode;
  table: CargoTable | null;
  baremBand: BaremBand | null;
  exVatPrice: number;             // KDV hariç ham fiyat (TL)
  incVatPrice: number;            // KDV dahil fiyat (TL)
  company: CargoCompany | null;
}

export interface OptimizationSuggestion {
  shouldOptimize: boolean;
  suggestedPrice: number;        // 199.90 veya 399.90
  currentNetProfit: number;
  optimizedNetProfit: number;
  profitIncrease: number;
  message: string;
}

// ─── HEPSİBURADA KAMPANYALI SABİT BAREM FİYATLARI (KDV HARİÇ, TL) ────────────
export const HEPSIBURADA_BAREM = {
  under200: 43.99,    // 0 - 200 TL arası: 43.99 TL + KDV
  "200to400": 75.99,  // 200 - 399.99 TL arası: 75.99 TL + KDV
};

// ─── STANDART KARGO TABLOSU (KDV HARİÇ, TL) ──────────────────────────────────
// 400 TL ve üzeri ya da termin süresi > 1 gün olan gönderiler için desi bazlı tarife
export const STANDART_CARGO_TABLE: Record<number, number> = {
  0: 75.00,
  1: 75.00,
  2: 82.50,
  3: 92.00,
  4: 100.00,
  5: 108.00,
  6: 118.00,
  7: 125.00,
  8: 134.00,
  9: 142.00,
  10: 150.00,
  15: 185.00,
  20: 230.00,
  25: 280.00,
  30: 325.00,
  50: 530.00,
};

/** Desi için standart kargo fiyatı (KDV hariç) */
export function getStandartCargoExVat(desi: number): number {
  const keys = Object.keys(STANDART_CARGO_TABLE).map(Number).sort((a, b) => a - b);
  const key = keys.find(k => k >= desi) ?? keys[keys.length - 1];
  return STANDART_CARGO_TABLE[key];
}

// ─── ANA SERVİS FONKSİYONLARI ────────────────────────────────────────────────

/**
 * Hepsiburada kargo maliyeti hesapla
 */
export function calcCargoPrice(input: CargoInput): CargoResult {
  const { satisFiyati, desi, kargoFirmasi = "HepsiJET", terminSuresiGun } = input;

  // Koşul: 0 ya da 1 gün terminli ve 400 TL altı siparişlerde kampanyalı sabit fiyat
  const isBaremEligible = terminSuresiGun <= 1 && satisFiyati < 400;

  if (!isBaremEligible) {
    const exVat = getStandartCargoExVat(desi);
    return {
      mode: "standart",
      table: null,
      baremBand: null,
      exVatPrice: exVat,
      incVatPrice: exVat * 1.20,
      company: kargoFirmasi,
    };
  }

  // Barem Bandı: 0-200 TL -> 43.99 TL, 200-399.99 TL -> 75.99 TL
  const band: BaremBand = satisFiyati <= 200 ? "under200" : "200to400";
  const exVat = HEPSIBURADA_BAREM[band];

  return {
    mode: "barem",
    table: 1,
    baremBand: band,
    exVatPrice: exVat,
    incVatPrice: exVat * 1.20, // %20 KDV
    company: kargoFirmasi,
  };
}

/**
 * Mevcut hesaplayıcıyla uyumlu fonksiyon:
 * weightGrams + price + fastShipping → KDV dahil kargo maliyeti (TL)
 */
export function calcShippingCost(
  weightGrams: number,
  satisFiyati: number,
  fastShipping: boolean,
  cargoCompany?: string
): number {
  const desi = Math.max(1, Math.ceil(weightGrams / 1000));
  // fastShipping = true ise termin <= 1 gün kabul edilir (kampanyalı sabit fiyat)
  const terminSuresiGun = fastShipping ? 1 : 2;
  const kargoFirmasi = cargoCompany && cargoCompany !== "auto" ? (cargoCompany as CargoCompany) : undefined;
  const res = calcCargoPrice({ satisFiyati, desi, terminSuresiGun, kargoFirmasi });
  return res.incVatPrice;
}

export function getCheapestBaremCompany(
  satisFiyati: number,
  terminSuresiGun: number
): { company: CargoCompany; exVat: number; incVat: number } {
  const res = calcCargoPrice({ satisFiyati, desi: 1, terminSuresiGun });
  return {
    company: res.company || "HepsiJET",
    exVat: res.exVatPrice,
    incVat: res.incVatPrice,
  };
}

// ─── FİYAT OPTİMİZASYON ÖNERİSİ ──────────────────────────────────────────────

export interface NetProfitInput {
  satisFiyati: number;
  productionCost: number;
  weightGrams: number;
  packagingCost: number;
  platformFee: number;    // KDV dahil
  fixedCost: number;
  returnRate: number;     // % (5 gibi)
  commissionRate: number; // % (15 gibi)
  paymentTermFee: number; // % (3 gibi)
  advertisingRate: number;// % (8 gibi, organik ise 0)
  fastShipping: boolean;
  selectedCompany?: string;
}

function calcNetProfit(input: NetProfitInput): number {
  const {
    satisFiyati, productionCost, weightGrams, packagingCost,
    platformFee, fixedCost, returnRate, commissionRate,
    paymentTermFee, advertisingRate, fastShipping,
  } = input;

  const shipping = calcShippingCost(weightGrams, satisFiyati, fastShipping);
  const returnCost = (productionCost + shipping + packagingCost) * (returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
  const commission = satisFiyati * (commissionRate / 100);
  const termFee = satisFiyati * (paymentTermFee / 100);
  const adCost = satisFiyati * (advertisingRate / 100);
  const totalExpenses = baseCost + commission + termFee + adCost;
  return satisFiyati - totalExpenses;
}

/**
 * 200 - 230 TL arasındaki fiyatlar için 199.90 TL simülasyonu
 * (Kargo 91.19 TL'den 52.79 TL'ye düşerek 38.40 TL kâr avantajı sağlar)
 */
export function checkPriceOptimization(input: NetProfitInput): OptimizationSuggestion {
  const { satisFiyati } = input;
  const OPTIMIZED_PRICE = 199.90;

  // 200 - 230 TL arasında kargo baremi sıçraması kontrolü
  const inRange = satisFiyati >= 200 && satisFiyati <= 230;

  if (!inRange) {
    return {
      shouldOptimize: false,
      suggestedPrice: OPTIMIZED_PRICE,
      currentNetProfit: calcNetProfit(input),
      optimizedNetProfit: calcNetProfit({ ...input, satisFiyati: OPTIMIZED_PRICE }),
      profitIncrease: 0,
      message: "",
    };
  }

  const currentProfit = calcNetProfit(input);
  const optimizedProfit = calcNetProfit({ ...input, satisFiyati: OPTIMIZED_PRICE });
  const profitIncrease = optimizedProfit - currentProfit;

  if (profitIncrease > 0) {
    return {
      shouldOptimize: true,
      suggestedPrice: OPTIMIZED_PRICE,
      currentNetProfit: currentProfit,
      optimizedNetProfit: optimizedProfit,
      profitIncrease,
      message: `⚡ Hepsiburada Barem Uyarısı: Fiyatı ₺199.90 yaparsanız kargo ₺91.19 yerine ₺52.79 baremine düşer ve net kârınız ₺${profitIncrease.toFixed(2)} artar! (₺${currentProfit.toFixed(2)} → ₺${optimizedProfit.toFixed(2)})`,
    };
  }

  return {
    shouldOptimize: false,
    suggestedPrice: OPTIMIZED_PRICE,
    currentNetProfit: currentProfit,
    optimizedNetProfit: optimizedProfit,
    profitIncrease,
    message: "",
  };
}
