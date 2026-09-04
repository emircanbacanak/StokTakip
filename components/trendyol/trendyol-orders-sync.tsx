"use client";

import { useState } from "react";
import { RefreshCw, Download, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncResult {
  success: boolean;
  fetched: number;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  errorMessage?: string;
}

export function TrendyolOrdersSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const syncOrders = async (days: number = 30) => {
    setSyncing(true);
    setLastSync(null);
    
    try {
      toast({
        title: "Senkronizasyon Başladı",
        description: `Eski veriler temizleniyor ve son ${days} günün siparişleri Trendyol'dan çekiliyor...`,
      });

      const response = await fetch("/api/trendyol-orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "Senkronizasyon başarısız oldu");
      }

      setLastSync(result);

      if (result.success) {
        toast({
          title: "✅ Senkronizasyon Tamamlandı!",
          description: `${result.fetched} sipariş çekildi, ${result.created} sipariş veritabanına kaydedildi.`,
        });
      } else {
        toast({
          title: "⚠️ Senkronizasyon Tamamlandı (Hatalarla)",
          description: `${result.created} sipariş kaydedildi, ${result.errors} hata oluştu.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Senkronizasyon Hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trendyol Siparişleri</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Trendyol'dan siparişleri otomatik olarak çekin ve fatura yönetiminde takip edin
          </p>
        </div>
      </div>

      {/* Sync Butonları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => syncOrders(7)}
          disabled={syncing}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 7 Gün</p>
            <p className="text-xs text-muted-foreground">Hızlı sync</p>
          </div>
        </button>

        <button
          onClick={() => syncOrders(30)}
          disabled={syncing}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-violet-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 30 Gün</p>
            <p className="text-xs text-muted-foreground">Aylık sync</p>
          </div>
        </button>

        <button
          onClick={() => syncOrders(90)}
          disabled={syncing}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 90 Gün</p>
            <p className="text-xs text-muted-foreground">Çeyrek sync</p>
          </div>
        </button>

        <button
          onClick={() => syncOrders(365)}
          disabled={syncing}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <Download className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 1 Yıl</p>
            <p className="text-xs text-muted-foreground">Tam sync</p>
          </div>
        </button>
      </div>

      {/* Syncing Progress */}
      {syncing && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Siparişler çekiliyor...</p>
              <p className="text-sm text-muted-foreground">
                Bu işlem birkaç dakika sürebilir
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Sync Result */}
      {lastSync && !syncing && (
        <div className={`border rounded-2xl p-6 ${
          lastSync.success && lastSync.errors === 0
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <div className="flex items-start gap-4">
            {lastSync.success && lastSync.errors === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-2">
                Son Senkronizasyon Sonucu
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Toplam</p>
                  <p className="font-bold text-foreground">{lastSync.fetched}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Yeni</p>
                  <p className="font-bold text-emerald-600">{lastSync.created}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Güncellenen</p>
                  <p className="font-bold text-blue-600">{lastSync.updated}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Silinen</p>
                  <p className="font-bold text-orange-600">{lastSync.deleted}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hata</p>
                  <p className="font-bold text-red-600">{lastSync.errors}</p>
                </div>
              </div>
              {lastSync.errorMessage && (
                <p className="text-xs text-muted-foreground mt-3">
                  {lastSync.errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bilgilendirme */}
      <div className="bg-muted/50 border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">💡 Nasıl Çalışır?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0">1.</span>
            <span>
              Yukarıdaki butonlardan birini seçerek Trendyol'dan siparişleri çekin
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0">2.</span>
            <span>
              Siparişler otomatik olarak veritabanına kaydedilir
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0">3.</span>
            <span>
              "Teslim Edildi" statüsündeki siparişler <strong>Fatura Yönetimi</strong> sayfasında görünür
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0">4.</span>
            <span>
              3+ gün geçmiş ve fatura kesilmemiş siparişler otomatik olarak listelenir
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
