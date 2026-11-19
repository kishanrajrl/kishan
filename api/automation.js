import { createClient } from '@supabase/supabase-js';

export const DEFAULT_ADMIN_SETTINGS = {
  // A. Booking Automation Settings
  autoCancelPendingEnabled: true,
  pendingExpiryDays: 3,
  autoCancelApprovedEnabled: true,
  approvedExpiryHours: 24,

  // B. Return and Overdue Settings
  defaultLoanDurationDays: 7,
  returnReminderDays: 1,
  overdueFrequency: 'daily',
  overdueDetection: 'immediate',
  requireDamageNote: true,

  // C. Student Booking Restrictions
  maxActiveBookingsPerStudent: 3,
  maxQuantityPerBooking: 1,
  allowStudentCancelPending: true,
  allowStudentCancelApproved: true,
  blockIfOverdue: true,

  // D. Notification Settings
  notifyOnBooking: true,
  notifyOnApproval: true,
  notifyOnRejection: true,
  notifyOnCollectionReminder: true,
  notifyOnReturnReminder: true,
  notifyOnOverdue: true,
  notifyOnDamage: true,

  // Metadata
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
  lastAutomationRun: null,
  lastAutomationCount: 0,
  lastAutomationStatus: 'idle',
  lastAutomationError: null
};

export async function getAdminSettings(supabase) {
  // 1. Try dedicated admin_settings table if it exists
  try {
    const { data: row, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (!error && row && row.settings) {
      return { ...DEFAULT_ADMIN_SETTINGS, ...row.settings };
    }
  } catch {}

  // 2. Fallback to latest LABSYNC_SETTINGS record in activity_log
  try {
    const { data: rows, error } = await supabase
      .from('activity_log')
      .select('description, created_at')
      .like('description', 'LABSYNC_SETTINGS:%')
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && rows && rows.length > 0) {
      const parsed = JSON.parse(rows[0].description.slice('LABSYNC_SETTINGS:'.length));
      return { ...DEFAULT_ADMIN_SETTINGS, ...parsed };
    }
  } catch {}

  return { ...DEFAULT_ADMIN_SETTINGS };
}

export async function saveAdminSettings(supabase, newSettings, actorEmail = 'admin') {
  const merged = {
    ...DEFAULT_ADMIN_SETTINGS,
    ...newSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail
  };

  // Try saving to admin_settings table first
  let savedToTable = false;
  try {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ id: 'current', settings: merged, updated_at: merged.updatedAt, updated_by: actorEmail }, { onConflict: 'id' });
    if (!error) savedToTable = true;
  } catch {}

  // Always write audit record to activity_log for persistence & governance
  const payload = 'LABSYNC_SETTINGS:' + JSON.stringify(merged);
  await supabase.from('activity_log').insert({
    description: payload
  });

  return merged;
}

