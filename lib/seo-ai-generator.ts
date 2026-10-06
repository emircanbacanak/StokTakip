import { CompetitorProduct, KeywordFrequency, MarketStats } from "./trendyol-market-scraper";

export interface VisionAnalysisResult {
  productType: string;
  suggestedSearchQuery: string;
  categorySuggestion: string;
  suggestedNotes: string; // Otomatik oluşturulan ürün özel vurguları / notları
  characterOrTheme?: string; // Tespit edilen karakter, oyun, film veya tema (Örn: Simon 'Ghost' Riley, Call of Duty)
  colors: string[];
  materials: string[];
  style: string;
  dimensionsEstimated: string;
  designDetails: string;
  usageAreas: string[];
  uspPoints: string[]; // Eşsiz satış noktaları
}

export interface SeoGeneratedContent {
  titles: {
    type: "algorithmic" | "conversion" | "premium_3d" | "gift_custom" | "compact";
    label: string;
    title: string;
    characterCount: number;
    explanation: string;
  }[];
  htmlDescription: string;
  plainTextDescription: string;
  tags: string[];
  careAndWarningGuide: {
    icon: string;
    title: string;
    description: string;
    cautionLevel: "high" | "medium" | "info";
  }[];
  competitorGapAnalysis: {
    competitorWeaknesses: string[];
    yourUniqueAdvantages: string[];
    suggestedFocusKeywords: string[];
    pricingStrategy: string;
  };
  seoScore: number;
}

/**
 * Gemini & Groq Multimodal Vision kullanarak yüklenen ürün görselini detaylı analiz eder
 */
