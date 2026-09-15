const fs = require("fs");
const path = require("path");

const files = [
  { file: "components/n11/n11-calculator-client.tsx", name: "n11", color: "orange" },
  { file: "components/pazarama/pazarama-calculator-client.tsx", name: "Pazarama", color: "blue" },
  { file: "components/trendruum/trendruum-calculator-client.tsx", name: "Trendruum", color: "purple" },
  { file: "components/idefix/idefix-calculator-client.tsx", name: "İdefix", color: "red" },
];

for (const item of files) {
  const filePath = path.resolve(item.file);
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Ensure Truck is imported
  if (!content.includes("Truck,")) {
    content = content.replace(
      'import { FileText, Calendar, User, Package, AlertCircle, Store, Settings, Calculator, TrendingUp, ShoppingBag }',
      'import { FileText, Calendar, User, Package, AlertCircle, Store, Settings, Calculator, TrendingUp, ShoppingBag, Truck }'
    );
  }

  // 2. Add quick cargo selector in Header (regex to handle CRLF/LF)
  const headerRegex = /\{\/\* Header \*\/\}\s*<div className="mb-6 flex items-center gap-3">\s*<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">\s*<Store className="w-5 h-5 text-white" \/>\s*<\/div>\s*<div>\s*<h1 className="text-2xl font-bold">([^<]+)<\/h1>\s*<p className="text-sm text-muted-foreground">Pazaryeri satış fiyatı hesaplama<\/p>\s*<\/div>\s*<\/div>/;

  const headerMatch = content.match(headerRegex);
  if (headerMatch) {
    const titleText = headerMatch[1];
    const newHeader = `{/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">${titleText}</h1>
              <p className="text-sm text-muted-foreground">Pazaryeri satış fiyatı hesaplama</p>
            </div>
          </div>

          {/* Hızlı Kargo Firması Seçimi */}
          <div className="flex items-center gap-2.5 bg-card border rounded-xl px-3.5 py-2 shadow-sm">
            <Truck className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Kargo Şirketi:</span>
            <select
              value={settings.cargoCompany || "auto"}
              onChange={(e) => upd({ cargoCompany: e.target.value })}
              className="text-xs font-bold bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer text-foreground"
            >
              {MARKETPLACE_CARGO_COMPANIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-popover text-foreground">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>`;
    content = content.replace(headerRegex, newHeader);
  } else {
    console.warn(`Could not match header in ${item.file}`);
  }

  // 3. Add cargo company selector in purchase form
  const purchaseRegex = /(<p className="text-xs text-muted-foreground mt-1">Sipariş başı sabit gider \(0 yapabilirsin\)<\/p>\s*<\/div>\s*<\/div>\s*)(\{\/\* Kendi Satış Fiyatım Simülasyonu \*\/})/;

  if (purchaseRegex.test(content)) {
    const injection = `                  <div className="md:col-span-2">
                    <Label htmlFor="purchase-cargo-company" className="text-xs font-semibold flex items-center gap-1.5">
                      🚚 Kargo Şirketi Tercihi
                    </Label>
                    <select
                      id="purchase-cargo-company"
                      value={settings.cargoCompany || "auto"}
                      onChange={(e) => upd({ cargoCompany: e.target.value })}
                      className="w-full h-9 mt-1 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {MARKETPLACE_CARGO_COMPANIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Özel kargo barem ve maliyet hesabı için kargo şirketi seçebilirsiniz</p>
                  </div>
                </div>

                $2`;
    content = content.replace(purchaseRegex, `$1${injection}`);
  } else {
    console.warn(`Could not match purchaseRegex in ${item.file}`);
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Updated ${item.file}`);
}
