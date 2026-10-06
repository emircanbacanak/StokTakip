import puppeteer, { Browser, Page } from "puppeteer";

export interface CompetitorProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  formattedPrice: string;
  ratingScore: number;
  reviewCount: number;
  badges: string[];
  socialProof?: string;
  image: string;
  link: string;
  isBestseller: boolean;
  isMostRated: boolean;
  isMostFavorited: boolean;
  isRecommended: boolean;
  sourceSorts?: string[];
  rank: number;
}

export interface KeywordFrequency {
  keyword: string;
  count: number;
  percentage: number;
  type: "single" | "phrase" | "longtail";
}

export interface MarketStats {
  totalAnalyzed: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  medianPrice: number;
  recommendedPrice: number;
  avgRating: number;
  totalReviews: number;
  bestsellerCount: number;
  mostRatedCount: number;
  mostFavoritedCount: number;
  topBrands: { name: string; count: number }[];
  priceDistribution: { range: string; count: number; percentage: number }[];
}

export interface TrendyolScrapeResult {
  query: string;
  sort: string;
  products: CompetitorProduct[];
  bestSellers: CompetitorProduct[];
  mostRated: CompetitorProduct[];
  mostFavorited: CompetitorProduct[];
  recommended: CompetitorProduct[];
  stats: MarketStats;
  keywords: KeywordFrequency[];
  suggestions: string[];
}

// Türkçe Stop-words (Temizlenecek anlamsız kelimeler)
const TURKISH_STOP_WORDS = new Set([
  "ve", "ile", "için", "bir", "bu", "şu", "o", "de", "da", "ki", "en", "çok", "daha",
  "kadar", "gibi", "her", "tüm", "olan", "veya", "ise", "adet", "adetli", "tane",
  "paket", "set", "takım", "takımı", "ürün", "ürünü", "boy", "boyu", "cm", "mm", "xl",
  "renk", "renkli", "özel", "yeni", "l", "m", "s", "no", "tipi", "model", "modeli"
]);

/**
 * Başlıklardan TF-IDF ve N-Gram anahtar kelime frekans analizi yapar
 */
