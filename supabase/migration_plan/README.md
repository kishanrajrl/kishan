# LabSync Database Migration Plan (New Supabase Project)

This directory contains the sequential, non-destructive SQL scripts to initialize a completely clean Supabase project for LabSync.

---

## 📋 Execution Order & File Map

Run the scripts **one by one in sequential order** in the **Supabase Dashboard ➔ SQL Editor**:

| Step | File | Purpose | Special Caution |
|---|---|---|---|
| **01** | `01_schema.sql` | Creates all 7 tables, UUID defaults, foreign keys, and performance indexes | Run first. Safe (`IF NOT EXISTS`). |
| **02** | `02_functions.sql` | Defines core stored procedures: `is_lab_admin()`, `handle_new_user()`, `approve_booking()`, `return_loan()`, `process_expired_bookings()` | Idempotent (`CREATE OR REPLACE`). |
| **03** | `03_triggers.sql` | Binds `on_auth_user_created` trigger on `auth.users` | Attaches to Supabase internal `auth` schema. Safe (`DROP TRIGGER IF EXISTS`). |
| **04** | `04_security_rls.sql` | Enables Row Level Security on all 7 tables and sets fine-grained role policies | Essential for security. Student/admin isolation is enforced here. |
| **05** | `05_admin_settings.sql` | Seeds initial automation settings, cancellation thresholds, and notification rules | Safe upsert on `admin_settings`. |
| **06** | `06_demo_equipment.sql` | Seeds all 22 laboratory equipment models (288 hardware units) | Idempotent upsert by `asset_code`. |
| **07** | `07_demo_data.sql` | Seeds initial audit trail logs, and conditionally links sample bookings and loans | Non-destructive. Dynamically binds to any registered students. |
| **08** | `08_verify_migration.sql` | Non-destructive verification query to audit tables, triggers, functions, and RLS | Read-only audit script. |

---

## 🔐 Provisioning Admin & Demo Accounts (Zero Secrets in SQL)

In accordance with Supabase best practices and security constraints, passwords and API secrets are **never stored in SQL files**.

Once steps 01–06 have been executed:

1. Update your local `.env.local` with the **new Supabase project credentials**:
   ```env
   VITE_SUPABASE_URL=https://[YOUR_NEW_PROJECT_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR_NEW_ANON_KEY]
   SUPABASE_SERVICE_ROLE_KEY=[YOUR_NEW_SERVICE_ROLE_KEY]
   ADMIN_INITIAL_PASSWORD=Admin@123
   DEMO_STUDENT_PASSWORD=DemoStudent@123
   ```

2. Run the existing automated provisioning scripts from your terminal:
   ```bash
   # Provision both authorized lab administrators (admin577528@gmail.com and harshritesh6360@gmail.com)
   npm run bootstrap:admins

   # Provision demo student accounts
   npm run bootstrap:demo

   # (Optional) Seed expanded demo data & student requisitions
   node scripts/seed-more-demo-data.mjs
   ```

3. Run `07_demo_data.sql` and `08_verify_migration.sql` in the Supabase SQL Editor.
