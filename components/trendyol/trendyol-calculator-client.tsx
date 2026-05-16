"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Store, Settings, Calculator, TrendingUp, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrendyolProduct {
  id: string;
  productName: string;
  weightGrams: number;
  quantity: number;
}

interface TrendyolSettings {
  // Üretim Maliyetleri
  filamentPricePerKg: number; // Filament fiyatı (TL/kg)
  electricityCostPerGram: number; // Elektrik maliyeti (TL/gr)
  depreciationCostPerGram: number; // Yıpranma maliyeti (TL/gr)
  wastePercentage: number; // Fire oranı (%)
  
  // Trendyol Maliyetleri
  commissionRate: number; // Komisyon oranı (%)
  vatRate: number; // KDV oranı (%)
  paymentTermFee: number; // Vade farkı (%)
  packagingCost: number; // Kutulama maliyeti (TL/ürün)
  profitMargin: number; // Kar marjı (%)
  
  // Profesyonel Maliyetler (YENİ)
  advertisingRate: number; // Reklam maliyeti (%)
  returnRate: number; // İade oranı (%)
  fixedCostPerOrder: number; // Sabit gider dağılımı (TL/sipariş)
  organicSalesMode: boolean; // Organik satış modu (reklam %0)
  
  // Kargo Baremleri (26 Mart 2026)
  cargoUnder200Fast: number; // 200 TL altı hızlı gönderim (1 gün)
  cargoUnder200Slow: number; // 200 TL altı yavaş gönderim
  cargo200to350Fast: number; // 200-350 TL hızlı gönderim
  cargo200to350Slow: number; // 200-350 TL yavaş gönderim
  cargoOver350: number; // 350 TL üzeri (anlaşmalı fiyat)
  fastShipping: boolean; // Hızlı gönderim yapıyor musunuz?
  
  // Görünüm Ayarları (YENİ)
  showVatExcluded: boolean; // KDV hariç analiz göster
}

const DEFAULT_TRENDYOL_SETTINGS: TrendyolSettings = {
  // Üretim Maliyetleri
  filamentPricePerKg: 650, // 650 TL/kg
  electricityCostPerGram: 0.1, // 0.1 TL/gr
  depreciationCostPerGram: 0.05, // 0.05 TL/gr
  wastePercentage: 10, // %10 fire
  
  // Trendyol Maliyetleri
  commissionRate: 15, // Ortalama komisyon %15
  vatRate: 20, // KDV %20
  paymentTermFee: 3, // Vade farkı %3
  packagingCost: 15, // Kutulama 15 TL
  profitMargin: 30, // %30 kar marjı
  
  // Profesyonel Maliyetler (YENİ)
  advertisingRate: 8, // Reklam maliyeti %8
  returnRate: 5, // İade oranı %5
  fixedCostPerOrder: 6, // Sabit gider 6 TL/sipariş
  organicSalesMode: false, // Organik satış modu kapalı
  
  // Kargo Baremleri (26 Mart 2026)
  cargoUnder200Fast: 34.16, // 200 TL altı hızlı (1 gün)
  cargoUnder200Slow: 64.58, // 200 TL altı yavaş
  cargo200to350Fast: 65.83, // 200-350 TL hızlı
  cargo200to350Slow: 72.91, // 200-350 TL yavaş
  cargoOver350: 55, // 350 TL üzeri (anlaşmalı fiyat - varsayılan 55 TL)
  fastShipping: true, // Varsayılan: Hızlı gönderim
  
  // Görünüm Ayarları
  showVatExcluded: false, // KDV hariç analiz kapalı
};

