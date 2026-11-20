# LabSync — setup and deployment

This is a Vite + vanilla JavaScript website with Supabase Auth and a Supabase Postgres backend. Vercel hosts the frontend; Supabase provides authentication, database, row-level security and backend functions. Email workflow notifications are intentionally not included.

## 1. Create the Supabase backend

1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**.
<<<<<<< HEAD
3. Paste and run all of `supabase/schema.sql` (creates base tables, auth triggers, RPCs, and RLS policies).
4. Open **SQL Editor -> New query**, paste and run all of `supabase/migrations/20261118_admin_settings_and_automation.sql` (creates admin_settings, notifications, automation procedures, and default configuration).
5. Open **Project Settings -> API** and copy the Project URL, `anon` public key, and `service_role` secret key.
6. In **Authentication -> URL Configuration**, set the Site URL to your eventual Vercel URL. Add `http://localhost:5173/**` and your Vercel URL to Redirect URLs.
=======
3. Paste and run all of `supabase/schema.sql`.
4. Open **Project Settings → API** and copy the Project URL and `anon` / publishable key.
5. In **Authentication → URL Configuration**, set the Site URL to your eventual Vercel URL. Add `http://localhost:5173/**` and your Vercel URL to Redirect URLs.
>>>>>>> e6f9b47d11456ab0d506dcc8dcd825b49d8b8230

## 2. Configure local environment

1. Copy `.env.example` to `.env.local`.
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. For the one-time admin setup only, also fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_INITIAL_PASSWORD`.
4. For the requested first-time setup, you can set `ADMIN_INITIAL_PASSWORD=Admin@123` in your local `.env.local` file. This is a weak shared password: use it only for initial submission/testing, then change it separately for each administrator immediately. Never put a service-role key or admin password in frontend code or GitHub.
5. Install and run:

```bash
npm install
npm run bootstrap:admins
npm run bootstrap:demo
npm run dev
```

The bootstrap script provisions exactly these two administrator accounts:
- admin577528@gmail.com
- harshritesh6360@gmail.com

Both accounts receive the initial password in your local environment. Change it after first login. The service-role key is used only by this local script and must never be deployed to Vercel.

Run `npm run bootstrap:demo` to add the electronics-focused demo equipment, sample students, requests and loans. The demo student password is set by `DEMO_STUDENT_PASSWORD` in `.env.local`.

## 3. Test the website

- Sign in using either provisioned admin account.
- Add equipment with a unique asset code and quantity.
- Open QR code to generate a QR for each equipment record.
- Students register, then an admin approves their profile.
- Approved students browse equipment and submit requests.
- Admin approves requests and the backend creates a loan while decrementing available stock.
- Admin records returns; undamaged returns increment available stock. Damaged returns are recorded and held out of available stock.
- Admin sees pending requests, approvals, active loans and overdue status.

## 4. Deploy to Vercel

1. Create a GitHub repository and push this project.
2. In Vercel choose **Add New → Project**, import the repository.
3. Framework preset: Vite. Build command `npm run build`; output directory `dist`.
4. Add only these environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.
6. Copy the Vercel URL into Supabase **Authentication → URL Configuration → Site URL and Redirect URLs**.

Do NOT add `SUPABASE_SERVICE_ROLE_KEY` or `ADMIN_INITIAL_PASSWORD` to Vercel. The service-role key bypasses row-level security and must stay private.

## 5. GitHub push commands

From this folder:

```bash
git init
git add .
git commit -m "Initial LabSync website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/labsync.git
git push -u origin main
```

If GitHub asks you to authenticate, complete its browser sign-in. Ensure `.env.local` is not staged or committed.

## Security notes and known scope

- Student self-registration always creates `role=student` and `status=pending`. The browser cannot choose an admin role.
- Only the two allowlisted email addresses can be treated as administrators by the database admin check.
- The service-role key is never used by browser code.
- Password reset uses Supabase Auth and requires SMTP/email configuration in Supabase; email notifications for bookings/overdue items are not included.
- This is a functional MVP. Add institution-specific policies, audit review and production testing before relying on it for real inventory.


## Demo data

Run `npm run bootstrap:demo` locally after the SQL schema and admin bootstrap. It creates 12 electronics equipment records, 3 approved demo student accounts, 3 pending sample booking requests and 3 sample loans (including one overdue and one returned). Set `DEMO_STUDENT_PASSWORD` in your local `.env.local`. The demo accounts are `demo.student1@labsync.test`, `demo.student2@labsync.test`, and `demo.student3@labsync.test`. This script uses the service-role key locally only; never deploy that key to Vercel.


## Demo records
See `DEMO-DATA.md` for the included electronics inventory and sample student, request, and loan records. The demo seeding script is already included in this package; you do not need another download.


## 6. Connect LabBuddy to Gemini AI

The website includes a floating **Ask LabBuddy** chat assistant. The Gemini API key is handled by a server-side endpoint, not browser JavaScript.

### Local setup
1. Open your existing `.env.local` file and add these lines:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
<<<<<<< HEAD
   GEMINI_MODEL=gemini-flash-lite-latest
=======
   GEMINI_MODEL=gemini-3.5-flash-lite
>>>>>>> e6f9b47d11456ab0d506dcc8dcd825b49d8b8230
   ```
2. Save `.env.local`.
3. Stop and restart the Vite server with `npm.cmd run dev`.
4. Open the site and click **Ask LabBuddy** in the bottom-right corner.

### Vercel setup
1. Open your LabSync project in Vercel → **Settings → Environment Variables**.
2. Add `VITE_SUPABASE_URL` (Public)
3. Add `VITE_SUPABASE_ANON_KEY` (Public)
4. Add `GEMINI_API_KEY` (Server-side only — DO NOT prefix with VITE_)
<<<<<<< HEAD
5. Add `GEMINI_MODEL` with value `gemini-flash-lite-latest` (Server-side only)
=======
5. Add `GEMINI_MODEL` with value `gemini-3.5-flash-lite` (Server-side only)
>>>>>>> e6f9b47d11456ab0d506dcc8dcd825b49d8b8230
6. Add `SUPABASE_SERVICE_ROLE_KEY` (Server-side only — used by `/api/automation` cron to auto-expire uncollected bookings and restore inventory)
7. Select Production and Preview, save, then deploy.

**Security:** Do not name this variable `VITE_GEMINI_API_KEY`. Do not paste your Gemini key into `src/main.js`, HTML, GitHub, screenshots, or public chat messages. Keep it only in `.env.local` on your computer and Vercel's server-side environment variables.

LabBuddy can explain LabSync workflows but does not have live access to the Supabase database and cannot itself approve bookings, issue equipment, or record returns. Those actions must be completed in the LabSync interface.


## LabBuddy project equipment recommendations

Students can describe their project idea, title, abstract, objectives or required features in the LabBuddy chat. LabBuddy analyses the project and recommends relevant equipment/components, explains why each is needed, and prioritizes essential versus optional items. When the student is signed in and Supabase is connected, the current equipment catalogue snapshot is supplied to Gemini so it can use real catalogue names, asset codes and available quantities. It must not invent stock. Students should still confirm availability in the Equipment page before submitting a booking request.

Example student prompt:
`My project is an IoT-based smart irrigation system. It should monitor soil moisture and automatically control a water pump. Suggest the equipment I should request, explain why each item is needed, and separate essential from optional components.`
