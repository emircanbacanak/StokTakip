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
  const { data } = await supabase
    .from('trendyol_listings')
    .select('stock_code, description')
    .not('description', 'ilike', '%rich-content-wrapper%')
    .limit(10);

  console.log('Count of items without rich-content-wrapper:', data?.length);
  for (const d of data || []) {
    console.log('Code:', d.stock_code, 'Desc:', d.description?.slice(0, 150));
  }
}
test();
