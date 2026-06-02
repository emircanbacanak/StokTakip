function gramsToDesi(grams) {
  return Math.max(1, Math.ceil(grams / 1000));
}
function calcShippingCost(weightGrams, satisFiyati, fastShipping) {
  const desi = Math.max(1, Math.ceil(weightGrams / 1000));
  if (satisFiyati >= 350 || desi >= 10) {
    const table = {
      0:[83.93,92.99,91.99,77.54,89.71,77.54,112.77,468.62,651.74,567.76],
      1:[83.93,92.99,91.99,77.54,89.71,77.54,112.77,468.62,651.74,567.76],
      2:[83.93,92.99,91.99,77.54,89.71,77.54,112.77,468.62,651.74,567.76],
      3:[95.12,103.99,101.99,96.00,99.96,93.63,120.56,468.62,651.74,567.76],
      4:[103.68,116.99,112.99,96.00,109.30,101.46,123.15,468.62,651.74,567.76],
      5:[111.17,129.99,121.99,100.55,114.94,107.98,142.91,468.62,651.74,567.76],
      6:[121.12,141.99,131.99,106.83,126.28,118.30,149.82,468.62,651.74,567.76],
      7:[128.46,149.99,140.99,113.15,134.85,125.66,169.44,468.62,651.74,567.76],
      8:[137.05,159.99,150.99,125.73,143.29,134.21,175.96,468.62,651.74,567.76],
      9:[144.91,169.99,159.99,138.34,151.87,142.42,186.86,468.62,651.74,567.76],
      10:[153.48,176.99,170.99,157.26,160.43,153.47,195.12,468.62,651.74,567.76],
      15:[188.82,226.99,223.99,198.22,200.48,192.81,258.72,468.62,651.74,567.76],
      20:[235.60,309.99,278.99,239.76,251.15,236.21,307.46,468.62,651.74,567.76],
      25:[288.32,429.99,333.99,281.27,302.70,283.69,378.43,468.62,651.74,567.76],
      30:[334.54,554.99,388.99,322.78,351.32,328.88,473.40,468.62,651.74,567.76],
      50:[548.66,1214.79,588.99,972.47,659.65,593.80,745.22,756.49,803.17,623.45]
    };
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    const key = keys.find(k => k >= desi) || keys[keys.length - 1];
    const row = table[key];
    const valid = row.filter(v => v !== null && v > 0);
    return Math.min(...valid) * 1.20;
  }
  const BAREM_PRICES = {
    1: {
      under200: {TEX:34.16, Aras:42.91, Surat:48.74, KolayGelsin:51.24, DHL:52.08, Yurti:74.58},
      "200to350": {TEX:65.83, Aras:73.74, Surat:79.58, KolayGelsin:82.08, DHL:82.91, Yurti:104.58},
    },
    2: {
      under200: {TEX:64.58, Aras:71.66, Surat:77.49, KolayGelsin:79.58, DHL:80.83, Yurti:101.24},
      "200to350": {TEX:72.91, Aras:79.99, Surat:85.83, KolayGelsin:87.91, DHL:89.16, Yurti:109.58},
    },
  };
  const table = fastShipping ? 1 : 2;
  const band = satisFiyati < 200 ? 'under200' : '200to350';
  const exVat = BAREM_PRICES[table][band].TEX;
  return exVat * 1.20;
}
function calcProductionCost(weightGrams, s) {
  const w = weightGrams * (1 + s.wastePercentage / 100);
  return (w / 1000) * s.filamentPricePerKg + w * s.electricityCostPerGram + w * s.depreciationCostPerGram;
}
function test() {
  const s = {
    filamentPricePerKg:650,
    electricityCostPerGram:0.1,
    depreciationCostPerGram:0.05,
    wastePercentage:10,
    commissionRate:24,
    paymentTermFee:4,
    packagingCost:15,
    platformFeeBase:10.99,
    fastShipping:true,
    advertisingRate:0,
    returnRate:5,
    fixedCostPerOrder:6,
    organicSalesMode:true,
    profitMargin:10,
  };
  const productionCost = calcProductionCost(70, s);
  console.log('productionCost', productionCost.toFixed(2));
  const platformFee = s.platformFeeBase * 1.20;
  const packagingCost = s.packagingCost;
  const fixedCost = s.fixedCostPerOrder;
  const adRate = 0;
  const cutRateOnGross = (s.commissionRate + s.paymentTermFee) / 100;
  const totalCutRate = cutRateOnGross + adRate;
  const m = s.profitMargin / 100;
  const denominator = 1 - totalCutRate - m;
  console.log('denom', denominator.toFixed(4));
  let p = 100;
  for (let i = 0; i < 20; i++) {
    const sh = calcShippingCost(70, p, s.fastShipping);
    const rc = (productionCost + sh + packagingCost) * (s.returnRate / 100);
    const bc = productionCost + sh + packagingCost + platformFee + fixedCost + rc;
    const np = bc / denominator;
    console.log('u200 iter', i, p.toFixed(2), np.toFixed(2));
    if (Math.abs(np - p) < 0.01) { p = np; break; }
    p = np;
  }
  console.log('priceUnder200', p.toFixed(2));
  p = 200;
  for (let i = 0; i < 20; i++) {
    const sh = calcShippingCost(70, p, s.fastShipping);
    const rc = (productionCost + sh + packagingCost) * (s.returnRate / 100);
    const bc = productionCost + sh + packagingCost + platformFee + fixedCost + rc;
    const np = bc / denominator;
    console.log('o200 iter', i, p.toFixed(2), np.toFixed(2));
    if (Math.abs(np - p) < 0.5) { p = np; break; }
    p = np;
  }
  console.log('priceOver200', p.toFixed(2));
  const roundPrice = Math.ceil(p / 5) * 5;
  console.log('roundedPrice', roundPrice.toFixed(2));
  const sh199 = calcShippingCost(70, 199, s.fastShipping);
  console.log('shipping199', sh199.toFixed(2));
  const sh200 = calcShippingCost(70, 200, s.fastShipping);
  console.log('shipping200', sh200.toFixed(2));
}
test();
