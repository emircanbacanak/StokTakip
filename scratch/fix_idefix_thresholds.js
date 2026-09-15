const fs = require("fs");
const file = "components/idefix/idefix-calculator-client.tsx";
let c = fs.readFileSync(file, "utf8");

// 1. Replace barem labels in calcDetailedPurchasePrice
c = c.replace(
  /let baremLabel = "Standart Kargo \(₺350\+\)";\s*let baremBadgeClass = "[^"]+";\s*if \(desi < 10\) \{\s*if \(P < 200\) \{\s*baremLabel = "🟢 Barem Altı \(<₺200 Destekli\)";\s*baremBadgeClass = "[^"]+";\s*\} else if \(P < 350\) \{\s*baremLabel = "🔵 Barem Üstü \(₺200-₺349 Destekli\)";\s*baremBadgeClass = "[^"]+";\s*\}\s*\}/,
  `let baremLabel = "Standart Kargo (₺300+)";
    let baremBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300";
    if (P < 150) {
      baremLabel = "🟢 50 TL Barem Desteği (<₺150)";
      baremBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300";
    } else if (P < 300) {
      baremLabel = "🔵 20 TL Barem Desteği (₺150-₺299)";
      baremBadgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300";
    }`
);

// 2. Replace solver in calcDetailedPurchasePrice
c = c.replace(
  /let recPrice = 200;\s*if \(desi < 10\) \{\s*const sh199 = calcMarketplaceShippingCost\(weightGrams, 199, s\.fastShipping, s\.cargoCompany\);\s*const p1 = calcExactPriceForShipping\(sh199\);\s*const sh250 = calcMarketplaceShippingCost\(weightGrams, 250, s\.fastShipping, s\.cargoCompany\);\s*const p2 = calcExactPriceForShipping\(sh250\);\s*const sh350 = calcMarketplaceShippingCost\(weightGrams, 350, s\.fastShipping, s\.cargoCompany\);\s*const p3 = calcExactPriceForShipping\(sh350\);\s*if \(p1 <= 199\) recPrice = Math\.ceil\(p1\);\s*else if \(p2 >= 200 && p2 < 350\) recPrice = Math\.ceil\(p2\);\s*else recPrice = Math\.ceil\(p3\);\s*\} else \{\s*const sh350 = calcMarketplaceShippingCost\(weightGrams, 350, s\.fastShipping, s\.cargoCompany\);\s*recPrice = Math\.ceil\(calcExactPriceForShipping\(sh350\)\);\s*\}\s*if \(desi < 10 && recPrice > 199\) \{\s*const r199 = calcForPrice\(199\);\s*const rRec = calcForPrice\(recPrice\);\s*if \(r199 && rRec && r199\.netProfitAfterVat > rRec\.netProfitAfterVat\) \{\s*recPrice = 199;\s*\}\s*\}/,
  `let recPrice = 150;
  const sh149 = calcMarketplaceShippingCost(weightGrams, 149, s.fastShipping, s.cargoCompany);
  const p1 = calcExactPriceForShipping(sh149);

  const sh200 = calcMarketplaceShippingCost(weightGrams, 200, s.fastShipping, s.cargoCompany);
  const p2 = calcExactPriceForShipping(sh200);

  const sh300 = calcMarketplaceShippingCost(weightGrams, 300, s.fastShipping, s.cargoCompany);
  const p3 = calcExactPriceForShipping(sh300);

  if (p1 <= 149) recPrice = Math.ceil(p1);
  else if (p2 >= 150 && p2 < 300) recPrice = Math.ceil(p2);
  else recPrice = Math.ceil(p3);

  if (recPrice > 149) {
    const r149 = calcForPrice(149);
    const rRec = calcForPrice(recPrice);
    if (r149 && rRec && r149.netProfitAfterVat > rRec.netProfitAfterVat) {
      recPrice = 149;
    }
  }`
);

// 3. Replace in calcIdefixPrice
c = c.replace(
  /\/\/ 1\) Barem Altı \(< 200 TL\)[\s\S]*?\/\/ 3\) Standart Kargo \(>= 350 TL\)[\s\S]*?if \(isFinite\(priceUnder200\)\) exactTargetPrice = priceUnder200;\s*else if \(isFinite\(price200to350\)\) exactTargetPrice = price200to350;/,
  `// 1) Barem Desteği 1 (< 150 TL) -> 50 TL destek
  let priceUnder150 = Infinity;
  let beUnder150 = Infinity;
  const sh149 = calcShipping(weightGramsTotal, 149, s.fastShipping, s.cargoCompany);
  const p1 = calcPriceForShippingComp(sh149, productionCostTotal, weightGramsTotal, s, m);
  if (p1 <= 149) priceUnder150 = p1;
  const be1 = calcPriceForShippingComp(sh149, productionCostTotal, weightGramsTotal, s, 0);
  if (be1 <= 149) beUnder150 = be1;

  // 2) Barem Desteği 2 (150 - 299 TL) -> 20 TL destek
  let price150to300 = Infinity;
  let be150to300 = Infinity;
  const sh200 = calcShipping(weightGramsTotal, 200, s.fastShipping, s.cargoCompany);
  const p2 = calcPriceForShippingComp(sh200, productionCostTotal, weightGramsTotal, s, m);
  if (p2 >= 150 && p2 < 300) price150to300 = p2;
  const be2 = calcPriceForShippingComp(sh200, productionCostTotal, weightGramsTotal, s, 0);
  if (be2 >= 150 && be2 < 300) be150to300 = be2;

  // 3) Standart Kargo (>= 300 TL) -> 0 TL destek
  const sh300 = calcShipping(weightGramsTotal, 300, s.fastShipping, s.cargoCompany);
  const p3 = calcPriceForShippingComp(sh300, productionCostTotal, weightGramsTotal, s, m);
  const be3 = calcPriceForShippingComp(sh300, productionCostTotal, weightGramsTotal, s, 0);

  let exactTargetPrice = p3;
  if (isFinite(priceUnder150)) exactTargetPrice = priceUnder150;
  else if (isFinite(price150to300)) exactTargetPrice = price150to300;`
);

c = c.replace(
  /if \(isFinite\(beUnder200\)\) bePrice = beUnder200;\s*else if \(isFinite\(be200to350\)\) bePrice = be200to350;/,
  `if (isFinite(beUnder150)) bePrice = beUnder150;
  else if (isFinite(be150to300)) bePrice = be150to300;`
);

// 4. In calcAtFixedPrice (lines around 600)
c = c.replace(
  /let baremLabel = "Standart Kargo \(₺350\+\)";\s*let baremBadgeClass = "[^"]+";\s*if \(desi < 10\) \{\s*if \(price < 200\) \{\s*baremLabel = "🟢 Barem Altı \(<₺200 Destekli\)";\s*baremBadgeClass = "[^"]+";\s*\} else if \(price < 350\) \{\s*baremLabel = "🔵 Barem Üstü \(₺200-₺349 Destekli\)";\s*baremBadgeClass = "[^"]+";\s*\}\s*\}/,
  `let baremLabel = "Standart Kargo (₺300+)";
  let baremBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300";
  if (price < 150) {
    baremLabel = "🟢 50 TL Barem Desteği (<₺150)";
    baremBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300";
  } else if (price < 300) {
    baremLabel = "🔵 20 TL Barem Desteği (₺150-₺299)";
    baremBadgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300";
  }`
);

fs.writeFileSync(file, c, "utf8");
console.log("Updated idefix calculator client thresholds successfully");
