const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('1. Dropping trigger and function from Supabase PostgreSQL...');
  // Execute via RPC or direct SQL if enabled, or check if we can run via Postgres function / SQL
  // In Supabase, if we have service_role, we can check RPC or run a function
  // Let's test if we have an rpc or execute_sql or if we can disable it
  try {
    const { error: rpcErr } = await supabase.rpc('execute_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trg_enforce_description_prefix ON trendyol_listings;
        DROP FUNCTION IF EXISTS enforce_description_prefix();
      `
    });
    console.log('RPC execute_sql result:', rpcErr || 'SUCCESS');
  } catch (e) {
    console.log('RPC execute_sql not available:', e.message);
  }

  // 2. Clean all existing rows in trendyol_listings where description starts with "Toptan sipariş vermeyin"
  console.log('\n2. Cleaning existing descriptions in Supabase trendyol_listings...');
  const { data: rows, error: fetchErr } = await supabase
    .from('trendyol_listings')
    .select('id, barcode, stock_code, description')
    .ilike('description', '%Toptan sipari%');

  console.log('Found rows with "Toptan sipariş":', rows?.length);

  for (const r of rows || []) {
    const cleaned = r.description.replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, '').trim();
    const { error: updateErr } = await supabase
      .from('trendyol_listings')
      .update({ description: cleaned })
      .eq('id', r.id);

    if (updateErr) {
      console.error(`Failed to update ${r.stock_code}:`, updateErr.message);
    } else {
      console.log(`Cleaned ${r.stock_code} (${r.barcode})`);
    }
  }

  // 3. Verify if the trigger prepended it again
  const { data: checkRows } = await supabase
    .from('trendyol_listings')
    .select('barcode, stock_code, description')
    .ilike('description', '%Toptan sipari%');

  console.log('\nRemaining rows with "Toptan sipariş":', checkRows?.length);
  if (checkRows && checkRows.length > 0) {
    console.log('Trigger is STILL ACTIVE in database! We need to drop it via migration or SQL.');
  } else {
    console.log('Trigger is NO LONGER PREPENDING or successfully dropped!');
  }
}

main();
