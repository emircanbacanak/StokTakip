const fs = require('fs');
const path = require('path');

// 1. Fix n11
const n11Path = path.join(__dirname, '..', 'components', 'n11', 'n11-calculator-client.tsx');
let n11Content = fs.readFileSync(n11Path, 'utf8');

const n11Target = `  };

  }

  if (desi < 10 && recPrice > 199) {
    const r199 = calcForPrice(199);
    const rRec = calcForPrice(recPrice);
    if (r199 && rRec && r199.netProfitAfterVat > rRec.netProfitAfterVat) {
      recPrice = 199;
    }
  }`;

const n11Replacement = `  };

  let recPrice = 150;
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
  }`;

if (n11Content.includes('  }\n\n  if (desi < 10 && recPrice > 199) {') || n11Content.includes('  }\r\n\r\n  if (desi < 10 && recPrice > 199) {')) {
  n11Content = n11Content.replace(/  };\s*}\s*if \(desi < 10 && recPrice > 199\) {[\s\S]*?recPrice = 199;\s*}\s*}/, n11Replacement);
  fs.writeFileSync(n11Path, n11Content, 'utf8');
  console.log('n11 fixed');
} else {
  console.log('n11 target not matched');
}

// 2. Fix Pazarama
const pazaramaPath = path.join(__dirname, '..', 'components', 'pazarama', 'pazarama-calculator-client.tsx');
let pazContent = fs.readFileSync(pazaramaPath, 'utf8');

const pazReplacement = `  let recPrice = 150;
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
  }`;

pazContent = pazContent.replace(/let recPrice = 200;\s*if \(desi < 10\) {[\s\S]*?recPrice = 199;\s*}\s*}/, pazReplacement);
fs.writeFileSync(pazaramaPath, pazContent, 'utf8');
console.log('pazarama fixed');

// 3. Fix Trendruum
const trendruumPath = path.join(__dirname, '..', 'components', 'trendruum', 'trendruum-calculator-client.tsx');
let trContent = fs.readFileSync(trendruumPath, 'utf8');

const trReplacement = `  let recPrice = 200;
  const sh250 = calcMarketplaceShippingCost(weightGrams, 250, s.fastShipping, s.cargoCompany);
  const p1 = calcExactPriceForShipping(sh250);

  const sh350 = calcMarketplaceShippingCost(weightGrams, 350, s.fastShipping, s.cargoCompany);
  const p2 = calcExactPriceForShipping(sh350);

  if (p1 < 350) recPrice = Math.ceil(p1);
  else recPrice = Math.ceil(p2);

  if (recPrice > 349) {
    const r349 = calcForPrice(349);
    const rRec = calcForPrice(recPrice);
    if (r349 && rRec && r349.netProfitAfterVat > rRec.netProfitAfterVat) {
      recPrice = 349;
    }
  }`;

trContent = trContent.replace(/let recPrice = 200;\s*if \(desi < 10\) {[\s\S]*?recPrice = 199;\s*}\s*}/, trReplacement);
fs.writeFileSync(trendruumPath, trContent, 'utf8');
console.log('trendruum fixed');
