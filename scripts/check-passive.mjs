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
  // 1. Check DB passive products
  const { data: dbPassive } = await supabase
    .from('trendyol_listings')
    .select('id, barcode, stock_code, title, trendyol_status, created_at')
    .eq('trendyol_status', 'passive');
  
  console.log('=== DB PASSIVE PRODUCTS (' + dbPassive?.length + ') ===');
  dbPassive?.forEach((r, i) => {
    console.log(`[${i+1}] Barcode: ${r.barcode} | SKU: ${r.stock_code} | Title: ${r.title?.slice(0, 35)}`);
  });

  // 2. Check Trendyol onSale=false products from approved products
  const approvedUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?onSale=false&size=100`;
  const appRes = await fetch(approvedUrl, { headers: trendyolHeaders() });
  const appData = await appRes.json();
  console.log('\n=== TRENDYOL APPROVED onSale=false totalElements: ' + appData.totalElements + ' ===');
  appData.content?.forEach((c, i) => {
    const v = c.variants?.[0] || {};
    console.log(`[${i+1}] Barcode: ${v.barcode || c.barcode} | SKU: ${v.stockCode || c.stockCode} | OnSale: ${v.onSale} | Title: ${c.title?.slice(0, 35)}`);
  });

  // 3. Check Trendyol unapproved products
  const unapprovedUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/unapproved?size=100`;
  const unappRes = await fetch(unapprovedUrl, { headers: trendyolHeaders() });
  const unappData = await unappRes.json();
  console.log('\n=== TRENDYOL UNAPPROVED totalElements: ' + unappData.totalElements + ' ===');
  unappData.content?.forEach((c, i) => {
    const v = c.variants?.[0] || {};
    console.log(`[${i+1}] Barcode: ${v.barcode || c.barcode} | SKU: ${v.stockCode || c.stockCode} | Status: ${c.status} | Title: ${c.title?.slice(0, 35)}`);
  });

  // 4. Also check if there is an archived or passive endpoint in Trendyol
  // Let's check all 13 DB barcodes against Trendyol API individually
  console.log('\n=== CHECKING EACH OF 13 DB PASSIVE BARCODES ON TRENDYOL ===');
  for (const p of (dbPassive || [])) {
    if (!p.barcode) continue;
    const chkUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?barcode=${encodeURIComponent(p.barcode)}`;
    const r = await fetch(chkUrl, { headers: trendyolHeaders() });
    const d = await r.json();
    const item = d.content?.[0];
    if (item) {
      const v = item.variants?.[0] || {};
      console.log(`Barcode ${p.barcode} (${p.stock_code}): FOUND in approved! onSale=${v.onSale} approved=${item.approved}`);
    } else {
      const uUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/unapproved?barcode=${encodeURIComponent(p.barcode)}`;
      const ur = await fetch(uUrl, { headers: trendyolHeaders() });
      const ud = await ur.json();
      const uitem = ud.content?.[0];
      if (uitem) {
        console.log(`Barcode ${p.barcode} (${p.stock_code}): FOUND in unapproved! status=${uitem.status}`);
      } else {
        console.log(`Barcode ${p.barcode} (${p.stock_code}): NOT FOUND anywhere in Trendyol!`);
      }
    }
  }
}

run();
