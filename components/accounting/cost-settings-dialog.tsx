"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CostSettings } from "@/lib/types/database";
import { DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Save, RotateCcw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CostSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdated?: () => void;
}

export function CostSettingsDialog({
  open,
  onOpenChange,
  onSettingsUpdated,
}: CostSettingsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [filamentPrice, setFilamentPrice] = useState(DEFAULT_COST_SETTINGS.filament_price_per_kg);
  const [filamentEnabled, setFilamentEnabled] = useState(DEFAULT_COST_SETTINGS.filament_enabled);
  
  const [electricityCost, setElectricityCost] = useState(DEFAULT_COST_SETTINGS.electricity_cost_per_gram);
  const [electricityEnabled, setElectricityEnabled] = useState(DEFAULT_COST_SETTINGS.electricity_enabled);
  
  const [wastePercentage, setWastePercentage] = useState(DEFAULT_COST_SETTINGS.waste_percentage);
  const [wasteEnabled, setWasteEnabled] = useState(DEFAULT_COST_SETTINGS.waste_enabled);
  
  const [depreciationCost, setDepreciationCost] = useState(DEFAULT_COST_SETTINGS.depreciation_cost_per_gram);
  const [depreciationEnabled, setDepreciationEnabled] = useState(DEFAULT_COST_SETTINGS.depreciation_enabled);
  
  const [profitMargin1, setProfitMargin1] = useState(DEFAULT_COST_SETTINGS.profit_margin_1);
  const [profitMargin2, setProfitMargin2] = useState(DEFAULT_COST_SETTINGS.profit_margin_2);
  const [profitMargin3, setProfitMargin3] = useState(DEFAULT_COST_SETTINGS.profit_margin_3);
  const [profitMargin4, setProfitMargin4] = useState(DEFAULT_COST_SETTINGS.profit_margin_4);
  const [profitMargin5, setProfitMargin5] = useState(DEFAULT_COST_SETTINGS.profit_margin_5);
  
  const [priceRoundingEnabled, setPriceRoundingEnabled] = useState(DEFAULT_COST_SETTINGS.price_rounding_enabled);

  // Ayarları yükle
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  async function loadSettings() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cost_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setFilamentPrice(data.filament_price_per_kg);
        setFilamentEnabled(data.filament_enabled);
        setElectricityCost(data.electricity_cost_per_gram);
        setElectricityEnabled(data.electricity_enabled);
        setWastePercentage(data.waste_percentage);
        setWasteEnabled(data.waste_enabled);
        setDepreciationCost(data.depreciation_cost_per_gram);
        setDepreciationEnabled(data.depreciation_enabled);
        setProfitMargin1(data.profit_margin_1);
        setProfitMargin2(data.profit_margin_2);
        setProfitMargin3(data.profit_margin_3);
        setProfitMargin4(data.profit_margin_4);
        setProfitMargin5(data.profit_margin_5);
        setPriceRoundingEnabled(data.price_rounding_enabled);
      }
    } catch (error) {
      console.error("Ayarlar yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ayarlar yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      
      const updates = {
        filament_price_per_kg: filamentPrice,
        filament_enabled: filamentEnabled,
        electricity_cost_per_gram: electricityCost,
        electricity_enabled: electricityEnabled,
        waste_percentage: wastePercentage,
        waste_enabled: wasteEnabled,
        depreciation_cost_per_gram: depreciationCost,
        depreciation_enabled: depreciationEnabled,
        profit_margin_1: profitMargin1,
        profit_margin_2: profitMargin2,
        profit_margin_3: profitMargin3,
        profit_margin_4: profitMargin4,
        profit_margin_5: profitMargin5,
        price_rounding_enabled: priceRoundingEnabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("cost_settings")
        .update(updates)
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Maliyet ayarları güncellendi",
      });

      onSettingsUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Ayarlar kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setFilamentPrice(DEFAULT_COST_SETTINGS.filament_price_per_kg);
    setFilamentEnabled(DEFAULT_COST_SETTINGS.filament_enabled);
    setElectricityCost(DEFAULT_COST_SETTINGS.electricity_cost_per_gram);
    setElectricityEnabled(DEFAULT_COST_SETTINGS.electricity_enabled);
    setWastePercentage(DEFAULT_COST_SETTINGS.waste_percentage);
    setWasteEnabled(DEFAULT_COST_SETTINGS.waste_enabled);
    setDepreciationCost(DEFAULT_COST_SETTINGS.depreciation_cost_per_gram);
    setDepreciationEnabled(DEFAULT_COST_SETTINGS.depreciation_enabled);
    setProfitMargin1(DEFAULT_COST_SETTINGS.profit_margin_1);
    setProfitMargin2(DEFAULT_COST_SETTINGS.profit_margin_2);
    setProfitMargin3(DEFAULT_COST_SETTINGS.profit_margin_3);
    setProfitMargin4(DEFAULT_COST_SETTINGS.profit_margin_4);
    setProfitMargin5(DEFAULT_COST_SETTINGS.profit_margin_5);
    setPriceRoundingEnabled(DEFAULT_COST_SETTINGS.price_rounding_enabled);
    
    toast({
      title: "Sıfırlandı",
      description: "Ayarlar varsayılan değerlere döndürüldü",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Maliyet Hesaplama Ayarları
          </DialogTitle>
          <DialogDescription>
            Ürün maliyet hesaplamaları için parametreleri yönetin. Her parametreyi aktif/pasif yapabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : (
          <div className="space-y-6">
            {/* Filament Fiyatı */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Filament Fiyatı</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filamentEnabled}
                    onChange={(e) => setFilamentEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filament-price" className="text-sm text-muted-foreground">
                  TL/kg
                </Label>
                <Input
                  id="filament-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={filamentPrice}
                  onChange={(e) => setFilamentPrice(parseFloat(e.target.value) || 0)}
                  disabled={!filamentEnabled}
                />
              </div>
            </div>

            {/* Elektrik Maliyeti */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Elektrik Maliyeti</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={electricityEnabled}
                    onChange={(e) => setElectricityEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricity-cost" className="text-sm text-muted-foreground">
                  TL/gram
                </Label>
                <Input
                  id="electricity-cost"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={electricityCost}
                  onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0)}
                  disabled={!electricityEnabled}
                />
              </div>
            </div>

            {/* Fire Oranı */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fire Oranı</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wasteEnabled}
                    onChange={(e) => setWasteEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waste-percentage" className="text-sm text-muted-foreground">
                  Yüzde (%)
                </Label>
                <Input
                  id="waste-percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={wastePercentage}
                  onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)}
                  disabled={!wasteEnabled}
                />
              </div>
            </div>

            {/* Yıpranma Maliyeti */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Yıpranma Maliyeti</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depreciationEnabled}
                    onChange={(e) => setDepreciationEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depreciation-cost" className="text-sm text-muted-foreground">
                  TL/gram
                </Label>
                <Input
                  id="depreciation-cost"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={depreciationCost}
                  onChange={(e) => setDepreciationCost(parseFloat(e.target.value) || 0)}
                  disabled={!depreciationEnabled}
                />
              </div>
            </div>

            {/* Kar Marjları */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <Label className="text-base font-semibold">Kar Marjları (%)</Label>
              <div className="grid grid-cols-5 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="margin-1" className="text-xs text-muted-foreground">
                    Marj 1
                  </Label>
                  <Input
                    id="margin-1"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profitMargin1}
                    onChange={(e) => setProfitMargin1(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-2" className="text-xs text-muted-foreground">
                    Marj 2
                  </Label>
                  <Input
                    id="margin-2"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profitMargin2}
                    onChange={(e) => setProfitMargin2(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-3" className="text-xs text-muted-foreground">
                    Marj 3
                  </Label>
                  <Input
                    id="margin-3"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profitMargin3}
                    onChange={(e) => setProfitMargin3(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-4" className="text-xs text-muted-foreground">
                    Marj 4
                  </Label>
                  <Input
                    id="margin-4"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profitMargin4}
                    onChange={(e) => setProfitMargin4(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-5" className="text-xs text-muted-foreground">
                    Marj 5
                  </Label>
                  <Input
                    id="margin-5"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profitMargin5}
                    onChange={(e) => setProfitMargin5(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Fiyat Yuvarlama */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Fiyat Yuvarlama</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Satış fiyatlarını 0 veya 5'e yuvarla
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceRoundingEnabled}
                    onChange={(e) => setPriceRoundingEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </label>
              </div>
            </div>

            {/* Uyarı */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Önemli Not</p>
                <p>
                  Ayarları değiştirdiğinizde, mevcut ürünlerin maliyet hesaplamaları otomatik olarak güncellenir.
                  Bu işlem birkaç saniye sürebilir.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading || saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Sıfırla
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
