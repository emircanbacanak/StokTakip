/**
 * İdefix Kargo Fiyatları ve Barem Destek Sistemi
 * 
 * 11/09/2026 Tarihinden İtibaren Geçerli İdefix Anlaşmalı KDV Hariç Kargo Fiyat Listesi
 * (Posta hizmet bedeli %2.35 dahil, KDV %20 hariçtir)
 * 
 * Barem Destek Sistemi:
 * - 150 TL Altı Sipariş: İdefix 50 TL barem desteği verir (KDV dahil fiyattan 50 TL düşer).
 * - 150 TL – 300 TL Arası Sipariş: İdefix 20 TL barem desteği verir (KDV dahil fiyattan 20 TL düşer).
 * - 300 TL Üzeri Sipariş: Barem desteği uygulanmaz, normal paket fiyatı yansıtılır.
 */

export const KDV_RATE = 0.20;

export const IDEFIX_CARGO_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ En Ucuz Kargo (Otomatik)" },
  { id: "Hepsijet", label: "HepsiJET" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "Aras", label: "Aras Kargo" },
  { id: "Surat", label: "Sürat Kargo" },
  { id: "DHL", label: "DHL eCommerce" },
  { id: "Yurtici", label: "Yurtiçi Kargo" },
];

export const IDEFIX_DESI_TABLE: Record<number, Record<string, number>> = {
  0:  { "Hepsijet": 86.33,  "PTT": 91.67,  "Aras": 93.61,  "Surat": 101.67, "DHL": 105.41, "Yurtici": 120.61 },
  1:  { "Hepsijet": 86.33,  "PTT": 91.67,  "Aras": 93.61,  "Surat": 101.67, "DHL": 105.41, "Yurtici": 120.61 },
  2:  { "Hepsijet": 86.33,  "PTT": 91.67,  "Aras": 103.74, "Surat": 104.68, "DHL": 105.41, "Yurtici": 123.67 },
  3:  { "Hepsijet": 96.21,  "PTT": 114.13, "Aras": 116.00, "Surat": 116.96, "DHL": 115.43, "Yurtici": 130.20 },
  4:  { "Hepsijet": 103.58, "PTT": 117.33, "Aras": 128.78, "Surat": 125.37, "DHL": 128.76, "Yurtici": 135.10 },
  5:  { "Hepsijet": 112.21, "PTT": 124.21, "Aras": 141.18, "Surat": 133.28, "DHL": 140.21, "Yurtici": 154.23 },
  6:  { "Hepsijet": 120.84, "PTT": 132.46, "Aras": 150.98, "Surat": 145.52, "DHL": 153.22, "Yurtici": 163.83 },
  7:  { "Hepsijet": 124.28, "PTT": 140.71, "Aras": 160.80, "Surat": 155.38, "DHL": 164.54, "Yurtici": 183.69 },
  8:  { "Hepsijet": 129.48, "PTT": 149.42, "Aras": 170.61, "Surat": 165.19, "DHL": 175.78, "Yurtici": 187.93 },
  9:  { "Hepsijet": 138.11, "PTT": 163.17, "Aras": 180.43, "Surat": 175.02, "DHL": 185.94, "Yurtici": 190.70 },
  10: { "Hepsijet": 153.65, "PTT": 184.25, "Aras": 190.22, "Surat": 184.86, "DHL": 195.38, "Yurtici": 193.57 },
};

export function gramsToDesi(weightGrams: number): number {
  if (weightGrams <= 500) return 1;
  if (weightGrams <= 1000) return 1;
  if (weightGrams <= 2000) return 2;
  if (weightGrams <= 3000) return 3;
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

export function getIdefixCargoExVat(desi: number, company?: string): number {
  const roundedDesi = Math.max(0, Math.min(10, Math.ceil(desi)));
  const row = IDEFIX_DESI_TABLE[roundedDesi] || IDEFIX_DESI_TABLE[10];

  if (company && company !== "auto" && row[company] !== undefined) {
    let base = row[company];
    if (desi > 10) base += (desi - 10) * 15;
    return base;
  }

  let min = Infinity;
  for (const c of Object.keys(row)) {
    if (row[c] < min) min = row[c];
  }
  if (desi > 10) min += (desi - 10) * 15;
  return min;
}

export function calcIdefixShippingCost(
  weightGrams: number,
  price: number,
  fastShipping: boolean = true,
  company?: string
): number {
  const desi = gramsToDesi(weightGrams);

  // 300 TL altı: Barem desteği içindedir (fiyata göre hesaplanır, desi önemsizdir)
  if (price < 300) {
    // Barem içindeyken paket baz kabul edilir (1 desi taban)
    const baseExVat = getIdefixCargoExVat(1, company);
    const baseIncVat = baseExVat * (1 + KDV_RATE);
    const support = price < 150 ? 50 : 20;
    const finalIncVat = Math.max(0, baseIncVat - support);
    return Math.round(finalIncVat * 100) / 100;
  }

  // 300 TL ve üzeri: Barem desteği dışındadır -> Kaç desiyse o desi tarifesi geçerli
  const baseExVat = getIdefixCargoExVat(desi, company);
  return Math.round(baseExVat * (1 + KDV_RATE) * 100) / 100;
}
