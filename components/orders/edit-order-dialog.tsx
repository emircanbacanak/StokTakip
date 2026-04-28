"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, ShoppingCart, Palette, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { AddColorsDialog } from "./add-colors-dialog";
import type { OrderItem, Product } from "@/lib/types/database";

interface ColorItem { id?: string; color: string; quantity: number }
interface Item { product_name: string; unit_price: number; colors: ColorItem[] }

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

interface Order {
  id: string;
  notes: string | null;
  items: OrderItem[];
  buyer: { name: string };
}

export function EditOrderDialog({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [colorList, setColorList] = useState<string[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [customProductIdx, setCustomProductIdx] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);
  const [showAddColors, setShowAddColors] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [customColors, setCustomColors] = useState<Set<string>>(new Set());
  const [editingColor, setEditingColor] = useState<{ name: string } | null>(null);
  const [editColorName, setEditColorName] = useState("");

  // Mevcut order_items'ı Item formatına dönüştür
  const buildItems = (orderItems: OrderItem[]): Item[] => {
    const map = new Map<string, Item>();
    orderItems.forEach((oi) => {
      const key = `${oi.product_name}__${oi.unit_price}`;
      if (!map.has(key)) {
        map.set(key, { product_name: oi.product_name, unit_price: oi.unit_price, colors: [] });
      }
      map.get(key)!.colors.push({ id: oi.id, color: oi.color, quantity: oi.quantity });
    });
    return Array.from(map.values());
  };

  const [items, setItems] = useState<Item[]>(() => buildItems(order.items));

  useEffect(() => {
    const sb = createClient();
    sb.from("colors").select("name, usage_count").order("usage_count", { ascending: false }).order("name").then(({ data }) => {
      if (data) setColorList(data.map((c: { name: string }) => c.name));
    });
    sb.from("products").select("id, name").order("name").then(({ data }) => {
      if (data) setCatalogProducts(data as Product[]);
    });
  }, []);

  const total = items.reduce((sum, item) => {
    return sum + item.colors.reduce((s, c) => s + c.quantity, 0) * item.unit_price;
  }, 0);

  function updateProductName(idx: number, val: string) {
    const next = [...items];
    next[idx] = { ...next[idx], product_name: val };
    setItems(next);
  }

  function updateUnitPrice(idx: number, price: number) {
    const next = [...items];
    next[idx].unit_price = price;
    setItems(next);
  }

  function updateColor(itemIdx: number, colorIdx: number, field: keyof ColorItem, val: string | number) {
    const next = [...items];
    next[itemIdx].colors[colorIdx] = { ...next[itemIdx].colors[colorIdx], [field]: val };
    setItems(next);
  }

  function addColor(itemIdx: number) {
    const next = [...items];
    next[itemIdx].colors.push({ color: "", quantity: 1 });
    setItems(next);
  }

  function removeColor(itemIdx: number, colorIdx: number) {
    const next = [...items];
    if (next[itemIdx].colors.length > 1) {
      next[itemIdx].colors = next[itemIdx].colors.filter((_, i) => i !== colorIdx);
      setItems(next);
    }
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleAddColors(count: number) {
    if (activeItemIdx === null) return;
    const next = [...items];
    for (let i = 0; i < count; i++) {
      next[activeItemIdx].colors.push({ color: "", quantity: 1 });
    }
    setItems(next);
    setActiveItemIdx(null);
  }

  async function saveCustomColor(colorName: string) {
    const trimmed = colorName.trim();
    if (!trimmed || colorList.includes(trimmed)) return;
    const sb = createClient();
    await sb.from("colors").insert({ name: trimmed });
    setColorList((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b, "tr")));
  }

  async function handleEditColor(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingColor(null); return; }
    const sb = createClient();
    const { data } = await sb.from("colors").select("id").eq("name", oldName).maybeSingle();
    if (data) await sb.from("colors").update({ name: trimmed }).eq("id", data.id);
    setItems((prev) => prev.map((item) => ({
      ...item,
      colors: item.colors.map((c) => c.color === oldName ? { ...c, color: trimmed } : c),
    })));
    setColorList((prev) => prev.map((c) => c === oldName ? trimmed : c).sort((a, b) => a.localeCompare(b, "tr")));
    setEditingColor(null);
    toast({ title: "Renk güncellendi ✓" });
  }

  async function handleDeleteColor(colorName: string) {
    const confirmed = await confirm({
      title: "Rengi Sil",
      message: `"${colorName}" rengini silmek istediğinizden emin misiniz?`,
      confirmText: "Sil", cancelText: "İptal", variant: "danger",
    });
    if (!confirmed) return;
    const sb = createClient();
    await sb.from("colors").delete().eq("name", colorName);
    setColorList((prev) => prev.filter((c) => c !== colorName));
    setItems((prev) => prev.map((item) => ({
      ...item,
      colors: item.colors.map((c) => c.color === colorName ? { ...c, color: "" } : c),
    })));
    toast({ title: "Renk silindi" });
  }

  async function save() {
    if (items.some((i) => !i.product_name)) { toast({ title: "Ürün adlarını doldurun", variant: "destructive" }); return; }
    if (items.some((i) => i.colors.some((c) => !c.color))) { toast({ title: "Renkleri seçin", variant: "destructive" }); return; }

    setSaving(true);
    const sb = createClient();

    // Mevcut order_items'ları id ile map'le - produced/delivered değerlerini koru
    const existingMap = new Map<string, { produced_quantity: number; delivered_quantity: number }>();
    order.items.forEach((oi) => {
      // key: product_name + color kombinasyonu
      existingMap.set(`${oi.product_name}__${oi.color}`, {
        produced_quantity: oi.produced_quantity || 0,
        delivered_quantity: oi.delivered_quantity || 0,
      });
    });

    // Mevcut order_items'ları sil
    await sb.from("order_items").delete().eq("order_id", order.id);

    // Yeni order_items ekle - mevcut produced/delivered değerlerini koru
    const orderItems = items.flatMap((item) =>
      item.colors.map((c) => {
        const existing = existingMap.get(`${item.product_name}__${c.color}`);
        return {
          order_id: order.id,
          product_name: item.product_name,
          color: c.color,
          quantity: c.quantity,
          unit_price: item.unit_price,
          produced_quantity: existing?.produced_quantity ?? 0,
          delivered_quantity: existing?.delivered_quantity ?? 0,
        };
      })
    );

    await sb.from("order_items").insert(orderItems);

    // Toplam tutarı güncelle
    await sb.from("orders").update({
      total_amount: total,
      notes: notes || null,
    }).eq("id", order.id);

    // Renk kullanım sayaçlarını artır
    const usedColors = [...new Set(items.flatMap((item) => item.colors.map((c) => c.color).filter(Boolean)))];
    for (const colorName of usedColors) {
      const { data } = await sb.from("colors").select("id, usage_count").eq("name", colorName).maybeSingle();
      if (data) await sb.from("colors").update({ usage_count: (data.usage_count || 0) + 1 }).eq("id", data.id);
    }

    toast({ title: "Sipariş güncellendi ✓" });
    setSaving(false);
    onSuccess();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[94vh] flex flex-col border border-border shadow-2xl">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Siparişi Düzenle</h2>
                <p className="text-xs text-muted-foreground">{order.buyer.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Ürünler */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ürünler</label>
                <button
                  onClick={() => setItems([{ product_name: "", unit_price: 0, colors: [{ color: "", quantity: 1 }] }, ...items])}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Ürün Ekle
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, itemIdx) => (
                  <div key={itemIdx} className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
                    {/* Ürün Adı + Fiyat */}
                    <div className="grid grid-cols-[1fr,120px] gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1.5 block font-medium">ÜRÜN ADI *</label>
                        {catalogProducts.length > 0 && !customProductIdx.has(itemIdx) ? (
                          <select
                            value={item.product_name || ""}
                            onChange={(e) => {
                              if (e.target.value === "__custom__") {
                                setCustomProductIdx((prev) => new Set(prev).add(itemIdx));
                                updateProductName(itemIdx, "");
                              } else {
                                updateProductName(itemIdx, e.target.value);
                              }
                            }}
                            className={inputCls}
                          >
                            <option value="">Ürün seçin...</option>
                            {catalogProducts.map((p) => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                            <option value="__custom__">— Manuel gir</option>
                          </select>
                        ) : (
                          <div className="flex gap-1.5">
                            <input
                              autoFocus={customProductIdx.has(itemIdx)}
                              placeholder="Ürün adı yazın..."
                              value={item.product_name || ""}
                              onChange={(e) => updateProductName(itemIdx, e.target.value)}
                              className={inputCls}
                            />
                            {catalogProducts.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomProductIdx((prev) => { const s = new Set(prev); s.delete(itemIdx); return s; });
                                  updateProductName(itemIdx, "");
                                }}
                                className="shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors"
                                title="Listeden seç"
                              >↩</button>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1.5 block font-medium">BİRİM FİYAT (₺)</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unit_price || 0}
                          onChange={(e) => updateUnitPrice(itemIdx, parseFloat(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Renkler */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Palette className="w-3 h-3" /> RENKLER ({item.colors.length})
                        </label>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => { setActiveItemIdx(itemIdx); setShowAddColors(true); }}
                            className="text-[10px] text-violet-600 font-semibold hover:underline">Toplu Ekle</button>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <button type="button" onClick={() => addColor(itemIdx)}
                            className="text-[10px] text-blue-600 font-semibold hover:underline">+ Renk</button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {item.colors.map((colorItem, colorIdx) => (
                          <div key={colorIdx} className="grid grid-cols-[1fr,80px,auto] gap-2 items-end">
                            <div>
                              {colorIdx === 0 && <label className="text-[9px] text-muted-foreground mb-1 block">RENK</label>}
                              {customColors.has(`${itemIdx}-${colorIdx}`) ? (
                                <div className="flex gap-1">
                                  <input autoFocus placeholder="Renk adı..." value={colorItem.color || ""}
                                    onChange={(e) => updateColor(itemIdx, colorIdx, "color", e.target.value)}
                                    onBlur={(e) => saveCustomColor(e.target.value)}
                                    className={inputCls + " text-xs"} />
                                  <button type="button" onClick={() => {
                                    setCustomColors((prev) => { const s = new Set(prev); s.delete(`${itemIdx}-${colorIdx}`); return s; });
                                    updateColor(itemIdx, colorIdx, "color", "");
                                  }} className="shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl">↩</button>
                                </div>
                              ) : editingColor?.name === colorItem.color ? (
                                <div className="flex gap-1">
                                  <input autoFocus value={editColorName} onChange={(e) => setEditColorName(e.target.value)}
                                    onBlur={() => handleEditColor(editingColor.name, editColorName)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleEditColor(editingColor.name, editColorName); if (e.key === "Escape") setEditingColor(null); }}
                                    className={inputCls + " text-xs"} />
                                  <button type="button" onClick={() => setEditingColor(null)}
                                    className="shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl">✕</button>
                                </div>
                              ) : (
                                <div className="flex gap-1 items-center">
                                  <select value={colorItem.color || ""}
                                    onChange={(e) => {
                                      if (e.target.value === "__custom__") {
                                        setCustomColors((prev) => new Set(prev).add(`${itemIdx}-${colorIdx}`));
                                        updateColor(itemIdx, colorIdx, "color", "");
                                      } else {
                                        updateColor(itemIdx, colorIdx, "color", e.target.value);
                                      }
                                    }}
                                    className={inputCls + " text-xs flex-1"}>
                                    <option value="">Seçin</option>
                                    {colorList.map((c) => <option key={c} value={c}>{c}</option>)}
                                    <option value="__custom__">✏️ Özel renk gir...</option>
                                  </select>
                                  {colorItem.color && (
                                    <>
                                      <button type="button" title="Rengi düzenle"
                                        onClick={() => { setEditingColor({ name: colorItem.color }); setEditColorName(colorItem.color); }}
                                        className="shrink-0 w-7 h-9 flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 border border-border rounded-lg transition-all">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button type="button" title="Rengi sil"
                                        onClick={() => handleDeleteColor(colorItem.color)}
                                        className="shrink-0 w-7 h-9 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-border rounded-lg transition-all">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              {colorIdx === 0 && <label className="text-[9px] text-muted-foreground mb-1 block">ADET</label>}
                              <input type="number" min="1" value={colorItem.quantity || 1}
                                onChange={(e) => updateColor(itemIdx, colorIdx, "quantity", parseInt(e.target.value) || 1)}
                                className={inputCls + " text-xs text-center"} />
                            </div>
                            <div>
                              {item.colors.length > 1 && (
                                <button type="button" onClick={() => removeColor(itemIdx, colorIdx)}
                                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Özet */}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {item.colors.reduce((s, c) => s + c.quantity, 0)} adet · {item.colors.length} renk · {formatCurrency(item.unit_price)}/adet
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">
                          {formatCurrency(item.colors.reduce((s, c) => s + c.quantity, 0) * item.unit_price)}
                        </span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(itemIdx)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                            <Trash2 className="w-3 h-3" /> Ürünü Kaldır
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Toplam */}
            <div className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-xl p-4 border border-blue-500/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Toplam Tutar</span>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Notlar</label>
              <textarea placeholder="Sipariş notu..." value={notes || ""} onChange={(e) => setNotes(e.target.value)} rows={2}
                className={inputCls + " resize-none"} />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex gap-3">
            <button onClick={onClose} className="flex-1 border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-all">İptal</button>
            <button onClick={save} disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
              {saving ? "Kaydediliyor..." : "Güncelle"}
            </button>
          </div>
        </div>
      </div>

      <AddColorsDialog open={showAddColors} onClose={() => { setShowAddColors(false); setActiveItemIdx(null); }} onConfirm={handleAddColors} />
      <ConfirmDialog />
    </>
  );
}
