const SELLER_ID = process.env.TRENDYOL_SELLER_ID;
const API_KEY = process.env.TRENDYOL_API_KEY;
const API_SECRET = process.env.TRENDYOL_API_SECRET;
const TRENDYOL_URL = "https://apigw.trendyol.com/integration";

function trendyolHeaders() {
  const token = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'User-Agent': `${SELLER_ID} - SelfIntegration`,
    'Content-Type': 'application/json',
    storeFrontCode: 'TR',
  };
}

async function run() {
  let page = 0;
  let all = [];
  while (true) {
    const res = await fetch(`${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?page=${page}&size=100`, { headers: trendyolHeaders() });
    const data = await res.json();
    all.push(...(data.content || []));
    if (all.length >= (data.totalElements || 0) || (data.content || []).length < 100) break;
    page++;
  }

  // Check parent products where ALL variants are onSale=false vs ANY variant is onSale=false
  console.log("Total approved parent products on Trendyol:", all.length);

  const purelyPassiveParents = [];
  const allPassiveVariants = [];

  all.forEach((c) => {
    const passiveVars = (c.variants || []).filter(v => v.onSale === false);
    const activeVars = (c.variants || []).filter(v => v.onSale !== false);
    
    passiveVars.forEach(v => allPassiveVariants.push({ parent: c.title, ...v }));

    if (passiveVars.length > 0 && activeVars.length === 0) {
      purelyPassiveParents.push(c);
    }
  });

  console.log(`Tamamen pasif olan Ürün Kartı (Parent) sayısı: ${purelyPassiveParents.length}`);
  purelyPassiveParents.forEach((c, i) => {
    console.log(`[${i+1}] Title: ${c.title.slice(0, 35)} | variants: ${c.variants.map(v => v.barcode).join(', ')}`);
  });

  console.log(`\nToplam pasif varyant (barkod) sayısı: ${allPassiveVariants.length}`);
  allPassiveVariants.forEach((v, i) => {
    console.log(`[${i+1}] Barcode: ${v.barcode} | SKU: ${v.stockCode} | Title: ${v.parent.slice(0, 30)}`);
  });
}

run();
