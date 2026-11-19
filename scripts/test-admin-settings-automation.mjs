import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_ADMIN_SETTINGS,
  getAdminSettings,
  saveAdminSettings,
  processAutomatedCancellations
} from '../api/automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase service credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runTests() {
  console.log('====================================================');
  console.log('   LABSYNC ADMIN SETTINGS & AUTOMATION TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Retrieve Initial Admin Settings
    // ----------------------------------------------------
    console.log('--- TEST 1: Retrieve Initial Admin Settings ---');
    const initialSettings = await getAdminSettings(supabase);
    assert(initialSettings && typeof initialSettings === 'object', 'Settings object returned');
    assert(initialSettings.pendingExpiryDays === 3 || typeof initialSettings.pendingExpiryDays === 'number', 'Default pendingExpiryDays is defined');
    assert(initialSettings.approvedExpiryHours === 24 || typeof initialSettings.approvedExpiryHours === 'number', 'Default approvedExpiryHours is defined');
    assert(initialSettings.maxActiveBookingsPerStudent === 3 || typeof initialSettings.maxActiveBookingsPerStudent === 'number', 'Default maxActiveBookingsPerStudent is defined');
    assert(initialSettings.requireDamageNote === true || typeof initialSettings.requireDamageNote === 'boolean', 'Default requireDamageNote is boolean');

    // ----------------------------------------------------
    // TEST 2: Update and Persist Admin Settings
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Save and Persist Admin Settings ---');
    const testSettings = {
      ...initialSettings,
      pendingExpiryDays: 4,
      approvedExpiryHours: 36,
      maxActiveBookingsPerStudent: 5,
      updatedBy: 'automated-test-runner@labsync.test'
    };

    const saved = await saveAdminSettings(supabase, testSettings, 'automated-test-runner@labsync.test');
    assert(saved.pendingExpiryDays === 4, 'Saved pendingExpiryDays = 4');
    assert(saved.approvedExpiryHours === 36, 'Saved approvedExpiryHours = 36');

    // Read back fresh from database
    const readBack = await getAdminSettings(supabase);
    assert(readBack.pendingExpiryDays === 4, 'Persisted settings read back from Supabase match pendingExpiryDays = 4');
    assert(readBack.approvedExpiryHours === 36, 'Persisted settings read back from Supabase match approvedExpiryHours = 36');
    assert(readBack.updatedBy === 'automated-test-runner@labsync.test', 'Audit updater identity stored correctly');

    // ----------------------------------------------------
    // TEST 3: Rule 1 - Auto-Cancel Expired Pending Requests
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Rule 1 - Auto-Cancel Expired Pending Requests ---');
    // Set pending expiry to 3 days
    await saveAdminSettings(supabase, { ...DEFAULT_ADMIN_SETTINGS, autoCancelPendingEnabled: true, pendingExpiryDays: 3 }, 'test-admin');

    // Get a demo student ID and an equipment ID
    const { data: student } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').eq('status', 'approved').limit(1).single();
    const { data: item } = await supabase.from('equipment').select('id, name, available_quantity, total_quantity').limit(1).single();

    assert(student && item, 'Found active student and equipment for test');

    // Create an expired pending request (created 5 days ago)
    const fiveDaysAgo = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const returnDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const { data: expiredPending, error: pErr } = await supabase.from('booking_requests').insert({
      user_id: student.id,
      equipment_id: item.id,
      status: 'pending',
      purpose: 'TEST_PENDING_EXPIRED: Microcontroller robotics lab experiment',
      requested_return_date: returnDate,
      created_at: fiveDaysAgo
    }).select().single();

    assert(!pErr && expiredPending, 'Created simulated expired pending request (5 days old)');

    // Run cancellation engine
    const runResult1 = await processAutomatedCancellations(supabase, 'Automated Test Engine');
    assert(runResult1.success === true, 'Engine execution returned success');
    assert(runResult1.cancelledPending >= 1, `Engine detected and cancelled expired pending request (cancelled: ${runResult1.cancelledPending})`);

    // Verify database record
    const { data: verifiedReq } = await supabase.from('booking_requests').select('*').eq('id', expiredPending.id).single();
    assert(verifiedReq.status === 'cancelled', 'Request status updated to "cancelled"');
    assert(verifiedReq.purpose.includes('Auto-cancelled: Expired after 3 days'), 'Cancellation reason appended to request purpose');

    // ----------------------------------------------------
    // TEST 4: Rule 2 - Auto-Cancel Approved Uncollected Bookings & Restore Stock
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Rule 2 - Auto-Cancel Approved Uncollected Bookings & Restore Stock ---');
    // Ensure approved auto-cancel is enabled with 24 hours
    await saveAdminSettings(supabase, { ...DEFAULT_ADMIN_SETTINGS, autoCancelApprovedEnabled: true, approvedExpiryHours: 24 }, 'test-admin');

    // Check initial available quantity of equipment
    const { data: itemBefore } = await supabase.from('equipment').select('id, available_quantity, total_quantity').eq('id', item.id).single();
    const initialQty = itemBefore.available_quantity;

    // Simulate an approved request from 30 hours ago (> 24h pickup window)
    const thirtyHoursAgo = new Date(Date.now() - (30 * 60 * 60 * 1000)).toISOString();
    const { data: approvedReq } = await supabase.from('booking_requests').insert({
      user_id: student.id,
      equipment_id: item.id,
      status: 'approved',
      purpose: 'TEST_APPROVED_UNCOLLECTED: Sensor interfacing experiment',
      requested_return_date: returnDate,
      created_at: thirtyHoursAgo
    }).select().single();

    // Create linked uncollected loan and simulate reserved inventory (-1)
    await supabase.from('equipment').update({ available_quantity: Math.max(0, initialQty - 1) }).eq('id', item.id);
    const { data: uncollectedLoan } = await supabase.from('loans').insert({
      user_id: student.id,
      equipment_id: item.id,
      request_id: approvedReq.id,
      status: 'issued',
      issued_at: thirtyHoursAgo,
      due_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
    }).select().single();

    assert(approvedReq && uncollectedLoan, 'Simulated approved uncollected booking with linked loan created');

    // Run cancellation engine
    const runResult2 = await processAutomatedCancellations(supabase, 'Automated Test Engine');
    assert(runResult2.success === true, 'Engine execution returned success');
    assert(runResult2.cancelledApproved >= 1, `Engine detected and cancelled uncollected approved booking (cancelled: ${runResult2.cancelledApproved})`);

    // Verify request is cancelled
    const { data: verifiedApproved } = await supabase.from('booking_requests').select('*').eq('id', approvedReq.id).single();
    assert(verifiedApproved.status === 'cancelled', 'Approved request transitioned to "cancelled"');
    assert(verifiedApproved.purpose.includes('Auto-cancelled: Not collected within 24h pickup window'), 'Purpose records pickup window expiry');

    // Verify linked loan was voided/deleted
    const { data: checkLoan } = await supabase.from('loans').select('*').eq('id', uncollectedLoan.id).maybeSingle();
    assert(!checkLoan, 'Linked uncollected loan record removed/voided');

    // Verify stock restoration
    const { data: itemAfter } = await supabase.from('equipment').select('id, available_quantity').eq('id', item.id).single();
    assert(itemAfter.available_quantity === initialQty, `Stock atomically restored to ${initialQty} units (was decremented during reservation)`);

    // ----------------------------------------------------
    // TEST 5: Idempotency & Safe Re-execution
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Idempotency & Safe Duplicate Execution ---');
    const runResult3 = await processAutomatedCancellations(supabase, 'Automated Test Engine Duplicate Check');
    assert(runResult3.success === true, 'Duplicate execution ran without throwing');
    assert(runResult3.cancelledApproved === 0, 'No false duplicate cancellations on already cancelled bookings');

    // Check stock was not double-incremented
    const { data: itemCheckDouble } = await supabase.from('equipment').select('id, available_quantity').eq('id', item.id).single();
    assert(itemCheckDouble.available_quantity === initialQty, 'Stock is not double-incremented on idempotent runs');

    // ----------------------------------------------------
    // TEST 6: Audit Log Verification
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Activity Audit Log Verification ---');
    const { data: logs } = await supabase.from('activity_log').select('*').like('description', 'AUTOMATION:%').order('created_at', { ascending: false }).limit(5);
    assert(logs && logs.length >= 2, 'Activity log records present for automated pending & approved cancellations');
    console.log(`Latest audit entry: "${logs[0]?.description}"`);

    // ----------------------------------------------------
    // CLEANUP & RESET
    // ----------------------------------------------------
    console.log('\n--- CLEANUP & RESET ---');
    // Remove test booking requests
    await supabase.from('booking_requests').delete().in('id', [expiredPending.id, approvedReq.id]);
    // Reset settings to university defaults
    await saveAdminSettings(supabase, DEFAULT_ADMIN_SETTINGS, 'System Default (Post-Test Reset)');
    const finalSettings = await getAdminSettings(supabase);
    assert(finalSettings.pendingExpiryDays === 3, 'Settings successfully restored to default 3 days pending expiry');
    assert(finalSettings.approvedExpiryHours === 24, 'Settings successfully restored to default 24 hours collection expiry');

  } catch (err) {
    console.error('Unexpected test exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
