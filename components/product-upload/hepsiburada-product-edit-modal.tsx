"use client";

import { useState } from "react";
import {
  X,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  DollarSign,
  Package,
  Clock,
  Truck,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export interface HepsiburadaListingItem {
  listingId?: string;
  hepsiburadaSku?: string;
  merchantSku: string;
  price: number | { amount: number; currency: string };
  availableStock?: number;
  dispatchTime?: number;
  cargoCompany1?: string;
  isSalable?: boolean;
  productName?: string;
  title?: string;
  description?: string;
  images?: string[];
  [key: string]: any;
}

interface Props {
  listing: HepsiburadaListingItem;
  onClose: () => void;
  onSaved: () => void;
}

export function HepsiburadaProductEditModal({ listing, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form State
  const initialPrice =
    typeof listing.price === "number"
      ? listing.price
      : listing.price?.amount || 0;

  const [price, setPrice] = useState<number>(initialPrice);
  const [stock, setStock] = useState<number>(listing.availableStock ?? 0);
  const [dispatchTime, setDispatchTime] = useState<number>(listing.dispatchTime ?? 2);
  const [cargoCompany, setCargoCompany] = useState<string>(listing.cargoCompany1 || "Aras Kargo");
  const [isSalable, setIsSalable] = useState<boolean>(listing.isSalable ?? true);

  // Görseller & Bilgiler
  const [title, setTitle] = useState<string>(listing.productName || listing.title || `3D Baskı Ürün (${listing.merchantSku})`);
  const [description, setDescription] = useState<string>(listing.description || "Ahenk Tasarım kaliteli 3D baskı geometrik tasarım ürünü.");
  const [images, setImages] = useState<string[]>(
    listing.images && listing.images.length > 0
      ? listing.images
      : ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800"]
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  // Resim Ekleme
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 10) {
      toast({ title: "Görsel Limiti", description: "En fazla 10 görsel ekleyebilirsiniz.", variant: "destructive" });
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
    toast({ title: "Görsel Eklendi", description: "Yeni görsel listeye eklendi." });
  };

  // Resim Silme
  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      toast({ title: "Uyarı", description: "En az 1 adet görsel bulunmalıdır.", variant: "destructive" });
      return;
    }
    setImages(images.filter((_, i) => i !== index));
  };

  // Kaydetme (Hem Envanter hem Katalog)
  const handleSave = async () => {
    if (price <= 0) {
      toast({ title: "Geçersiz Fiyat", description: "Fiyat 0'dan büyük olmalıdır.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Envanter & Fiyat / Stok Güncellemesi (PUT /api/hepsiburada/listings)
      const invRes = await fetch("/api/hepsiburada/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hepsiburadaSku: listing.hepsiburadaSku,
          merchantSku: listing.merchantSku,
          price: Number(price),
          availableStock: Number(stock),
          dispatchTime: Number(dispatchTime),
          cargoCompany1: cargoCompany,
          isSalable: isSalable,
        }),
      });

      const invData = await invRes.json();
      if (!invRes.ok || !invData.success) {
        throw new Error(invData.error || invData.message || "Envanter güncellenemedi");
      }

      // 2. Katalog & Görsel Güncellemesi (POST /api/hepsiburada/catalog-update)
      let catalogTrackingId = "";
      try {
        const catRes = await fetch("/api/hepsiburada/catalog-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantSku: listing.merchantSku,
            title,
            description,
            price: Number(price),
            stock: Number(stock),
            images,
          }),
        });
        const catData = await catRes.json();
        if (catData.success && catData.trackingId) {
          catalogTrackingId = catData.trackingId;
        }
      } catch {
        // Envanter başarıyla güncellendiyse devam et
      }

      toast({
        title: "Güncelleme Başarılı",
        description: `Hepsiburada SIT listelemesi güncellendi. ${
          invData.batchId ? `(Batch ID: ${invData.batchId})` : ""
        } ${catalogTrackingId ? `(Tracking: ${catalogTrackingId})` : ""}`,
      });

      onSaved();
    } catch (err: any) {
      toast({
        title: "Güncelleme Hatası",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Hepsiburada Ürün & Listeleme Düzenle</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/30">
                CANLI MOD
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Merchant SKU: <span className="font-bold text-foreground">{listing.merchantSku}</span>
              {listing.hepsiburadaSku && (
                <span className="ml-2">| HB SKU: {listing.hepsiburadaSku}</span>
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Fiyat & Stok Ayarları */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Fiyat, Stok ve Satış Ayarları
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">Satış Fiyatı (₺)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">Kullanılabilir Stok</label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">Kargoya Veriliş (Gün)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">Kargo Firması</label>
                <select
                  value={cargoCompany}
                  onChange={(e) => setCargoCompany(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl bg-background border border-input px-3 text-foreground"
                >
                  <option value="Aras Kargo">Aras Kargo</option>
                  <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                  <option value="MNG Kargo">MNG Kargo</option>
                  <option value="Sendeo">Sendeo</option>
                  <option value="Kolay Gelsin">Kolay Gelsin</option>
                  <option value="HepsiJET">HepsiJET</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">Satış Durumu</label>
                <div className="flex items-center gap-3 h-9">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isSalable}
                      onChange={(e) => setIsSalable(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded-sm cursor-pointer"
                    />
                    <span className={isSalable ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}>
                      {isSalable ? "Satışta (Aktif)" : "Satış Dışı (Pasif)"}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ürün Başlık ve Açıklama */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              Ürün Adı ve Açıklaması
            </h4>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Ürün Başlığı</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ürün adı girin..."
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Ürün Açıklaması</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-xl bg-background border border-input p-3 text-foreground resize-none focus:outline-hidden focus:ring-1 focus:ring-ring"
                placeholder="Açıklama girin..."
              />
            </div>
          </div>

          {/* 3. Görsel Yönetimi (Ekle / Sil / Değiştir) */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-600" />
                Ürün Görselleri ({images.length} Adet)
              </h4>
            </div>

            {/* Görsel Ekleme Girişi */}
            <div className="flex items-center gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Yeni görsel URL'si yapıştırın (https://...)"
                className="h-9 text-xs rounded-xl flex-1 bg-background"
              />
              <Button
                type="button"
                onClick={handleAddImage}
                size="sm"
                className="h-9 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Görsel Ekle
              </Button>
            </div>

            {/* Görsel Galerisi & Silme */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl border border-border overflow-hidden bg-background aspect-square flex items-center justify-center p-1"
                >
                  <img
                    src={imgUrl}
                    alt={`Görsel ${idx + 1}`}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/200x200?text=Görsel+Hatalı";
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    #{idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer"
                    title="Görseli Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Alt Butonları */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-xs font-semibold rounded-xl"
          >
            İptal
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 mr-1.5 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Hepsiburada SIT'e Kaydediliyor..." : "Değişiklikleri Hepsiburada'ya Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
