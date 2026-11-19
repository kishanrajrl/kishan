import { handleGeminiChat } from './gemini.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }
  const result = await handleGeminiChat(body);
  return res.status(result.status).json(result.body);
}
