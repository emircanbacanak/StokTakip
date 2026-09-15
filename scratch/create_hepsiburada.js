const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const trendyolDir = path.join(rootDir, 'components', 'trendyol');
const hepsiburadaDir = path.join(rootDir, 'components', 'hepsiburada');

if (!fs.existsSync(hepsiburadaDir)) {
  fs.mkdirSync(hepsiburadaDir, { recursive: true });
}

// 1. Cargo Price Calculator
console.log('1. Creating cargo-price-calculator.tsx for Hepsiburada...');
let cargoContent = fs.readFileSync(path.join(trendyolDir, 'cargo-price-calculator.tsx'), 'utf8');
cargoContent = cargoContent
  .replace(/Trendyol anlaşmalı kargo fiyatı karşılaştırma/g, 'Hepsiburada anlaşmalı kargo fiyatı karşılaştırma')
  .replace(/Trendyol Kargo/g, 'Hepsiburada Kargo')
  .replace(/Trendyol/g, 'Hepsiburada');
fs.writeFileSync(path.join(hepsiburadaDir, 'cargo-price-calculator.tsx'), cargoContent, 'utf8');

// 2. Calculator Client
console.log('2. Creating hepsiburada-calculator-client.tsx...');
let calcContent = fs.readFileSync(path.join(trendyolDir, 'trendyol-calculator-client.tsx'), 'utf8');

// Replace identifiers and storage keys
calcContent = calcContent
  .replace(/TrendyolCalculatorClient/g, 'HepsiburadaCalculatorClient')
  .replace(/TrendyolProduct/g, 'HepsiburadaProduct')
  .replace(/TrendyolSettings/g, 'HepsiburadaSettings')
  .replace(/DEFAULT_TRENDYOL_SETTINGS/g, 'DEFAULT_HEPSIBURADA_SETTINGS')
  .replace(/trendyolSettings/g, 'hepsiburadaSettings')
  .replace(/trendyolProducts/g, 'hepsiburadaProducts')
  .replace(/Trendyol'un/g, "Hepsiburada'nın")
  .replace(/Trendyol'da/g, "Hepsiburada'da")
  .replace(/Trendyol'dan/g, "Hepsiburada'dan")
  .replace(/Trendyol'a/g, "Hepsiburada'ya")
  .replace(/Trendyol/g, 'Hepsiburada')
  .replace(/trendyol/g, 'hepsiburada');

fs.writeFileSync(path.join(hepsiburadaDir, 'hepsiburada-calculator-client.tsx'), calcContent, 'utf8');

// 3. Hepsiburada Tabs
console.log('3. Creating hepsiburada-tabs.tsx...');
let tabsContent = fs.readFileSync(path.join(trendyolDir, 'trendyol-tabs.tsx'), 'utf8');
tabsContent = tabsContent
  .replace(/TrendyolTabs/g, 'HepsiburadaTabs')
  .replace(/TrendyolCalculatorClient/g, 'HepsiburadaCalculatorClient')
  .replace(/\.\/trendyol-calculator-client/g, './hepsiburada-calculator-client')
  .replace(/Trendyol anlaşmalı kargo fiyatı karşılaştırma/g, 'Hepsiburada anlaşmalı kargo fiyatı karşılaştırma')
  .replace(/Trendyol/g, 'Hepsiburada');

fs.writeFileSync(path.join(hepsiburadaDir, 'hepsiburada-tabs.tsx'), tabsContent, 'utf8');

// 4. Page in app/dashboard/hepsiburada/page.tsx
console.log('4. Creating app/dashboard/hepsiburada/page.tsx...');
const pageContent = `"use client";

import { HepsiburadaTabs } from "@/components/hepsiburada/hepsiburada-tabs";

export default function HepsiburadaPage() {
  return <HepsiburadaTabs />;
}
`;
fs.writeFileSync(path.join(rootDir, 'app', 'dashboard', 'hepsiburada', 'page.tsx'), pageContent, 'utf8');

console.log('All Hepsiburada files created successfully!');
