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
    .select('description')
    .eq('stock_code', 'SNA-BOR')
    .single();

  const raw = data?.description || '';
  console.log('Raw length:', raw.length);
  // Strip wrapper
  let stripped = raw
    .replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, '')
    .replace(/<div[^>]*id=["']rich-content-wrapper["'][^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .trim();

  console.log('\n--- Stripped Result ---');
  console.log(stripped.slice(0, 500));
}
test();
