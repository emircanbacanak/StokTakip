import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export interface FilamentItem {
  type: string;
  color?: string;
  usedG: number;
  usedM?: string;
}

export interface DownloadProductItem {
  title: string;
  makerWorldId: string;
  coverUrl?: string;
  images: string[];
  totalWeightGram?: number;
  designer?: string;
  tags?: string[];
  summary?: string;
  url?: string;
  filaments?: FilamentItem[];
  printTimeMinutes?: number;
}

function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { products, mode = "save_to_folder" } = body as {
      products: DownloadProductItem[];
      mode?: "save_to_folder" | "zip";
    };

    if (!products || !products.length) {
      return NextResponse.json(
        { error: "İndirilecek ürün bulunamadı." },
        { status: 400 }
      );
    }

    // Ana indirme dizini: Proje dizininde `downloads/makerworld`
    const baseDownloadsDir = path.join(process.cwd(), "downloads", "makerworld");
    if (!fs.existsSync(baseDownloadsDir)) {
      fs.mkdirSync(baseDownloadsDir, { recursive: true });
    }

    if (mode === "zip") {
      const zip = new AdmZip();

      for (const prod of products) {
        const folderName = sanitizeFolderName(prod.title || `model_${prod.makerWorldId}`);
        const filText = (prod.filaments || [])
          .map((f) => `- ${f.type} (${f.color || "#000"}): ${f.usedG}g`)
          .join("\n");

        // Ürün bilgi metni
        const infoText = `Ürün Adı: ${prod.title}
MakerWorld ID: ${prod.makerWorldId}
Orijinal Link: ${prod.url || ""}
Tasarımcı: ${prod.designer || ""}
Toplam Gramaj: ${prod.totalWeightGram || 0}g
Tahmini Baskı Süresi: ${
          prod.printTimeMinutes
            ? `${Math.floor(prod.printTimeMinutes / 60)} saat ${prod.printTimeMinutes % 60} dakika`
            : "Belirtilmemiş"
        }
Filament / Renk Kırılımları:
${filText || "- Standart / Tek Renk"}
Etiketler: ${(prod.tags || []).join(", ")}
Açıklama: ${prod.summary || ""}
`;
        zip.addFile(`${folderName}/urun_bilgileri.txt`, Buffer.from(infoText, "utf-8"));

        // Resimleri indirip ZIP'e ekleme
        const imagesToFetch =
          prod.images && prod.images.length > 0
            ? prod.images
            : prod.coverUrl
            ? [prod.coverUrl]
            : [];

        let imgIdx = 1;
        for (const imgUrl of imagesToFetch) {
          try {
            const res = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
              const imgName = `${folderName}/foto_${imgIdx}${ext}`;
              zip.addFile(imgName, buffer);
              imgIdx++;
            }
          } catch (e) {
            console.error(`Resim indirme hatası (${imgUrl}):`, e);
          }
        }
      }

      const zipBuffer = zip.toBuffer();
      const filename = `MakerWorld_Urunler_${Date.now()}.zip`;

      return new Response(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Mode: "save_to_folder" -> Sunucu diski üzerine klasörler halinde kaydet
    const savedFolders: { title: string; folderPath: string; imageCount: number }[] = [];

    for (const prod of products) {
      const folderName = sanitizeFolderName(prod.title || `model_${prod.makerWorldId}`);
      const targetDir = path.join(baseDownloadsDir, folderName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filText = (prod.filaments || [])
        .map((f) => `- ${f.type} (${f.color || "#000"}): ${f.usedG}g`)
        .join("\n");

      // Bilgi dosyasını yaz
      const infoText = `Ürün Adı: ${prod.title}
MakerWorld ID: ${prod.makerWorldId}
Orijinal Link: ${prod.url || ""}
Tasarımcı: ${prod.designer || ""}
Toplam Gramaj: ${prod.totalWeightGram || 0}g
Tahmini Baskı Süresi: ${
        prod.printTimeMinutes
          ? `${Math.floor(prod.printTimeMinutes / 60)} saat ${prod.printTimeMinutes % 60} dakika`
          : "Belirtilmemiş"
      }
Filament / Renk Kırılımları:
${filText || "- Standart / Tek Renk"}
Etiketler: ${(prod.tags || []).join(", ")}
Açıklama: ${prod.summary || ""}
İndirilme Tarihi: ${new Date().toLocaleString("tr-TR")}
`;
      fs.writeFileSync(path.join(targetDir, "urun_bilgileri.txt"), infoText, "utf-8");

      // Fotoğrafları indir ve kaydet
      const imagesToFetch =
        prod.images && prod.images.length > 0
          ? prod.images
          : prod.coverUrl
          ? [prod.coverUrl]
          : [];
      let savedImgCount = 0;

      for (let i = 0; i < imagesToFetch.length; i++) {
        const imgUrl = imagesToFetch[i];
        try {
          const res = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
            const imgFilename = `${sanitizeFolderName(prod.title)}_${i + 1}${ext}`;
            fs.writeFileSync(path.join(targetDir, imgFilename), buffer);
            savedImgCount++;
          }
        } catch (err) {
          console.error(`Görsel indirme hatası: ${imgUrl}`, err);
        }
      }

      savedFolders.push({
        title: prod.title,
        folderPath: targetDir,
        imageCount: savedImgCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${savedFolders.length} adet ürün klasörü oluşturuldu ve fotoğraflar kaydedildi.`,
      baseDirectory: baseDownloadsDir,
      savedFolders,
    });
  } catch (error: any) {
    console.error("MakerWorld Download Hatası:", error);
    return NextResponse.json(
      { error: error?.message || "İndirme sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
