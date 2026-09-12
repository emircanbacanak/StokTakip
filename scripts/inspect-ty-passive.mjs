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
  const res = await fetch(`${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?size=100`, { headers: trendyolHeaders() });
  const data = await res.json();
  const items = data.content || [];

  console.log('=== ALL ON-SALE = FALSE PRODUCTS FROM APPROVED ===');
  for (const c of items) {
    for (const v of (c.variants || [])) {
      if (v.onSale === false) {
        console.log(JSON.stringify({
          title: c.title?.slice(0, 35),
          barcode: v.barcode,
          stockCode: v.stockCode,
          archived: v.archived,
          blacklisted: v.blacklisted,
          rejected: v.rejected,
          approved: c.approved,
          quantity: v.quantity,
          onSale: v.onSale,
        }));
      }
    }
  }
}

run();
