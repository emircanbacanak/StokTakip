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
  
  // Kargo Baremleri (26 Mart 2026)
  cargoUnder200Fast: number; // 200 TL altı hızlı gönderim (1 gün)
  cargoUnder200Slow: number; // 200 TL altı yavaş gönderim
  cargo200to350Fast: number; // 200-350 TL hızlı gönderim
  cargo200to350Slow: number; // 200-350 TL yavaş gönderim
  cargoOver350: number; // 350 TL üzeri (anlaşmalı fiyat)
  fastShipping: boolean; // Hızlı gönderim yapıyor musunuz?
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
  
  // Kargo Baremleri (26 Mart 2026)
  cargoUnder200Fast: 34.16, // 200 TL altı hızlı (1 gün)
  cargoUnder200Slow: 64.58, // 200 TL altı yavaş
  cargo200to350Fast: 65.83, // 200-350 TL hızlı
  cargo200to350Slow: 72.91, // 200-350 TL yavaş
  cargoOver350: 0, // 350 TL üzeri (anlaşmalı, alıcı öder)
  fastShipping: true, // Varsayılan: Hızlı gönderim
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
    breakdown: {
      productionCost: number;
      packagingCost: number;
      shippingCost: number;
      platformFee: number;
      commission: number;
      vat: number;
      paymentTermFee: number;
      totalCost: number;
      profit: number;
      netProfit: number;
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
    
    // 10. Önerilen satış fiyatı - KAR MARJI NET KAR ÜZERİNDEN
    // İstenen net kar = Toplam Maliyet × Kar Marjı%
    const desiredNetProfit = finalFixedCost * (trendyolSettings.profitMargin / 100);
    
    // Önerilen Fiyat = (Toplam Maliyet + İstenen Kar) / (1 - Kesinti%)
    let recommendedPrice = (finalFixedCost + desiredNetProfit) / (1 - totalDeductionRate);
    
    // 11. Önerilen fiyat için kargo maliyetini hesapla
    const shippingCostForRecommended = calculateShippingCost(recommendedPrice);
    
    // Eğer kargo maliyeti değiştiyse, yeniden hesapla
    if (shippingCostForRecommended !== shippingCost) {
      const newFixedCost = fixedCostWithoutShipping + shippingCostForRecommended;
      const newDesiredNetProfit = newFixedCost * (trendyolSettings.profitMargin / 100);
      recommendedPrice = (newFixedCost + newDesiredNetProfit) / (1 - totalDeductionRate);
    }
    
    // 12. Detaylı döküm (önerilen fiyat üzerinden)
    const commission = recommendedPrice * (trendyolSettings.commissionRate / 100);
    const paymentTermFee = recommendedPrice * (trendyolSettings.paymentTermFee / 100);
    const vat = recommendedPrice * (trendyolSettings.vatRate / 100); // KDV bilgi amaçlı
    
    const totalCost = productionCost + packagingCost + shippingCostForRecommended + platformFee + commission + paymentTermFee;
    const netProfit = recommendedPrice - totalCost;
    const profit = recommendedPrice - (productionCost + packagingCost + shippingCostForRecommended + platformFee);
    
    return {
      minSalePrice: Math.ceil(minSalePrice / 5) * 5, // 5'e yuvarla
      recommendedPrice: Math.ceil(recommendedPrice / 5) * 5, // 5'e yuvarla
      breakdown: {
        productionCost,
        packagingCost,
        shippingCost: shippingCostForRecommended,
        platformFee,
        commission,
        vat,
        paymentTermFee,
        totalCost,
        profit,
        netProfit,
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
        totalQuantity: acc.totalQuantity + product.quantity,
      };
    },
    { totalProductionCost: 0, totalRecommendedRevenue: 0, totalProfit: 0, totalQuantity: 0 }
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
                              <p className="text-muted-foreground">Minimum Fiyat</p>
                              <p className="font-semibold text-amber-600">₺{pricing.minSalePrice.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Önerilen Fiyat</p>
                              <p className="font-semibold text-green-600">₺{pricing.recommendedPrice.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t space-y-2 text-xs">
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
                            <div className="flex justify-between text-blue-600 text-xs italic">
                              <span>KDV (%{trendyolSettings.vatRate}) - Bilgi Amaçlı</span>
                              <span>₺{pricing.breakdown.vat.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-green-600 pt-2 border-t">
                              <span>Net Kar (Adet Başı)</span>
                              <span>₺{pricing.breakdown.netProfit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Kar Oranı</span>
                              <span>{((pricing.breakdown.netProfit / (pricing.breakdown.productionCost + pricing.breakdown.packagingCost + pricing.breakdown.shippingCost + pricing.breakdown.platformFee)) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
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
                          value={trendyolSettings.filamentPricePerKg || ""}
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
                          value={trendyolSettings.electricityCostPerGram || ""}
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
                          value={trendyolSettings.wastePercentage || ""}
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
                          value={trendyolSettings.depreciationCostPerGram || ""}
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
                          value={trendyolSettings.cargoUnder200Fast || ""}
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
                          value={trendyolSettings.cargoUnder200Slow || ""}
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
                          value={trendyolSettings.cargo200to350Fast || ""}
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
                          value={trendyolSettings.cargo200to350Slow || ""}
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
                          value={trendyolSettings.cargoOver350 || ""}
                          onChange={(e) =>
                            setTrendyolSettings({
                              ...trendyolSettings,
                              cargoOver350: parseFloat(e.target.value) || 0,
                            })
                          }
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Anlaşmalı fiyat (varsayılan: 0 TL)</p>
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
                          value={trendyolSettings.commissionRate || ""}
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
                      value={trendyolSettings.vatRate || ""}
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
                      value={trendyolSettings.paymentTermFee || ""}
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
                      value={trendyolSettings.packagingCost || ""}
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
                          value={trendyolSettings.profitMargin || ""}
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
                    <p className="font-semibold">Trendyol Kargo Kuralları (26 Mart 2026)</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>200 TL altı:</strong> Hızlı 34,16 TL / Yavaş 64,58 TL</li>
                      <li>• <strong>200-350 TL:</strong> Hızlı 65,83 TL / Yavaş 72,91 TL</li>
                      <li>• <strong>350 TL üzeri:</strong> Anlaşmalı fiyat listesi</li>
                      <li>• <strong>Hızlı gönderim:</strong> 1 gün içinde daha ucuz</li>
                      <li>• <strong>10 desi sınırı:</strong> Üzeri barem dışı</li>
                      <li>• <strong>Otomatik iptal:</strong> 45 gün içinde çıkmazsa</li>
                      <li>• Komisyon: %12-18 (kategoriye göre)</li>
                      <li>• Platform bedeli: 10.99 TL + KDV</li>
                    </ul>
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
                      <span className="font-semibold text-green-900 dark:text-green-100">Net Kar</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₺{totalCalculations.totalProfit.toFixed(2)}
                      </span>
                    </div>
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
