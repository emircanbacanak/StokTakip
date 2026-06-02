"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Loader2, X, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProductImage } from "@/lib/types/database";

interface ProductGalleryProps {
  productId: string;
  onClose: () => void;
}

export function ProductGallery({ productId, onClose }: ProductGalleryProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const sb = createClient();

  useEffect(() => {
    loadImages();
  }, [productId]);

  async function loadImages() {
    const { data, error } = await sb
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    
    if (error) {
      toast({ title: "Resimler yüklenemedi", description: error.message, variant: "destructive" });
    } else {
      setImages(data || []);
    }
    setLoading(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.type.includes("png") ? "png" : "jpg";
      const fileName = `${productId}_${Date.now()}_${i}.${ext}`;
      const path = `products/gallery/${fileName}`;

      const { error: uploadError } = await sb.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload error", uploadError);
        continue;
      }

      const { data: publicData } = sb.storage.from("product-images").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;

      const { error: dbError } = await sb.from("product_images").insert({
        product_id: productId,
        url: publicUrl,
        sort_order: images.length + i,
      });

      if (!dbError) {
        successCount++;
      }
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    
    if (successCount > 0) {
      toast({ title: `${successCount} resim eklendi ✓` });
      loadImages();
    } else {
      toast({ title: "Resim eklenemedi", variant: "destructive" });
    }
  }

  async function deleteImage(imageId: string, url: string) {
    if (!confirm("Bu resmi silmek istediğinizden emin misiniz?")) return;

    // Supabase storage'dan sil
    try {
      const urlParts = url.split("/");
      const pathPart = urlParts.slice(urlParts.findIndex(p => p === "product-images") + 1).join("/");
      await sb.storage.from("product-images").remove([pathPart]);
    } catch (e) {
      console.log("Storage deletion failed, continuing with db deletion", e);
    }

    const { error } = await sb.from("product_images").delete().eq("id", imageId);
    
    if (error) {
      toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resim silindi" });
      loadImages();
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <ImageIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">Ürün Galerisi (Çoklu Resim)</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Bu alandan ürün için birden fazla resim ekleyebilirsiniz. Ahenk Tasarım (Vitrin) tarafında bu resimler kaydırmalı (slider) olarak gösterilecektir.
      </p>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-xl border border-border bg-muted overflow-hidden group">
              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => deleteImage(img.id, img.url)}
                  className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative aspect-square rounded-xl border-2 border-dashed border-border hover:border-violet-500/50 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/30"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <span className="text-xs font-semibold">Resim Ekle</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}
    </div>
  );
}
