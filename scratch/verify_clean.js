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
  
  // Test our updated logic directly
  let clean = raw.trim();
  clean = clean.replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, "").trim();
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  clean = clean.replace(/<div[^>]*id=["']rich-content-wrapper["'][^>]*>/gi, "");
  clean = clean.replace(/<div[^>]*class=["']rt-editor-body["'][^>]*>/gi, "");
  clean = clean.replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "\n");
  clean = clean.replace(/<br\b[^>]*\/?>/gi, "<br>");
  clean = clean.replace(/(<br>\s*){3,}/gi, "<br><br>");
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();
  clean = clean
    .replace(/<div[^>]*id=["']rich-content-wrapper["'][^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  console.log('Cleaned HTML length:', clean.length);
  console.log('Starts with:', clean.slice(0, 200));
  console.log('\nEnds with:', clean.slice(-200));
  console.log('\nContains any <div> tags?', clean.includes('<div') || clean.includes('</div>'));
}
test();