export function extractKeywordsFromTitles(titles: string[]): KeywordFrequency[] {
  const singleMap = new Map<string, number>();
  const phraseMap = new Map<string, number>();
  const totalTitles = titles.length || 1;

  for (const rawTitle of titles) {
    const cleanWords = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1 && !TURKISH_STOP_WORDS.has(w) && !/^\d+$/.test(w));

    // 1-Gram (Tekil Kelimeler)
    for (const word of cleanWords) {
      singleMap.set(word, (singleMap.get(word) || 0) + 1);
    }

    // 2-Gram (İkili İfadeler)
    for (let i = 0; i < cleanWords.length - 1; i++) {
      const phrase = `${cleanWords[i]} ${cleanWords[i + 1]}`;
      phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
    }

    // 3-Gram (Üçlü Kalıplar)
    for (let i = 0; i < cleanWords.length - 2; i++) {
      const phrase = `${cleanWords[i]} ${cleanWords[i + 1]} ${cleanWords[i + 2]}`;
      phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
    }
  }

  const results: KeywordFrequency[] = [];

  // Tekil kelimeleri ekle
  Array.from(singleMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([keyword, count]) => {
      results.push({
        keyword,
        count,
        percentage: Math.round((count / totalTitles) * 100),
        type: "single",
      });
    });

  // İfadeleri ekle
  Array.from(phraseMap.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([keyword, count]) => {
      results.push({
        keyword,
        count,
        percentage: Math.round((count / totalTitles) * 100),
        type: keyword.split(" ").length === 2 ? "phrase" : "longtail",
      });
    });

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Google ve arama motorlarından ilgili anahtar kelime tamamlama önerilerini çeker
 */
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  try {
    const urls = [
      `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(`trendyol ${query}`)}`,
      `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
    ];

    const allSuggestions: string[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data[1])) {
            data[1].forEach((s: string) => {
              const clean = s.replace(/^trendyol\s+/i, "").trim();
              if (clean && !allSuggestions.includes(clean)) {
                allSuggestions.push(clean);
              }
            });
          }
        }
      } catch (e) {}
    }

    return allSuggestions.slice(0, 15);
  } catch {
    return [];
  }
}

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const clean = priceStr
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(clean) || 0;
}

/**
 * Belirli bir URL sayfasını Puppeteer ile tarayan yardımcı fonksiyon
 */
async function scrapeSingleUrl(page: Page, url: string, maxItems: number, sortTag: string): Promise<any[]> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });
    await page.evaluate(() => {
      window.scrollBy(0, 1500);
    });
    await new Promise((r) => setTimeout(r, 800));

    const rawProducts = await page.evaluate((limit: number, currentTag: string) => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".p-card-wrppr, .p-card-chldrn-cntnr, .product-card, div[data-id]"
        )
      );

      const items: any[] = [];
      const seenTitles = new Set<string>();

      for (let i = 0; i < cards.length; i++) {
        if (items.length >= limit) break;
        const card = cards[i];

        const text = card.innerText || "";
        const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        let linkEl = card.querySelector("a");
        if (!linkEl && card.tagName === "A") {
          linkEl = card as HTMLAnchorElement;
        }
        let link = linkEl?.getAttribute("href") || (linkEl as any)?.href || "";
        if (link && !link.startsWith("http")) {
          link = "https://www.trendyol.com" + (link.startsWith("/") ? "" : "/") + link;
        }
        const imgEl = card.querySelector("img");
        const image = imgEl?.src || imgEl?.getAttribute("data-src") || "";

        let brand = "";
        let title = "";
        const badges: string[] = [];
        let socialProof = "";
        let ratingScore = 0;
        let reviewCount = 0;
        let priceStr = "";
        let originalPriceStr = "";

        for (const line of lines) {
          if (
            line.includes("En Çok Satan") ||
            line.includes("En Çok Değerlendirilen") ||
            line.includes("En Çok Ziyaret Edilen") ||
            line.includes("Öne Çıkan") ||
            line.includes("Flaş Ürün") ||
            line.includes("Popüler") ||
            line.includes("Birlikte Al")
          ) {
            badges.push(line);
          } else if (
            line.includes("kişi ekledi") ||
            line.includes("kişi favoriledi") ||
            line.includes("kişi baktı") ||
            line.includes("sepette") ||
            line.includes("Kupon")
          ) {
            if (!socialProof && (line.includes("kişi") || line.includes("ekledi") || line.includes("favoriledi"))) {
              socialProof = line;
            }
          } else if (/^\d+(\.\d+)?$/.test(line) && parseFloat(line) <= 5.0 && parseFloat(line) >= 1.0) {
            ratingScore = parseFloat(line);
          } else if (/^\(\d+\)$/.test(line)) {
            reviewCount = parseInt(line.replace(/[()]/g, ""), 10);
          } else if (line.includes("TL") && !line.includes("Kupon") && !line.includes("İndirim")) {
            if (!priceStr) {
              priceStr = line;
            } else if (!originalPriceStr) {
              originalPriceStr = line;
            }
          }
        }

        const possibleTitles = lines.filter(
          (l: string) =>
            l.length > 10 &&
            !l.includes("TL") &&
            !l.includes("Kargo") &&
            !l.includes("Sepete") &&
            !l.includes("En Çok") &&
            !l.includes("kişi") &&
            !l.includes("Kupon")
        );

        if (possibleTitles.length > 0) {
          title = possibleTitles[0];
          const parts = title.split(" ");
          if (parts.length > 1) {
            brand = parts[0];
          }
        }

        if (title && !seenTitles.has(title)) {
          seenTitles.add(title);
          items.push({
            title,
            brand: brand || "Diğer",
            priceStr,
            originalPriceStr,
            ratingScore,
            reviewCount,
            badges,
            socialProof,
            image,
            link: link || `https://www.trendyol.com/sr?q=${encodeURIComponent(title)}`,
            sortTag: currentTag,
          });
        }
      }

      return items;
    }, maxItems, sortTag);

    return rawProducts;
  } catch (err: any) {
    console.warn(`⚠️ [scrapeSingleUrl] ${url} tarama uyarısı:`, err.message);
    return [];
  }
}

/**
 * Trendyol Arama Sayfalarını Tarar (Tüm Pazar Boyutları Birlikte veya Tekil Filtre)
 */
