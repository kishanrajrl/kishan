import fs from 'fs';
import path from 'path';

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

const env = loadEnv();
const candidates = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

async function testOne(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond with: OK' }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return { model: modelName, status: res.status, text };
    }
    return { model: modelName, status: res.status, error: data?.error?.message || `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    return { model: modelName, status: 'TIMEOUT', error: err.message };
  }
}

async function run() {
  console.log('Testing candidate models...');
  for (const c of candidates) {
    const r = await testOne(c);
    console.log(r.model, '->', r.status, r.text || r.error);
    if (r.status === 200) {
      console.log(`\nSELECTED BEST MODEL: ${r.model}`);
      // Update .env.local with this working model
      let envContent = fs.readFileSync('.env.local', 'utf8');
      envContent = envContent.replace(/^GEMINI_MODEL=.*/m, `GEMINI_MODEL=${r.model}`);
      fs.writeFileSync('.env.local', envContent, 'utf8');
      break;
    }
  }
}

run();
