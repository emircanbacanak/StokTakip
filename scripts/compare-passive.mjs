import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  // Fetch ALL approved from Trendyol and filter onSale === false
  let page = 0;
  let allTrendyolProducts = [];
  while (true) {
    const res = await fetch(`${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?page=${page}&size=100`, { headers: trendyolHeaders() });
    const data = await res.json();
    const items = data.content || [];
    allTrendyolProducts.push(...items);
    if (items.length < 100 || allTrendyolProducts.length >= (data.totalElements || 0)) break;
    page++;
  }

  const tyPassive = [];
  allTrendyolProducts.forEach(c => {
    (c.variants || []).forEach(v => {
      if (v.onSale === false) {
        tyPassive.push({
          barcode: v.barcode,
          stockCode: v.stockCode,
          title: c.title,
          onSale: v.onSale,
          archived: v.archived
        });
      }
    });
  });

  console.log(`Trendyol'da Gerçek Pasif (onSale=false) Sayısı: ${tyPassive.length}`);
  tyPassive.forEach((p, i) => {
    console.log(`[${i+1}] Barcode: ${p.barcode} | SKU: ${p.stockCode} | Title: ${p.title.slice(0, 30)}`);
  });

  // Now check DB passive
  const { data: dbPassive, error } = await supabase
    .from('trendyol_listings')
    .select('id, barcode, stock_code, title, trendyol_status')
    .eq('trendyol_status', 'passive');
  if (error) console.error('DB error:', error);

  console.log(`\nDB'de 'passive' işaretli Sayısı: ${dbPassive.length}`);
  const tyBarcodes = new Set(tyPassive.map(t => t.barcode));

  const extraInDb = dbPassive.filter(d => !tyBarcodes.has(d.barcode));
  console.log(`\nTrendyol'da olmayıp DB'de 'passive' olan FAZLALIKLAR (${extraInDb.length} adet):`);
  extraInDb.forEach((d, i) => {
    console.log(`[${i+1}] ID: ${d.id} | Barcode: ${d.barcode} | SKU: ${d.stock_code} | Title: ${d.title}`);
  });
}

run();
