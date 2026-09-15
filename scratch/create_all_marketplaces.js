const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const platforms = [
  { key: 'n11', name: 'n11', defaultCommission: 17 },
  { key: 'pazarama', name: 'Pazarama', defaultCommission: 15 },
  { key: 'trendruum', name: 'Trendruum', defaultCommission: 15 },
  { key: 'idefix', name: 'İdefix', defaultCommission: 16 },
];

for (const p of platforms) {
  console.log(`\n=== Creating platform: ${p.name} (${p.key}) ===`);
  const compDir = path.join(rootDir, 'components', p.key);
  const appDir = path.join(rootDir, 'app', 'dashboard', p.key);

  if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

  // 1. Cargo Price Calculator
  const cargoCalcContent = `"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  MARKETPLACE_CARGO_COMPANIES,
  getMarketplaceCargoExVat,
  calcMarketplaceShippingCost,
} from "@/lib/marketplace-cargo";

export function CargoPriceCalculator() {
  const [orderAmount, setOrderAmount] = useState<string>("180");
  const [width, setWidth] = useState<string>("25");
  const [height, setHeight] = useState<string>("20");
  const [depth, setDepth] = useState<string>("15");
  const [weightKg, setWeightKg] = useState<string>("1");
  const [selectedCompany, setSelectedCompany] = useState<string>("auto");

  const desi = useMemo(() => {
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const d = parseFloat(depth) || 0;
    if (w <= 0 || h <= 0 || d <= 0) return 1;
    return Math.max(1, Math.ceil((w * h * d) / 3000));
  }, [width, height, depth]);

  const effectiveDesi = useMemo(() => {
    const wt = parseFloat(weightKg) || 0;
    return Math.max(1, desi, Math.ceil(wt));
  }, [desi, weightKg]);

  const amount = parseFloat(orderAmount) || 0;

  const cost = useMemo(() => {
    return calcMarketplaceShippingCost(effectiveDesi * 1000, amount, true, selectedCompany);
  }, [effectiveDesi, amount, selectedCompany]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-5 h-5 text-blue-500" />
            ${p.name} Anlaşmalı Kargo ve Barem Hesaplayıcı
          </CardTitle>
          <CardDescription>
            Sipariş tutarı ve desi değerine göre anlaşmalı kargo maliyetlerinizi hesaplayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Sipariş Satış Fiyatı (TL)</Label>
              <Input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                className="mt-1"
                placeholder="180"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Kargo Firması Tercihi</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-input bg-background text-sm font-medium"
              >
                {MARKETPLACE_CARGO_COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Ağırlık (kg)</Label>
              <Input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1"
                placeholder="1.0"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1 text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              Paket Ölçüleri
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">En (cm)</Label>
                <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-[11px]">Boy (cm)</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-[11px]">Yükseklik (cm)</Label>
                <Input type="number" value={depth} onChange={(e) => setDepth(e.target.value)} className="mt-1 h-9" />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Hacimsel: <strong>{desi} Desi</strong></span>
              <span>Faturalandırılan: <strong>{effectiveDesi} Desi</strong></span>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Badge className="bg-blue-600 text-white mb-1">
                {amount < 200 ? "Barem Altı Avantajlı" : amount < 350 ? "Orta Barem" : "Standart Desi"}
              </Badge>
              <p className="text-sm font-medium text-foreground">
                ${p.name} Anlaşmalı Kargo Fiyatı
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">KDV Hariç: ₺{(cost / 1.20).toFixed(2)}</div>
              <div className="text-2xl font-extrabold text-foreground">
                ₺{cost.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">KDV Dahil</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(compDir, 'cargo-price-calculator.tsx'), cargoCalcContent, 'utf8');

  // 2. Calculator Client
  let baseCalc = fs.readFileSync(path.join(rootDir, 'components', 'trendyol', 'trendyol-calculator-client.tsx'), 'utf8');
  
  // Custom replacements for platform
  baseCalc = baseCalc
    .replace(/TrendyolCalculatorClient/g, `${p.name.replace(/[^a-zA-Z0-9]/g, '')}CalculatorClient`)
    .replace(/TrendyolProduct/g, `${p.name.replace(/[^a-zA-Z0-9]/g, '')}Product`)
    .replace(/TrendyolSettings/g, `${p.name.replace(/[^a-zA-Z0-9]/g, '')}Settings`)
    .replace(/DEFAULT_TRENDYOL_SETTINGS/g, `DEFAULT_${p.key.toUpperCase()}_SETTINGS`)
    .replace(/trendyolSettings/g, `${p.key}Settings`)
    .replace(/trendyolProducts/g, `${p.key}Products`)
    .replace(/@\/lib\/trendyol-cargo/g, '@/lib/marketplace-cargo')
    .replace(/CARGO_COMPANIES/g, 'MARKETPLACE_CARGO_COMPANIES')
    .replace(/calcShippingCost/g, 'calcMarketplaceShippingCost')
    .replace(/Trendyol'un/g, `${p.name}'ın`)
    .replace(/Trendyol'da/g, `${p.name}'da`)
    .replace(/Trendyol'dan/g, `${p.name}'dan`)
    .replace(/Trendyol'a/g, `${p.name}'a`)
    .replace(/Trendyol/g, p.name)
    .replace(/commissionRate:\s*\d+,/g, `commissionRate: ${p.defaultCommission},`);

  fs.writeFileSync(path.join(compDir, `${p.key}-calculator-client.tsx`), baseCalc, 'utf8');

  // 3. Tabs
  const compName = `${p.name.replace(/[^a-zA-Z0-9]/g, '')}`;
  const tabsContent = `"use client";

import { useState } from "react";
import { Store, Truck } from "lucide-react";
import { ${compName}CalculatorClient } from "./${p.key}-calculator-client";
import { CargoPriceCalculator } from "./cargo-price-calculator";

const TABS = [
  { id: "calculator", label: "Fiyat Hesaplayıcı", icon: Store },
  { id: "cargo", label: "Kargo Fiyatları", icon: Truck },
];

export function ${compName}Tabs() {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <div className="flex-1 overflow-auto">
      {/* Tab Bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          <div className="flex gap-1 pt-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={\`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors \${
                    isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }\`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "calculator" && <${compName}CalculatorClient />}
      {activeTab === "cargo" && (
        <div className="container mx-auto p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">${p.name} Kargo Fiyatları</h1>
                <p className="text-sm text-muted-foreground">
                  ${p.name} anlaşmalı kargo fiyatları ve desi hesaplama
                </p>
              </div>
            </div>
          </div>
          <CargoPriceCalculator />
        </div>
      )}
    </div>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${p.key}-tabs.tsx`), tabsContent, 'utf8');

  // 4. Page in app/dashboard/[platform]/page.tsx
  const pageContent = `"use client";

import { ${compName}Tabs } from "@/components/${p.key}/${p.key}-tabs";

export default function ${compName}Page() {
  return <${compName}Tabs />;
}
`;
  fs.writeFileSync(path.join(appDir, 'page.tsx'), pageContent, 'utf8');

  console.log(`Created files for ${p.name}!`);
}

console.log('\nAll 4 platforms created successfully!');
