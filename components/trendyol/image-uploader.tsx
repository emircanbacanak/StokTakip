"use client";

/**
 * ImageUploader — ImgBB'ye yükle, kalıcı URL döner
 *
 * Düzeltme: onChange stale closure sorunu giderildi.
 * Yüklenen URL'ler doğrudan onChange'e iletilir, value prop'a bağımlı değil.
 */

import { useState, useCallback, useRef } from "react";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

const MAX_SIZE_MB = 32;

async function uploadToImgBB(file: File, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("NEXT_PUBLIC_IMGBB_API_KEY tanımlı değil");
  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append("image", base64.split(",")[1]);
  form.append("name", file.name.replace(/\.[^.]+$/, ""));

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`ImgBB ${res.status}: ${(await res.text()).substring(0, 200)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message ?? "Yükleme başarısız");
  return data.data.display_url as string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({ value, onChange, maxImages = 8 }: ImageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── stale closure'ı önlemek için value'yu ref'te tut ────────────────────
  const valueRef = useRef(value);
  valueRef.current = value;

  const activeUploads = uploading.filter(u => u.status === "uploading").length;
  const canUploadMore = value.length + activeUploads < maxImages;

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? "";
    const arr = Array.from(files);

    // valueRef.current ile ANLIK değere eriş (stale değil)
    const currentValue = valueRef.current;
    const remaining = maxImages - currentValue.length;

    if (remaining <= 0) {
      toast({ title: `Maksimum ${maxImages} görsel`, variant: "destructive" });
      return;
    }

    const toProcess = arr.slice(0, remaining);

    if (arr.length > remaining) {
      toast({
        title: `Maksimum ${maxImages} görsel`,
        description: `${arr.length - remaining} dosya atlandı`,
        variant: "destructive",
      });
    }

    const oversized = toProcess.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length) {
      toast({
        title: "Dosya çok büyük",
        description: `${oversized.map(f => f.name).join(", ")} — max ${MAX_SIZE_MB}MB`,
        variant: "destructive",
      });
      return;
    }

    // Kuyruk oluştur
    const queue: UploadingFile[] = toProcess.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "uploading" as const,
    }));

    setUploading(prev => [...prev, ...queue]);

    // Paralel yükleme
    const results = await Promise.allSettled(
      toProcess.map(file => uploadToImgBB(file, apiKey))
    );

    const successUrls: string[] = [];
    const updatedQueue = queue.map((item, i) => {
      const result = results[i];
      if (result.status === "fulfilled") {
        successUrls.push(result.value);
        return { ...item, status: "done" as const };
      } else {
        toast({
          title: `Yükleme hatası: ${item.name}`,
          description: result.reason?.message ?? "Bilinmeyen hata",
          variant: "destructive",
        });
        return { ...item, status: "error" as const, error: result.reason?.message };
      }
    });

    // Queue durumunu güncelle
    setUploading(prev =>
      prev.map(u => {
        const found = updatedQueue.find(q => q.id === u.id);
        return found ?? u;
      })
    );

    // ── Kritik düzeltme: valueRef.current ile anlık listeye ekle ─────────
    if (successUrls.length > 0) {
      onChange([...valueRef.current, ...successUrls]);
    }

    // 3 saniye sonra done/error olanları temizle
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.status === "uploading"));
    }, 3000);
  }, [maxImages, onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removeUrl = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  return (
    <div className="space-y-3">
      {/* API Key uyarısı */}
      {!apiKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>NEXT_PUBLIC_IMGBB_API_KEY</strong> .env.local dosyasına eklenmedi.{" "}
            <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              imgbb.com/api
            </a>{" "}
            üzerinden ücretsiz key alın.
          </span>
        </div>
      )}

      {/* Yükleme alanı */}
      {canUploadMore && (
        <div
          className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
            ${dragOver
              ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 scale-[1.01]"
              : "border-border hover:border-orange-400 hover:bg-muted/30"
            }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center select-none">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors
              ${dragOver ? "bg-orange-100 dark:bg-orange-900/30" : "bg-muted"}`}>
              <ImagePlus className={`w-6 h-6 ${dragOver ? "text-orange-500" : "text-muted-foreground"}`} />
            </div>
            <p className="text-sm font-medium">
              {dragOver ? "Bırakın!" : "Görsel sürükleyin veya tıklayın"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WEBP — max {MAX_SIZE_MB}MB · {value.length}/{maxImages} yüklendi
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
              ImgBB&apos;ye otomatik yüklenip URL alınır
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) {
                processFiles(e.target.files);
                // input'u sıfırla — aynı dosyayı tekrar seçebilmek için
                e.target.value = "";
              }
            }}
          />
        </div>
      )}

      {/* Aktif yükleme kuyruğu */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map(u => (
            <div key={u.id} className={`flex items-center gap-3 p-2 rounded-lg border text-xs
              ${u.status === "error"
                ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                : "border-border bg-muted/30"}`}>
              <img src={u.preview} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
              <span className="flex-1 truncate font-medium">{u.name}</span>
              {u.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-orange-500 shrink-0" />}
              {u.status === "done" && <span className="text-green-600 shrink-0 font-medium">✓ Yüklendi</span>}
              {u.status === "error" && (
                <span className="text-red-600 shrink-0 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Hata
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Yüklenmiş görseller grid'i */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {value.map((url, idx) => (
            <div key={`${url}-${idx}`} className="group relative aspect-square rounded-xl overflow-hidden border bg-muted">
              <img
                src={url}
                alt={`Görsel ${idx + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23374151'/%3E%3C/svg%3E";
                }}
              />
              {/* Sıra numarası */}
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              {/* Sil */}
              <button
                type="button"
                onClick={() => removeUrl(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
              {/* Ana görsel rozeti */}
              {idx === 0 && (
                <div className="absolute bottom-0 left-0 right-0 text-center pb-1">
                  <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                    Ana Görsel
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
