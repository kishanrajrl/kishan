import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_STUDENT_PASSWORD || 'DemoStudent@123';

if (!url || !key) {
  console.error('Missing database configuration in .env.local');
  process.exit(1);
}

const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const db = createClient(cleanUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function seed() {
  console.log('====================================================');
  console.log('   SEEDING EXPANDED DEMO DATASET FOR LABSYNC        ');
  console.log('====================================================\n');

  // 1. ADD ADDITIONAL STUDENTS (5 New Students across AI, Electrical, Mechanical, ECE)
  const newStudents = [
    { email: 'kavya.patel@labsync.test', name: 'Kavya Patel', usn: '1DS24EC045', dept: 'Electronics & Communication', sem: '5', status: 'approved' },
    { email: 'vikram.aditya@labsync.test', name: 'Vikram Aditya', usn: '1DS24EE012', dept: 'Electrical & Electronics', sem: '4', status: 'approved' },
    { email: 'sneha.reddy@labsync.test', name: 'Sneha Reddy', usn: '1DS24AI034', dept: 'Artificial Intelligence & ML', sem: '3', status: 'approved' },
    { email: 'mohammed.faiz@labsync.test', name: 'Mohammed Faiz', usn: '1DS24ME008', dept: 'Robotics & Mechanical', sem: '5', status: 'approved' },
    { email: 'ananya.deshmukh@labsync.test', name: 'Ananya Deshmukh', usn: '1DS24CS089', dept: 'Computer Science', sem: '4', status: 'pending' } // Pending for admin approval demo!
  ];

  const studentMap = {};
  const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUsers = userList?.users || [];

  for (const s of newStudents) {
    let u = existingUsers.find(x => x.email?.toLowerCase() === s.email.toLowerCase());
    if (!u) {
      const res = await db.auth.admin.createUser({
        email: s.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: s.name, usn: s.usn, department: s.dept, semester: s.sem }
      });
      if (res.error) {
        console.warn(`Could not create user ${s.email}:`, res.error.message);
        continue;
      }
      u = res.data.user;
    }

    const { error: profErr } = await db.from('profiles').upsert({
      id: u.id,
      email: s.email,
      full_name: s.name,
      usn: s.usn,
      department: s.dept,
      semester: s.sem,
      role: 'student',
      status: s.status
    }, { onConflict: 'id' });

    if (profErr) console.warn('Profile upsert warning:', profErr.message);
    studentMap[s.email] = { id: u.id, ...s };
    console.log(`✓ Student: ${s.name} (${s.email}) — [${s.status.toUpperCase()}]`);
  }

  // 2. ADD 10 ADDITIONAL LABORATORY HARDWARE ITEMS
  const additionalAssets = [
    ['Raspberry Pi 4 Model B (4GB)', 'LS-1012', 'Development Board', 8, '▣', 'High-performance 64-bit quad-core SBC with Gigabit Ethernet, dual-band Wi-Fi, dual 4K micro-HDMI outputs, and 4GB LPDDR4 RAM.'],
    ['Digital Storage Oscilloscope 100MHz', 'LS-1013', 'Test Equipment', 4, '∿', 'Dual-channel 100MHz bench oscilloscope with 1GSa/s real-time sampling rate, 7-inch TFT color display, and FFT frequency analysis.'],
    ['Logic Analyzer 8-Channel 24MHz', 'LS-1014', 'Test Equipment', 10, '⑉', 'USB-based 8-channel digital logic analyzer supporting I2C, SPI, UART, and PWM protocol decoding.'],
    ['OLED Display 0.96 inch I2C', 'LS-1015', 'Displays', 15, '▤', 'Monochrome 128x64 self-illuminating graphical OLED display with high contrast and standard 4-pin I2C communication interface.'],
    ['16x2 LCD with I2C Backpack', 'LS-1016', 'Displays', 18, '▤', 'Alphanumeric 16-character by 2-line liquid crystal display with PCF8574 I2C adapter backpack for 2-wire serial connection.'],
    ['MPU-6050 6-DOF IMU Sensor', 'LS-1017', 'Sensors', 14, '◎', 'Integrated 3-axis accelerometer and 3-axis angular rate sensor (gyroscope) with onboard Digital Motion Processor (DMP).'],
    ['HC-05 Bluetooth Module', 'LS-1018', 'IoT & Wi-Fi', 12, '📶', 'Class 2 serial Bluetooth v2.0+EDR transceiver module with master/slave mode switching and simple AT command configuration.'],
    ['L298N Dual H-Bridge Motor Driver', 'LS-1019', 'Actuators', 12, '⚙', 'High-voltage, high-current dual full-bridge driver designed to control inductive loads such as DC motors, stepping motors, and solenoids.'],
    ['Soldering Station 60W Adjustable', 'LS-1020', 'Prototyping', 6, '⚡', 'ESD-safe temperature-controlled 60W soldering iron station with ceramic heating element, digital LED readout, and heat-resistant stand.'],
    ['PIR Motion Sensor HC-SR501', 'LS-1021', 'Sensors', 16, '◎', 'Pyroelectric infrared motion detector module with adjustable delay time and sensitivity for automated intruder or presence detection.']
  ];

  for (const [name, asset_code, category, total_quantity, icon, description] of additionalAssets) {
    const { error } = await db.from('equipment').upsert({
      name,
      asset_code,
      category,
      total_quantity,
      available_quantity: total_quantity,
      icon,
      description
    }, { onConflict: 'asset_code' });

    if (error) console.warn(`Asset ${asset_code} upsert warning:`, error.message);
    else console.log(`✓ Equipment: ${name} (${asset_code}) — Total Units: ${total_quantity}`);
  }

  // Fetch all equipment mapping
  const { data: allEq } = await db.from('equipment').select('*');
  const byCode = Object.fromEntries((allEq || []).map(e => [e.asset_code, e]));

  // 3. SAMPLE REQUISITIONS COVERING ALL STAGES (Pending, Approved-awaiting-collection, Rejected)
  const { data: existingRequests } = await db.from('booking_requests').select('purpose');
  const hasRequest = (p) => (existingRequests || []).some(x => x.purpose === p);

  const newRequests = [
    // A. Pending Request (Ready for admin to click "Approve Request")
    {
      user_id: studentMap['sneha.reddy@labsync.test']?.id,
      equipment_id: byCode['LS-1002']?.id, // ESP32
      purpose: 'DEMO: Smart Attendance System using RFID & Cloud Telemetry',
      requested_return_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      status: 'pending'
    },
    // B. Pending Request (Ready for admin to click "Approve Request")
    {
      user_id: studentMap['vikram.aditya@labsync.test']?.id,
      equipment_id: byCode['LS-1015']?.id, // OLED Display
      purpose: 'DEMO: Digital Voltmeter GUI and Waveform Display',
      requested_return_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      status: 'pending'
    },
    // C. Approved Awaiting Collection (Step 1 Approved! 1 unit reserved; ready for admin to click "⚡ Issue Hardware" when student collects!)
    {
      user_id: studentMap['kavya.patel@labsync.test']?.id,
      equipment_id: byCode['LS-1017']?.id, // MPU-6050
      purpose: 'DEMO: Self-Balancing Inverted Pendulum Robot (Ready for collection)',
      requested_return_date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
      status: 'approved'
    },
    // D. Approved Awaiting Collection (Step 1 Approved! 1 unit reserved; ready for admin to click "⚡ Issue Hardware" when student collects!)
    {
      user_id: studentMap['mohammed.faiz@labsync.test']?.id,
      equipment_id: byCode['LS-1012']?.id, // Raspberry Pi 4
      purpose: 'DEMO: Autonomous Obstacle Rover with Computer Vision (Ready for collection)',
      requested_return_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'approved'
    },
    // E. Rejected Request
    {
      user_id: studentMap['sneha.reddy@labsync.test']?.id,
      equipment_id: byCode['LS-1020']?.id, // Soldering Station
      purpose: 'DEMO: Dormitory personal repair project (Non-coursework)',
      requested_return_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      status: 'rejected'
    }
  ];

  for (const r of newRequests) {
    if (r.user_id && r.equipment_id && !hasRequest(r.purpose)) {
      await db.from('booking_requests').insert(r);
      // For approved uncollected requests, reserve 1 unit of stock
      if (r.status === 'approved') {
        const eq = byCode[r.equipment_id] || Object.values(byCode).find(e => e.id === r.equipment_id);
        if (eq) {
          await db.from('equipment').update({ available_quantity: Math.max(0, eq.available_quantity - 1) }).eq('id', eq.id);
        }
      }
      console.log(`✓ Requisition: "${r.purpose.slice(0, 45)}..." — [${r.status.toUpperCase()}]`);
    }
  }

  // 4. SAMPLE ACTIVE, OVERDUE, AND DAMAGED LOANS
  const { data: existingLoans } = await db.from('loans').select('damage_note');
  const hasLoan = (note) => (existingLoans || []).some(l => l.damage_note === note);

  const sampleLoans = [
    // Active loan with plenty of time remaining (3 days left)
    {
      user_id: studentMap['vikram.aditya@labsync.test']?.id,
      equipment_id: byCode['LS-1013']?.id, // Oscilloscope
      due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      status: 'issued',
      damage_note: 'DEMO: Active loan (Oscilloscope in signals lab)'
    },
    // Overdue loan (Overdue by 2 days — triggers urgent red alerts!)
    {
      user_id: studentMap['kavya.patel@labsync.test']?.id,
      equipment_id: byCode['LS-1014']?.id, // Logic Analyzer
      due_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      status: 'issued',
      damage_note: 'DEMO: Overdue loan (Logic Analyzer SPI protocol test)'
    },
    // Damaged return (Shows condition inspection report & quarantine handling!)
    {
      user_id: studentMap['mohammed.faiz@labsync.test']?.id,
      equipment_id: byCode['LS-1018']?.id, // HC-05
      due_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      returned_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      status: 'damaged',
      damage_note: 'INSPECTION REPORT: Bent RX pin header and trace cracked during breadboard insertion; quarantined for PCB rework.'
    }
  ];

  for (const l of sampleLoans) {
    if (l.user_id && l.equipment_id && !hasLoan(l.damage_note)) {
      await db.from('loans').insert(l);
      // For active/overdue issued loans, decrement available stock
      if (l.status === 'issued') {
        const eq = Object.values(byCode).find(e => e.id === l.equipment_id);
        if (eq) {
          await db.from('equipment').update({ available_quantity: Math.max(0, eq.available_quantity - 1) }).eq('id', eq.id);
        }
      }
      console.log(`✓ Loan: [${l.status.toUpperCase()}] ${l.damage_note}`);
    }
  }

  // 5. ACTIVITY LOG ENTRIES (Vibrant audit trail)
  const activityEntries = [
    'Requisition #req-8291 approved for Raspberry Pi 4 Model B (LS-1012). Unit reserved awaiting student counter collection.',
    'Inspection: Logic Analyzer (LS-1014) overdue notification sent to Kavya Patel (1DS24EC045).',
    'Damage report filed: HC-05 Bluetooth Module (LS-1018) quarantined with bent header pin.',
    'Approved enrollment for student Vikram Aditya (1DS24EE012, Electrical & Electronics).',
    'Routine inventory calibration check completed across Power and Actuator bays.'
  ];

  for (const desc of activityEntries) {
    await db.from('activity_log').insert({ description: desc });
  }
  console.log(`✓ Added ${activityEntries.length} realistic laboratory audit log records.`);

  // 6. IN-APP NOTIFICATIONS
  if (studentMap['kavya.patel@labsync.test']?.id) {
    await db.from('notifications').insert({
      user_id: studentMap['kavya.patel@labsync.test'].id,
      title: 'Booking Approved — Ready for Collection',
      message: 'Your booking for MPU-6050 6-DOF IMU Sensor has been approved! Please visit the laboratory counter to collect your hardware.',
      type: 'success'
    });
  }
  if (studentMap['vikram.aditya@labsync.test']?.id) {
    await db.from('notifications').insert({
      user_id: studentMap['vikram.aditya@labsync.test'].id,
      title: 'Upcoming Due Date Reminder',
      message: 'Your loan for Digital Storage Oscilloscope 100MHz is due in 3 days. Please return it to the lab counter on time.',
      type: 'warning'
    });
  }
  console.log('✓ Added student in-app notifications.');

  console.log('\n====================================================');
  console.log('   DEMO DATA EXPANSION COMPLETE!                    ');
  console.log('====================================================');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
