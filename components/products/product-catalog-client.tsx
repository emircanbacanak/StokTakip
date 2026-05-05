"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, ImageIcon, Loader2, Package, Pencil, X, Check, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { Product, CostSettings } from "@/lib/types/database";
import { calculateProductCost, DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import { formatCurrency } from "@/lib/utils";

const inputCls =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

async function removeBackground(file: File): Promise<string> {
  // Dynamic import to avoid SSR issues
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(file, {
    model: "isnet_fp16", // En kaliteli model (isnet_fp16 > isnet > isnet_quint8)
    output: {
      format: "image/png",
      quality: 0.9,
    },
  });
  // Convert to base64 so it can be used as img src without blob: restrictions
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function uploadProductImage(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string,
  productId: string
): Promise<string | null> {
  // Convert blob URL or data URL to blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `products/${productId}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) return null;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

interface ProductFormProps {
  initial?: Product;
  onSave: () => void;
  onCancel: () => void;
}

function ProductForm({ initial, onSave, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [weightGrams, setWeightGrams] = useState<string>(
    initial?.weight_grams ? String(initial.weight_grams) : ""
  );
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [removedBgImage, setRemovedBgImage] = useState<string | null>(null);
  const [useOriginal, setUseOriginal] = useState(true);
  const [removingBg, setRemovingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costSettings, setCostSettings] = useState<CostSettings | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Maliyet ayarlarını yükle
  useEffect(() => {
    async function loadSettings() {
      try {
        const sb = createClient();
        const { data } = await sb.from("cost_settings").select("*").limit(1).single();
        if (data) setCostSettings(data);
      } catch {
        setCostSettings({ id: "", ...DEFAULT_COST_SETTINGS, updated_at: "", updated_by: null });
      }
    }
    loadSettings();
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Orijinal resmi kaydet
    const original = URL.createObjectURL(file);
    setOriginalImage(original);
    setImagePreview(original);
    setUseOriginal(true);
    setRemovedBgImage(null);
  }

  async function handleRemoveBackground() {
    if (!originalImage) return;
    setRemovingBg(true);
    try {
      // Orijinal dosyayı al
      const res = await fetch(originalImage);
      const blob = await res.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });
      
      const result = await removeBackground(file);
      setRemovedBgImage(result);
      setImagePreview(result);
      setUseOriginal(false);
      toast({ title: "Arkaplan kaldırıldı ✓" });
    } catch {
      toast({ title: "Arkaplan kaldırılamadı", variant: "destructive" });
    } finally {
      setRemovingBg(false);
    }
  }

  function switchToOriginal() {
    if (originalImage) {
      setImagePreview(originalImage);
      setUseOriginal(true);
    }
  }

  function switchToRemoved() {
    if (removedBgImage) {
      setImagePreview(removedBgImage);
      setUseOriginal(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast({ title: "Ürün adı gerekli", variant: "destructive" });
      return;
    }
    setSaving(true);
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setSaving(false); return; }

    const id = initial?.id ?? crypto.randomUUID();
    let imageUrl = initial?.image_url ?? null;

    if (imagePreview && imagePreview !== initial?.image_url) {
      const uploaded = await uploadProductImage(sb, imagePreview, id);
      if (uploaded) imageUrl = uploaded;
      else imageUrl = imagePreview; // keep blob url as fallback
    }

    if (initial) {
      await sb.from("products").update({ name: name.trim(), description: description.trim() || null, image_url: imageUrl, weight_grams: parseFloat(weightGrams) || 0 }).eq("id", initial.id);
    } else {
      await sb.from("products").insert({ id, name: name.trim(), description: description.trim() || null, image_url: imageUrl, weight_grams: parseFloat(weightGrams) || 0 });
    }

    toast({ title: initial ? "Ürün güncellendi ✓" : "Ürün eklendi ✓" });
    setSaving(false);
    onSave();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Package className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm text-foreground">{initial ? "Ürünü Düzenle" : "Yeni Ürün"}</span>
      </div>

      {/* Image upload */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Ürün Resmi
        </label>
        <div
          onClick={() => !removingBg && fileRef.current?.click()}
          className="relative w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-muted/30"
        >
          {removingBg ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs font-medium">Arkaplan kaldırılıyor...</span>
            </div>
          ) : imagePreview ? (
            <>
              <img src={imagePreview} alt="preview" className="relative max-h-36 max-w-full object-contain" />
              <button
                onClick={(e) => { e.stopPropagation(); setImagePreview(null); setOriginalImage(null); setRemovedBgImage(null); }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-8 h-8 opacity-40" />
              <span className="text-xs font-medium">Resim seç veya sürükle</span>
              <span className="text-[10px] opacity-60">Yükledikten sonra arkaplan kaldırabilirsiniz</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        
        {/* Arkaplan Kaldırma Seçenekleri */}
        {originalImage && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={switchToOriginal}
              disabled={removingBg}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                useOriginal
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Orijinal Kullan
            </button>
            {removedBgImage ? (
              <button
                type="button"
                onClick={switchToRemoved}
                disabled={removingBg}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  !useOriginal
                    ? "bg-violet-500 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Arkaplan Kaldırılmış
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={removingBg}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-md transition-all disabled:opacity-50"
              >
                {removingBg ? "Kaldırılıyor..." : "Arkaplan Kaldır"}
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Ürün Adı *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ürün adı..." className={inputCls} />
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Açıklama</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ürün açıklaması..." rows={2} className={inputCls + " resize-none"} />
      </div>

      {/* Gramaj */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1">
          <Scale className="w-3 h-3" /> Gramaj (gr)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={weightGrams}
          onChange={(e) => setWeightGrams(e.target.value)}
          placeholder="Örn: 40"
          className={inputCls}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Ürünün baskı ağırlığı. Maliyet hesaplaması için gereklidir.
        </p>
      </div>

      {/* Maliyet Önizlemesi */}
      {costSettings && parseFloat(weightGrams) > 0 && (() => {
        const w = parseFloat(weightGrams);
        const calc = calculateProductCost(w, costSettings);
        return (
          <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Maliyet Önizlemesi
            </p>
            <div className="space-y-1 text-xs">
              {/* Gramaj bilgileri */}
              <div className="flex justify-between text-muted-foreground">
                <span>Ham gramaj:</span>
                <span className="font-medium text-foreground">{w.toFixed(1)} gr</span>
              </div>
              {costSettings.waste_enabled && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Fire dahil gramaj (%{costSettings.waste_percentage}):</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{calc.weightWithWasteGrams.toFixed(1)} gr</span>
                </div>
              )}
              <div className="h-px bg-blue-200 dark:bg-blue-800 my-1" />
              {/* Maliyet kalemleri */}
              {calc.breakdown.filter(b => b.enabled).map((b, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>{b.label}:</span>
                  <span className="font-medium text-foreground">{formatCurrency(b.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t border-blue-200 dark:border-blue-800 pt-1 mt-1">
                <span className="text-foreground">Toplam Maliyet:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(calc.totalCost)}</span>
              </div>
            </div>
            {/* Önerilen satış fiyatları */}
            <div className="grid grid-cols-5 gap-1 pt-1 border-t border-blue-200 dark:border-blue-800">
              {[
                { label: `%${costSettings.profit_margin_1}`, price: calc.suggestedPrices.margin10 },
                { label: `%${costSettings.profit_margin_2}`, price: calc.suggestedPrices.margin20 },
                { label: `%${costSettings.profit_margin_3}`, price: calc.suggestedPrices.margin30 },
                { label: `%${costSettings.profit_margin_4}`, price: calc.suggestedPrices.margin40 },
                { label: `%${costSettings.profit_margin_5}`, price: calc.suggestedPrices.margin50 },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  <p className="text-[11px] font-bold text-foreground">{formatCurrency(item.price)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-xl text-sm hover:bg-muted transition-all">
          İptal
        </button>
        <button onClick={save} disabled={saving || removingBg} className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor...</> : <><Check className="w-3.5 h-3.5" /> Kaydet</>}
        </button>
      </div>
    </div>
  );
}

export function ProductCatalogClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filter, setFilter] = useState<"all" | "no-image">("all");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const topRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setLoading(false); return; }
    const { data } = await sb.from("products").select("*").order("name");
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(p: Product) {
    setEditing(p);
    setShowForm(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  function startAdd() {
    setShowForm(true);
    setEditing(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    const confirmed = await confirm({
      title: "Ürünü Sil",
      message: "Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "İptal",
      variant: "danger",
    });
    
    if (!confirmed) return;
    
    const sb = createClient();
    await sb.from("products").delete().eq("id", id);
    toast({ title: "Ürün silindi" });
    load();
  }

  // Filtreleme
  const filteredProducts = filter === "no-image" 
    ? products.filter(p => !p.image_url)
    : products;
  
  const noImageCount = products.filter(p => !p.image_url).length;

  return (
    <div className="space-y-4">
      <div ref={topRef} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{filteredProducts.length} ürün</p>
          {noImageCount > 0 && (
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filter === "all"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilter("no-image")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filter === "no-image"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Resim Bekleyen ({noImageCount})
              </button>
            </div>
          )}
        </div>
        {!showForm && !editing && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Ürün Ekle
          </button>
        )}
      </div>

      {(showForm) && (
        <ProductForm
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <ProductForm
          initial={editing}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            {filter === "no-image" ? "Tüm ürünlerin resmi var" : "Henüz ürün yok"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {filter === "no-image" ? "Harika! Tüm ürünlerinizin fotoğrafı mevcut" : "Ürün kataloğunuzu oluşturun"}
          </p>
          {filter === "no-image" ? (
            <button onClick={() => setFilter("all")} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
              Tüm Ürünleri Göster
            </button>
          ) : (
            <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
              İlk Ürünü Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all group">
              {/* Image area */}
              <div className="relative h-32 bg-muted flex items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                )}
                {/* Actions overlay - sadece desktop hover'da */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-2">
                  <button
                    onClick={() => { startEdit(p); }}
                    className="w-8 h-8 bg-card/90 dark:bg-card/90 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                {p.weight_grams > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {p.weight_grams} gr
                  </p>
                )}
                {/* Mobil butonlar */}
                <div className="flex gap-2 mt-2 sm:hidden">
                  <button
                    onClick={() => startEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Düzenle
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-500/30 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
