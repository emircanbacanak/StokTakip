"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CostSettings, OrderCostAnalysis } from "@/lib/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Flame,
  Zap,
  AlertCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CostSettingsDialog } from "./cost-settings-dialog";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  buyer: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface ProductWithWeight {
  name: string;
  weight_grams: number;
}

export function CostAnalysisTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductWithWeight[]>([]);
  const [settings, setSettings] = useState<CostSettings | null>(null);
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(30);
  const [analysis, setAnalysis] = useState<OrderCostAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Siparişleri yükle
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total_amount,
          buyer:buyers(id, name),
          items:order_items(id, product_name, quantity, unit_price)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      setOrders(ordersData as any);

      // Ürünleri yükle
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("name, weight_grams");

      if (productsError) throw productsError;
      setProducts(productsData);

      // Ayarları yükle
      const { data: settingsData, error: settingsError } = await supabase
        .from("cost_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsError) throw settingsError;
      setSettings(settingsData);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Veriler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function calculateOrderCost() {
    if (!selectedOrderId || !settings) return;

    setCalculating(true);
    try {
      const supabase = createClient();

      // Sipariş bilgilerini al
      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (!selectedOrder) throw new Error("Sipariş bulunamadı");

      // Her ürün için gramajı bul ve hesapla
      let totalWeight = 0;
      let totalWeightWithWaste = 0;
      let totalFilament = 0;
      let totalElectricity = 0;
      let totalWaste = 0;
      let totalDepreciation = 0;

      for (const item of selectedOrder.items) {
        const product = products.find((p) => p.name === item.product_name);
        const weightGrams = product?.weight_grams || 0;

        if (weightGrams === 0) {
          toast({
            title: "Uyarı",
            description: `"${item.product_name}" ürününün gramajı tanımlı değil`,
            variant: "destructive",
          });
          continue;
        }

        const itemWeight = weightGrams * item.quantity;
        const itemWeightWithWaste = settings.waste_enabled
          ? itemWeight * (1 + settings.waste_percentage / 100)
          : itemWeight;

        totalWeight += itemWeight;
        totalWeightWithWaste += itemWeightWithWaste;

        // Filament maliyeti
        if (settings.filament_enabled) {
          totalFilament += (itemWeight / 1000) * settings.filament_price_per_kg;
        }

        // Elektrik maliyeti
        if (settings.electricity_enabled) {
          totalElectricity += itemWeightWithWaste * settings.electricity_cost_per_gram;
        }

        // Fire maliyeti
        if (settings.waste_enabled && settings.filament_enabled) {
          totalWaste +=
            ((itemWeightWithWaste - itemWeight) / 1000) * settings.filament_price_per_kg;
        }

        // Yıpranma maliyeti
        if (settings.depreciation_enabled) {
          totalDepreciation += itemWeightWithWaste * settings.depreciation_cost_per_gram;
        }
      }

      const totalCost = totalFilament + totalElectricity + totalWaste + totalDepreciation;
      const totalRevenue = selectedOrder.total_amount;
      const totalProfit = totalRevenue - totalCost;
      const profitMarginPercentage =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Analizi kaydet
      const analysisData: any = {
        order_id: selectedOrderId,
        buyer_name: selectedOrder.buyer.name,
        order_date: selectedOrder.created_at,
        total_items_count: selectedOrder.items.length,
        total_quantity: selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0),
        total_weight_grams: totalWeight,
        total_weight_with_waste_grams: totalWeightWithWaste,
        filament_price_per_kg: settings.filament_price_per_kg,
        electricity_cost_per_gram: settings.electricity_cost_per_gram,
        waste_percentage: settings.waste_percentage,
        depreciation_cost_per_gram: settings.depreciation_cost_per_gram,
        total_filament_cost: totalFilament,
        total_electricity_cost: totalElectricity,
        total_waste_cost: totalWaste,
        total_depreciation_cost: totalDepreciation,
        total_production_cost: totalCost,
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        profit_margin_percentage: profitMarginPercentage,
      };

      const { data: savedAnalysis, error } = await supabase
        .from("order_cost_analysis")
        .insert(analysisData)
        .select()
        .single();

      if (error) throw error;

      setAnalysis(savedAnalysis);

      toast({
        title: "Başarılı",
        description: "Maliyet analizi hesaplandı",
      });
    } catch (error) {
      console.error("Maliyet hesaplanırken hata:", error);
      toast({
        title: "Hata",
        description: "Maliyet hesaplanamadı",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  }

  function calculateRecommendedPrices() {
    if (!analysis || !settings) return null;

    const costPerUnit = analysis.total_production_cost / analysis.total_quantity;
    const recommendedPrice = costPerUnit * (1 + targetProfitMargin / 100);

    return {
      costPerUnit,
      recommendedPrice,
      totalRecommendedRevenue: recommendedPrice * analysis.total_quantity,
    };
  }

  const recommended = calculateRecommendedPrices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Maliyet Analizi</h2>
          <p className="text-muted-foreground mt-1">
            Sipariş bazlı gerçek maliyet ve kar analizi
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSettingsOpen(true)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Ayarlar
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Yükleniyor...</div>
      ) : (
        <>
          {/* Sipariş Seçimi */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sipariş Seç</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order-select">Sipariş</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger id="order-select">
                    <SelectValue placeholder="Bir sipariş seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.buyer.name} - {formatDate(order.created_at)} -{" "}
                        {formatCurrency(order.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit-margin">Hedef Kar Marjı (%)</Label>
                <Input
                  id="profit-margin"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={targetProfitMargin}
                  onChange={(e) => setTargetProfitMargin(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <Button
              onClick={calculateOrderCost}
              disabled={!selectedOrderId || calculating}
              className="mt-4 w-full md:w-auto"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Hesaplanıyor...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Maliyet Hesapla
                </>
              )}
            </Button>
          </div>

          {/* Analiz Sonuçları */}
          {analysis && (
            <>
              {/* Özet Kartlar */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">
                      Üretim
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Üretim</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {analysis.total_quantity} adet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.total_items_count} farklı ürün
                  </p>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950 px-2 py-1 rounded">
                      Filament
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Filament</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {(analysis.total_weight_with_waste_grams / 1000).toFixed(2)} kg
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fire dahil ({analysis.waste_percentage}%)
                  </p>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950 px-2 py-1 rounded">
                      Maliyet
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(analysis.total_production_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(analysis.total_production_cost / analysis.total_quantity)}/adet
                  </p>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    {analysis.total_profit >= 0 ? (
                      <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        analysis.total_profit >= 0
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950"
                          : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950"
                      }`}
                    >
                      {analysis.profit_margin_percentage >= 0 ? "+" : ""}
                      {analysis.profit_margin_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Kar/Zarar</p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      analysis.total_profit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(analysis.total_profit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gelir: {formatCurrency(analysis.total_revenue)}
                  </p>
                </div>
              </div>

              {/* Maliyet Dökümü */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Maliyet Dökümü</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Filament</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(analysis.total_filament_cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(
                        (analysis.total_filament_cost / analysis.total_production_cost) *
                        100
                      ).toFixed(1)}
                      % toplam maliyetin
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Elektrik</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(analysis.total_electricity_cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(
                        (analysis.total_electricity_cost / analysis.total_production_cost) *
                        100
                      ).toFixed(1)}
                      % toplam maliyetin
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Fire</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(analysis.total_waste_cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(
                        (analysis.total_waste_cost / analysis.total_production_cost) *
                        100
                      ).toFixed(1)}
                      % toplam maliyetin
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-muted-foreground">Yıpranma</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(analysis.total_depreciation_cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(
                        (analysis.total_depreciation_cost / analysis.total_production_cost) *
                        100
                      ).toFixed(1)}
                      % toplam maliyetin
                    </p>
                  </div>
                </div>
              </div>

              {/* Önerilen Fiyatlandırma */}
              {recommended && (
                <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Önerilen Fiyatlandırma (%{targetProfitMargin} Kar Marjı)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Birim Maliyet</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(recommended.costPerUnit)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Önerilen Birim Fiyat</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(recommended.recommendedPrice)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Toplam Gelir</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(recommended.totalRecommendedRevenue)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Not:</strong> Bu fiyatlandırma, girdiğiniz %{targetProfitMargin} kar
                      marjına göre hesaplanmıştır. Gerçek satış fiyatınız{" "}
                      {formatCurrency(analysis.total_revenue / analysis.total_quantity)} olup, kar
                      marjınız %{analysis.profit_margin_percentage.toFixed(1)}'dir.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Ayarlar Dialog */}
      <CostSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSettingsUpdated={loadData}
      />
    </div>
  );
}