export function TrendyolCalculatorClient() {
  const { toast } = useToast();
  const [trendyolSettings, setTrendyolSettings] = useState<TrendyolSettings>(DEFAULT_TRENDYOL_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  
  // Ürün girişi
  const [productName, setProductName] = useState<string>("");
  const [weightGrams, setWeightGrams] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  
  // Ürün listesi
  const [products, setProducts] = useState<TrendyolProduct[]>([]);

  // Ayarları localStorage'dan yükle
  useEffect(() => {
    const savedSettings = localStorage.getItem("trendyolSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Eski ayarları yeni yapıya uyarla
        setTrendyolSettings({
          ...DEFAULT_TRENDYOL_SETTINGS,
          ...parsed,
        });
      } catch (error) {
        console.error("Ayarlar yüklenemedi:", error);
      }
    }
  }, []);

  // Ayarları localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("trendyolSettings", JSON.stringify(trendyolSettings));
  }, [trendyolSettings]);

  // Ürünleri localStorage'dan yükle
  useEffect(() => {
    const savedProducts = localStorage.getItem("trendyolProducts");
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (error) {
        console.error("Ürünler yüklenemedi:", error);
      }
    }
  }, []);

  // Ürünleri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("trendyolProducts", JSON.stringify(products));
  }, [products]);

  const addProduct = () => {
    if (!productName.trim() || !weightGrams || parseFloat(weightGrams) <= 0) {
      toast({
        title: "Hata",
        description: "Lütfen ürün adı ve gramaj girin",
        variant: "destructive",
      });
      return;
    }

    const newProduct: TrendyolProduct = {
      id: Date.now().toString(),
      productName: productName.trim(),
      weightGrams: parseFloat(weightGrams),
      quantity: parseInt(quantity) || 1,
    };

    setProducts([...products, newProduct]);
    setProductName("");
    setWeightGrams("");
    setQuantity("1");
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  // Maliyet hesaplama fonksiyonu (Trendyol'a özel)
  const calculateProductionCost = (weightGrams: number): number => {
    // Fire dahil gramaj
    const weightWithWaste = weightGrams * (1 + trendyolSettings.wastePercentage / 100);

    // Filament maliyeti
    const filamentCost = (weightWithWaste / 1000) * trendyolSettings.filamentPricePerKg;

    // Elektrik maliyeti
    const electricityCost = weightWithWaste * trendyolSettings.electricityCostPerGram;

    // Yıpranma maliyeti
    const depreciationCost = weightWithWaste * trendyolSettings.depreciationCostPerGram;

    return filamentCost + electricityCost + depreciationCost;
  };

  // Kargo maliyeti hesaplama (26 Mart 2026 baremleri)
  const calculateShippingCost = (salePrice: number): number => {
    if (salePrice >= 350) {
      // 350 TL ve üzeri: Anlaşmalı fiyat (alıcı öder)
      return trendyolSettings.cargoOver350;
    } else if (salePrice >= 200) {
      // 200-350 TL arası
      return trendyolSettings.fastShipping 
        ? trendyolSettings.cargo200to350Fast 
        : trendyolSettings.cargo200to350Slow;
    } else {
      // 200 TL altı
      return trendyolSettings.fastShipping 
        ? trendyolSettings.cargoUnder200Fast 
        : trendyolSettings.cargoUnder200Slow;
    }
  };

  // Trendyol için önerilen satış fiyatı hesaplama
  const calculateTrendyolPrice = (productionCost: number, weightGrams: number): {
    minSalePrice: number;
    recommendedPrice: number;
    breakEvenPrice: number; // YENİ - Başabaş fiyatı
    breakdown: {
      productionCost: number;
      packagingCost: number;
      shippingCost: number;
      platformFee: number;
      commission: number;
      vat: number;
      paymentTermFee: number;
      advertisingCost: number;
      returnCost: number; // YENİ - Gerçek iade maliyeti
      fixedCost: number;
      totalCost: number;
      totalCostWithProfessional: number;
      profit: number;
      netProfit: number;
      realNetProfit: number;
      profitMarginPercent: number;
      realProfitMarginPercent: number;
      priceExcludingVat: number;
      realNetMarginExcludingVat: number; // YENİ - KDV hariç gerçek net marj
    };
  } => {
    // 1. Kutulama maliyeti
    const packagingCost = trendyolSettings.packagingCost;
    
    // 2. Platform hizmet bedeli (10.99 TL + KDV)
    const platformFee = 10.99 * (1 + trendyolSettings.vatRate / 100);
    
    // 3. Toplam sabit maliyet (kargo hariç, çünkü fiyata bağlı)
    const fixedCostWithoutShipping = productionCost + packagingCost + platformFee;
    
    // 4. Toplam kesinti oranı (komisyon + vade farkı)
    const totalDeductionRate = (
      trendyolSettings.commissionRate +
      trendyolSettings.paymentTermFee
    ) / 100;
    
    // 5. İlk minimum satış fiyatı tahmini (kargo olmadan)
    let minSalePrice = fixedCostWithoutShipping / (1 - totalDeductionRate);
    
    // 6. Kargo maliyetini hesapla (fiyata göre)
    let shippingCost = calculateShippingCost(minSalePrice);
    
    // 7. Kargo dahil gerçek minimum fiyat
    minSalePrice = (fixedCostWithoutShipping + shippingCost) / (1 - totalDeductionRate);
    
    // 8. Kargo maliyetini tekrar kontrol et (fiyat değişti mi?)
    shippingCost = calculateShippingCost(minSalePrice);
    
    // 9. Kargo dahil gerçek sabit maliyet
    const finalFixedCost = fixedCostWithoutShipping + shippingCost;
    
    // 10. Önerilen satış fiyatı - GERÇEK KAR MARJI (TÜM MALİYETLER DAHİL)
    // Profesyonel maliyetleri de dahil ederek hesaplama yapıyoruz
    // Sabit gider
    const fixedCost = trendyolSettings.fixedCostPerOrder;
    
    // İteratif hesaplama (reklam ve iade fiyata bağlı olduğu için)
    let recommendedPrice = 0;
    let iteration = 0;
    const maxIterations = 10;
    
    // İlk tahmin
    recommendedPrice = (finalFixedCost + fixedCost) * (1 + trendyolSettings.profitMargin / 100) / (1 - totalDeductionRate);
    
    // İteratif olarak gerçek fiyatı bul
    let shippingCostForRecommended = shippingCost;
    let advertisingCost = 0;
    let returnCost = 0;
    
    while (iteration < maxIterations) {
      iteration++;
      
      // Kargo maliyetini güncelle
      shippingCostForRecommended = calculateShippingCost(recommendedPrice);
      
      // Reklam maliyeti (organik modda %0)
      advertisingCost = trendyolSettings.organicSalesMode 
        ? 0 
        : recommendedPrice * (trendyolSettings.advertisingRate / 100);
      
      // İade maliyeti (ürün + kargo + paketleme) × iade oranı
      returnCost = (productionCost + shippingCostForRecommended + packagingCost) * (trendyolSettings.returnRate / 100);
      
      // Toplam maliyet (TÜM profesyonel maliyetler dahil)
      const totalBaseCost = productionCost + packagingCost + shippingCostForRecommended + platformFee + fixedCost;
      
      // Komisyon ve vade farkı fiyattan kesilecek
      const commission = recommendedPrice * (trendyolSettings.commissionRate / 100);
      const paymentTermFee = recommendedPrice * (trendyolSettings.paymentTermFee / 100);
      
      // Toplam profesyonel maliyet
      const totalProfessionalCost = totalBaseCost + advertisingCost + returnCost + commission + paymentTermFee;
      
      // İstenen gerçek net kar
      const desiredRealNetProfit = totalBaseCost * (trendyolSettings.profitMargin / 100);
      
      // Yeni fiyat hesabı
      // Fiyat = (Temel Maliyet + İstenen Kar + Reklam + İade) / (1 - Kesinti%)
      const newPrice = (totalBaseCost + desiredRealNetProfit + advertisingCost + returnCost) / (1 - totalDeductionRate);
      
      // Yakınsama kontrolü
      if (Math.abs(newPrice - recommendedPrice) < 1) {
        recommendedPrice = newPrice;
        break;
      }
      
      recommendedPrice = newPrice;
    }
    
    // 12. Detaylı döküm (önerilen fiyat üzerinden)
    const commission = recommendedPrice * (trendyolSettings.commissionRate / 100);
    const paymentTermFee = recommendedPrice * (trendyolSettings.paymentTermFee / 100);
    const vat = recommendedPrice * (trendyolSettings.vatRate / 100); // KDV bilgi amaçlı
    
    // Temel maliyet (eski hesap - geriye dönük uyumluluk için)
    const totalCost = productionCost + packagingCost + shippingCostForRecommended + platformFee + commission + paymentTermFee;
    const netProfit = recommendedPrice - totalCost;
    
    // Profesyonel toplam maliyet (reklam + iade + sabit gider dahil)
    const totalCostWithProfessional = totalCost + advertisingCost + returnCost + fixedCost;
    const realNetProfit = recommendedPrice - totalCostWithProfessional;
    
    // Kar marjı hesaplamaları
    const baseCost = productionCost + packagingCost + shippingCostForRecommended + platformFee + fixedCost;
    const profitMarginPercent = (netProfit / (productionCost + packagingCost + shippingCostForRecommended + platformFee)) * 100;
    const realProfitMarginPercent = (realNetProfit / baseCost) * 100; // Gerçek kar oranı artık girilen değere eşit olmalı
    
    // KDV hariç fiyat ve marj (profesyonel muhasebe için)
    const priceExcludingVat = recommendedPrice / (1 + trendyolSettings.vatRate / 100);
    const realNetMarginExcludingVat = (realNetProfit / priceExcludingVat) * 100;
    
    const profit = recommendedPrice - (productionCost + packagingCost + shippingCostForRecommended + platformFee);
    
    // YENİ: Başabaş fiyatı (Break-even) - Tüm profesyonel maliyetler dahil
    // Bu fiyatın altında zarar edilir
    const breakEvenBaseCost = productionCost + packagingCost + platformFee + fixedCost;
    let breakEvenPrice = breakEvenBaseCost / (1 - totalDeductionRate);
    const breakEvenShipping = calculateShippingCost(breakEvenPrice);
    
    // İade ve reklam maliyetini de ekle
    const breakEvenWithShipping = breakEvenBaseCost + breakEvenShipping;
    // İade maliyeti başabaş fiyata göre hesaplanmalı
    const estimatedReturnCost = (productionCost + breakEvenShipping + packagingCost) * (trendyolSettings.returnRate / 100);
    const estimatedAdCost = trendyolSettings.organicSalesMode ? 0 : (breakEvenPrice * (trendyolSettings.advertisingRate / 100));
    
    breakEvenPrice = (breakEvenWithShipping + estimatedReturnCost + estimatedAdCost) / (1 - totalDeductionRate - (trendyolSettings.organicSalesMode ? 0 : trendyolSettings.advertisingRate / 100));
    
    return {
      minSalePrice: Math.ceil(minSalePrice / 5) * 5, // 5'e yuvarla
      recommendedPrice: Math.ceil(recommendedPrice / 5) * 5, // 5'e yuvarla
      breakEvenPrice: Math.ceil(breakEvenPrice / 5) * 5, // 5'e yuvarla
      breakdown: {
        productionCost,
        packagingCost,
        shippingCost: shippingCostForRecommended,
        platformFee,
        commission,
        vat,
        paymentTermFee,
        advertisingCost,
        returnCost,
        fixedCost,
        totalCost,
        totalCostWithProfessional,
        profit,
        netProfit,
        realNetProfit,
        profitMarginPercent,
        realProfitMarginPercent,
        priceExcludingVat,
        realNetMarginExcludingVat,
      },
    };
  };

  // Toplam hesaplamalar
  const totalCalculations = products.reduce(
    (acc, product) => {
      const productionCost = calculateProductionCost(product.weightGrams);
      const pricing = calculateTrendyolPrice(productionCost, product.weightGrams);
      
      return {
        totalProductionCost: acc.totalProductionCost + productionCost * product.quantity,
        totalRecommendedRevenue: acc.totalRecommendedRevenue + pricing.recommendedPrice * product.quantity,
        totalProfit: acc.totalProfit + pricing.breakdown.netProfit * product.quantity,
        totalRealProfit: acc.totalRealProfit + pricing.breakdown.realNetProfit * product.quantity, // YENİ
        totalQuantity: acc.totalQuantity + product.quantity,
      };
    },
    { totalProductionCost: 0, totalRecommendedRevenue: 0, totalProfit: 0, totalRealProfit: 0, totalQuantity: 0 }
  );

  if (products.length === 0 && !showSettings) {
    // İlk yükleme - ayarları göster
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trendyol Hesaplayıcı</h1>
              <p className="text-sm text-muted-foreground">Pazaryeri satış fiyatı hesaplama</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon - Ürün Girişi */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ürün Ekleme Formu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ürün Ekle
                </CardTitle>
                <CardDescription>
                  Trendyol'da satacağınız ürünleri ekleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="productName">Ürün Adı</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Örn: Aura Vazo"
                      onKeyDown={(e) => e.key === "Enter" && addProduct()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weightGrams">Gramaj (gr)</Label>
                    <Input
                      id="weightGrams"
                      type="number"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(e.target.value)}
                      placeholder="40"
                      onKeyDown={(e) => e.key === "Enter" && addProduct()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Adet</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="1"
                      min="1"
                      onKeyDown={(e) => e.key === "Enter" && addProduct()}
                    />
                  </div>
                </div>
                <Button onClick={addProduct} className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Ürün Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Ürün Listesi ve Hesaplamalar */}
            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Fiyat Hesaplamaları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products.map((product) => {
                      const productionCost = calculateProductionCost(product.weightGrams);
                      const pricing = calculateTrendyolPrice(productionCost, product.weightGrams);
                      
                      return (
                        <div key={product.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{product.productName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {product.weightGrams} gr × {product.quantity} adet
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProduct(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Sil
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Üretim Maliyeti</p>
                              <p className="font-semibold">₺{productionCost.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Kargo (Satıcı Öder)</p>
                              <p className="font-semibold text-amber-600">
                                ₺{(pricing.breakdown.shippingCost || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-red-600 font-semibold">⚠️ Başabaş Fiyatı</p>
                              <p className="font-bold text-red-600">₺{pricing.breakEvenPrice.toFixed(2)}</p>
                              <p className="text-xs text-red-500">Altında zarar</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Minimum Fiyat</p>
                              <p className="font-semibold text-amber-600">₺{pricing.minSalePrice.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <p className="text-muted-foreground">Önerilen Fiyat</p>
                              <p className="font-semibold text-green-600 text-lg">₺{pricing.recommendedPrice.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {/* Kar Uyarısı */}
                          {pricing.breakdown.realNetProfit < 15 && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                                ⚠️ Düşük Karlılık Uyarısı
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                Gerçek net kar {pricing.breakdown.realNetProfit.toFixed(2)} TL. 
                                {pricing.breakdown.realNetProfit < 10 
                                  ? " Çok riskli! Set satış düşünün." 
                                  : " Sürdürülebilir değil, fiyat artırın veya bundle yapın."}
                              </p>
                            </div>
                          )}
                          
                          {/* YENİ: Aksiyon Önerisi Kartı */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                              💡 Fiyat Stratejisi Önerisi
                            </p>
                            
                            {(() => {
                              const cargoRatio = (pricing.breakdown.shippingCost / pricing.recommendedPrice) * 100;
                              const isHighCargo = cargoRatio > 20;
                              const realProfit = pricing.breakdown.realNetProfit;
                              
                              // Fiyat bantları hesapla
                              const riskyMin = Math.ceil(pricing.breakEvenPrice * 1.05 / 5) * 5;
                              const healthyMin = Math.ceil(pricing.breakEvenPrice * 1.15 / 5) * 5;
                              const idealMin = Math.ceil(pricing.breakEvenPrice * 1.25 / 5) * 5;
                              
                              // Liste fiyatı önerisi - Önerilen Fiyat'ı kullan (kampanya için alan bırak)
                              const suggestedListPrice = pricing.recommendedPrice;
                              const suggestedCampaignPrice = Math.ceil(suggestedListPrice * 0.95 / 5) * 5;
                              
                              return (
                                <>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between bg-white/50 dark:bg-gray-900/30 rounded px-2 py-1.5">
                                      <span className="text-red-700 dark:text-red-400">🔴 Riskli</span>
                                      <span className="font-semibold text-red-700 dark:text-red-400">
                                        ₺{riskyMin} - ₺{healthyMin - 5}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/50 dark:bg-gray-900/30 rounded px-2 py-1.5">
                                      <span className="text-amber-700 dark:text-amber-400">🟡 Sağlıklı</span>
                                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                                        ₺{healthyMin} - ₺{idealMin - 5}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/50 dark:bg-gray-900/30 rounded px-2 py-1.5">
                                      <span className="text-green-700 dark:text-green-400">🟢 İdeal</span>
                                      <span className="font-semibold text-green-700 dark:text-green-400">
                                        ₺{idealMin}+
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t-2 border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">
                                      👉 Önerilen Strateji:
                                    </p>
                                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg p-3 border border-green-300 dark:border-green-700">
                                      <p className="text-sm font-bold text-green-900 dark:text-green-100">
                                        Liste: ₺{suggestedListPrice}
                                      </p>
                                      <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                                        Kampanya: ₺{suggestedCampaignPrice} (%5 indirim)
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 space-y-1 text-xs text-blue-800 dark:text-blue-200">
                                    {isHighCargo && (
                                      <p>• ⚠️ Kargo oranı yüksek (%{cargoRatio.toFixed(0)}), set satış düşünün</p>
                                    )}
                                    {realProfit < 25 && (
                                      <p>• 💰 {healthyMin} TL altı sürdürülebilir değil</p>
                                    )}
                                    {realProfit >= 25 && realProfit < 40 && (
                                      <p>• ✅ Mevcut fiyat kabul edilebilir ama {idealMin}+ daha sağlıklı</p>
                                    )}
                                    {realProfit >= 40 && (
                                      <p>• 🎉 Harika! Reklam ve büyüme için alan var</p>
                                    )}
                                    <p>• 📊 {pricing.breakEvenPrice} TL altı kesinlikle zarar</p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Detaylı Döküm - Daraltılabilir */}
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
                              <span className="group-open:rotate-90 transition-transform">▶</span>
                              Detaylı Maliyet Dökümü (Gelişmiş)
                            </summary>
                            
                          <div className="pt-3 border-t space-y-2 text-xs mt-2">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Üretim Maliyeti</span>
                              <span>₺{pricing.breakdown.productionCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Kutulama</span>
                              <span>₺{pricing.breakdown.packagingCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-amber-600">
                              <span>Kargo (Satıcı Öder)</span>
                              <span>₺{(pricing.breakdown.shippingCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Platform Hizmet Bedeli</span>
                              <span>₺{pricing.breakdown.platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-600 pt-2 border-t">
                              <span>Komisyon (%{trendyolSettings.commissionRate})</span>
                              <span>-₺{pricing.breakdown.commission.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Vade Farkı (%{trendyolSettings.paymentTermFee})</span>
                              <span>-₺{pricing.breakdown.paymentTermFee.toFixed(2)}</span>
                            </div>
                            
                            {/* YENİ: Profesyonel Maliyetler */}
                            <div className="pt-2 border-t">
                              <p className="text-xs font-semibold text-orange-600 mb-1">
                                Profesyonel Maliyetler {trendyolSettings.organicSalesMode && "(Organik Mod)"}
                              </p>
                              {!trendyolSettings.organicSalesMode && (
                                <div className="flex justify-between text-orange-600">
                                  <span>Reklam Maliyeti (%{trendyolSettings.advertisingRate})</span>
                                  <span>-₺{pricing.breakdown.advertisingCost.toFixed(2)}</span>
                                </div>
                              )}
                              {trendyolSettings.organicSalesMode && (
                                <div className="flex justify-between text-green-600">
                                  <span>✓ Reklam (Organik - %0)</span>
                                  <span>₺0.00</span>
                                </div>
                              )}
                              <div className="flex justify-between text-orange-600">
                                <span>İade Maliyeti (%{trendyolSettings.returnRate})</span>
                                <span>-₺{pricing.breakdown.returnCost.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground ml-4">
                                (Ürün + Kargo + Paket) × {trendyolSettings.returnRate}%
                              </p>
                              <div className="flex justify-between text-orange-600">
                                <span>Sabit Gider Dağılımı</span>
                                <span>-₺{pricing.breakdown.fixedCost.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            {trendyolSettings.showVatExcluded && (
                              <div className="pt-2 border-t border-purple-200">
                                <div className="flex justify-between text-purple-600 text-xs">
                                  <span>KDV Hariç Fiyat</span>
                                  <span>₺{pricing.breakdown.priceExcludingVat.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-purple-700 font-semibold text-xs">
                                  <span>KDV Hariç Net Marj</span>
                                  <span>{pricing.breakdown.realNetMarginExcludingVat.toFixed(2)}%</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-blue-600 text-xs italic">
                              <span>KDV (%{trendyolSettings.vatRate}) - Mahsuplaşır</span>
                              <span>₺{pricing.breakdown.vat.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between font-semibold text-green-600 pt-2 border-t">
                              <span>Temel Net Kar</span>
                              <span>₺{pricing.breakdown.netProfit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Temel Kar Oranı</span>
                              <span>{pricing.breakdown.profitMarginPercent.toFixed(1)}%</span>
                            </div>
                            
                            {/* YENİ: Gerçek Net Kar */}
                            <div className="flex justify-between font-bold text-emerald-700 pt-2 border-t-2 border-emerald-300">
                              <span>Gerçek Net Kar</span>
                              <span>₺{pricing.breakdown.realNetProfit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-emerald-600">
                              <span>Gerçek Kar Oranı</span>
                              <span>{pricing.breakdown.realProfitMarginPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sağ Kolon - Ayarlar ve Özet */}
          <div className="space-y-6">
            {/* Trendyol Ayarları */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Trendyol Ayarları
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    {showSettings ? "Gizle" : "Düzenle"}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showSettings && (
                <CardContent className="space-y-4">
                  <div className="pb-3 border-b">
                    <p className="text-sm font-semibold text-foreground mb-3">Üretim Maliyetleri</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="filamentPricePerKg">Filament Fiyatı (TL/kg)</Label>
                        <Input
                          id="filamentPricePerKg"
                          type="number"
                          value={trendyolSettings.filamentPricePerKg ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              filamentPricePerKg: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="electricityCostPerGram">Elektrik Maliyeti (TL/gr)</Label>
                        <Input
                          id="electricityCostPerGram"
                          type="number"
                          value={trendyolSettings.electricityCostPerGram ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              electricityCostPerGram: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="wastePercentage">Fire Oranı (%)</Label>
                        <Input
                          id="wastePercentage"
                          type="number"
                          value={trendyolSettings.wastePercentage ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              wastePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="depreciationCostPerGram">Yıpranma Maliyeti (TL/gr)</Label>
                        <Input
                          id="depreciationCostPerGram"
                          type="number"
                          value={trendyolSettings.depreciationCostPerGram ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              depreciationCostPerGram: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pb-3 border-b">
                    <p className="text-sm font-semibold text-foreground mb-3">Kargo Baremleri (26 Mart 2026)</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="fastShipping"
                          checked={trendyolSettings.fastShipping}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              fastShipping: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        <Label htmlFor="fastShipping" className="cursor-pointer">
                          Hızlı Gönderim (1 gün içinde)
                        </Label>
                      </div>
                      <div>
                        <Label htmlFor="cargoUnder200Fast">200 TL Altı - Hızlı (TL)</Label>
                        <Input
                          id="cargoUnder200Fast"
                          type="number"
                          value={trendyolSettings.cargoUnder200Fast ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargoUnder200Fast: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Varsayılan: 34,16 TL</p>
                      </div>
                      <div>
                        <Label htmlFor="cargoUnder200Slow">200 TL Altı - Yavaş (TL)</Label>
                        <Input
                          id="cargoUnder200Slow"
                          type="number"
                          value={trendyolSettings.cargoUnder200Slow ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargoUnder200Slow: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Varsayılan: 64,58 TL</p>
                      </div>
                      <div>
                        <Label htmlFor="cargo200to350Fast">200-350 TL - Hızlı (TL)</Label>
                        <Input
                          id="cargo200to350Fast"
                          type="number"
                          value={trendyolSettings.cargo200to350Fast ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargo200to350Fast: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Varsayılan: 65,83 TL</p>
                      </div>
                      <div>
                        <Label htmlFor="cargo200to350Slow">200-350 TL - Yavaş (TL)</Label>
                        <Input
                          id="cargo200to350Slow"
                          type="number"
                          value={trendyolSettings.cargo200to350Slow ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargo200to350Slow: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Varsayılan: 72,91 TL</p>
                      </div>
                      <div>
                        <Label htmlFor="cargoOver350">350 TL Üzeri (TL)</Label>
                        <Input
                          id="cargoOver350"
                          type="number"
                          value={trendyolSettings.cargoOver350 ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargoOver350: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Anlaşmalı fiyat (varsayılan: 55 TL)</p>
                        <p className="text-xs text-amber-600 mt-1">⚠️ 0 TL = Alıcı öder (nadir)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Trendyol Maliyetleri</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="commissionRate">Komisyon Oranı (%)</Label>
                        <Input
                          id="commissionRate"
                          type="number"
                          value={trendyolSettings.commissionRate ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              commissionRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.1"
                        />
                      </div>
                  <div>
                    <Label htmlFor="vatRate">KDV Oranı (%)</Label>
                    <Input
                      id="vatRate"
                      type="number"
                      value={trendyolSettings.vatRate ?? ""}
                      onChange={(e) =>
                        setTrendyolSettings({
                          ...trendyolSettings,
                          vatRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentTermFee">Vade Farkı (%)</Label>
                    <Input
                      id="paymentTermFee"
                      type="number"
                      value={trendyolSettings.paymentTermFee ?? ""}
                      onChange={(e) =>
                        setTrendyolSettings({
                          ...trendyolSettings,
                          paymentTermFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="packagingCost">Kutulama Maliyeti (TL)</Label>
                    <Input
                      id="packagingCost"
                      type="number"
                      value={trendyolSettings.packagingCost ?? ""}
                      onChange={(e) =>
                        setTrendyolSettings({
                          ...trendyolSettings,
                          packagingCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      step="0.1"
                    />
                  </div>
                      <div>
                        <Label htmlFor="profitMargin">Kar Marjı (%)</Label>
                        <Input
                          id="profitMargin"
                          type="number"
                          value={trendyolSettings.profitMargin ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              profitMargin: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Önerilen: %20-40</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* YENİ: Profesyonel Maliyetler Bölümü */}
                  <div className="pb-3 border-b">
                    <p className="text-sm font-semibold text-orange-600 mb-3">Profesyonel Maliyetler</p>
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="organicSalesMode"
                            checked={trendyolSettings.organicSalesMode}
                            onChange={(e) =>
                              setTrendyolSettings({
                                ...trendyolSettings,
                                organicSalesMode: e.target.checked,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor="organicSalesMode" className="cursor-pointer font-semibold text-green-700">
                            🌱 Organik Satış Modu
                          </Label>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Reklam maliyeti %0 olur. TikTok, Instagram Reels gibi organik kanallar için.
                        </p>
                      </div>
                      
                      {!trendyolSettings.organicSalesMode && (
                        <div>
                          <Label htmlFor="advertisingRate">Reklam Maliyeti (%)</Label>
                          <Input
                            id="advertisingRate"
                            type="number"
                            value={trendyolSettings.advertisingRate ?? ""}
                            onChange={(e) =>
                              setTrendyolSettings({
                                ...trendyolSettings,
                                advertisingRate: parseFloat(e.target.value) || 0,
                              })
                            }
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Ortalama: %5-10</p>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="returnRate">İade Oranı (%)</Label>
                        <Input
                          id="returnRate"
                          type="number"
                          value={trendyolSettings.returnRate ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              returnRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Ortalama: %3-7 (çift kargo dahil)</p>
                      </div>
                      <div>
                        <Label htmlFor="fixedCostPerOrder">Sabit Gider (TL/sipariş)</Label>
                        <Input
                          id="fixedCostPerOrder"
                          type="number"
                          value={trendyolSettings.fixedCostPerOrder ?? ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              fixedCostPerOrder: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Muhasebe, vergi, e-fatura vb.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* YENİ: Görünüm Ayarları */}
                  <div className="pb-3 border-b">
                    <p className="text-sm font-semibold text-foreground mb-3">Görünüm Ayarları</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showVatExcluded"
                        checked={trendyolSettings.showVatExcluded}
                        onChange={(e) =>
                          setTrendyolSettings({
                            ...trendyolSettings,
                            showVatExcluded: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="showVatExcluded" className="cursor-pointer">
                        KDV Hariç Analiz Göster
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Profesyonel muhasebe için</p>
                  </div>
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrendyolSettings(DEFAULT_TRENDYOL_SETTINGS)}
                      className="w-full"
                    >
                      Varsayılana Dön
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Bilgilendirme */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-semibold">Profesyonel Hesaplama Rehberi</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Başabaş Fiyatı:</strong> Altında zarar edersiniz (tüm maliyetler dahil)</li>
                      <li>• <strong>Temel Net Kar:</strong> Sadece üretim + kargo + komisyon</li>
                      <li>• <strong>Gerçek Net Kar:</strong> Reklam + iade + sabit gider dahil</li>
                      <li>• <strong>Organik Mod:</strong> Reklam %0 (TikTok, Instagram için)</li>
                      <li>• <strong>İade Maliyeti:</strong> Çift kargo + ürün kaybı dahil</li>
                      <li>• <strong>Hedef Kar:</strong> Min 15 TL, ideal 25+ TL</li>
                      <li>• <strong>Küçük ürünler:</strong> Set satış yapın (kargo paylaşılır)</li>
                      <li>• <strong>KDV:</strong> Mahsuplaşır, gerçek gider değil</li>
                    </ul>
                    <div className="pt-2 border-t border-blue-300">
                      <p className="text-xs font-semibold text-blue-800">💡 Tek Kişilik Operasyon İpuçları</p>
                      <ul className="space-y-1 text-xs mt-1">
                        <li>• Organik satış modunu kullanın (başlangıçta)</li>
                        <li>• 3-5'li setler hazırlayın (kargo optimizasyonu)</li>
                        <li>• Sabit gideri 3-6 TL tutun</li>
                        <li>• İade oranını %3-5 aralığında tutun</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toplam Özet */}
            {products.length > 0 && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                    <TrendingUp className="w-5 h-5" />
                    Toplam Özet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-800 dark:text-green-200">Toplam Ürün</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {totalCalculations.totalQuantity} adet
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-800 dark:text-green-200">Üretim Maliyeti</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      ₺{totalCalculations.totalProductionCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-800 dark:text-green-200">Önerilen Gelir</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      ₺{totalCalculations.totalRecommendedRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-green-300 dark:border-green-800">
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-900 dark:text-green-100">Temel Net Kar</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₺{totalCalculations.totalProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t-2 border-emerald-400 dark:border-emerald-700">
                    <div className="flex justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-100">Gerçek Net Kar</span>
                      <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                        ₺{totalCalculations.totalRealProfit.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      Reklam, iade ve sabit giderler dahil
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
