"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/types/database";
import { Loader2, Save, DollarSign, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function ProductPricesTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;

      setProducts(data || []);
      
      // Mevcut fiyatları state'e yükle
      const priceMap: Record<string, string> = {};
      (data || []).forEach(p => {
        if (p.price !== null) {
          priceMap[p.id] = String(p.price);
        }
      });
      setPrices(priceMap);
    } catch (error) {
      console.error("Ürünler yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ürünler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handlePriceChange = (productId: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const savePrice = async (productId: string) => {
    const priceStr = prices[productId];
    if (!priceStr || priceStr.trim() === "") {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir fiyat girin",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir fiyat girin",
        variant: "destructive",
      });
      return;
    }

    setSaving(productId);
    try {
      const sb = createClient();
      const { error } = await sb
        .from("products")
        .update({ price })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Fiyat kaydedildi",
      });

      // Ürün listesini güncelle
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, price } : p))
      );
    } catch (error) {
      console.error("Fiyat kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Fiyat kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const clearPrice = async (productId: string) => {
    setSaving(productId);
    try {
      const sb = createClient();
      const { error } = await sb
        .from("products")
        .update({ price: null })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Fiyat temizlendi",
      });

      // State'i güncelle
      setPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[productId];
        return newPrices;
      });

      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, price: null } : p))
      );
    } catch (error) {
      console.error("Fiyat temizlenirken hata:", error);
      toast({
        title: "Hata",
        description: "Fiyat temizlenemedi",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Ürün Fiyatları</h2>
            <p className="text-sm text-white/80">Ürünlerinize satış fiyatı belirleyin</p>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ürün
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gramaj
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mevcut Fiyat
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Yeni Fiyat
                </th>
                <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">
                      {product.has_sizes ? (
                        <span className="text-xs text-muted-foreground">Boyutlu</span>
                      ) : (
                        `${product.weight_grams} gr`
                      )}
                    </span>
                  </td>
                  <td className="p-4">
                    {product.price !== null ? (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(product.price)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Fiyat yok</span>
                    )}
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prices[product.id] || ""}
                      onChange={(e) => handlePriceChange(product.id, e.target.value)}
                      placeholder="Fiyat girin..."
                      className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => savePrice(product.id)}
                        disabled={saving === product.id || !prices[product.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving === product.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Kaydet
                      </button>
                      {product.price !== null && (
                        <button
                          onClick={() => clearPrice(product.id)}
                          disabled={saving === product.id}
                          className="px-3 py-1.5 border border-border text-muted-foreground text-xs font-semibold rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Temizle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Henüz ürün eklenmemiş</p>
        </div>
      )}
    </div>
  );
}
