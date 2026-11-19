import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { handleGeminiChat } from '../api/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
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

const questions = [
  'How do I book equipment?',
  'What electronics equipment is available?',
  'Recommend components for a smart irrigation project.',
  'What can I build using ESP32?',
  'How do I return borrowed equipment?'
];

async function runFiveQuestions() {
  const env = loadEnv();
  console.log('====================================================');
  console.log('   LABBUDDY GEMINI AI: 5 MANDATORY TEST QUESTIONS   ');
  console.log('====================================================\n');
  console.log('Model configured:', env.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  // Load real catalogue from Supabase
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
  const { data: equipment, error: eqErr } = await supabase.from('equipment').select('*');
  if (eqErr) {
    console.warn('Could not fetch catalogue:', eqErr.message);
  } else {
    console.log(`Supplied ${equipment.length} cataloged laboratory records as context.\n`);
  }

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`----------------------------------------------------`);
    console.log(`[QUESTION ${i + 1}/5]: "${q}"`);
    console.log(`----------------------------------------------------`);

    const res = await handleGeminiChat({
      messages: [{ role: 'user', text: q }],
      equipment: equipment || []
    }, env);

    if (res.status === 200 && res.body?.reply) {
      console.log(`✅ Status: 200 OK`);
      const snippet = res.body.reply.slice(0, 300).replace(/\r?\n/g, ' ');
      console.log(`Gemini Reply: "${snippet}..."\n`);
      passed++;
    } else {
      console.error(`❌ Status: ${res.status}`);
      console.error(`Error:`, res.body?.error || 'Unknown error');
      failed++;
    }
  }

  console.log('====================================================');
  console.log(`GEMINI 5-QUESTION SUMMARY: ${passed}/5 PASSED, ${failed}/5 FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runFiveQuestions().catch(e => {
  console.error(e);
  process.exit(1);
});
