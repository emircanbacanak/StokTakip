// ─── AKILLI MODEL, BARKOD VE STOK KODU (SKU) ÜRETECİSİ ─────────────────────────

// Renk kısaltmaları haritası (SIY, BEY, TEN, vb.)
export const COLOR_CODE_MAP: Record<string, string> = {
  Siyah: "SIY",
  Beyaz: "BEY",
  Gri: "GRI",
  Antrasit: "ANT",
  Bej: "BEJ",
  Ten: "TEN",
  Mavi: "MAV",
  Kırmızı: "KIR",
  Sarı: "SAR",
  Yeşil: "YES",
  Kahverengi: "KAH",
  Pembe: "PEM",
  Mor: "MOR",
  Turuncu: "TUR",
  Turkuaz: "TRK",
  Ekru: "EKR",
  Haki: "HAK",
  Bordo: "BOR",
  Altın: "ALT",
  Gümüş: "GUM",
  Krem: "KRM",
  Lacivert: "LAC",
  "Çok Renkli": "CRK",
  Şeffaf: "SEF",
  Inox: "INX",
  Metalik: "MET",
};

// Koddan Türkçe renk ismine ters harita
export const CODE_TO_COLOR_MAP: Record<string, string> = Object.entries(COLOR_CODE_MAP).reduce(
  (acc, [name, code]) => {
    acc[code] = name;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Stok kodundaki (SKU) segmentlerden rengi çözer (Örn: JJT-CRK-20 -> "Çok Renkli")
 */
export function extractColorFromStockCode(stockCode: string): string | null {
  if (!stockCode) return null;
  const parts = stockCode.toUpperCase().split("-");
  for (const part of parts) {
    if (CODE_TO_COLOR_MAP[part]) {
      return CODE_TO_COLOR_MAP[part];
    }
  }
  return null;
}

/**
 * Renk isminden 3 harfli standart renk kodunu türetir (Örn: Siyah -> SIY, Beyaz -> BEY, Ten -> TEN)
 */
export function getColorCode(colorName: string): string {
  if (!colorName) return "GEN";
  const trimmed = colorName.trim();
  if (COLOR_CODE_MAP[trimmed]) return COLOR_CODE_MAP[trimmed];

  for (const [key, code] of Object.entries(COLOR_CODE_MAP)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase())) return code;
  }

  // Türkçe karakter temizleme ve ilk 3 harf
  const trMap: Record<string, string> = {
    ç: "C", Ç: "C", ğ: "G", Ğ: "G", ı: "I", İ: "I", ö: "O", Ö: "O", ş: "S", Ş: "S", ü: "U", Ü: "U",
  };
  const normalized = trimmed
    .split("")
    .map((char) => trMap[char] || char.toUpperCase())
    .join("")
    .replace(/[^A-Z0-9]/g, "");

  return normalized.slice(0, 3) || "VAR";
}

/**
 * Metinden (başlık, açıklama vb.) yüksekliği veya aralığı çözer (Örn: "15-16 cm", "15 - 16 cm", "20 cm")
 */
export function extractHeightFromText(text?: string): string | null {
  if (!text) return null;

  // 1. Aralık tespiti (Örn: "15-16 cm", "15 - 16 cm", "15-16", "0 - 10 cm", "11 - 30 cm")
  const rangeMatch = text.match(/(\d+)\s*[-–/]\s*(\d+)(?:\s*(?:cm|CM))?/i);
  if (rangeMatch) {
    const r1 = rangeMatch[1];
    const r2 = rangeMatch[2];
    if (r1 === "15" && r2 === "16") return "15-16 cm";
    if (r1 === "0" && r2 === "10") return "0 - 10 cm";
    if (r1 === "11" && r2 === "30") return "11 - 30 cm";
    if (r1 === "31" && r2 === "45") return "31 - 45 cm";
    if (r1 === "41" && r2 === "50") return "41 - 50 cm";
    if (r1 === "51" && r2 === "80") return "51 - 80 cm";
    if (r1 === "71" && r2 === "90") return "71 - 90 cm";
    if (r1 === "91" && r2 === "110") return "91 - 110 cm";
    if (r1 === "111" && r2 === "150") return "111 - 150 cm";
    return `${r1}-${r2} cm`;
  }

  // 2. Tek sayı cm tespiti (Örn: "20 cm", "15CM", "10 cm")
  const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cm|CM)/i);
  if (singleMatch) {
    return `${singleMatch[1]} cm`;
  }

  return null;
}

/**
 * Ürün boyutu / yüksekliğini tespit eder (Örn: "20 cm" -> "20", "15-16 cm" -> "15", "Petra Vazo 16 cm" -> "16")
 */
