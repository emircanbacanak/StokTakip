"use client";

/**
 * TrendyolListingsClient — Gönderilmiş ürünlerin listesi ve yönetimi
 */

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, Send, Search, Filter, Eye, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { TrendyolListing, TrendyolStatus } from "@/lib/types/database";
import { ProductForm } from "./product-form";

// ─── DURUM RENKLERİ ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TrendyolStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  draft: {
    label: "Taslak",
    icon: <Clock className="w-3.5 h-3.5" />,
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  pending: {
    label: "Bekliyor",
    icon: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
    cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  approved: {
    label: "Onaylandı",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  rejected: {
    label: "Reddedildi",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
  passive: {
    label: "Pasif",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  },
};

// ─── BİLEŞEN ─────────────────────────────────────────────────────────────────
export function TrendyolListingsClient() {
  const { toast } = useToast();
  const [listings, setListings] = useState<TrendyolListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TrendyolStatus | "all">("all");
  const [selectedListing, setSelectedListing] = useState<TrendyolListing | null>(null);
  const [editMode, setEditMode] = useState(false);

  // ── Yükle ──────────────────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const sb = createClient();
      let q = sb
        .from("trendyol_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") q = q.eq("trendyol_status", statusFilter);
      if (search.trim().length > 0) q = q.ilike("title", `%${search.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;
      setListings((data ?? []) as TrendyolListing[]);
    } catch (e) {
      toast({
        title: "Yükleme hatası",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, toast]);

  useEffect(() => { loadListings(); }, [loadListings]);

  // ── Yeniden gönder ────────────────────────────────────────────────────────
  const handleResubmit = useCallback(
    async (listing: TrendyolListing) => {
      toast({ title: "Yeniden gönderiliyor…" });
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

      const { submitProductToTrendyol } = await import("@/lib/trendyol-api-client");
      const result = await submitProductToTrendyol(
        {
          listing_id: listing.id,
          title: listing.title,
          description: listing.description,
          brand_name: listing.brand_name,
          list_price: listing.list_price,
          sale_price: listing.sale_price,
          vat_rate: listing.vat_rate,
          quantity: listing.quantity,
          image_urls: listing.image_urls,
          cargo_company: listing.cargo_company ?? undefined,
          desi: listing.desi ?? undefined,
          warranty_months: listing.warranty_months,
        },
        supabaseUrl,
        anonKey
      );

      if (result.success) {
        toast({ title: "Başarıyla yeniden gönderildi" });
        loadListings();
      } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
      }
    },
    [toast, loadListings]
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  // Düzenleme modu
  if (editMode && selectedListing) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setSelectedListing(null); }}>
            ← Geri
          </Button>
          <h2 className="text-base font-semibold">Ürünü Düzenle</h2>
        </div>
        <ProductForm
          listingId={selectedListing.id}
          onSuccess={() => { setEditMode(false); setSelectedListing(null); loadListings(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Araçlar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ürün adı ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TrendyolStatus | "all")}
        >
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {(Object.keys(STATUS_CONFIG) as TrendyolStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadListings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Özet bandı */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(STATUS_CONFIG) as TrendyolStatus[]).map((s) => {
          const count = listings.filter((l) => l.trendyol_status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${STATUS_CONFIG[s].cls} ${statusFilter === s ? "ring-2 ring-offset-1 ring-current" : ""}`}
            >
              {STATUS_CONFIG[s].icon}
              {STATUS_CONFIG[s].label}
              <span className="font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Henüz ürün gönderilmemiş</p>
            <p className="text-xs mt-1">
              "Ürün Ekle" veya "Toplu Yükleme" sekmesini kullanın
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {listings.map((listing) => {
            const cfg = STATUS_CONFIG[listing.trendyol_status];
            return (
              <Card key={listing.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Görsel */}
                    {listing.image_urls[0] ? (
                      <img
                        src={listing.image_urls[0]}
                        alt={listing.title}
                        className="w-14 h-14 object-cover rounded-lg shrink-0 border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Detay */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2">
                        <p className="font-medium text-sm truncate flex-1">{listing.title}</p>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${cfg.cls}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>₺{listing.sale_price.toFixed(2)}</span>
                        <span>Stok: {listing.quantity}</span>
                        <span>KDV: %{listing.vat_rate}</span>
                        {listing.barcode && (
                          <span className="font-mono">
                            Barkod: {listing.barcode}
                          </span>
                        )}
                      </div>

                      {listing.rejection_reason && (
                        <div className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {listing.rejection_reason.substring(0, 120)}
                        </div>
                      )}
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedListing(listing); setEditMode(true); }}
                      >
                        Düzenle
                      </Button>
                      {(listing.trendyol_status === "rejected" ||
                        listing.trendyol_status === "draft") && (
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={() => handleResubmit(listing)}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Yeniden Gönder
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
