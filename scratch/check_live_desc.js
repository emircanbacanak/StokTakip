const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
    })
);

const SELLER_ID = env.TRENDYOL_SELLER_ID;
const API_KEY = env.TRENDYOL_API_KEY;
const API_SECRET = env.TRENDYOL_API_SECRET;
const TRENDYOL_URL = "https://apigw.trendyol.com/integration";

async function test() {
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  const headers = {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": `${SELLER_ID} - SelfIntegration`,
    storeFrontCode: "TR",
  };

  const res2 = await fetch(`${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?size=10`, { headers });
  const data2 = await res2.json();
  console.log('Items count:', data2?.content?.length);
  for (const p of data2?.content || []) {
    console.log('\n--- Item ---');
    console.log('Title:', p.title);
    console.log('Variants:', p.variants?.map(v => v.barcode));
    console.log('Description:');
    console.log(p.description);
  }
}
test();