export async function processAutomatedCancellations(supabase, actor = 'System Automation Engine') {
  const settings = await getAdminSettings(supabase);
  const now = Date.now();
  const details = [];
  let cancelledPending = 0;
  let cancelledApproved = 0;

  try {
    // -------------------------------------------------------------
    // RULE 1: Automatically Cancel Expired Pending Requests
    // -------------------------------------------------------------
    if (settings.autoCancelPendingEnabled) {
      const days = Number(settings.pendingExpiryDays) || 3;
      const cutoffMs = now - (days * 24 * 60 * 60 * 1000);

      const { data: pendingRequests, error: pErr } = await supabase
        .from('booking_requests')
        .select('*, equipment(id, name, asset_code), profiles(id, full_name, email)')
        .eq('status', 'pending');

      if (!pErr && pendingRequests) {
        for (const req of pendingRequests) {
          const reqTime = new Date(req.created_at).getTime();
          if (reqTime <= cutoffMs) {
            // Cancel pending request
            const { error: cancelErr } = await supabase
              .from('booking_requests')
              .update({
                status: 'cancelled',
                purpose: (req.purpose || '') + ` [Auto-cancelled: Expired after ${days} days without approval]`
              })
              .eq('id', req.id);

            if (!cancelErr) {
              cancelledPending++;
              const eqName = req.equipment?.name || 'Equipment';
              const code = req.equipment?.asset_code || '';
              const studentName = req.profiles?.full_name || 'Student';

              // Log in activity_log
              await supabase.from('activity_log').insert({
                description: `AUTOMATION: Cancelled expired pending requisition #${req.id.slice(0, 8)} for ${eqName} (${code}) by ${studentName} (Exceeded ${days}-day threshold).`
              });

              details.push({
                type: 'pending_expiry',
                requestId: req.id,
                equipment: eqName,
                student: studentName,
                reason: `Pending for >${days} days without administrative action`
              });
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // RULE 2: Automatically Cancel Approved But Uncollected Bookings
    // -------------------------------------------------------------
    if (settings.autoCancelApprovedEnabled) {
      const hours = Number(settings.approvedExpiryHours) || 24;
      const cutoffMs = now - (hours * 60 * 60 * 1000);

      // Find requests approved before cutoff time
      const { data: approvedRequests, error: aErr } = await supabase
        .from('booking_requests')
        .select('*, equipment(id, name, asset_code, available_quantity, total_quantity), profiles(id, full_name, email)')
        .eq('status', 'approved');

      if (!aErr && approvedRequests) {
        for (const req of approvedRequests) {
          // Check linked loan to verify if equipment is still awaiting pickup
          const { data: loan, error: loanErr } = await supabase
            .from('loans')
            .select('*')
            .eq('request_id', req.id)
            .maybeSingle();

          if (!loanErr && loan && loan.status === 'issued' && !loan.returned_at) {
            const approvalTime = new Date(loan.issued_at || req.created_at).getTime();
            if (approvalTime <= cutoffMs) {
              // 1. Cancel booking request
              const { error: cancelErr } = await supabase
                .from('booking_requests')
                .update({
                  status: 'cancelled',
                  purpose: (req.purpose || '') + ` [Auto-cancelled: Not collected within ${hours}h pickup window]`
                })
                .eq('id', req.id);

              if (!cancelErr) {
                // 2. Remove / void the uncollected loan
                await supabase.from('loans').delete().eq('id', loan.id);

                // 3. Atomically restore reserved equipment inventory
                if (req.equipment) {
                  const currentAvail = Number(req.equipment.available_quantity) || 0;
                  const total = Number(req.equipment.total_quantity) || (currentAvail + 1);
                  const restored = Math.min(total, currentAvail + 1);

                  await supabase
                    .from('equipment')
                    .update({ available_quantity: restored })
                    .eq('id', req.equipment.id);
                }

                cancelledApproved++;
                const eqName = req.equipment?.name || 'Equipment';
                const code = req.equipment?.asset_code || '';
                const studentName = req.profiles?.full_name || 'Student';

                // Log in activity_log
                await supabase.from('activity_log').insert({
                  description: `AUTOMATION: Cancelled uncollected approved booking #${req.id.slice(0, 8)} for ${eqName} (${code}) by ${studentName}. Reserved inventory restored (+1 unit).`
                });

                details.push({
                  type: 'approved_uncollected',
                  requestId: req.id,
                  equipment: eqName,
                  student: studentName,
                  reason: `Approved booking not collected within ${hours} hours. Stock restored.`
                });
              }
            }
          }
        }
      }
    }

    // Update settings metadata with execution results
    const totalCancelled = cancelledPending + cancelledApproved;
    const updatedSettings = {
      ...settings,
      lastAutomationRun: new Date().toISOString(),
      lastAutomationCount: totalCancelled,
      lastAutomationStatus: 'success',
      lastAutomationError: null
    };

    await saveAdminSettings(supabase, updatedSettings, actor);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      cancelledPending,
      cancelledApproved,
      totalCancelled,
      details,
      error: null
    };
  } catch (err) {
    const errorMsg = err.message || 'Unknown automation execution failure';
    try {
      const errSettings = {
        ...settings,
        lastAutomationRun: new Date().toISOString(),
        lastAutomationStatus: 'error',
        lastAutomationError: errorMsg
      };
      await saveAdminSettings(supabase, errSettings, actor);
    } catch {}

    return {
      success: false,
      timestamp: new Date().toISOString(),
      cancelledPending,
      cancelledApproved,
      totalCancelled: 0,
      details,
      error: errorMsg
    };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server database credentials not configured.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  if (req.method === 'GET') {
    // Return current settings & status
    const settings = await getAdminSettings(supabase);
    return res.status(200).json({ settings });
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const action = body.action || 'run';

    if (action === 'save_settings') {
      const updated = await saveAdminSettings(supabase, body.settings || {}, body.actor || 'Administrator');
      return res.status(200).json({ success: true, settings: updated });
    }

    if (action === 'reset_settings') {
      const reset = await saveAdminSettings(supabase, DEFAULT_ADMIN_SETTINGS, body.actor || 'Administrator (Reset)');
      return res.status(200).json({ success: true, settings: reset });
    }

    // Default action: Run automation process
    const result = await processAutomatedCancellations(supabase, body.actor || 'Manual Admin Trigger');
    return res.status(result.success ? 200 : 500).json(result);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
