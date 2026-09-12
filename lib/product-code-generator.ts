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
 * Ürün boyutu / yüksekliğini tespit eder (Örn: "20 cm" -> "20", "Petra Vazo 16 cm" -> "16")
 */
export function extractSizeCode(heightStr?: string, title?: string): string {
  if (heightStr) {
    const match = heightStr.match(/\d+/);
    if (match) return match[0];
  }
  if (title) {
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
