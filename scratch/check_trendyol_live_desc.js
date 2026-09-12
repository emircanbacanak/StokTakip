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
const authHeader = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

async function test() {
  const res = await fetch(`https://api.trendyol.com/sapigw/suppliers/${SELLER_ID}/products?size=5&approved=true`, {
    headers: {
      Authorization: authHeader,
      'User-Agent': `${SELLER_ID} - SelfIntegration`,
    }
  });

  const json = await res.json();
  console.log('Status:', res.status, 'Keys:', Object.keys(json));
  for (const item of json.content || []) {
    console.log('\n==============================');
    console.log('Barcode:', item.barcode, 'Title:', item.title);
    console.log('Description:');
    console.log(item.description?.slice(0, 300));
  }
}
test();
