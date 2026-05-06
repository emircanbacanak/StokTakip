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
    produced_quantity: number;
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

  // Satış fiyatı simülatörü state'leri
  const [actualSalePrice, setActualSalePrice] = useState<string>("");       // Gerçek sattığım birim fiyat
  const [simulatedPrice, setSimulatedPrice] = useState<string>("");         // İndirimli fiyat simülasyonu

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
          items:order_items(id, product_name, quantity, produced_quantity, unit_price)
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

        // Gerçekte üretilen miktar (fazla üretim dahil)
        const actualQty = Math.max(item.produced_quantity || 0, item.quantity);

        const itemWeight = weightGrams * actualQty;
        const itemWeightWithWaste = settings.waste_enabled
          ? itemWeight * (1 + settings.waste_percentage / 100)
          : itemWeight;

        totalWeight += itemWeight;
        totalWeightWithWaste += itemWeightWithWaste;

        // Filament maliyeti: ham gramaj üzerinden (fire ayrı kalem)
        if (settings.filament_enabled) {
          totalFilament += (itemWeight / 1000) * settings.filament_price_per_kg;
        }

        // Elektrik maliyeti: fire dahil gramaj üzerinden
        if (settings.electricity_enabled) {
          totalElectricity += itemWeightWithWaste * settings.electricity_cost_per_gram;
        }

        // Fire maliyeti: fire miktarı × filament fiyatı
        if (settings.waste_enabled && settings.filament_enabled) {
          totalWaste += ((itemWeightWithWaste - itemWeight) / 1000) * settings.filament_price_per_kg;
        }

        // Yıpranma maliyeti: fire dahil gramaj üzerinden
        if (settings.depreciation_enabled) {
          totalDepreciation += itemWeightWithWaste * settings.depreciation_cost_per_gram;
        }
      }

      const totalCost = totalFilament + totalElectricity + totalWaste + totalDepreciation;
      // Gerçek gelir = sipariş tutarı + fazla üretim değeri
      const overProductionValue = selectedOrder.items.reduce((sum, item) => {
        const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
        return sum + overProduced * item.unit_price;
      }, 0);
      const totalRevenue = selectedOrder.total_amount + overProductionValue;
      // Gerçek üretilen toplam adet
      const totalActualQty = selectedOrder.items.reduce((sum, item) =>
        sum + Math.max(item.produced_quantity || 0, item.quantity), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMarginPercentage =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Analizi kaydet
      const analysisData: any = {
        order_id: selectedOrderId,
        buyer_name: selectedOrder.buyer.name,
        order_date: selectedOrder.created_at,
        total_items_count: selectedOrder.items.length,
        total_quantity: totalActualQty,
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
      // Gerçek satış fiyatını sipariş birim fiyatından otomatik doldur
      const avgUnitPrice = selectedOrder.total_amount / selectedOrder.items.reduce((s, i) => s + i.quantity, 0);
      setActualSalePrice(avgUnitPrice.toFixed(2));
      setSimulatedPrice("");

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
      markupPct: targetProfitMargin,
    };
  }

  // Gerçek satış analizi
  function calcActualSale() {
    if (!analysis || !actualSalePrice) return null;
    const price = parseFloat(actualSalePrice);
    if (isNaN(price) || price <= 0) return null;
    const costPerUnit = analysis.total_production_cost / analysis.total_quantity;
    const profit = price - costPerUnit;
    const markupPct = (profit / costPerUnit) * 100;
    const totalRevenue = price * analysis.total_quantity;
    const totalProfit = totalRevenue - analysis.total_production_cost;
    return { price, costPerUnit, profit, markupPct, totalRevenue, totalProfit };
  }

  // İndirim simülatörü
  function calcSimulated() {
    if (!analysis || !simulatedPrice) return null;
    const price = parseFloat(simulatedPrice);
    if (isNaN(price) || price <= 0) return null;
    const costPerUnit = analysis.total_production_cost / analysis.total_quantity;
    const profit = price - costPerUnit;
    const markupPct = (profit / costPerUnit) * 100;
    const totalRevenue = price * analysis.total_quantity;
    const totalProfit = totalRevenue - analysis.total_production_cost;
    const isLoss = profit < 0;
    const breakEvenPrice = costPerUnit;
    return { price, costPerUnit, profit, markupPct, totalRevenue, totalProfit, isLoss, breakEvenPrice };
  }

  const recommended = calculateRecommendedPrices();
  const actualSale = calcActualSale();
  const simulated = calcSimulated();

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
            <div className="grid gap-4 md:grid-cols-2 items-end">
              <div className="space-y-2">
                <Label htmlFor="order-select">Sipariş</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger id="order-select">
                    <SelectValue placeholder="Bir sipariş seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => {
                      const overProd = order.items.reduce((s, i) => {
                        const over = Math.max(0, (i.produced_quantity || 0) - i.quantity);
                        return s + over * i.unit_price;
                      }, 0);
                      const realTotal = order.total_amount + overProd;
                      const realQty = order.items.reduce((s, i) =>
                        s + Math.max(i.produced_quantity || 0, i.quantity), 0);
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {order.buyer.name} - {formatDate(order.created_at)} - {realQty} adet - {formatCurrency(realTotal)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit-margin">Hedef Kar Yüzdesi (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Maliyetin kaç % üstüne kar koyacaksınız? Örn: %50 → maliyet 42 TL ise fiyat 63 TL
                </p>
                <Input
                  id="profit-margin"
                  type="number"
                  step="1"
                  min="0"
                  value={targetProfitMargin === 0 ? "" : targetProfitMargin}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetProfitMargin(val === "" ? 0 : parseFloat(val) || 0);
                  }}
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
              {/* Önerilen Fiyatlandırma */}
              {recommended && (
                <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Önerilen Fiyatlandırma
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Birim Maliyet</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(recommended.costPerUnit)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 border-2 border-emerald-400/50">
                      <p className="text-xs text-muted-foreground mb-1">Önerilen Birim Fiyat</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(recommended.recommendedPrice)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Kar Yüzdesi</p>
                      <p className="text-xl font-bold text-blue-600">%{recommended.markupPct.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">maliyetin üstüne eklenen kar</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <p>
                      <strong>Maliyet üstü %{recommended.markupPct.toFixed(0)}</strong> kar ile birim fiyat{" "}
                      <strong>{formatCurrency(recommended.recommendedPrice)}</strong> olur.
                    </p>
                    <p>
                      Bu fiyattan {analysis.total_quantity} adet satarsanız toplam{" "}
                      <strong>{formatCurrency(recommended.totalRecommendedRevenue)}</strong> gelir elde edersiniz.
                    </p>
                  </div>
                </div>
              )}

              {/* Özet Kartlar */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Üretim kartı */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">Üretim</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Üretim</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analysis.total_quantity} adet</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">{analysis.total_items_count} farklı ürün</p>
                    <p className="text-xs text-muted-foreground">Adet başı gramaj: <span className="font-medium text-foreground">{(analysis.total_weight_grams / analysis.total_quantity).toFixed(1)} gr</span></p>
                    <p className="text-xs text-muted-foreground">Ham gramaj: <span className="font-medium text-foreground">{analysis.total_weight_grams.toFixed(0)} gr</span></p>
                    <p className="text-xs text-muted-foreground">Fire dahil: <span className="font-medium text-orange-500">{analysis.total_weight_with_waste_grams.toFixed(0)} gr</span></p>
                  </div>
                </div>

                {/* Filament kartı */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950 px-2 py-1 rounded">Filament</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Filament</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{(analysis.total_weight_with_waste_grams / 1000).toFixed(3)} kg</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Fire oranı: <span className="font-medium text-foreground">%{analysis.waste_percentage}</span></p>
                    <p className="text-xs text-muted-foreground">Adet başı: <span className="font-medium text-foreground">{(analysis.total_weight_with_waste_grams / analysis.total_quantity).toFixed(1)} gr</span></p>
                    <p className="text-xs text-muted-foreground">Filament fiyatı: <span className="font-medium text-foreground">{formatCurrency(analysis.filament_price_per_kg)}/kg</span></p>
                  </div>
                </div>

                {/* Maliyet kartı */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950 px-2 py-1 rounded">Maliyet</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(analysis.total_production_cost)}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Adet başı maliyet: <span className="font-medium text-foreground">{formatCurrency(analysis.total_production_cost / analysis.total_quantity)}</span></p>
                    <p className="text-xs text-muted-foreground">Satış fiyatı: <span className="font-medium text-blue-600">{formatCurrency(analysis.total_revenue / analysis.total_quantity)}/adet</span></p>
                    <p className="text-xs text-muted-foreground">Toplam satış: <span className="font-medium text-blue-600">{formatCurrency(analysis.total_revenue)}</span></p>
                  </div>
                </div>

                {/* Kar/Zarar kartı */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    {analysis.total_profit >= 0
                      ? <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      : <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${analysis.total_profit >= 0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950" : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950"}`}>
                      {analysis.total_production_cost > 0 ? `+%${((analysis.total_profit / analysis.total_production_cost) * 100).toFixed(1)}` : "%0"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Kar/Zarar</p>
                  <p className={`text-2xl font-bold mt-1 ${analysis.total_profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatCurrency(analysis.total_profit)}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Gelir: <span className="font-medium text-foreground">{formatCurrency(analysis.total_revenue)}</span></p>
                    <p className="text-xs text-muted-foreground">Gider: <span className="font-medium text-foreground">{formatCurrency(analysis.total_production_cost)}</span></p>
                    <p className="text-xs text-muted-foreground">Adet başı kar: <span className={`font-medium ${analysis.total_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(analysis.total_profit / analysis.total_quantity)}</span></p>
                  </div>
                </div>
              </div>

              {/* Maliyet Dökümü */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Maliyet Dökümü</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Filament</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(analysis.total_filament_cost)}</p>
                    <p className="text-xs text-muted-foreground">{((analysis.total_filament_cost / analysis.total_production_cost) * 100).toFixed(1)}% toplam maliyetin</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Elektrik</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(analysis.total_electricity_cost)}</p>
                    <p className="text-xs text-muted-foreground">{((analysis.total_electricity_cost / analysis.total_production_cost) * 100).toFixed(1)}% toplam maliyetin</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Fire</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(analysis.total_waste_cost)}</p>
                    <p className="text-xs text-muted-foreground">{((analysis.total_waste_cost / analysis.total_production_cost) * 100).toFixed(1)}% toplam maliyetin</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-muted-foreground">Yıpranma</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(analysis.total_depreciation_cost)}</p>
                    <p className="text-xs text-muted-foreground">{((analysis.total_depreciation_cost / analysis.total_production_cost) * 100).toFixed(1)}% toplam maliyetin</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Toplam Maliyet: </span>
                    <span className="font-bold text-foreground">{formatCurrency(analysis.total_production_cost)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">%{targetProfitMargin} kar dahil: </span>
                    <span className="font-bold text-emerald-600 text-lg">
                      {formatCurrency(analysis.total_production_cost * (1 + targetProfitMargin / 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Ürün Bazlı Maliyet Tablosu ── */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Package className="w-5 h-5 text-violet-500" />
                  <h3 className="text-lg font-semibold text-foreground">Ürün Bazlı Maliyet</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Ürün</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Adet</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Gramaj</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Birim Maliyet</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Toplam Maliyet</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Birim Satış</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Kar %</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Önerilen (%{targetProfitMargin})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Ürün adına göre grupla
                        const productMap = new Map<string, {
                          name: string;
                          totalQty: number;
                          weightGrams: number;
                          unitPrice: number;
                          totalCost: number;
                        }>();

                        const selectedOrder = orders.find(o => o.id === selectedOrderId);
                        if (!selectedOrder) return null;

                        selectedOrder.items.forEach(item => {
                          const product = products.find(p => p.name === item.product_name);
                          const wg = product?.weight_grams || 0;
                          const actualQty = Math.max(item.produced_quantity || 0, item.quantity);
                          const wWithWaste = settings ? (settings.waste_enabled ? wg * (1 + settings.waste_percentage / 100) : wg) : wg;

                          // Birim maliyet hesapla
                          let unitCost = 0;
                          if (settings) {
                            const filament = settings.filament_enabled ? (wg / 1000) * settings.filament_price_per_kg : 0;
                            const electricity = settings.electricity_enabled ? wWithWaste * settings.electricity_cost_per_gram : 0;
                            const waste = (settings.waste_enabled && settings.filament_enabled) ? ((wWithWaste - wg) / 1000) * settings.filament_price_per_kg : 0;
                            const depreciation = settings.depreciation_enabled ? wWithWaste * settings.depreciation_cost_per_gram : 0;
                            unitCost = filament + electricity + waste + depreciation;
                          }

                          const key = item.product_name;
                          if (!productMap.has(key)) {
                            productMap.set(key, { name: key, totalQty: 0, weightGrams: wg, unitPrice: item.unit_price, totalCost: 0 });
                          }
                          const p = productMap.get(key)!;
                          p.totalQty += actualQty;
                          p.totalCost += unitCost * actualQty;
                        });

                        return Array.from(productMap.values()).map(p => {
                          const unitCost = p.totalQty > 0 ? p.totalCost / p.totalQty : 0;
                          const markupPct = unitCost > 0 ? ((p.unitPrice - unitCost) / unitCost) * 100 : 0;
                          const suggestedPrice = unitCost * (1 + targetProfitMargin / 100);
                          const isProfit = p.unitPrice >= unitCost;

                          return (
                            <tr key={p.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">{p.totalQty}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">
                                {p.weightGrams > 0 ? `${p.weightGrams} gr` : <span className="text-red-500 text-xs">Gramaj yok</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(unitCost)}</td>
                              <td className="px-4 py-2.5 text-right text-foreground">{formatCurrency(p.totalCost)}</td>
                              <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{formatCurrency(p.unitPrice)}</td>
                              <td className={`px-4 py-2.5 text-right font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}>
                                {isProfit ? "+" : ""}{markupPct.toFixed(1)}%
                              </td>
                              <td className="px-4 py-2.5 text-right text-violet-600 font-medium">{formatCurrency(suggestedPrice)}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Satış Fiyatı Analizi ── */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Satış Fiyatı Analizi
                </h3>

                {/* Gerçek satış fiyatı */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Gerçek Sattığım Birim Fiyat (TL)
                  </Label>
                  <div className="flex gap-3 items-start">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Örn: 45.00"
                      value={actualSalePrice}
                      onChange={(e) => setActualSalePrice(e.target.value)}
                      className="max-w-[200px]"
                    />
                    {actualSale && (
                      <div className={`flex-1 rounded-lg p-3 border text-sm space-y-1 ${
                        actualSale.profit >= 0
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                      }`}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Birim Maliyet</p>
                            <p className="font-bold text-foreground">{formatCurrency(actualSale.costPerUnit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Birim Kar</p>
                            <p className={`font-bold ${actualSale.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {actualSale.profit >= 0 ? "+" : ""}{formatCurrency(actualSale.profit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Kar Yüzdesi</p>
                            <p className={`font-bold ${actualSale.markupPct >= 0 ? "text-blue-600" : "text-red-600"}`}>
                              %{actualSale.markupPct.toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-current/10 pt-2 mt-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Toplam Gelir ({analysis.total_quantity} adet)</p>
                            <p className="font-bold text-foreground">{formatCurrency(actualSale.totalRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Toplam Kar</p>
                            <p className={`font-bold ${actualSale.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {actualSale.totalProfit >= 0 ? "+" : ""}{formatCurrency(actualSale.totalProfit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* İndirim simülatörü */}
                <div className="space-y-3 border-t border-border pt-5">
                  <div>
                    <Label className="text-sm font-semibold">İndirim Simülatörü</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Müşteri indirim isterse kaça satabilirsiniz? Minimum karlı fiyatı görün.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="İndirimli fiyat girin..."
                      value={simulatedPrice}
                      onChange={(e) => setSimulatedPrice(e.target.value)}
                      className="max-w-[200px]"
                    />
                    {simulated && (
                      <div className={`flex-1 rounded-lg p-3 border text-sm space-y-2 ${
                        simulated.isLoss
                          ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
                          : simulated.markupPct < 10
                          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800"
                          : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                      }`}>
                        {/* Uyarı bandı */}
                        {simulated.isLoss && (
                          <div className="flex items-center gap-2 text-red-600 font-semibold text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            ZARAR! Bu fiyat maliyetin altında. En az {formatCurrency(simulated.breakEvenPrice)} olmalı.
                          </div>
                        )}
                        {!simulated.isLoss && simulated.markupPct < 10 && (
                          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-semibold text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Düşük kar! Sadece %{simulated.markupPct.toFixed(1)} kar yapıyorsunuz.
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Birim Maliyet</p>
                            <p className="font-bold text-foreground">{formatCurrency(simulated.costPerUnit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Birim Kar/Zarar</p>
                            <p className={`font-bold ${simulated.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {simulated.profit >= 0 ? "+" : ""}{formatCurrency(simulated.profit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Kar Yüzdesi</p>
                            <p className={`font-bold ${simulated.markupPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              %{simulated.markupPct.toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-current/10 pt-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Toplam Gelir</p>
                            <p className="font-bold text-foreground">{formatCurrency(simulated.totalRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Toplam Kar/Zarar</p>
                            <p className={`font-bold ${simulated.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {simulated.totalProfit >= 0 ? "+" : ""}{formatCurrency(simulated.totalProfit)}
                            </p>
                          </div>
                        </div>
                        {/* Gerçek fiyatla karşılaştırma */}
                        {actualSale && (
                          <div className="border-t border-current/10 pt-2 text-xs text-muted-foreground">
                            Gerçek fiyata ({formatCurrency(actualSale.price)}) göre:{" "}
                            <span className={simulated.totalProfit < actualSale.totalProfit ? "text-red-500 font-semibold" : "text-emerald-600 font-semibold"}>
                              {formatCurrency(simulated.totalProfit - actualSale.totalProfit)} fark
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Hızlı indirim butonları */}
                  {actualSale && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Hızlı:</span>
                      {[5, 10, 15, 20].map(pct => {
                        const discounted = actualSale.price * (1 - pct / 100);
                        return (
                          <button
                            key={pct}
                            onClick={() => setSimulatedPrice(discounted.toFixed(2))}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all"
                          >
                            -%{pct} → {formatCurrency(discounted)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
