-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 05: ADMIN SETTINGS & AUTOMATION CONFIG
-- Purpose: Seeds the system configuration, automation thresholds, and defaults.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses ON CONFLICT (id) DO UPDATE / DO NOTHING; idempotent.
-- ============================================================================

insert into public.admin_settings (id, settings, updated_at, updated_by)
values (
  'current',
  '{
    "autoCancelPendingEnabled": true,
    "pendingExpiryDays": 3,
    "autoCancelApprovedEnabled": true,
    "approvedExpiryHours": 24,
    "defaultLoanDurationDays": 7,
    "returnReminderDays": 1,
    "overdueFrequency": "daily",
    "overdueDetection": "immediate",
    "requireDamageNote": true,
    "maxActiveBookingsPerStudent": 3,
    "maxQuantityPerBooking": 1,
    "allowStudentCancelPending": true,
    "allowStudentCancelApproved": true,
    "blockIfOverdue": true,
    "notifyOnBooking": true,
    "notifyOnApproval": true,
    "notifyOnRejection": true,
    "notifyOnCollectionReminder": true,
    "notifyOnReturnReminder": true,
    "notifyOnOverdue": true,
    "notifyOnDamage": true,
    "lastAutomationRun": null,
    "lastAutomationCount": 0,
    "lastAutomationStatus": "idle",
    "lastAutomationError": null
  }'::jsonb,
  now(),
  'System Migration Initializer'
)
on conflict (id) do update set
  settings = excluded.settings,
  updated_at = now(),
  updated_by = excluded.updated_by;