export async function scrapeTrendyolMarket(
  query: string,
  sort: "ALL" | "BEST_SELLER" | "MOST_RATED" | "MOST_FAVOURITE" | "DEFAULT" = "ALL",
  limit = 40
): Promise<TrendyolScrapeResult> {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) {
    throw new Error("Arama sorgusu boş olamaz");
  }

  console.log(`🔍 Trendyol 360° Pazar Taraması Başlatılıyor: [${cleanQuery}] (Mod: ${sort})`);

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1280,800",
      ],
    });

    const page: Page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    const tasks: { sortTag: string; url: string; count: number }[] = [];

    if (sort === "ALL") {
      // 360° Hepsi Birlikte Analiz: En Çok Satanlar, En Çok Değerlendirilenler, En Çok Favorilenenler ve Önerilenler
      tasks.push(
        {
          sortTag: "BEST_SELLER",
          url: `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}&sst=BEST_SELLER`,
          count: 15,
        },
        {
          sortTag: "MOST_RATED",
          url: `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}&sst=MOST_RATED`,
          count: 15,
        },
        {
          sortTag: "MOST_FAVOURITE",
          url: `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}&sst=MOST_FAVOURITE`,
          count: 15,
        },
        {
          sortTag: "DEFAULT",
          url: `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}`,
          count: 15,
        }
      );
    } else {
      const sortParam =
        sort === "BEST_SELLER"
          ? "&sst=BEST_SELLER"
          : sort === "MOST_RATED"
          ? "&sst=MOST_RATED"
          : sort === "MOST_FAVOURITE"
          ? "&sst=MOST_FAVOURITE"
          : "";
      tasks.push({
        sortTag: sort,
        url: `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}${sortParam}`,
        count: limit,
      });
    }

    const aggregatedRaw: any[] = [];
    for (const task of tasks) {
      console.log(`📡 [${task.sortTag}] Verileri taranıyor...`);
      const res = await scrapeSingleUrl(page, task.url, task.count, task.sortTag);
      aggregatedRaw.push(...res);
    }

    await browser.close();
    browser = null;

    // Tekilleştirme ve Birleştirme (Map ile başlık/link bazlı)
    const productMap = new Map<string, CompetitorProduct>();
    const bestSellers: CompetitorProduct[] = [];
    const mostRated: CompetitorProduct[] = [];
    const mostFavorited: CompetitorProduct[] = [];
    const recommended: CompetitorProduct[] = [];

    let rankCounter = 1;

    for (const raw of aggregatedRaw) {
      const priceNum = parsePrice(raw.priceStr);
      const origNum = parsePrice(raw.originalPriceStr);

      const hasBestseller = raw.sortTag === "BEST_SELLER" || raw.badges?.some((b: string) => b.includes("En Çok Satan"));
      const hasMostRated = raw.sortTag === "MOST_RATED" || raw.badges?.some((b: string) => b.includes("En Çok Değerlendirilen"));
      const hasFavorited = raw.sortTag === "MOST_FAVOURITE" || Boolean(raw.socialProof && raw.socialProof.includes("favoriledi"));
      const hasRecommended = raw.sortTag === "DEFAULT";

      const key = raw.title.toLowerCase().trim();

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        if (hasBestseller) existing.isBestseller = true;
        if (hasMostRated) existing.isMostRated = true;
        if (hasFavorited) existing.isMostFavorited = true;
        if (hasRecommended) existing.isRecommended = true;
        if (!existing.sourceSorts?.includes(raw.sortTag)) {
          existing.sourceSorts?.push(raw.sortTag);
        }
        if (raw.socialProof && !existing.socialProof) {
          existing.socialProof = raw.socialProof;
        }
      } else {
        const product: CompetitorProduct = {
          id: `ty-${rankCounter}-${Math.random().toString(36).substring(2, 6)}`,
          title: raw.title,
          brand: raw.brand,
          price: priceNum,
          originalPrice: origNum > priceNum ? origNum : undefined,
          formattedPrice: priceNum > 0 ? `${priceNum.toLocaleString("tr-TR")} TL` : raw.priceStr || "Fiyat Yok",
          ratingScore: raw.ratingScore || 4.5,
          reviewCount: raw.reviewCount || 0,
          badges: raw.badges || [],
          socialProof: raw.socialProof || undefined,
          image: raw.image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
          link: raw.link || `https://www.trendyol.com/sr?q=${encodeURIComponent(cleanQuery)}`,
          isBestseller: hasBestseller,
          isMostRated: hasMostRated,
          isMostFavorited: hasFavorited,
          isRecommended: hasRecommended,
          sourceSorts: [raw.sortTag],
          rank: rankCounter++,
        };

        productMap.set(key, product);

        if (hasBestseller) bestSellers.push(product);
        if (hasMostRated) mostRated.push(product);
        if (hasFavorited) mostFavorited.push(product);
        if (hasRecommended) recommended.push(product);
      }
    }

    const allProducts = Array.from(productMap.values());

    // İstatistiksel Hesaplamalar
    const validPrices = allProducts.map((p) => p.price).filter((pr) => pr > 0).sort((a, b) => a - b);
    const minPrice = validPrices.length > 0 ? validPrices[0] : 0;
    const maxPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : 0;
    const avgPrice =
      validPrices.length > 0
        ? Math.round(validPrices.reduce((acc, curr) => acc + curr, 0) / validPrices.length)
        : 0;

    const medianPrice =
      validPrices.length > 0 ? validPrices[Math.floor(validPrices.length / 2)] : avgPrice;

    const recommendedPrice = Math.round(medianPrice > 0 ? medianPrice * 0.94 : 299);

    const ratings = allProducts.map((p) => p.ratingScore).filter((r) => r > 0);
    const avgRating =
      ratings.length > 0
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 4.5;

    const totalReviews = allProducts.reduce((acc, p) => acc + p.reviewCount, 0);
    const bestsellerCount = allProducts.filter((p) => p.isBestseller).length;
    const mostRatedCount = allProducts.filter((p) => p.isMostRated).length;
    const mostFavoritedCount = allProducts.filter((p) => p.isMostFavorited).length;

    // Marka Dağılımı
    const brandCountMap = new Map<string, number>();
    allProducts.forEach((p) => {
      brandCountMap.set(p.brand, (brandCountMap.get(p.brand) || 0) + 1);
    });

    const topBrands = Array.from(brandCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Fiyat Dağılım Aralıkları
    const priceStep = Math.max(50, Math.round((maxPrice - minPrice) / 4));
    const priceDistribution = [
      {
        range: `${minPrice} - ${minPrice + priceStep} TL`,
        count: validPrices.filter((p) => p >= minPrice && p < minPrice + priceStep).length,
        percentage: 0,
      },
      {
        range: `${minPrice + priceStep} - ${minPrice + priceStep * 2} TL`,
        count: validPrices.filter((p) => p >= minPrice + priceStep && p < minPrice + priceStep * 2).length,
        percentage: 0,
      },
      {
        range: `${minPrice + priceStep * 2} - ${minPrice + priceStep * 3} TL`,
        count: validPrices.filter((p) => p >= minPrice + priceStep * 2 && p < minPrice + priceStep * 3).length,
        percentage: 0,
      },
      {
        range: `${minPrice + priceStep * 3}+ TL`,
        count: validPrices.filter((p) => p >= minPrice + priceStep * 3).length,
        percentage: 0,
      },
    ].map((pd) => ({
      ...pd,
      percentage: validPrices.length > 0 ? Math.round((pd.count / validPrices.length) * 100) : 0,
    }));

    const stats: MarketStats = {
      totalAnalyzed: allProducts.length,
      minPrice,
      maxPrice,
      avgPrice,
      medianPrice,
      recommendedPrice,
      avgRating,
      totalReviews,
      bestsellerCount,
      mostRatedCount,
      mostFavoritedCount,
      topBrands,
      priceDistribution,
    };

    // Anahtar kelime ve TF-IDF
    const titles = allProducts.map((p) => p.title);
    const keywords = extractKeywordsFromTitles(titles);

    // Google/Trendyol Canlı Arama Önerileri
    const suggestions = await fetchSearchSuggestions(cleanQuery);

    return {
      query: cleanQuery,
      sort,
      products: allProducts,
      bestSellers,
      mostRated,
      mostFavorited,
      recommended,
      stats,
      keywords,
      suggestions,
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.error("❌ Trendyol 360° Market Scraper Hatası:", error);
    throw error;
  }
}
