import { defineConfig, loadEnv } from 'vite';
import { handleGeminiChat } from './api/gemini.js';
import automationHandler, { processAutomatedCancellations } from './api/automation.js';
import { handleStudentRegistration } from './api/register.js';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
  // Load .env.local for local server-side endpoints
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL;
  if (env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
  if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
  if (env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  function localServerApis() {
    return {
      name: 'labsync-local-server-apis',
      configureServer(server) {
        // 1. Gemini Chat API Middleware
        server.middlewares.use('/api/chat', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let body = {};
          try { body = raw ? JSON.parse(raw) : {}; }
          catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request.' }));
            return;
          }
          const result = await handleGeminiChat(body);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.body));
        });

        // 2. Booking Automation & Settings API Middleware
        server.middlewares.use('/api/automation', async (req, res) => {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let body = {};
          if (raw) {
            try { body = JSON.parse(raw); } catch {}
          }
          req.body = body;

          // Polyfill res.status and res.json for the handler
          const mockRes = {
            statusCode: 200,
            setHeader(k, v) { res.setHeader(k, v); },
            status(code) { this.statusCode = code; return this; },
            json(data) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            }
          };

          await automationHandler(req, mockRes);
        });

        // 3. Student Registration API Middleware (Email confirmation bypass)
        server.middlewares.use('/api/register', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let body = {};
          try { body = raw ? JSON.parse(raw) : {}; }
          catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request.' }));
            return;
          }
          const result = await handleStudentRegistration(body, process.env);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.body));
        });

        // 4. Automated Server-Side Background Runner (every 60s)
        const subUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
        const subKey = env.SUPABASE_SERVICE_ROLE_KEY;
        if (subUrl && subKey) {
          const supabase = createClient(subUrl, subKey, { auth: { persistSession: false } });
          const intervalId = setInterval(async () => {
            try {
              await processAutomatedCancellations(supabase, 'Vite Background Cron Runner');
            } catch {}
          }, 60000);

          server.httpServer?.on('close', () => clearInterval(intervalId));
        }
      }
    };
  }

  return { plugins: [localServerApis()] };
});
