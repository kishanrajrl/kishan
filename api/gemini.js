const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const FAST_FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash'
];
const KNOWN_SLOW_OR_DEPRECATED = new Set([
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite'
]);

async function fetchFromGemini(modelName, apiKey, systemInstruction, messages, timeoutMs = 8000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages,
        generationConfig: { temperature: 0.55, maxOutputTokens: 800 }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function handleGeminiChat(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return {
      status: 503,
      body: {
        error: 'Gemini is not configured yet. Please add a valid GEMINI_API_KEY from Google AI Studio (https://aistudio.google.com) to your .env.local file or Vercel environment variables.'
      }
    };
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const messages = incoming
    .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] }));

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { status: 400, body: { error: 'Send a message to start the conversation.' } };
  }

  const equipment = Array.isArray(body?.equipment) ? body.equipment.slice(0, 80).map(item => ({
    name: String(item?.name || '').slice(0, 100),
    asset_code: String(item?.asset_code || '').slice(0, 40),
    category: String(item?.category || '').slice(0, 60),
    description: String(item?.description || '').slice(0, 240),
    total_quantity: Number.isFinite(Number(item?.total_quantity)) ? Number(item.total_quantity) : null,
    available_quantity: Number.isFinite(Number(item?.available_quantity)) ? Number(item.available_quantity) : null
  })).filter(item => item.name) : [];

  const inventoryContext = equipment.length
    ? `CURRENT LABSYNC EQUIPMENT CATALOGUE (provided by the live laboratory database; use only this for claims about stocked items and current stock):\n${JSON.stringify(equipment)}`
    : 'The live LabSync equipment catalogue was not supplied. You may suggest typical electronics equipment based on engineering knowledge, but clearly label it as a general suggestion and note that actual LabSync availability must be confirmed in the catalogue.';

  const systemInstruction = `You are LabBuddy, the smart AI laboratory assistant inside LabSync (Smart Laboratory Equipment Booking and Management System).
Help students understand how to find equipment, request bookings, track loans and due dates, and help lab administrators understand inventory, approvals, issuing, returns, overdue items and damage tracking.

IMPORTANT PROJECT-TO-EQUIPMENT RECOMMENDATION FEATURE:
When a student describes a project idea, title, abstract, or requirements, analyse what the project needs and recommend the most relevant equipment and electronic components.
Structure project recommendations with:
1. Short Understanding of the Project
2. Recommended LabSync Equipment (mention exact item name, asset code, and currently available quantity from the supplied catalogue)
3. Why each item is needed in the circuit/system
4. Essential vs Optional items
5. Additional external components needed that are not in the lab catalogue (e.g. specialized ICs, water pumps, batteries)
6. A helpful build/safety tip for the student

Prefer items from the supplied current catalogue. If a component is out of stock (available_quantity = 0), explicitly notify the student that it is currently checked out and suggest alternatives if possible. Never fabricate asset codes or inventory.

Keep answers well-structured with clear bullet points, friendly tone, and practical advice suitable for engineering students.
Never claim you have modified a booking or issued equipment yourself — guide the student to use the LabSync interface buttons.

${inventoryContext}`;

  const envModel = (env.GEMINI_MODEL || '').trim();
  const candidateModels = [];

  // If a valid custom model that is NOT known to be overloaded/deprecated is configured, prioritize it
  if (envModel && !KNOWN_SLOW_OR_DEPRECATED.has(envModel)) {
    candidateModels.push(envModel);
  }

  // Always prioritize fast, responsive flash-lite models
  candidateModels.push(DEFAULT_MODEL, ...FAST_FALLBACK_MODELS);

  // If the user configured a known slow or overloaded model, keep it as last resort
  if (envModel && KNOWN_SLOW_OR_DEPRECATED.has(envModel)) {
    candidateModels.push(envModel);
  }

  const modelsToTry = [...new Set(candidateModels)];
  let response;
  let responseData = null;
  for (const modelToTry of modelsToTry) {
    try {
      const res = await fetchFromGemini(modelToTry, apiKey, systemInstruction, messages, 8000);
      const data = await res.json().catch(() => ({}));
      response = res;
      responseData = data;
      if (res.ok) break;
      if (res.status === 400 && JSON.stringify(data).toLowerCase().includes('api key')) {
        break;
      }
    } catch {
      // Timeout or network error: continue to next candidate model
    }
  }

  if (!response) {
    return { status: 502, body: { error: 'Could not reach Gemini API. Please check your internet connection.' } };
  }

  const data = responseData || {};
  if (!response.ok) {
    const rawMsg = data?.error?.message || `Gemini request failed (${response.status}).`;
    if (rawMsg.toLowerCase().includes('api key') || response.status === 400) {
      return {
        status: 502,
        body: {
          error: 'The configured GEMINI_API_KEY is invalid or expired. Please update it with a valid key from Google AI Studio (https://aistudio.google.com).'
        }
      };
    }
    if (response.status === 429) {
      return { status: 429, body: { error: 'Gemini API rate limit reached. Please wait a moment and try again.' } };
    }
    return { status: 502, body: { error: rawMsg } };
  }

  const answer = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();

  if (!answer) {
    return { status: 502, body: { error: 'Gemini returned an empty response. Please try rephrasing your question.' } };
  }

  return { status: 200, body: { reply: answer } };
}