export function extractSizeCode(heightStr?: string, title?: string): string {
  if (heightStr) {
    const range = heightStr.match(/(\d+)\s*[-–/]\s*(\d+)/);
    if (range) return range[1];
    const match = heightStr.match(/\d+/);
    if (match) return match[0];
  }
  if (title) {
    const range = title.match(/(\d+)\s*[-–/]\s*(\d+)/);
    if (range) return range[1];
    const match = title.match(/(\d+)\s*(?:cm|CM|mm|MM)/i);
    if (match) return match[1];
    const anyNum = title.match(/\b\d+\b/);
    if (anyNum) return anyNum[0];
  }
  return "20"; // Varsayılan standart boyut
}

/**
 * Ürün başlığından ana ürün kısaltmasını türetir (Örn: "Petra Vazo" -> "PTR", "Aura Vazo" -> "AUR", "Suna Vazo" -> "SNA")
 */
export function extractProductPrefix(text: string): string {
  if (!text) return "PRD";
  
  // Eğer zaten MODEL-KODU formatındaysa ilk parçayı al (Örn: PTR-VZO-01 -> PTR)
  if (text.includes("-")) {
    const part = text.split("-")[0].trim().toUpperCase();
    if (part && part.length >= 2 && part !== "MOD") return part;
  }

  const trMap: Record<string, string> = {
    ç: "C", Ç: "C", ğ: "G", Ğ: "G", ı: "I", İ: "I", ö: "O", Ö: "O", ş: "S", Ş: "S", ü: "U", Ü: "U",
  };
  const clean = text
    .split("")
    .map((c) => trMap[c] || c.toUpperCase())
    .join("")
    .replace(/[^A-Z0-9\s-]/g, " ");

  const words = clean
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !["VE", "ILE", "ICIN", "DEKORATIF", "MODERN", "ESTETIK"].includes(w));

  if (words.length === 0) return "PRD";

  const first = words[0];
  // Bilinen ve sık kullanılan ürün modelleri
  const knownPrefixes: Record<string, string> = {
    PETRA: "PTR",
    AURA: "AUR",
    SUNA: "SNA",
    SENFONI: "SNF",
    MIRA: "MIR",
    BABA: "BABA",
    DIAMOND: "DMD",
    NOVA: "NOV",
    LUNA: "LUN",
  };
  if (knownPrefixes[first]) return knownPrefixes[first];

  // Sessiz harf çıkarma mantığı (Örn: VAZO -> VZ, AHENK -> HNK)
  const vowels = new Set(["A", "E", "I", "O", "U"]);
  let consonants = "";
  for (let i = 0; i < first.length; i++) {
    if (i === 0 || !vowels.has(first[i])) {
      consonants += first[i];
    }
  }
  if (consonants.length >= 3) return consonants.slice(0, 3);
  return first.slice(0, 3);
}

/**
 * Akıllı Model Kodu Üretici (Örn: PTR-VZO-01)
 */
export function generateSmartModelCode(title: string, categoryName = ""): string {
  const prefix = extractProductPrefix(title);
  let catCode = "VZO";
  const clean = (title + " " + categoryName).toUpperCase();

  if (clean.includes("VAZO")) catCode = "VZO";
  else if (clean.includes("MUMLUK") || clean.includes("ŞAMDAN") || clean.includes("SAMDAN")) catCode = "MML";
  else if (clean.includes("SAKSI")) catCode = "SKS";
  else if (clean.includes("BIBLO") || clean.includes("FIGUR") || clean.includes("FİGÜR")) catCode = "BBL";
  else if (clean.includes("TEPSI")) catCode = "TPS";
  else if (clean.includes("TABLO") || clean.includes("CERCEVE") || clean.includes("ÇERÇEVE")) catCode = "TBL";
  else if (clean.includes("SET")) catCode = "SET";
  else {
    const words = title.trim().split(/\s+/);
    if (words.length > 1 && words[1].length >= 3) {
      catCode = words[1].toUpperCase().slice(0, 3);
    }
  }

  return `${prefix}-${catCode}-01`;
}

/**
 * Akıllı Stok Kodu (SKU) Üretici (Örn: PTR-TEN-20, PTR-BEY-20, AUR-SIY-16)
 */
export function generateSmartStockCode(
  modelCodeOrTitle: string,
  colorName: string,
  heightOrSize?: string,
  title?: string
): string {
  const prefix = extractProductPrefix(modelCodeOrTitle || title || "");
  const colorCode = getColorCode(colorName);
  const sizeCode = extractSizeCode(heightOrSize, title);
  return `${prefix}-${colorCode}-${sizeCode}`;
}

/**
 * 13 Haneli EAN-13 Uyumlu Benzersiz Barkod Üretici (Örn: 9990006150029)
 */
export function generateEan13Barcode(): string {
  const prefix = "999000";
  const mid = Math.floor(100000 + Math.random() * 900000).toString();
  const raw12 = `${prefix}${mid}`;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${raw12}${checksum}`;
}