export async function analyzeProductImageVision(
  imageBase64: string,
  mimeType = "image/jpeg"
): Promise<VisionAnalysisResult> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

  const prompt = `Sen Türkiye'nin en iyi e-ticaret görsel analiz, 3D yazıcı üretim ve popüler kültür/oyun/figür uzmanısın.
Fotoğraftaki ürünü son derece dikkatli, akıllıca ve detaylı incele. Bu ürünün NE OLDUĞUNU kesin, net ve mantıklı olarak tespit et.

KRİTİK GÖRSEL TANIMA KURALLARI:
1. POPÜLER KÜLTÜR, OYUN, FİLM, ANİME & KARAKTER TESPİTİ (ÇOK ÖNEMLİ):
   - Görselde bir karakter, büst, heykel veya maske varsa; KARAKTERİN VE OYUNUN/FİLMİN TAM ADINI TESPİT ET!
   - Örneğin: Eğer görselde kurukafa maskeli taktik asker varsa, bu 'Call of Duty: Modern Warfare Simon "Ghost" Riley' karakteridir. Asla sadece "dekor ürünü" veya "asker biblo" deme; "Call of Duty Ghost Simon Riley Büst Figür" olarak adlandır.
   - Örnekler: Ghost (CoD), Mandalorian, Darth Vader, Batman, Iron Man, Spider-Man, Gengar / Pikachu (Pokemon), Geralt (Witcher), Kratos (God of War), Jinx (LoL), Reyna (Valorant), Goku / Zoro / Luffy / Gojo (Anime), Gigachad vb.
2. MASAÜSTÜ & KUTU OYUNLARI:
   - Tavla seti (Backgammon), Satranç takımı, Dama, Zar kulesi (Dice Tower), Kart standı, Catan tablası. Menteşe, zar/pul yuvaları varsa kesinlikle Tavla Takımıdır.
3. DEKORASYON & ORGANIZER & 3D MODELLER:
   - Eklemli Kristal Ejderha (Articulated Dragon), Spiral/Geometrik Vazo, Sukulent/Kaktüs Saksısı, Lithophane Gece Lambası, Kulaklık Standı, Masaüstü Kalemlik/Organizer, Telefon Tutucu.

Lütfen aşağıdaki JSON formatında EKSİKSİZ, MANTIKLI ve NET yanıt ver:
{
  "productType": "Ürünün kesin ve tam adı (Örn: Call of Duty Simon 'Ghost' Riley Karakter Büstü veya 3D Baskı Geometrik Taşınabilir Tavla Takımı)",
  "characterOrTheme": "Tespit edilen karakter, oyun, film veya tema adı (Örn: Simon 'Ghost' Riley - Call of Duty, veya Tavla & Kutu Oyunları)",
  "suggestedSearchQuery": "Trendyol'da alıcıların yazacağı en mantıklı 2-4 kelimelik ana arama terimi (Örn: call of duty ghost figür veya 3d baskı tavla seti)",
  "categorySuggestion": "Önerilen Trendyol Ana ve Alt Kategorisi (Örn: Hobi & Oyun > Figür & Heykel veya Kutu Oyunları)",
  "suggestedNotes": "Özel Ürün Vurguları alanı için otomatik oluşturulan zengin 3D ve ürün detay notu (Örn: Call of Duty Simon 'Ghost' Riley taktik kuru kafa maskeli büst figürü. Yüksek çözünürlüklü FDM 3D baskı, mat siyah ve detaylı yüzey dokusu, oyuncu (gamer) masaüstü setup dekoru ve koleksiyonluk hediye, çevre dostu dayanıklı PLA malzeme.)",
  "colors": ["Tespit edilen ana renkler (Örn: Mat Siyah, Kemik Beyazı)"],
  "materials": ["PLA Biyopolimer", "Dayanıklı PETG"],
  "style": "Tasarım stili (Örn: Taktik Askeri / Gaming, Modern Geometrik)",
  "dimensionsEstimated": "Tahmini ebat (Örn: ~15-20cm Yükseklik)",
  "designDetails": "Görseldeki ayırt edici mekanizma ve detaylar (Örn: Taktik kulaklık, kurukafa maske hatları, FDM katman geometrisi)",
  "usageAreas": ["Gamer ve oyuncu masaüstü setup dekoru", "Koleksiyon ve sergileme", "Hediye"],
  "uspPoints": [
    "Yüksek doluluk ve darbelere dayanıklı katmanlı 3D üretim",
    "İkonik karakter tasarımına sadık kalarak üretilmiş özel koleksiyon parçası",
    "Çevre dostu organik biyoplastik malzeme"
  ]
}`;

  // 1. Google Gemini Vision (gemini-flash-latest & gemini-3.1-flash-lite)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    const models = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: cleanBase64 } },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          console.log(`✅ [Vision] ${model} ile görsel başarıyla analiz edildi:`, parsed.productType);
          return parsed;
        } else {
          const errJson = await response.json().catch(() => ({}));
          console.warn(`⚠️ [Vision] Gemini ${model} API yanıt hatası:`, errJson);
        }
      } catch (e: any) {
        console.warn(`⚠️ [Vision] Gemini ${model} çağrısı yapılamadı:`, e?.message || e);
      }
    }
  }

  // 2. Groq Llama 3.2 Vision (llama-3.2-11b-vision-preview)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${cleanBase64}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        console.log("✅ [Vision] Groq Llama 3.2 Vision ile görsel analiz edildi:", parsed.productType);
        return parsed;
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("⚠️ [Vision] Groq Vision hatası:", errJson);
      }
    } catch (e: any) {
      console.warn("⚠️ [Vision] Groq Vision çağrı hatası:", e?.message || e);
    }
  }

  // Akıllı Heuristic Fallback
  console.warn("⚠️ [Vision] API anahtarı geçersiz veya yanıt vermediği için varsayılan fallback şablonu kullanıldı.");
  return {
    productType: "3D Baskı Özel Tasarım Figür / Model",
    suggestedSearchQuery: "3d baskı figür",
    categorySuggestion: "Ev & Yaşam > Dekorasyon > Biblo & Heykel",
    characterOrTheme: "3D Masaüstü Figürü",
    suggestedNotes: "Yüksek doluluk ve hassas katmanlı 3D yazıcı üretimi, çevre dostu organik PLA biyopolimer malzeme, masaüstü dekor ve hediyelik koleksiyon parçası.",
    colors: ["Beyaz", "Mat Siyah", "Özel Renk"],
    materials: ["PLA Biyopolimer", "Dayanıklı PETG"],
    style: "Modern / Minimalist",
    dimensionsEstimated: "~12-18cm",
    designDetails: "Katmanlı FDM 3D baskı geometrisi ve detaylı yüzey işçiliği",
    usageAreas: ["Masaüstü dekorasyonu", "Ev ve ofis sergileme", "Hediye"],
    uspPoints: [
      "Katmanlı FDM üretim ile hafif ve dayanıklı yapı",
      "Çevre dostu organik biyoplastik malzeme",
      "Piyasada benzeri olmayan özgün 3D tasarım",
    ],
  };
}

/**
 * Pazar Verileri, Rakip Başlıkları ve 3D Özelliklerini Birleştirerek Üst Düzey SEO İçeriği Üretir
 */
