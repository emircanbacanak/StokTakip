/**
 * Trendruum Kargo Fiyatları ve Barem Sistemi
 * 
 * 01.07.2026 Tarihi İtibari ile KDV HARİÇ Fiyatlar
 * Kural: 350 TL altında satışlarda 50 TL kargo indirimi uygulanıyor.
 */

export const KDV_RATE = 0.20;

export const TRENDRUUM_CARGO_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ En Ucuz Kargo (Otomatik)" },
  { id: "Hepsijet", label: "HepsiJET" },
  { id: "ArasSehirici", label: "Aras Kargo (Şehiriçi)" },
  { id: "ArasSehirdisi", label: "Aras Kargo (Şehirdışı)" },
  { id: "Surat", label: "Sürat Kargo" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "Yurtici", label: "Yurtiçi Kargo" },
  { id: "KolayGelsin", label: "Kolay Gelsin" },
];

export const TRENDRUUM_DESI_TABLE: Record<number, Record<string, number>> = {
  0:  { "Hepsijet": 91,  "ArasSehirici": 77,  "ArasSehirdisi": 98,  "Surat": 113, "PTT": 136, "Yurtici": 166, "KolayGelsin": 125 },
  1:  { "Hepsijet": 91,  "ArasSehirici": 77,  "ArasSehirdisi": 98,  "Surat": 113, "PTT": 145, "Yurtici": 166, "KolayGelsin": 125 },
  2:  { "Hepsijet": 91,  "ArasSehirici": 83,  "ArasSehirdisi": 109, "Surat": 113, "PTT": 152, "Yurtici": 173, "KolayGelsin": 125 },
  3:  { "Hepsijet": 91,  "ArasSehirici": 90,  "ArasSehirdisi": 122, "Surat": 120, "PTT": 170, "Yurtici": 184, "KolayGelsin": 125 },
  4:  { "Hepsijet": 136, "ArasSehirici": 98,  "ArasSehirdisi": 135, "Surat": 123, "PTT": 199, "Yurtici": 200, "KolayGelsin": 125 },
  5:  { "Hepsijet": 136, "ArasSehirici": 106, "ArasSehirdisi": 149, "Surat": 133, "PTT": 213, "Yurtici": 207, "KolayGelsin": 160 },
  6:  { "Hepsijet": 136, "ArasSehirici": 131, "ArasSehirdisi": 189, "Surat": 151, "PTT": 223, "Yurtici": 236, "KolayGelsin": 160 },
  7:  { "Hepsijet": 136, "ArasSehirici": 131, "ArasSehirdisi": 189, "Surat": 155, "PTT": 242, "Yurtici": 247, "KolayGelsin": 160 },
  8:  { "Hepsijet": 136, "ArasSehirici": 131, "ArasSehirdisi": 189, "Surat": 167, "PTT": 259, "Yurtici": 261, "KolayGelsin": 160 },
  9:  { "Hepsijet": 136, "ArasSehirici": 131, "ArasSehirdisi": 189, "Surat": 181, "PTT": 269, "Yurtici": 274, "KolayGelsin": 160 },
  10: { "Hepsijet": 136, "ArasSehirici": 131, "ArasSehirdisi": 189, "Surat": 189, "PTT": 283, "Yurtici": 299, "KolayGelsin": 207 },
};

export function gramsToDesi(weightGrams: number): number {
  if (weightGrams <= 500) return 1;
  if (weightGrams <= 1000) return 1;
  if (weightGrams <= 2000) return 2;
  if (weightGrams <= 3000) return 3;
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

export function getTrendruumCargoExVat(desi: number, company?: string): number {
  const roundedDesi = Math.max(0, Math.min(10, Math.ceil(desi)));
  const row = TRENDRUUM_DESI_TABLE[roundedDesi] || TRENDRUUM_DESI_TABLE[10];

  if (company && company !== "auto" && row[company] !== undefined) {
    let base = row[company];
    if (desi > 10) base += (desi - 10) * 16;
    return base;
  }

  let min = Infinity;
  for (const c of Object.keys(row)) {
    if (row[c] < min) min = row[c];
  }
  if (desi > 10) min += (desi - 10) * 16;
  return min;
}

export function calcTrendruumShippingCost(
  weightGrams: number,
  price: number,
  fastShipping: boolean = true,
  company?: string
): number {
  const desi = gramsToDesi(weightGrams);

  // 350 TL altı: Barem desteği içindedir (fiyata göre hesaplanır, desi önemsizdir)
  if (price < 350) {
    const baseExVat = getTrendruumCargoExVat(1, company);
    const finalExVat = Math.max(0, baseExVat - 50);
    return Math.round(finalExVat * (1 + KDV_RATE) * 100) / 100;
  }

  // 350 TL ve üzeri: Barem desteği dışındadır -> Standart desi tarifesi
  const baseExVat = getTrendruumCargoExVat(desi, company);
  return Math.round(baseExVat * (1 + KDV_RATE) * 100) / 100;
}
