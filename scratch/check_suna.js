const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('trendyol_listings')
    .select('barcode, stock_code, title, description')
    .ilike('stock_code', '%SNA%')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }
  for (const item of data) {
    console.log('---', item.stock_code, item.barcode);
    console.log('Desc starts with:', item.description?.slice(0, 80));
  }
}
test();