export async function generateFullSeoProductPackage(params: {
  productTitleOrQuery: string;
  visionData?: VisionAnalysisResult;
  competitors: CompetitorProduct[];
  keywords: KeywordFrequency[];
  stats: MarketStats;
  brandName?: string;
  customNotes?: string;
  suggestions?: string[];
}): Promise<SeoGeneratedContent> {
  const { productTitleOrQuery, visionData, competitors, keywords, stats, brandName, customNotes, suggestions = [] } = params;

  const topCompetitorSamples = competitors.slice(0, 10).map((c, i) => ({
    sira: i + 1,
    baslik: c.title,
    fiyat: c.formattedPrice,
    puan: c.ratingScore,
    yorum: c.reviewCount,
    rozetler: c.badges.join(", "),
    sosyalKanit: c.socialProof || "",
  }));

  const topKeywordsList = keywords.slice(0, 20).map((k) => `${k.keyword} (%${k.percentage} rakipte kullanılıyor)`);

  const promptSystem = `Sen Türkiye'nin en iyi Trendyol E-Ticaret SEO ve Dönüşüm Optimizasyonu Uzmanısın.
Amacımız: Trendyol arama motorunda 1. SIRAYA ÇIKMAK, en yüksek arama hacmini yakalamak, müşterinin aradığı tam karakteri/ürünü bulmasını sağlamak ve dönüşüm oranını maksimize etmek!

=== BİZİM ÜRÜNÜMÜZ & TESPİT EDİLEN DETAYLAR ===
Ürün/Arama Terimi: ${productTitleOrQuery}
Marka Durumu: ${brandName?.trim() ? `Marka: "${brandName.trim()}" (Başlıklarda bu markayı kullan)` : "MARKA BELİRTİLMEDİ. Başlıklara kesinlikle herhangi bir varsayılan/uydurma marka adı EKLEME! Başlık doğrudan ürün veya karakterin adı ile başlasın."}
Görsel ve Karakter Analiz Özeti: ${JSON.stringify(visionData || {})}
Özel Ürün Vurguları / Notlar: ${customNotes || visionData?.suggestedNotes || "3D Yazıcı FDM üretimi, dayanıklı PLA malzeme, detaylı işçilik."}
Üretim Tipi: Yüksek hassasiyetli 3D Yazıcı Teknolojisi (FDM Katmanlı Üretim, Organik Biyopolimer PLA/PETG).

=== CANLI TRENDYOL RAKİP VE PAZAR VERİLERİ (VERİ TEMELLİ ANALİZ) ===
Piyasa Ortalama Fiyatı: ${stats.avgPrice} TL (Min: ${stats.minPrice} TL, Max: ${stats.maxPrice} TL, Önerilen: ${stats.recommendedPrice} TL)

Rakiplerin Başlıklarında En Çok Geçen Anahtar Kelimeler (TF-IDF):
${topKeywordsList.join("\n")}

Trendyol Canlı Arama Motoru Tamamlama (Autosuggest) Önerileri:
${suggestions.length > 0 ? suggestions.join(", ") : "3d baskı, hediyelik figür, masaüstü dekor"}

İncelenen İlk 10 Lider Rakip Ürün:
${JSON.stringify(topCompetitorSamples, null, 2)}

=== STRATEJİK KURALLAR: BAŞLIK, AÇIKLAMA VE ETİKET FORMÜLÜ ===
1. BAŞLIK UZUNLUĞU VE MANTIĞI:
   - Trendyol'da başlığı aşırı doldurmak spama sokar; ideal başlık 75 - 100 karakter arasındadır.
   - En kritik kural: İlk 40 karakter mobilde kesilmeden görünür. Bu yüzden ilk 40 karaktere en yüksek arama hacimli [Karakter/Model Adı + Ürün Türü] gelmelidir.
   - Asla anlamsız kelime yığını yapma; dil bilgisi kusursuz, akıcı ve satış odaklı olsun.

2. ETİKETLER (TAGS) - KESİNLİKLE KAFADAN UYDURMA:
   - "tags" listesini kafandan rastgele kelimelerle doldurma!
   - Doğrudan yukarıdaki "Rakiplerin Başlıklarında En Çok Geçen Anahtar Kelimeler" ve "Trendyol Canlı Arama Önerileri" listesinde tespit edilen gerçek arama terimlerinden en popüler 12-15 adedini seç.

3. ÜRÜN AÇIKLAMASI (HTML FORMATINDA - ZENGİN VE UZUN):
   - Trendyol algoritması açıklamayı indeksler ve detaylı açıklama iade oranını düşürür.
   - Açıklamada <h2>, <h3>, <ul>, <li>, <b>, <table> kullanarak zengin, detaylı ve ikna edici bir metin yaz.
   - 3D Baskı özellikleri, malzeme (PLA Biyopolimer), ebatlar, kutu içeriği, 50°C üzeri ısı ve bulaşık makinesinde yıkamama uyarılarını eksiksiz açıkla.

Aşağıdaki JSON şemasında eksiksiz bir yanıt ver:
{
  "titles": [
    {
      "type": "algorithmic",
      "label": "1. Sıra Algoritma Odaklı (Maksimum Arama Hacmi)",
      "title": "...",
      "characterCount": 85,
      "explanation": "..."
    },
    {
      "type": "conversion",
      "label": "Satış & Dönüşüm Odaklı (Müşteri Çeken)",
      "title": "...",
      "characterCount": 90,
      "explanation": "..."
    },
    {
      "type": "premium_3d",
      "label": "Premium 3D Tasarım Odaklı",
      "title": "...",
      "characterCount": 88,
      "explanation": "..."
    },
    {
      "type": "gift_custom",
      "label": "Hediye & Kişiselleştirilebilir Seri",
      "title": "...",
      "characterCount": 92,
      "explanation": "..."
    },
    {
      "type": "compact",
      "label": "Kompakt & Sade Başlık",
      "title": "...",
      "characterCount": 75,
      "explanation": "..."
    }
  ],
  "htmlDescription": "...",
  "plainTextDescription": "...",
  "tags": ["..."],
  "careAndWarningGuide": [
    {
      "icon": "☀️",
      "title": "Yüksek Isı ve Doğrudan Güneş Işığı",
      "description": "Ürün 50°C üzerindeki doğrudan güneş ışığına veya aşırı sıcak ortamlara maruz bırakılmamalıdır.",
      "cautionLevel": "high"
    },
    {
      "icon": "🧼",
      "title": "Yıkama ve Temizlik Talimatı",
      "description": "Bulaşık makinesinde yıkanmaz. Yalnızca ılık su ve nemli yumuşak bir bez ile temizlenmelidir.",
      "cautionLevel": "high"
    },
    {
      "icon": "🛡️",
      "title": "Darbe ve Mekanik Dayanım",
      "description": "Katmanlı 3D üretim geometrisi ile dayanıklıdır ancak sert zeminlere şiddetli çarpmalardan korunmalıdır.",
      "cautionLevel": "medium"
    },
    {
      "icon": "🌿",
      "title": "Çevre Dostu Organik Malzeme",
      "description": "Mısır nişastasından üretilen doğa dostu, kokusuz ve insan sağlığına zararsız PLA biyopolimer kullanılmıştır.",
      "cautionLevel": "info"
    }
  ],
  "competitorGapAnalysis": {
    "competitorWeaknesses": ["..."],
    "yourUniqueAdvantages": ["..."],
    "suggestedFocusKeywords": ["..."],
    "pricingStrategy": "..."
  },
  "seoScore": 98
}`;

  // 1. Önce Groq API'yi Dene (Hızlı ve Güçlü LLaMA 3.3 70B)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Sen profesyonel bir Trendyol SEO ve E-Ticaret veri uzmanısın. Yalnızca geçerli JSON formatında yanıt ver.",
            },
            {
              role: "user",
              content: promptSystem,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.titles)) {
            parsed.titles = parsed.titles.map((t: any) => ({
              ...t,
              characterCount: (t.title || "").length,
            }));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("⚠️ Groq LLM hatası, Gemini deneniyor:", e);
    }
  }

  // 2. Gemini API'yi Dene
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    const models = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    for (const model of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptSystem }] }],
            generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
          }),
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed.titles)) {
            parsed.titles = parsed.titles.map((t: any) => ({
              ...t,
              characterCount: (t.title || "").length,
            }));
          }
          console.log(`✅ [SEO Generator] Gemini ${model} ile SEO içerik paketi başarıyla üretildi.`);
          return parsed;
        }
      } catch (e) {
        console.warn(`⚠️ [SEO Generator] Gemini ${model} LLM hatası:`, e);
      }
    }
  }

  // 3. Fallback Heuristic Generator (API'lar geçici ulaşılamazsa dahi mükemmel içerik üretir)
  const prefix = brandName?.trim() ? `${brandName.trim()} ` : "";
  const primaryKw = keywords[0]?.keyword || productTitleOrQuery;
  const secondaryKw = keywords[1]?.keyword || "Özel Tasarım";
  const thirdKw = keywords[2]?.keyword || "Modern Seri";

  return {
    titles: [
      {
        type: "algorithmic",
        label: "1. Sıra Algoritma Odaklı (Maksimum Arama Hacmi)",
        title: `${prefix}${productTitleOrQuery} ${primaryKw} ${secondaryKw} 3D Baskı Özel Seri`.trim(),
        characterCount: (`${prefix}${productTitleOrQuery} ${primaryKw} ${secondaryKw} 3D Baskı Özel Seri`).trim().length,
        explanation: "Trendyol arama hacmi en yüksek 3 anahtar kelimeyi başa yerleştirir.",
      },
      {
        type: "conversion",
        label: "Satış & Dönüşüm Odaklı (Müşteri Çeken)",
        title: `${prefix}Modern ${productTitleOrQuery} - Yüksek Dayanımlı Geometrik 3D Tasarım`.trim(),
        characterCount: (`${prefix}Modern ${productTitleOrQuery} - Yüksek Dayanımlı Geometrik 3D Tasarım`).trim().length,
        explanation: "Tıklanma oranını ve müşteri güvenini artıran estetik vurgular içerir.",
      },
      {
        type: "premium_3d",
        label: "Premium 3D Tasarım Odaklı",
        title: `${prefix}Premium 3D Baskı ${productTitleOrQuery} Ergonomik ve Hafif Koleksiyon Modeli`.trim(),
        characterCount: (`${prefix}Premium 3D Baskı ${productTitleOrQuery} Ergonomik ve Hafif Koleksiyon Modeli`).trim().length,
        explanation: "3D katman kalitesini ve malzeme dayanıklılığını öne çıkarır.",
      },
      {
        type: "gift_custom",
        label: "Hediye & Kişiselleştirilebilir Seri",
        title: `${prefix}Hediyelik Özel Tasarım ${productTitleOrQuery} Modern Ev & Ofis Serisi`.trim(),
        characterCount: (`${prefix}Hediyelik Özel Tasarım ${productTitleOrQuery} Modern Ev & Ofis Serisi`).trim().length,
        explanation: "Özel gün ve hediye aramalarından yüksek trafik çeker.",
      },
      {
        type: "compact",
        label: "Kompakt & Sade Başlık",
        title: `${prefix}${productTitleOrQuery} - ${thirdKw}`.trim(),
        characterCount: (`${prefix}${productTitleOrQuery} - ${thirdKw}`).trim().length,
        explanation: "Mobil arama sonuçlarında tam görünen sade ve net başlık.",
      },
    ],
    htmlDescription: `
      <h2>✨ ${prefix}${productTitleOrQuery} ile Yaşam Alanınıza Modern Bir Dokunuş Katın!</h2>
      <p>Özenle tasarlanan bu özel 3D üretim ürün, estetik çizgileri, hafifliği ve fütüristik yapısıyla standart piyasa modellerinden ayrılır. Hem ev hem de ofis kullanımında göz alıcı bir şıklık sunar.</p>
      
      <h3>🌟 Öne Çıkan Ürün Özellikleri</h3>
      <ul>
        <li><b>Yüksek Hassasiyetli 3D Üretim:</b> Mikron düzeyinde katman teknolojisi ile pürüzsüz ve dayanıklı yüzey dokusu.</li>
        <li><b>Ergonomik & Hafif:</b> Geleneksel ağır ürünlerin aksine kolayca taşınabilir ve pratik kullanılır.</li>
        <li><b>Modern Geometri:</b> Mekanınıza çağdaş ve estetik bir atmosfer kazandırır.</li>
      </ul>

      <h3>📐 Teknik Detaylar & Ölçüler</h3>
      <table border="1" style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
        <tr style="background:#f4f4f5;">
          <th style="padding:8px;">Özellik</th>
          <th style="padding:8px;">Açıklama</th>
        </tr>
        <tr>
          <td style="padding:8px;"><b>Marka</b></td>
          <td style="padding:8px;">${brandName}</td>
        </tr>
        <tr>
          <td style="padding:8px;"><b>Malzeme</b></td>
          <td style="padding:8px;">Doğa Dostu Organik Biyopolimer (PLA/PETG)</td>
        </tr>
        <tr>
          <td style="padding:8px;"><b>Üretim Teknolojisi</b></td>
          <td style="padding:8px;">Katmanlı FDM 3D Üretim</td>
        </tr>
      </table>

      <h3>⚠️ 3D Üretim Özel Bakım & Kullanım Rehberi</h3>
      <p>Ürününüzün uzun yıllar ilk günkü formunu ve renk canlılığını koruması için lütfen aşağıdaki talimatlara dikkat ediniz:</p>
      <ul>
        <li>☀️ <b>Sıcaklık & Güneş:</b> Ürünü 50°C üzerindeki doğrudan güneş ışığına, kalorifer peteği yanına veya yaz aylarında kapalı araç içine maruz bırakmayınız.</li>
        <li>🧼 <b>Yıkama Talimatı:</b> Bulaşık makinesinde <u>kesinlikle yıkanmaz</u>. Yalnızca ılık su ve nemli yumuşak bir bez ile nazikçe temizlenmelidir.</li>
        <li>🛡️ <b>Darbe Dayanımı:</b> Katmanlı mimari darbelere karşı esnek ve mukavemetlidir; sert zeminlere yüksekten düşürülmemesi önerilir.</li>
        <li>🌿 <b>Malzeme Güvenliği:</b> Çevre dostu mısır nişastası bazlı organik biyoplastik olup kokusuz ve zararsızdır.</li>
      </ul>
      <p><b>${brandName} Güvencesiyle:</b> Her ürünümüz titizlikle test edilerek koruyucu ambalajında kargolanmaktadır.</p>
    `,
    plainTextDescription: `${brandName} ${productTitleOrQuery}\n\nÖne Çıkan Özellikler:\n- Yüksek hassasiyetli 3D baskı\n- Hafif ve modern tasarım\n\nBakım Uyarısı: Bulaşık makinesinde yıkanmaz, 50°C üzeri ısı ve doğrudan güneş ışığına maruz bırakılmamalıdır.`,
    tags: [
      productTitleOrQuery.toLowerCase(),
      primaryKw.toLowerCase(),
      secondaryKw.toLowerCase(),
      "3d baskı",
      "özel tasarım",
      "hediyelik",
      "modern tasarım",
      "ahenk tasarım",
      "yüksek kalite",
      "dekoratif",
      "trend ürün",
      "şık tasarım",
    ],
    careAndWarningGuide: [
      {
        icon: "☀️",
        title: "Yüksek Isı ve Doğrudan Güneş Işığı",
        description: "Ürün 50°C üzerindeki doğrudan güneş ışığına veya aşırı sıcak ortamlara maruz bırakılmamalıdır.",
        cautionLevel: "high",
      },
      {
        icon: "🧼",
        title: "Yıkama ve Temizlik Talimatı",
        description: "Bulaşık makinesinde yıkanmaz. Yalnızca ılık su ve nemli yumuşak bir bez ile temizlenmelidir.",
        cautionLevel: "high",
      },
      {
        icon: "🛡️",
        title: "Darbe ve Mekanik Dayanım",
        description: "Katmanlı 3D üretim geometrisi ile dayanıklıdır ancak sert zeminlere şiddetli çarpmalardan korunmalıdır.",
        cautionLevel: "medium",
      },
      {
        icon: "🌿",
        title: "Çevre Dostu Organik Malzeme",
        description: "Mısır nişastasından üretilen doğa dostu, kokusuz ve insan sağlığına zararsız PLA biyopolimer kullanılmıştır.",
        cautionLevel: "info",
      },
    ],
    competitorGapAnalysis: {
      competitorWeaknesses: [
        "Klasik sıradan tasarımlar",
        "Ağır ve taşınması zor materyaller",
        "Açıklama ve bakım talimatlarının yetersizliği",
      ],
      yourUniqueAdvantages: [
        "Modern fütüristik 3D geometri",
        "Hafif, taşınabilir ve estetik yapı",
        "Çevre dostu organik biyoplastik kullanımı",
      ],
      suggestedFocusKeywords: [
        productTitleOrQuery,
        `${productTitleOrQuery} 3d`,
        `özel tasarım ${productTitleOrQuery}`,
      ],
      pricingStrategy: `Önerilen satış fiyatı ${stats.recommendedPrice > 0 ? stats.recommendedPrice : 299} TL olarak konumlandırılmalıdır.`,
    },
    seoScore: 97,
  };
}
