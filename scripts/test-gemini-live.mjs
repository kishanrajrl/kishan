import fs from 'fs';
import path from 'path';
import { handleGeminiChat } from '../api/gemini.js';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

async function testGemini() {
  const env = loadEnv();
  console.log('Testing Gemini API integration...');
  console.log('Model configured:', env.GEMINI_MODEL);

  // 1. Fetch live inventory from Supabase so LabBuddy has real catalog context
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
  const { data: equipment, error: eqErr } = await supabase.from('equipment').select('*');
  if (eqErr) {
    console.error('Failed to fetch equipment for context:', eqErr.message);
  } else {
    console.log(`Supplied ${equipment.length} cataloged equipment records as context.`);
  }

  // 2. Test 1: Project Equipment Recommendation
  console.log('\n--- Test 1: Project Recommendation ---');
  const query1 = 'I want to build a smart irrigation system using IoT. What equipment do I need?';
  console.log('User Question:', query1);

  const res1 = await handleGeminiChat({
    messages: [{ role: 'user', text: query1 }],
    equipment: equipment || []
  }, env);

  console.log('Response Status:', res1.status);
  if (res1.status === 200) {
    console.log('Gemini Reply Snippet:');
    console.log(res1.body.reply.slice(0, 500) + '...\n');
  } else {
    console.error('Gemini Error:', res1.body.error);
    process.exit(1);
  }

  // 3. Test 2: LabSync Procedure Query
  console.log('--- Test 2: LabSync Booking & Return Procedure ---');
  const query2 = 'How does the equipment booking and QR return process work in LabSync?';
  console.log('User Question:', query2);

  const res2 = await handleGeminiChat({
    messages: [{ role: 'user', text: query2 }],
    equipment: equipment || []
  }, env);

  console.log('Response Status:', res2.status);
  if (res2.status === 200) {
    console.log('Gemini Reply Snippet:');
    console.log(res2.body.reply.slice(0, 500) + '...\n');
  } else {
    console.error('Gemini Error:', res2.body.error);
    process.exit(1);
  }

  console.log('ALL GEMINI API TESTS PASSED SUCCESSFULLY!');
}

testGemini().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
