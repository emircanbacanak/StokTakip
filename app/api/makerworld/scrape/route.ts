import { NextRequest, NextResponse } from "next/server";

interface FilamentInfo {
  type: string;
  color?: string;
  usedG: number;
  usedM?: string;
}

interface ScrapedMakerWorldProduct {
  id: string;
  makerWorldId: string;
  url: string;
  title: string;
  designer: string;
  designerAvatar?: string;
  coverUrl: string;
  images: string[];
  totalWeightGram: number;
  filaments: FilamentInfo[];
  printTimeMinutes: number;
  tags: string[];
  summary: string;
  platesCount: number;
  scrapedAt: string;
}

function extractModelId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Doğrudan sadece sayı ise (örn: 14207)
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // URL kalıpları: makerworld.com/.../models/123456 veya models/123456...
  const match = trimmed.match(/models\/(\d+)/i);
  if (match && match[1]) {
    return match[1];
  }

  // Alternatif link yapıları: id=123456, design/123456, design-service/design/123456
  const altMatch = trimmed.match(/(?:id=|design\/|design-service\/design\/)(\d+)/i);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }

  // Makerworld domain'i içeren herhangi bir link içindeki ID
  const mwMatch = trimmed.match(/makerworld\.com[^\s"']*\/(\d{3,10})/i);
  if (mwMatch && mwMatch[1]) {
    return mwMatch[1];
  }

  // Metin içinde geçen ilk 5-8 haneli bağımsız model numarası
  const numberMatch = trimmed.match(/\b(\d{4,8})\b/);
  if (numberMatch && numberMatch[1]) {
    return numberMatch[1];
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { links } = body as { links?: string[] | string };

    let urlList: string[] = [];
    if (Array.isArray(links)) {
      urlList = links;
    } else if (typeof links === "string") {
      urlList = links
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (!urlList.length) {
      return NextResponse.json(
        { error: "Lütfen en az bir MakerWorld linki girin." },
        { status: 400 }
      );
    }

    const results: ScrapedMakerWorldProduct[] = [];
    const errors: { url: string; error: string }[] = [];

    for (const rawUrl of urlList) {
      const modelId = extractModelId(rawUrl);
      if (!modelId) {
        errors.push({ url: rawUrl, error: "Geçerli bir MakerWorld model ID'si bulunamadı." });
        continue;
      }

      try {
        const apiUrl = `https://api.bambulab.com/v1/design-service/design/${modelId}`;
        const res = await fetch(apiUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          errors.push({
            url: rawUrl,
            error: `MakerWorld API hatası (${res.status}): ${res.statusText}`,
          });
          continue;
        }

        const data = await res.json();
        if (!data || !data.title) {
          errors.push({ url: rawUrl, error: "Model bilgileri okunamadı veya model silinmiş/gizli." });
          continue;
        }

        // --- 1. SADECE GERÇEK ÜRÜN FOTOĞRAFLARINI TOPLAMA ---
        const imageList: string[] = [];
        const addImage = (url?: string) => {
          if (!url || typeof url !== "string") return;
          const u = url.trim();
          if (!u || !u.startsWith("http")) return;
          if (
            u.includes("plate_") ||
            u.includes("/instance/plate_") ||
            u.includes("/avatar/") ||
            u.includes("flag") ||
            u.includes("/public/us.png") ||
            u.includes("emoji")
          ) {
            return;
          }
          if (!imageList.includes(u)) {
            imageList.push(u);
          }
        };

        addImage(data.coverUrl);

        if (Array.isArray(data.designExtension?.design_pictures)) {
          data.designExtension.design_pictures.forEach((p: any) => {
            addImage(p?.url || p?.bigUrl || p?.middleUrl);
          });
        }

        if (Array.isArray(data.pictures)) {
          data.pictures.forEach((p: any) => {
            addImage(p?.url || p?.bigUrl || p?.middleUrl);
          });
        }

        if (Array.isArray(data.instances)) {
          data.instances.forEach((inst: any) => {
            addImage(inst.cover);
            if (Array.isArray(inst.pictures)) {
              inst.pictures.forEach((p: any) => {
                addImage(p?.url || p?.bigUrl || p?.middleUrl);
              });
            }
          });
        }

        if (data.summary) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
          let match;
          while ((match = imgRegex.exec(data.summary)) !== null) {
            const src = match[1];
            if (src && !src.includes("emoji")) {
              addImage(src);
            }
          }
        }

        // --- 2. KAPSAMLI GRAMAJ, FİLAMENT VE BASKI SÜRESİ ÇÖZÜMLEME ---
        let totalWeight = 0;
        let totalPrintTimeSec = 0;
        let totalPlatesCount = 0;
        const filamentMap = new Map<string, FilamentInfo>();

        if (Array.isArray(data.instances) && data.instances.length > 0) {
          // İlk (varsayılan veya en popüler) baskı profilini al
          const primaryInst = data.instances[0];

          let ext = primaryInst?.extention;
          if (typeof ext === "string") {
            try {
              ext = JSON.parse(ext);
            } catch {}
          }

          // Plakaları tara
          const plates: any[] = [];
          if (Array.isArray(ext)) {
            ext.forEach((item: any) => {
              if (Array.isArray(item?.modelInfo?.plates)) plates.push(...item.modelInfo.plates);
              if (Array.isArray(item?.plates)) plates.push(...item.plates);
              if (item?.weight && totalWeight === 0) totalWeight = Number(item.weight) || 0;
              if (item?.prediction && totalPrintTimeSec === 0) totalPrintTimeSec = Number(item.prediction) || 0;
            });
          } else if (ext) {
            if (Array.isArray(ext?.modelInfo?.plates)) {
              plates.push(...ext.modelInfo.plates);
            } else if (Array.isArray(ext?.plates)) {
              plates.push(...ext.plates);
            }

            if (ext.weight && totalWeight === 0) totalWeight = Number(ext.weight) || 0;
            if (ext.prediction && totalPrintTimeSec === 0) totalPrintTimeSec = Number(ext.prediction) || 0;
          }

          totalPlatesCount = plates.length || 1;

          // Her bir plakanın ağırlık, süre ve filamentlerini topla
          for (const plate of plates) {
            const pWeight = Number(plate.weight) || 0;
            const pTime = Number(plate.prediction) || 0;

            totalWeight += pWeight;
            totalPrintTimeSec += pTime;

            if (Array.isArray(plate.filaments)) {
              for (const f of plate.filaments) {
                const fType = f.type || "PLA";
                const fColor = f.color || "#000000";
                const fUsedG = Number(f.usedG) || 0;
                const key = `${fType}_${fColor}`;

                if (filamentMap.has(key)) {
                  const existing = filamentMap.get(key)!;
                  existing.usedG += fUsedG;
                } else {
                  filamentMap.set(key, {
                    type: fType,
                    color: fColor,
                    usedG: fUsedG,
                    usedM: f.usedM ? String(f.usedM) : undefined,
                  });
                }
              }
            }
          }

          // Eğer modelInfo.plates'ten filament çıkmadıysa instanceFilaments'e bak
          if (filamentMap.size === 0 && ext?.instanceFilaments && Array.isArray(ext.instanceFilaments)) {
            ext.instanceFilaments.forEach((f: any) => {
              const fType = f.type || "PLA";
              const fColor = f.color || "#000000";
              const fUsedG = Number(f.usedG) || 0;
              const key = `${fType}_${fColor}`;
              if (!filamentMap.has(key)) {
                filamentMap.set(key, {
                  type: fType,
                  color: fColor,
                  usedG: fUsedG,
                  usedM: f.usedM ? String(f.usedM) : undefined,
                });
              }
            });
          }
        }

        const filaments = Array.from(filamentMap.values());

        // Eğer toplam gramaj 0 kaldıysa ama filamentlerde gram varsa topla
        if (totalWeight === 0 && filaments.length > 0) {
          totalWeight = filaments.reduce((sum, f) => sum + (f.usedG || 0), 0);
        }

        // Açıklama veya başlıktan gramaj regex yedek araması (örn: "45g", "120 grams")
        if (totalWeight === 0) {
          const textToSearch = `${data.title} ${data.summary || ""}`;
          const gMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gr)\b/i);
          if (gMatch && gMatch[1]) {
            const parsedG = parseFloat(gMatch[1]);
            if (parsedG > 0 && parsedG < 5000) {
              totalWeight = Math.round(parsedG);
            }
          }
        }

        // Tasarımcı
        const designer = data.designCreator?.name || "Bilinmiyor";
        const designerAvatar = data.designCreator?.avatar || "";

        // Açıklama metni temizliği
        const summary = (data.summary || "")
          .replace(/<[^>]*>?/gm, " ")
          .replace(/\s+/g, " ")
          .trim();

        const product: ScrapedMakerWorldProduct = {
          id: `mw-${modelId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          makerWorldId: modelId,
          url: rawUrl.startsWith("http") ? rawUrl : `https://makerworld.com/en/models/${modelId}`,
          title: data.title || "İsimsiz Model",
          designer,
          designerAvatar,
          coverUrl: imageList[0] || data.coverUrl || "",
          images: imageList,
          totalWeightGram: Math.round(totalWeight),
          filaments,
          printTimeMinutes: Math.round(totalPrintTimeSec / 60),
          tags: Array.isArray(data.tags) ? data.tags : [],
          summary,
          platesCount: totalPlatesCount,
          scrapedAt: new Date().toISOString(),
        };

        results.push(product);
      } catch (err: any) {
        errors.push({
          url: rawUrl,
          error: err?.message || "Model çekilirken bağlantı hatası oluştu.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      products: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("MakerWorld Scrape Handler Hatası:", error);
    return NextResponse.json(
      { error: error?.message || "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
