import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_EMAILS = ['admin577528@gmail.com', 'harshritesh6360@gmail.com'];
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let session = null;
let profile = null;
let roleChoice = 'student';
let currentPage = 'overview';
let activeCategory = 'All';
let scannerInstance = null;
let cache = { equipment: [], requests: [], loans: [], profiles: [], events: [] };
let notifications = [];

const DEFAULT_ADMIN_SETTINGS = {
  autoCancelPendingEnabled: true,
  pendingExpiryDays: 3,
  autoCancelApprovedEnabled: true,
  approvedExpiryHours: 24,
  defaultLoanDurationDays: 7,
  returnReminderDays: 1,
  overdueFrequency: 'daily',
  overdueDetection: 'immediate',
  requireDamageNote: true,
  maxActiveBookingsPerStudent: 3,
  maxQuantityPerBooking: 1,
  allowStudentCancelPending: true,
  allowStudentCancelApproved: true,
  blockIfOverdue: true,
  notifyOnBooking: true,
  notifyOnApproval: true,
  notifyOnRejection: true,
  notifyOnCollectionReminder: true,
  notifyOnReturnReminder: true,
  notifyOnOverdue: true,
  notifyOnDamage: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
  lastAutomationRun: null,
  lastAutomationCount: 0,
  lastAutomationStatus: 'idle',
  lastAutomationError: null
};

let adminSettings = { ...DEFAULT_ADMIN_SETTINGS };

async function fetchAdminSettings() {
  try {
    const res = await fetch('/api/automation');
    if (res.ok) {
      const data = await res.json();
      if (data && data.settings) {
        adminSettings = { ...DEFAULT_ADMIN_SETTINGS, ...data.settings };
        return adminSettings;
      }
    }
  } catch {}

  if (isAdmin()) {
    try {
      const { data: rows } = await supabase
        .from('activity_log')
        .select('description')
        .like('description', 'LABSYNC_SETTINGS:%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (rows && rows.length > 0) {
        const parsed = JSON.parse(rows[0].description.slice('LABSYNC_SETTINGS:'.length));
        adminSettings = { ...DEFAULT_ADMIN_SETTINGS, ...parsed };
      }
    } catch {}
  }
  return adminSettings;
}

async function saveAdminSettingsToServer(updated) {
  const payload = {
    ...adminSettings,
    ...updated,
    updatedAt: new Date().toISOString(),
    updatedBy: profile?.email || session?.user?.email || 'admin'
  };

  const res = await fetch('/api/automation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save_settings', settings: payload, actor: payload.updatedBy })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save configuration to server');
  }

  const data = await res.json();
  adminSettings = { ...DEFAULT_ADMIN_SETTINGS, ...(data.settings || payload) };
  return adminSettings;
}

async function triggerAutomationRun() {
  const res = await fetch('/api/automation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'run', actor: profile?.email || 'Administrator' })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Automation execution failed');
  }
  await reload();
  return data;
}

// Curated Hardware Knowledge Base & High-Resolution Vector Assets
const EQUIPMENT_DATA = {
  'LS-1001': {
    image: '/images/equipment/arduino-uno.svg',
    specs: 'ATmega328P 8-bit AVR MCU @ 16 MHz · 32 KB Flash · 2 KB SRAM · 14 Digital I/O (6 PWM) · 6 Analog Inputs · 5V Operating Voltage · USB-B & DC Barrel Jack',
    description: 'The industry-standard development board for prototyping embedded systems and electronics. Features an 8-bit AVR microcontroller with digital and analog I/O pins, onboard 5V regulator, USB communication port, and ICSP header.',
    applications: 'Introductory embedded systems, robotics motor control, sensor telemetry, PWM driver circuits, automated control, and analog/digital laboratory experiments.',
    safety: 'Operating voltage is 5V; input voltage on DC barrel jack is 7-12V. Never supply reverse polarity. Maximum current per I/O pin is 40mA.',
    shelf: 'Cabinet A-1 · Microcontrollers Bay'
  },
  'LS-1002': {
    image: '/images/equipment/esp32-devkit.svg',
    specs: 'Dual-core 32-bit Xtensa LX6 @ 240 MHz · Wi-Fi 802.11 b/g/n · Bluetooth v4.2 BR/EDR & BLE · 520 KB SRAM · 30 GPIOs · Hardware Crypto Acceleration',
    description: 'Ultra-capable system-on-chip development module with integrated dual-mode Wi-Fi and Bluetooth connectivity. Packed with capacitive touch sensors, Hall sensors, low-noise amplifiers, and extensive hardware crypto accelerators.',
    applications: 'Internet of Things (IoT) prototypes, smart home telemetry, cloud-connected sensor gateways, industrial automation, and wireless robotics control.',
    safety: 'Operates at 3.3V logic level. GPIO pins are strictly NOT 5V tolerant. Power via micro-USB or regulated 3.3V rail. Avoid static discharge on antenna.',
    shelf: 'Cabinet A-2 · Wireless & IoT Bay'
  },
  'LS-2004': {
    image: '/images/equipment/nodemcu-esp8266.svg',
    specs: 'Tensilica L106 32-bit CPU @ 80/160 MHz · Wi-Fi 802.11 b/g/n (2.4 GHz) · 4 MB Flash · 11 Digital GPIOs · 1 Analog Input (1.0V max) · Micro-USB Interface',
    description: 'Open-source Lua- and Arduino-programmable firmware platform based on the ESP-12E module. Integrates full TCP/IP networking stack with breadboard-friendly pin pitch, micro-USB port, and USB-to-UART bridge.',
    applications: 'Lightweight cloud telemetry nodes, MQTT publish/subscribe sensor stations, smart energy meters, and wireless sensor networking.',
    safety: 'Logic level is 3.3V. The onboard ADC (A0 pin) accepts a maximum input of 3.3V (divided down to 1.0V internally). Do not connect 5V signals directly to GPIO.',
    shelf: 'Cabinet A-2 · Wireless & IoT Bay'
  },
  'LS-1003': {
    image: '/images/equipment/dht11-sensor.svg',
    specs: 'Temperature: 0 to 50°C (±2°C) · Humidity: 20 to 90% RH (±5% RH) · Sampling Rate: 1 Hz (1 reading/sec) · Voltage: 3.3V - 5.5V DC · Single-bus Interface',
    description: 'Basic, low-cost digital temperature and humidity composite sensor with single-bus serial communication. Consists of a resistive humidity measurement component, an NTC temperature sensor, and an 8-bit microcontroller inside.',
    applications: 'Weather monitoring systems, climate-controlled environmental chambers, HVAC automation, soil-atmosphere studies, and smart agriculture projects.',
    safety: 'Requires a 4.7kΩ to 10kΩ pull-up resistor between the DATA line and VCC. Avoid continuous condensation or immersion in liquid.',
    shelf: 'Drawer S-1 · Environmental Sensors'
  },
  'LS-1004': {
    image: '/images/equipment/dht22-sensor.svg',
    specs: 'Temperature: -40 to 80°C (±0.5°C) · Humidity: 0 to 100% RH (±2% RH) · Sampling Rate: 0.5 Hz (every 2s) · Voltage: 3.3V - 6V DC · High Accuracy AM2302',
    description: 'High-precision capacitive digital temperature and humidity sensor (AM2302) with pre-calibrated digital signal output. Provides greater range, faster stabilization, and superior precision compared to DHT11.',
    applications: 'Precision cleanroom monitoring, greenhouse climate control, scientific instrumentation, weather stations, and cold-storage tracking.',
    safety: 'Maximum sampling frequency is once every 2 seconds. Ensure accurate VCC and GND pinout orientation to prevent thermal breakdown of sensor element.',
    shelf: 'Drawer S-1 · Environmental Sensors'
  },
  'LS-1005': {
    image: '/images/equipment/breadboard-830.svg',
    specs: 'Tie-Points: 830 (630 terminal strip + 200 distribution power bus) · Pitch: 2.54mm (0.1") · Wire Gauge: 20-29 AWG · Voltage Rating: up to 300V / 2A',
    description: 'Premium solderless prototyping breadboard with durable nickel-plated phosphor bronze spring contact clips and self-adhesive foam backing. Features clearly marked red/blue power distribution rails and numbered terminal rows.',
    applications: 'Rapid circuit prototyping, IC testing, analog and digital electronics lab experiments, and breadboard-friendly MCU interconnects without soldering.',
    safety: 'Do not insert component leads thicker than 20 AWG to avoid bending internal contact spring clips. Maximum continuous current rating: 2 Amperes.',
    shelf: 'Bin B-1 · Prototyping Essentials'
  },
  'LS-1006': {
    image: '/images/equipment/jumper-wires.svg',
    specs: 'Length: 20cm (8") · Configurations: M-M, M-F, F-F · Core: 28 AWG Multi-strand copper · Connectors: Standard 2.54mm DuPont headers · 65+ Pcs Kit',
    description: 'Set of multi-colored flexible ribbon jumper cables with durable molded DuPont connector housings. Multi-strand high-conductivity copper core enables repeated flexing without internal conductor fatigue.',
    applications: 'Connecting sensors, microcontrollers, displays, modules, and peripheral shields to breadboards and development headers during laboratory sessions.',
    safety: 'Do not pull on the wire insulation when disconnecting; grip the plastic molded DuPont connector head directly to prevent pin separation.',
    shelf: 'Bin B-2 · Prototyping Essentials'
  },
  'LS-1007': {
    image: '/images/equipment/digital-multimeter.svg',
    specs: 'DC Voltage: up to 600V · AC Voltage: up to 600V · DC Current: up to 10A · Resistance: up to 20 MΩ · Continuity: Audible beeper · Display: 3.5-digit LCD',
    description: 'Rugged laboratory digital multimeter featuring shock-absorbent yellow rubber holster, tilt-stand, low-battery indicator, and fused overload protection. Essential measurement tool for verifying voltage levels and troubleshooting circuits.',
    applications: 'Circuit debugging, voltage rail verification, continuity tracing, resistor measurement, diode testing, and power consumption characterization.',
    safety: 'Always ensure test lead probe placement matches the selected measurement mode. Never measure voltage with probes inserted in the 10A current jack.',
    shelf: 'Bench T-1 · Test & Measurement Equipment'
  },
  'LS-1008': {
    image: '/images/equipment/power-supply.svg',
    specs: 'Output Voltage: Regulated 5V DC (variable 0-30V) · Current Output: 0 to 3 Amperes · Display: Dual 3-digit LED readout · Regulation: < 0.01% + 2mV',
    description: 'Benchtop linear regulated DC laboratory power supply engineered for continuous operation. Provides low-ripple, low-noise DC excitation with independent coarse/fine voltage regulation and active current limiting protection.',
    applications: 'Powering microcontroller development boards, motor driver circuits, operational amplifier arrays, and testing embedded system load steps.',
    safety: 'Ensure the output switch is OFF before connecting circuit leads. Set appropriate current limits prior to energizing sensitive prototype circuits.',
    shelf: 'Bench T-2 · Power Stations'
  },
  'LS-1009': {
    image: '/images/equipment/servo-motor.svg',
    specs: 'Torque: 1.8 kg-cm @ 4.8V · Speed: 0.1 sec/60° · Operating Voltage: 4.8V - 6.0V · Weight: 9g · Rotation: 180° range (controlled via 50 Hz PWM)',
    description: 'Lightweight TowerPro SG90 miniature rotary servo motor with nylon gear train and 3-pin connector interface. Delivers high positioning torque and precise angular displacement based on variable pulse-width control signals.',
    applications: 'Robotics steering, pan-tilt camera mounts, automated barrier gates, robotic arm grippers, and educational mechatronics demonstrations.',
    safety: 'Do not force the motor arm beyond its mechanical rotation stops (0° to 180°). Power directly from an external 5V source rather than an MCU pin.',
    shelf: 'Drawer A-1 · Actuators & Motors'
  },
  'LS-1010': {
    image: '/images/equipment/ultrasonic-sensor.svg',
    specs: 'Range: 2 cm to 400 cm (1" to 13 feet) · Accuracy: 3 mm · Frequency: 40 kHz · Working Current: 15 mA · Operating Voltage: 5V DC · Trigger/Echo Interface',
    description: 'Popular non-contact acoustic distance measuring module consisting of ultrasonic transmitter, receiver, and control circuit. Emits eight 40 kHz sound bursts and calculates target distance via echo flight time.',
    applications: 'Autonomous obstacle-avoiding mobile robots, liquid level monitoring in storage tanks, human presence detection, and automated smart parking indicators.',
    safety: 'Operate strictly on 5V supply. Echo pin outputs a 5V logic signal; use a voltage divider (e.g. 1kΩ / 2kΩ) when connecting to 3.3V MCUs (ESP32 / ESP8266).',
    shelf: 'Drawer S-2 · Acoustic & Distance Sensors'
  },
  'LS-1011': {
    image: '/images/equipment/relay-module.svg',
    specs: 'Trigger Voltage: 5V DC · Trigger Current: 5mA · Switch Capacity: 10A @ 250VAC / 10A @ 30VDC · Isolation: High-speed optocoupler · Contacts: NO / COM / NC',
    description: 'Optically isolated single-channel electromechanical relay module designed to interface low-voltage microcontrollers with high-current AC/DC appliances. Includes flyback diode protection and status indicator LEDs.',
    applications: 'Smart home IoT appliance automation (fans, lamps, pumps), industrial solenoid actuation, isolation switching, and power supply sequencing.',
    safety: 'Exercise extreme caution when switching high-voltage mains AC (230V). Always enclose live connections in an insulated protective case. Never touch screw terminals while energized.',
    shelf: 'Drawer M-1 · Relay & Switching Modules'
  }
};

function getEquipmentMeta(assetCode, item = {}) {
  const code = String(assetCode || '').toUpperCase();
  if (EQUIPMENT_DATA[code]) return EQUIPMENT_DATA[code];
  return {
    image: '/images/equipment/arduino-uno.svg',
    specs: `${item.category || 'Laboratory Hardware'} · Standard Academic Lab Asset`,
    description: item.description || 'Precision electronic engineering component cataloged for laboratory experimentation and academic research.',
    applications: 'Electronics prototyping, embedded hardware development, and course project experiments.',
    safety: 'Handle in accordance with institutional laboratory safety regulations and equipment manuals.',
    shelf: 'General Equipment Rack'
  };
}

function toast(message, error = false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.style.background = error ? '#993535' : '#087f75';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3600);
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function isAdmin() {
  return profile?.role === 'admin' && profile?.status === 'approved' && ADMIN_EMAILS.includes(profile?.email?.toLowerCase());
}

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelativeDue(dueAt) {
  const due = new Date(dueAt);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, isLate: true };
  if (diffDays === 0) return { text: 'Due today', isLate: false };
  if (diffDays === 1) return { text: 'Due tomorrow', isLate: false };
  return { text: `Due in ${diffDays} days`, isLate: false };
}

function statusPill(s) {
  const v = String(s || 'pending').toLowerCase();
  const cls = ['approved', 'available', 'returned'].includes(v) ? 'green'
    : ['pending', 'requested', 'low_stock'].includes(v) ? 'orange'
    : ['overdue', 'rejected', 'damaged', 'unavailable'].includes(v) ? 'red' : '';
  return `<span class="pill ${cls}">${esc(v.replace('_', ' '))}</span>`;
}

function showAuth() {
  $('#auth-screen').classList.remove('hidden');
  $('#workspace').classList.add('hidden');
}

function showWorkspace() {
  $('#auth-screen').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
}

async function loadProfile() {
  if (!session?.user?.id) throw new Error('No active user session');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw error;
  profile = data;

  if (profile.status === 'pending') {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    throw new Error('Your student registration is pending administrator approval. Please check back later.');
  }

  if (profile.status === 'rejected') {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    throw new Error('Your registration was not approved. Please contact the laboratory administrator.');
  }
}

async function refreshData() {
  const [eq, rq, ln, ev] = await Promise.all([
    supabase.from('equipment').select('*').order('created_at', { ascending: false }),
    supabase.from('booking_requests').select('*, equipment(name,asset_code), profiles(full_name,usn,email,department,semester)').order('created_at', { ascending: false }),
    supabase.from('loans').select('*, equipment(name,asset_code), profiles(full_name,usn,email,department,semester)').order('issued_at', { ascending: false }),
    isAdmin() ? supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(40) : Promise.resolve({ data: [] })
  ]);

  for (const r of [eq, rq, ln, ev]) {
    if (r.error) throw r.error;
  }

  cache.equipment = eq.data || [];
  cache.requests = rq.data || [];
  cache.loans = ln.data || [];
  cache.events = ev.data || [];

  if (isAdmin()) {
    const p = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (p.error) throw p.error;
    cache.profiles = p.data || [];
  }

  await fetchAdminSettings();

  const pendingCount = isAdmin()
    ? cache.requests.filter(x => x.status === 'pending').length
    : cache.requests.filter(x => x.user_id === session?.user?.id && x.status === 'pending').length;

  const badge = $('#request-badge');
  if (badge) {
    badge.textContent = pendingCount;
    badge.classList.toggle('hidden', pendingCount === 0);
  }

  buildNotifications();
}

function buildNotifications() {
  const notifs = [];
  const now = new Date();

  if (isAdmin()) {
    const pendingStudents = cache.profiles.filter(p => p.role === 'student' && p.status === 'pending');
    if (pendingStudents.length > 0) {
      notifs.push({
        id: `pending-students-${pendingStudents.length}`,
        title: 'Student Registrations Pending',
        text: `${pendingStudents.length} student candidate(s) are awaiting identity & enrollment verification.`,
        time: 'Action required',
        isAlert: true
      });
    }

    if (adminSettings.notifyOnBooking !== false) {
      const pendingRequests = cache.requests.filter(r => r.status === 'pending');
      if (pendingRequests.length > 0) {
        notifs.push({
          id: `pending-req-${pendingRequests.length}`,
          title: 'Equipment Booking Queue',
          text: `${pendingRequests.length} student equipment request(s) are awaiting administrative review & stock allocation.`,
          time: 'Review needed',
          isAlert: false
        });
      }
    }

    if (adminSettings.notifyOnOverdue !== false) {
      const overdueLoans = cache.loans.filter(l => l.status === 'issued' && new Date(l.due_at) < now);
      if (overdueLoans.length > 0) {
        notifs.push({
          id: `admin-overdue-${overdueLoans.length}`,
          title: 'Overdue Equipment Alert',
          text: `${overdueLoans.length} equipment unit(s) have passed their scheduled return date. Follow up with students immediately.`,
          time: 'Immediate follow-up',
          isAlert: true
        });
      }
    }
  } else {
    notifs.push({
      id: 'welcome-student',
      title: 'LabSync Account Approved',
      text: 'Your student profile is active and verified. You may browse our 12 electronics hardware items and submit requisitions.',
      time: 'Status: Approved',
      isAlert: false
    });

    const myRequests = cache.requests.filter(r => r.user_id === session?.user?.id);

    // Auto-cancelled notifications
    const myCancelled = myRequests.filter(r => r.status === 'cancelled' && (r.purpose || '').includes('Auto-cancelled')).slice(0, 3);
    for (const r of myCancelled) {
      const reasonMatch = (r.purpose || '').match(/\[Auto-cancelled: (.*?)\]/);
      notifs.push({
        id: `req-cancelled-${r.id}`,
        title: '⚠️ Requisition Automatically Cancelled',
        text: `Your requisition for "${r.equipment?.name || 'Equipment'}" was cancelled: ${reasonMatch ? reasonMatch[1] : 'Stale request expired'}.`,
        time: 'System Automation',
        isAlert: true
      });
    }

    if (adminSettings.notifyOnApproval !== false) {
      const approvedRecent = myRequests.filter(r => r.status === 'approved').slice(0, 3);
      for (const r of approvedRecent) {
        notifs.push({
          id: `req-app-${r.id}`,
          title: 'Booking Approved & Ready',
          text: `Your requisition for "${r.equipment?.name || 'Equipment'}" has been approved. Please collect it from the lab counter before the pickup window expires.`,
          time: formatDate(r.created_at),
          isAlert: false
        });
      }
    }

    if (adminSettings.notifyOnRejection !== false) {
      const rejectedRecent = myRequests.filter(r => r.status === 'rejected').slice(0, 2);
      for (const r of rejectedRecent) {
        notifs.push({
          id: `req-rej-${r.id}`,
          title: 'Requisition Declined',
          text: `Your request for "${r.equipment?.name || 'Equipment'}" could not be approved by the laboratory desk.`,
          time: formatDate(r.created_at),
          isAlert: false
        });
      }
    }

    const myLoans = cache.loans.filter(l => l.user_id === session?.user?.id && l.status === 'issued');
    for (const l of myLoans) {
      const rel = formatRelativeDue(l.due_at);
      if (rel.isLate) {
        if (adminSettings.notifyOnOverdue !== false) {
          notifs.push({
            id: `loan-overdue-${l.id}`,
            title: '⚠️ Action Required: Equipment Overdue',
            text: `"${l.equipment?.name || 'Equipment'}" was due on ${formatDate(l.due_at)} (${rel.text}). Return immediately to clear your record.`,
            time: 'Overdue Alert',
            isAlert: true
          });
        }
      } else {
        if (adminSettings.notifyOnReturnReminder !== false) {
          notifs.push({
            id: `loan-due-${l.id}`,
            title: 'Active Hardware Loan Reminder',
            text: `"${l.equipment?.name || 'Equipment'}" is currently in your possession. ${rel.text}.`,
            time: formatDate(l.due_at),
            isAlert: false
          });
        }
      }
    }
  }

  notifications = notifs;
  updateNotificationUI();
}

function updateNotificationUI() {
  const badge = $('#notif-badge');
  const list = $('#notif-list');
  if (!badge || !list) return;

  const readKey = `labsync_read_notifs_${session?.user?.id || 'anon'}`;
  let readIds = [];
  try { readIds = JSON.parse(localStorage.getItem(readKey) || '[]'); } catch {}

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
  badge.textContent = unreadCount;
  badge.classList.toggle('hidden', unreadCount === 0);

  if (!notifications.length) {
    list.innerHTML = '<div class="empty" style="padding:24px;text-align:center;">No new notifications</div>';
    return;
  }

  list.innerHTML = notifications.map(n => {
    const isUnread = !readIds.includes(n.id);
    return `<div class="notif-item ${isUnread ? 'unread' : ''}">
      <strong>${esc(n.title)}</strong>
      <span>${esc(n.text)}</span>
      <small>${esc(n.time)}</small>
    </div>`;
  }).join('');
}

function markAllNotificationsRead() {
  const readKey = `labsync_read_notifs_${session?.user?.id || 'anon'}`;
  const allIds = notifications.map(n => n.id);
  localStorage.setItem(readKey, JSON.stringify(allIds));
  updateNotificationUI();
  toast('All notifications marked as read.');
}

function setUserHeader() {
  const n = profile.full_name || session?.user?.email || 'User';
  $('#user-name').textContent = n;
  $('#user-role').textContent = isAdmin() ? 'Lab Administrator' : `Student (${profile.department || 'Engineering'})`;
  $('#user-avatar').textContent = n.charAt(0).toUpperCase();

  $$('.admin-only').forEach(x => x.classList.toggle('hidden', !isAdmin()));
  const myloansNav = $('#nav [data-page="myloans"]');
  if (myloansNav) myloansNav.classList.toggle('hidden', isAdmin());
}

function navigate(page) {
  if (page === 'settings' && !isAdmin()) return navigate('overview');
  currentPage = page;
  $$('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const names = {
    overview: 'Overview',
    equipment: 'Equipment Catalogue',
    requests: 'Booking Requests',
    students: 'Student Approvals & Directory',
    myloans: 'My Loans & Equipment',
    activity: 'Active Loans & Returns',
    settings: 'Admin Settings & Automation'
  };
  $('#page-title').textContent = names[page] || 'Overview';
  $('#page-kicker').textContent = isAdmin() ? 'ADMINISTRATOR WORKSPACE' : 'STUDENT WORKSPACE';

  $('.sidebar')?.classList.remove('open');
  $('.sidebar-backdrop')?.remove();

  renderPage();
}

async function renderPage() {
  const c = $('#page-content');
  if (!c) return;
  if (currentPage === 'overview') return renderOverview(c);
  if (currentPage === 'equipment') return renderEquipment(c);
  if (currentPage === 'requests') return renderRequests(c);
  if (currentPage === 'students') return renderStudents(c);
  if (currentPage === 'myloans') return renderMyLoans(c);
  if (currentPage === 'activity') return renderActivity(c);
  if (currentPage === 'settings') return renderSettings(c);
}

function stat(label, value, foot, icon) {
  return `<div class="stat-card">
    <div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div>
    <div class="stat-value">${value}</div>
    <div class="stat-foot">${foot}</div>
  </div>`;
}

function renderOverview(c) {
  const totalUnits = cache.equipment.reduce((a, e) => a + Number(e.total_quantity || 0), 0);
  const availUnits = cache.equipment.reduce((a, e) => a + Number(e.available_quantity || 0), 0);
  const activeLoans = cache.loans.filter(x => x.status === 'issued');
  const overdueLoans = activeLoans.filter(x => new Date(x.due_at) < new Date());
  const pendingRequests = cache.requests.filter(x => x.status === 'pending');

  if (isAdmin()) {
    const totalStudents = cache.profiles.filter(p => p.role === 'student').length;
    const pendingStudents = cache.profiles.filter(p => p.role === 'student' && p.status === 'pending').length;
    const approvedStudents = cache.profiles.filter(p => p.role === 'student' && p.status === 'approved').length;
    const damagedUnits = cache.loans.filter(x => x.status === 'damaged').length;

    c.innerHTML = `
      <div class="welcome-row">
        <div>
          <h3>Laboratory Inventory Control & Administration Center 👋</h3>
          <p>Authorized Administrator: <b>${esc(profile.full_name || 'Administrator')}</b> (<code>${esc(profile.email || '')}</code>). Monitor live electronics stock, verify student requisitions, process hardware returns, and record condition inspection reports.</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" id="quick-add-eq">＋ Add Equipment</button>
          <button class="btn secondary" id="quick-scan-qr">▣ Scan Asset QR</button>
        </div>
      </div>

      <div class="stats-grid">
        ${stat('TOTAL STUDENTS', totalStudents, `${approvedStudents} approved · ${pendingStudents} pending verification`, '👥')}
        ${stat('PENDING APPROVALS', pendingStudents, 'New registrations awaiting credential verification', '⏳')}
        ${stat('TOTAL EQUIPMENT', totalUnits, `Across ${cache.equipment.length} cataloged electronics items`, '📦')}
        ${stat('AVAILABLE UNITS', availUnits, 'Verified hardware ready for immediate student assignment', '✓')}
        ${stat('ISSUED HARDWARE', activeLoans.length, 'Components currently deployed in active student projects', '⇄')}
        ${stat('PENDING REQUESTS', pendingRequests.length, 'Requisitions awaiting administrative approval & issue', '📋')}
        ${stat('OVERDUE LOANS', overdueLoans.length, overdueLoans.length ? 'Critical: past due date requiring student follow-up' : 'All loans currently within scheduled return window', '⚠️')}
        ${stat('DAMAGED REPORTED', damagedUnits, 'Hardware flagged with defects held out of circulation', '🔧')}
      </div>

      ${overdueLoans.length ? `
        <div class="panel" style="border-left:4px solid #d94848;margin-bottom:24px;">
          <div class="panel-head">
            <h3 style="color:#c23d3d;">⚠️ High Priority: Overdue Equipment Alert (${overdueLoans.length} unit${overdueLoans.length > 1 ? 's' : ''})</h3>
            <button class="btn secondary small-btn" data-go="activity">Manage Issued Loans →</button>
          </div>
          <p class="muted">The following laboratory components have exceeded their approved return date and require administrative follow-up:</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EQUIPMENT</th>
                  <th>STUDENT</th>
                  <th>DEPARTMENT / USN</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${overdueLoans.slice(0, 4).map(l => {
                  const rel = formatRelativeDue(l.due_at);
                  return `<tr>
                    <td><b>${esc(l.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
                    <td><b>${esc(l.profiles?.full_name || 'Student')}</b><br><small>${esc(l.profiles?.email || '')}</small></td>
                    <td>${esc(l.profiles?.department || '—')}<br><small class="code-tag">${esc(l.profiles?.usn || '—')}</small></td>
                    <td><b>${formatDate(l.due_at)}</b></td>
                    <td><span class="pill red">${rel.text}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="guide-grid">
        <div class="guide-card">
          <h4>📋 Laboratory Administrator Operating Protocol</h4>
          <ul class="guide-list">
            <li><b>Stock Integrity:</b> All stock deductions and restorations execute atomically inside PostgreSQL via <code>approve_booking</code> and <code>return_loan</code> RPCs to prevent race conditions.</li>
            <li><b>Return Inspection:</b> Visually inspect IC pins, wire insulation, and multimeter probe fuses before recording a return in the system.</li>
            <li><b>Damage Logging:</b> Always use <i>Report Damage</i> for bent pins, burnt traces, or blown ICs so the damaged unit is quarantined from student checkout.</li>
          </ul>
        </div>
        <div class="guide-card">
          <h4>⚡ Administrative Quick Actions & Shortcuts</h4>
          <ul class="guide-list">
            <li><b>Asset Tagging:</b> Open any equipment card to download high-resolution QR codes or print adhesive laboratory asset labels.</li>
            <li><b>Barcode Scanning:</b> Use the built-in camera QR scanner or fallback manual asset code lookup to identify units instantly at the checkout counter.</li>
            <li><b>Student Verifications:</b> Review student USN and department before approving accounts to ensure institutional access compliance.</li>
          </ul>
        </div>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-head">
            <h3>Recent Booking Requisitions</h3>
            <button class="link-btn" data-go="requests">View all requests (${cache.requests.length}) →</button>
          </div>
          ${requestTable(cache.requests.slice(0, 5), true)}
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Laboratory Operations Queue</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px;">
            <button class="btn secondary full" data-go="students">
              <span>Review Student Registrations</span>
              ${pendingStudents ? `<span class="pill orange">${pendingStudents} pending</span>` : '<span>→</span>'}
            </button>
            <button class="btn secondary full" data-go="requests">
              <span>Process Equipment Booking Queue</span>
              ${pendingRequests.length ? `<span class="pill orange">${pendingRequests.length} pending</span>` : '<span>→</span>'}
            </button>
            <button class="btn secondary full" data-go="activity">
              <span>Record Hardware Returns & Condition</span>
              <span>→</span>
            </button>
            <button class="btn secondary full" data-go="equipment">
              <span>Manage Catalogue & Print QR Labels</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    `;

    $('#quick-add-eq')?.addEventListener('click', () => equipmentModal());
    $('#quick-scan-qr')?.addEventListener('click', () => scanModal());
  } else {
    // Student overview
    const myRequests = cache.requests.filter(x => x.user_id === session.user.id);
    const myActiveLoans = cache.loans.filter(x => x.user_id === session.user.id && x.status === 'issued');
    const myOverdue = myActiveLoans.filter(x => new Date(x.due_at) < new Date());

    c.innerHTML = `
      <div class="welcome-row">
        <div>
          <h3>Welcome to LabSync, ${esc(profile.full_name?.split(' ')[0] || 'Student')} 👋</h3>
          <p>Academic Workspace: <b>Department of ${esc(profile.department || 'Engineering')}</b> · Semester <b>${esc(profile.semester || '—')}</b> · USN: <code>${esc(profile.usn || '—')}</code>. Browse our verified laboratory hardware, request components for coursework or mini-projects, and track return deadlines in real time.</p>
        </div>
        <button class="btn primary" data-go="equipment">Browse Equipment Catalogue →</button>
      </div>

      <div class="stats-grid">
        ${stat('TOTAL REQUISITIONS', myRequests.length, 'Lifetime booking requests submitted by you', '📋')}
        ${stat('PENDING APPROVAL', myRequests.filter(x => x.status === 'pending').length, 'Requests currently under laboratory staff review', '⏳')}
        ${stat('CURRENTLY ISSUED', myActiveLoans.length, 'Laboratory components in your physical custody', '📦')}
        ${stat('OVERDUE NOTICE', myOverdue.length, myOverdue.length ? 'Requires immediate return to laboratory' : 'All borrowed items are within approved timeframe', '⚠️')}
      </div>

      <div class="guide-grid">
        <div class="guide-card">
          <h4>📖 How LabSync Equipment Booking Works</h4>
          <ol class="guide-list">
            <li><b>Explore Hardware:</b> Browse the 12 electronics components in our catalogue and check live real-time stock.</li>
            <li><b>Submit Request:</b> Specify your lab experiment title or project purpose and select your required return date.</li>
            <li><b>Counter Collection:</b> Once approved, present your college student ID card and asset code at the lab counter to collect your hardware.</li>
          </ol>
        </div>
        <div class="guide-card">
          <h4>⚡ Component Care & Laboratory Policy</h4>
          <ul class="guide-list">
            <li><b>Loan Duration:</b> Standard equipment loan duration is limited to 7 days to ensure fair access for all student batches.</li>
            <li><b>Handling Safety:</b> Double-check power polarity (VCC / GND) and use current-limiting resistors before energizing microcontrollers.</li>
            <li><b>Return Condition:</b> Clean breadboards and bundle jumper wires neatly before returning equipment to the lab counter.</li>
          </ul>
        </div>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-head">
            <h3>My Currently Borrowed Equipment</h3>
            <button class="link-btn" data-go="myloans">View loan history →</button>
          </div>
          ${myActiveLoans.length ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>EQUIPMENT</th>
                    <th>ISSUED ON</th>
                    <th>DUE DATE</th>
                    <th>RETURN WINDOW</th>
                  </tr>
                </thead>
                <tbody>
                  ${myActiveLoans.map(l => {
                    const rel = formatRelativeDue(l.due_at);
                    return `<tr>
                      <td><b>${esc(l.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
                      <td>${formatDate(l.issued_at)}</td>
                      <td><b>${formatDate(l.due_at)}</b></td>
                      <td><span class="pill ${rel.isLate ? 'red' : 'green'}">${rel.text}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty">You currently have no hardware checked out on active loan.</div>'}
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>My Requisition Status</h3>
            <button class="link-btn" data-go="requests">Manage requests →</button>
          </div>
          ${requestTable(myRequests.slice(0, 5), false)}
        </div>
      </div>
    `;
  }
}

function equipmentTable(items) {
  if (!items.length) return '<div class="empty">No equipment currently cataloged in laboratory inventory.</div>';
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr><th>ITEM</th><th>CATEGORY</th><th>AVAILABLE</th><th>STATUS</th></tr>
      </thead>
      <tbody>
        ${items.map(e => `<tr>
          <td><b>${esc(e.name)}</b><br><small class="code-tag">${esc(e.asset_code)}</small></td>
          <td>${esc(e.category || 'General')}</td>
          <td><b>${e.available_quantity}</b> / ${e.total_quantity} units</td>
          <td>${statusPill(e.available_quantity > 0 ? 'available' : 'unavailable')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function requestTable(items, admin = false) {
  if (!items.length) return '<div class="empty">No equipment booking requisitions found.</div>';
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>EQUIPMENT</th>
          ${admin ? '<th>STUDENT DETAILS</th>' : ''}
          <th>PROJECT / PURPOSE</th>
          <th>REQUESTED RETURN</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(r => `<tr>
          <td><b>${esc(r.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(r.equipment?.asset_code || '')}</small></td>
          ${admin ? `<td><b>${esc(r.profiles?.full_name || 'Student')}</b><br><small>${esc(r.profiles?.usn || '')} · ${esc(r.profiles?.department || '')}</small></td>` : ''}
          <td><small>${esc(r.purpose || 'No purpose stated')}</small></td>
          <td>${formatDate(r.requested_return_date)}</td>
          <td>${statusPill(r.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderEquipment(c) {
  const categories = ['All', ...new Set(cache.equipment.map(e => e.category).filter(Boolean))];

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>Laboratory Hardware Catalogue & Inventory</h3>
        <p>Explore our 12 certified electronics components, microcontrollers, IoT sensors, and prototyping modules. Check live real-time stock and submit booking requests.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${isAdmin() ? '<button class="btn primary" id="add-equipment">＋ Add Equipment</button>' : ''}
        <button class="btn secondary" id="scan-open">▣ Scan / Lookup QR</button>
      </div>
    </div>

    <div class="category-bar" id="category-bar">
      ${categories.map(cat => `
        <button class="category-chip ${activeCategory === cat ? 'active' : ''}" data-category="${esc(cat)}">${esc(cat)}</button>
      `).join('')}
    </div>

    <div class="toolbar">
      <input id="equipment-search" placeholder="Search by component name, asset code (e.g. LS-1001), category, or technical specs..." autocomplete="off" />
      <select id="equipment-filter">
        <option value="all">All Availability Status</option>
        <option value="available">Available Only (Ready for Checkout)</option>
        <option value="unavailable">Out of Stock (Currently Checked Out)</option>
      </select>
    </div>

    <div class="equipment-grid" id="equipment-grid"></div>
  `;

  const draw = () => {
    const q = ($('#equipment-search')?.value || '').toLowerCase().trim();
    const f = $('#equipment-filter')?.value || 'all';

    let list = cache.equipment.filter(e => {
      const meta = getEquipmentMeta(e.asset_code, e);
      const matchQuery = (e.name + ' ' + e.asset_code + ' ' + (e.category || '') + ' ' + meta.description + ' ' + meta.specs).toLowerCase().includes(q);
      const matchCat = activeCategory === 'All' || e.category === activeCategory;
      const matchFilter = f === 'all' ? true : f === 'available' ? (e.available_quantity > 0) : (e.available_quantity === 0);
      return matchQuery && matchCat && matchFilter;
    });

    const grid = $('#equipment-grid');
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column: 1 / -1;padding:40px;">No matching equipment found in catalogue. Try modifying your search query or selecting a different category filter.</div>';
      return;
    }

    grid.innerHTML = list.map(e => {
      const avail = Number(e.available_quantity || 0);
      const total = Number(e.total_quantity || 0);
      const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
      const meterClass = avail === 0 ? 'empty' : avail <= 2 ? 'low' : '';
      const meta = getEquipmentMeta(e.asset_code, e);

      const stockBadgeText = avail === 0 ? 'Checked Out' : avail <= 2 ? `${avail} Left (Low)` : 'In Stock';
      const stockBadgeClass = avail === 0 ? 'empty' : avail <= 2 ? 'low' : 'available';

      return `<article class="equipment-card">
        <div class="equipment-img-wrap">
          <span class="equipment-stock-badge ${stockBadgeClass}">${stockBadgeText}</span>
          <img src="${meta.image}" alt="${esc(e.name)}" class="equipment-img" loading="lazy" onerror="this.src='/images/equipment/arduino-uno.svg'" />
        </div>
        
        <div class="equipment-card-content">
          <div class="equipment-tags-row">
            <span class="equipment-cat-tag">${esc(e.category || 'Electronics')}</span>
            <span class="code-tag">${esc(e.asset_code)}</span>
          </div>

          <h3>${esc(e.name)}</h3>
          <div class="equipment-specs-snippet" title="${esc(meta.specs)}">${esc(meta.specs)}</div>
          <p class="equipment-desc-text">${esc(meta.description)}</p>

          <div class="equipment-shelf-tag">
            <span>📍</span><span>${esc(meta.shelf)}</span>
          </div>

          <div class="equipment-footer">
            <div class="stock-meter">
              <div class="stock-meter-fill ${meterClass}" style="width: ${pct}%"></div>
            </div>
            <div class="equipment-meta" style="margin-top:7px;">
              <span><b>${avail}</b> of ${total} units ready</span>
              ${statusPill(avail > 0 ? 'available' : 'unavailable')}
            </div>

            <div class="card-actions" style="margin-top:14px;">
              ${!isAdmin() ? (avail > 0
                ? `<button class="btn primary" data-request="${e.id}">Request Equipment</button>`
                : `<button class="btn secondary" data-out-of-stock="${esc(e.name)}" data-asset="${esc(e.asset_code)}" title="Currently out of stock - click to ask LabBuddy for alternative components">Out of Stock ℹ</button>`) : ''}
              <button class="btn secondary" data-qr="${e.id}">Details & QR</button>
              ${isAdmin() ? `
                <button class="btn secondary" data-edit="${e.id}">Edit</button>
                <button class="btn danger small-btn" data-delete="${e.id}" title="Safely remove equipment from inventory">Delete</button>
              ` : ''}
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
  };

  $('#equipment-search')?.addEventListener('input', draw);
  $('#equipment-filter')?.addEventListener('change', draw);

  $('#category-bar')?.addEventListener('click', e => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    activeCategory = chip.dataset.category;
    $$('.category-chip').forEach(c => c.classList.toggle('active', c === chip));
    draw();
  });

  $('#add-equipment')?.addEventListener('click', () => equipmentModal());
  $('#scan-open')?.addEventListener('click', scanModal);

  $('#equipment-grid')?.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.request) requestEquipment(b.dataset.request);
    if (b.dataset.qr) qrModal(b.dataset.qr);
    if (b.dataset.edit) equipmentModal(cache.equipment.find(x => x.id === b.dataset.edit));
    if (b.dataset.delete) deleteEquipmentSafely(b.dataset.delete);
    if (b.dataset.outOfStock) {
      const name = b.dataset.outOfStock;
      const code = b.dataset.asset;
      toast(`"${name}" (${code}) is currently out of stock. Opening LabBuddy for recommendations...`);
      const panel = $('#buddy-panel');
      if (panel) {
        panel.classList.remove('hidden');
        const input = $('#buddy-input');
        if (input) {
          input.value = `Is there an alternative component for ${name} (${code}) in the lab?`;
          input.focus();
        }
      }
    }
  });

  draw();
}

function renderRequests(c) {
  const items = isAdmin() ? cache.requests : cache.requests.filter(x => x.user_id === session.user.id);

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>${isAdmin() ? 'Manage Student Equipment Requisitions' : 'My Booking Requisitions'}</h3>
        <p>${isAdmin() ? 'Review, approve, or reject student laboratory booking requests. Approving a request atomically decrements available stock and issues an active loan record.' : 'Track the review status of your equipment requests. Requisitions are typically reviewed by laboratory staff within 2-4 working hours.'}</p>
      </div>
    </div>

    <div class="panel">
      ${items.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                ${isAdmin() ? '<th>STUDENT DETAILS</th>' : ''}
                <th>PURPOSE / LAB SUBJECT</th>
                <th>REQUESTED RETURN</th>
                <th>SUBMITTED ON</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(r => `<tr>
                <td><b>${esc(r.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(r.equipment?.asset_code || '')}</small></td>
                ${isAdmin() ? `<td>
                  <b>${esc(r.profiles?.full_name || 'Student')}</b><br>
                  <small>${esc(r.profiles?.usn || '')} · ${esc(r.profiles?.department || '')}</small>
                </td>` : ''}
                <td><small>${esc(r.purpose || 'No purpose stated')}</small></td>
                <td>${formatDate(r.requested_return_date)}</td>
                <td>${formatDate(r.created_at)}</td>
                <td>${statusPill(r.status)}</td>
                <td>
                  ${isAdmin() ? (r.status === 'pending' ? `
                    <div class="inline-actions">
                      <button class="btn primary small-btn" data-approve="${r.id}">Approve & Issue</button>
                      <button class="btn danger small-btn" data-reject="${r.id}">Reject</button>
                    </div>
                  ` : r.status === 'approved' ? `
                    <button class="btn danger small-btn" data-cancel="${r.id}" title="Revoke uncollected booking and restore stock">Revoke Booking</button>
                  ` : '<span class="muted">—</span>') : (
                    r.status === 'pending' && adminSettings.allowStudentCancelPending ? `
                      <button class="btn danger small-btn" data-cancel="${r.id}">Cancel Request</button>
                    ` : r.status === 'approved' && adminSettings.allowStudentCancelApproved ? `
                      <button class="btn danger small-btn" data-cancel="${r.id}">Cancel Booking</button>
                    ` : '<span class="muted">—</span>'
                  )}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty" style="padding:40px 20px;text-align:center;">
             <p style="margin:0 0 14px;font-size:14px;">No booking requisitions recorded in the system.</p>
             <button class="btn primary small-btn" data-go="equipment">Browse Equipment Catalogue →</button>
           </div>`}
    </div>
  `;

  c.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => updateRequest(b.dataset.approve, 'approved'));
  c.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => updateRequest(b.dataset.reject, 'rejected'));
  c.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => cancelBookingRequest(b.dataset.cancel));
}

function renderStudents(c) {
  const pending = cache.profiles.filter(p => p.role === 'student' && p.status === 'pending');
  const approved = cache.profiles.filter(p => p.role === 'student' && p.status === 'approved');
  const allStudents = cache.profiles.filter(p => p.role === 'student');

  let activeSubtab = 'pending';

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>Student Account Approvals & Roster Directory</h3>
        <p>Verify candidate student registrations against college records. Approved students gain access to the equipment catalogue, booking requisition forms, and loan accounts.</p>
      </div>
    </div>

    <div class="subtabs">
      <button class="subtab active" data-subtab="pending">Pending Verification Queue <span class="subtab-count">${pending.length}</span></button>
      <button class="subtab" data-subtab="approved">Active Approved Students <span class="subtab-count">${approved.length}</span></button>
      <button class="subtab" data-subtab="all">Full Student Roster <span class="subtab-count">${allStudents.length}</span></button>
    </div>

    <div class="toolbar">
      <input id="student-search" placeholder="Search student by name, USN, college email, or engineering department..." autocomplete="off" />
    </div>

    <div class="panel" id="students-panel-content"></div>
  `;

  const drawList = () => {
    const q = ($('#student-search')?.value || '').toLowerCase().trim();
    let currentPool = activeSubtab === 'pending' ? pending : activeSubtab === 'approved' ? approved : allStudents;
    let filtered = currentPool.filter(p =>
      (p.full_name + ' ' + (p.usn || '') + ' ' + p.email + ' ' + (p.department || '')).toLowerCase().includes(q)
    );

    const panel = $('#students-panel-content');
    if (!panel) return;

    if (!filtered.length) {
      panel.innerHTML = `<div class="empty">No student records found under the "${activeSubtab}" filter.</div>`;
      return;
    }

    panel.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>STUDENT NAME / EMAIL</th>
              <th>USN / STUDENT ID</th>
              <th>DEPARTMENT</th>
              <th>SEMESTER</th>
              <th>STATUS</th>
              <th>REGISTERED ON</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => `<tr>
              <td><b>${esc(p.full_name)}</b><br><small>${esc(p.email)}</small></td>
              <td><span class="code-tag">${esc(p.usn || '—')}</span></td>
              <td>${esc(p.department || '—')}</td>
              <td>Semester ${esc(p.semester || '—')}</td>
              <td>${statusPill(p.status)}</td>
              <td>${formatDate(p.created_at)}</td>
              <td>
                <div class="inline-actions">
                  ${p.status === 'pending' ? `
                    <button class="btn primary small-btn" data-student-approve="${p.id}">Approve</button>
                    <button class="btn danger small-btn" data-student-reject="${p.id}">Reject</button>
                  ` : p.status === 'approved' ? `
                    <button class="btn danger small-btn" data-student-reject="${p.id}" title="Revoke student access">Revoke</button>
                  ` : p.status === 'rejected' ? `
                    <button class="btn primary small-btn" data-student-approve="${p.id}" title="Grant student access">Approve</button>
                  ` : ''}
                  <button class="btn secondary small-btn" data-student-view="${p.id}">Borrowing History</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    panel.querySelectorAll('[data-student-approve]').forEach(b => b.onclick = () => approveStudent(b.dataset.studentApprove, 'approved'));
    panel.querySelectorAll('[data-student-reject]').forEach(b => b.onclick = () => approveStudent(b.dataset.studentReject, 'rejected'));
    panel.querySelectorAll('[data-student-view]').forEach(b => b.onclick = () => studentDetailsModal(b.dataset.studentView));
  };

  $$('.subtab').forEach(b => {
    b.onclick = () => {
      activeSubtab = b.dataset.subtab;
      $$('.subtab').forEach(x => x.classList.toggle('active', x === b));
      drawList();
    };
  });

  $('#student-search')?.addEventListener('input', drawList);
  drawList();
}

function studentDetailsModal(studentId) {
  const s = cache.profiles.find(p => p.id === studentId);
  if (!s) return;

  const studentRequests = cache.requests.filter(r => r.user_id === studentId);
  const studentLoans = cache.loans.filter(l => l.user_id === studentId);

  const body = `
    <div class="profile-info-grid">
      <div class="profile-info-item"><small>Full Student Name</small><strong>${esc(s.full_name)}</strong></div>
      <div class="profile-info-item"><small>University Serial Number</small><strong class="code-tag">${esc(s.usn || '—')}</strong></div>
      <div class="profile-info-item"><small>Institutional Email</small><strong>${esc(s.email)}</strong></div>
      <div class="profile-info-item"><small>Department & Semester</small><strong>${esc(s.department || '—')} (Sem ${esc(s.semester || '—')})</strong></div>
      <div class="profile-info-item"><small>Account Access Status</small>${statusPill(s.status)}</div>
      <div class="profile-info-item"><small>Registered On</small><strong>${formatDate(s.created_at)}</strong></div>
    </div>

    <h4>Complete Borrowing History (${studentLoans.length} total loans, ${studentRequests.length} booking requisitions)</h4>
    ${studentLoans.length ? `
      <div class="table-wrap" style="max-height:240px;">
        <table>
          <thead><tr><th>COMPONENT</th><th>ISSUED DATE</th><th>DUE DATE</th><th>STATUS</th></tr></thead>
          <tbody>
            ${studentLoans.map(l => `<tr>
              <td><b>${esc(l.equipment?.name || 'Item')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
              <td>${formatDate(l.issued_at)}</td>
              <td>${formatDate(l.due_at)}</td>
              <td>${statusPill(l.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="muted">No laboratory equipment loans recorded for this student yet.</p>'}
  `;

  modal(`Student Profile: ${esc(s.full_name)}`, body, null, null, 'Close');
}

function renderMyLoans(c) {
  const loans = cache.loans.filter(l => l.user_id === session.user.id);
  const active = loans.filter(l => l.status === 'issued');
  const past = loans.filter(l => l.status !== 'issued');

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>My Equipment Loans & Physical Assets</h3>
        <p>Monitor scheduled return deadlines and return history. Present equipment at the laboratory desk on or before the due date for staff physical inspection and digital check-in.</p>
      </div>
    </div>

    <div class="panel">
      <h4>Currently Issued Hardware (${active.length})</h4>
      ${active.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                <th>ISSUED ON</th>
                <th>DUE DATE</th>
                <th>TIME REMAINING</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${active.map(l => {
                const rel = formatRelativeDue(l.due_at);
                return `<tr>
                  <td><b>${esc(l.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
                  <td>${formatDate(l.issued_at)}</td>
                  <td><b>${formatDate(l.due_at)}</b></td>
                  <td><span class="pill ${rel.isLate ? 'red' : 'green'}">${rel.text}</span></td>
                  <td>${statusPill(rel.isLate ? 'overdue' : 'issued')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty" style="padding:28px 20px;text-align:center;">
             <p style="margin:0 0 12px;font-size:13.5px;">You currently have no equipment issued on active loan.</p>
             <button class="btn primary small-btn" data-go="equipment">Browse Equipment Catalogue →</button>
           </div>`}
    </div>

    <br>
    <div class="panel">
      <h4>Completed Returns & Inspection History (${past.length})</h4>
      ${past.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                <th>ISSUED ON</th>
                <th>RETURNED ON</th>
                <th>CONDITION STATUS</th>
                <th>INSPECTION LOG NOTES</th>
              </tr>
            </thead>
            <tbody>
              ${past.map(l => `<tr>
                <td><b>${esc(l.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
                <td>${formatDate(l.issued_at)}</td>
                <td>${formatDate(l.returned_at)}</td>
                <td>${statusPill(l.status)}</td>
                <td><small>${esc(l.damage_note || 'Returned in good operational condition')}</small></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty" style="padding:24px 20px;text-align:center;">
             <p style="margin:0 0 12px;font-size:13.5px;">No past return records in your borrowing history.</p>
             <button class="btn secondary small-btn" data-go="equipment">Explore Available Hardware →</button>
           </div>`}
    </div>
  `;
}

function renderActivity(c) {
  const activeLoans = cache.loans.filter(l => l.status === 'issued');
  const now = new Date();

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>Active Hardware Loans & Return Verification</h3>
        <p>Record hardware returns, inspect component condition, report damaged hardware, and track overdue items across all academic departments.</p>
      </div>
      <button class="btn secondary" id="activity-scan-btn">▣ Scan Asset QR to Process Return</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Currently Issued Laboratory Components (${activeLoans.length})</h3>
      </div>
      ${activeLoans.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                <th>STUDENT</th>
                <th>DEPARTMENT / USN</th>
                <th>ISSUED ON</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${activeLoans.map(l => {
                const late = new Date(l.due_at) < now;
                const rel = formatRelativeDue(l.due_at);
                return `<tr>
                  <td><b>${esc(l.equipment?.name || 'Equipment')}</b><br><small class="code-tag">${esc(l.equipment?.asset_code || '')}</small></td>
                  <td><b>${esc(l.profiles?.full_name || 'Student')}</b><br><small>${esc(l.profiles?.email || '')}</small></td>
                  <td>${esc(l.profiles?.department || '—')}<br><small class="code-tag">${esc(l.profiles?.usn || '—')}</small></td>
                  <td>${formatDate(l.issued_at)}</td>
                  <td><b>${formatDate(l.due_at)}</b></td>
                  <td><span class="pill ${late ? 'red' : 'green'}">${rel.text}</span></td>
                  <td>
                    <div class="inline-actions">
                      <button class="btn primary small-btn" data-return="${l.id}">Mark Returned (Good)</button>
                      <button class="btn danger small-btn" data-damage="${l.id}">Report Damage</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty" style="padding:28px 20px;text-align:center;">
             <p style="margin:0 0 12px;font-size:13.5px;">No equipment is currently issued on loan. All laboratory hardware is accounted for on shelves.</p>
             <button class="btn secondary small-btn" data-go="requests">Review Booking Queue →</button>
           </div>`}
    </div>

    <br>
    <div class="panel">
      <h3>Laboratory System Audit Log</h3>
      <p class="muted">Immutable chronological record of all administrative approvals, issuances, returns, and inventory modifications.</p>
      ${cache.events.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>TIMESTAMP</th><th>AUDIT ACTION DESCRIPTION</th></tr></thead>
            <tbody>
              ${cache.events.map(e => `<tr>
                <td style="white-space:nowrap;"><small>${formatDate(e.created_at)} ${new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></td>
                <td>${esc(e.description)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty">No recent audit log entries recorded.</div>'}
    </div>
  `;

  $('#activity-scan-btn')?.addEventListener('click', scanModal);
  c.querySelectorAll('[data-return]').forEach(b => b.onclick = () => returnLoan(b.dataset.return));
  c.querySelectorAll('[data-damage]').forEach(b => b.onclick = () => damageLoan(b.dataset.damage));
}

function renderSettings(c) {
  if (!isAdmin()) {
    c.innerHTML = `
      <div class="empty" style="padding: 60px 20px;">
        <h3>Access Restricted</h3>
        <p class="muted">Administrative privileges are required to configure laboratory policies and automated workflows.</p>
      </div>
    `;
    return;
  }

  const s = adminSettings;
  const lastRunFormatted = s.lastAutomationRun 
    ? `${formatDate(s.lastAutomationRun)} at ${new Date(s.lastAutomationRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` 
    : 'Awaiting scheduled cycle';
  const lastUpdatedFormatted = s.updatedAt 
    ? `${formatDate(s.updatedAt)} at ${new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
    : 'System Default';

  c.innerHTML = `
    <div class="welcome-row">
      <div>
        <h3>Laboratory Administration & Automated Governance</h3>
        <p>Configure automated cancellation timeouts, student borrowing policies, return reminder thresholds, and notification dispatches. Settings are synchronized with Supabase and enforced system-wide.</p>
      </div>
    </div>

    <!-- Automation Engine Telemetry Banner -->
    <div class="automation-banner">
      <div class="automation-banner-info">
        <h4><span style="font-size: 20px;">⚙️</span> Automated Background Engine</h4>
        <p>LabSync runs continuous server-side automation to evaluate overdue loans, cancel stale pending requests, and void uncollected approved equipment to safeguard hardware availability.</p>
        <div class="automation-stats-row">
          <span class="automation-stat-badge">Engine Status: <b>Active (Interval & On-Demand)</b></span>
          <span class="automation-stat-badge">Last Cycle: <b>${lastRunFormatted}</b></span>
          <span class="automation-stat-badge">Items Processed: <b>${s.lastAutomationCount ?? 0}</b></span>
          ${s.lastAutomationError ? `<span class="automation-stat-badge" style="border-color: var(--danger); color: var(--danger);">Error: ${esc(s.lastAutomationError)}</span>` : ''}
        </div>
      </div>
      <div>
        <button class="btn secondary sm" id="btn-run-automation" title="Execute background cancellation pass immediately">
          ⚡ Run Check Now
        </button>
      </div>
    </div>

    <div class="settings-grid">
      <!-- Section A: Booking Automation Settings -->
      <div class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <h4><span>📋</span> A. Booking Expiry & Stock Protection Rules</h4>
            <p>Automatically cancel inactive requests to prevent inventory lockups without staff intervention.</p>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Auto-Cancel Expired Pending Requests</h5>
            <p>Automatically mark pending booking requests as cancelled if laboratory staff have not reviewed them within the designated expiry period.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-auto-cancel-pending" ${s.autoCancelPendingEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Pending Request Expiry Duration (Days)</h5>
            <p>Number of calendar days after submission before an unreviewed request expires (Default: 3 days).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-pending-days" class="settings-num-input" min="1" max="30" value="${s.pendingExpiryDays ?? 3}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">days</span>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Auto-Cancel Approved Uncollected Equipment</h5>
            <p>Automatically void approved bookings if the student does not physically collect the component within the pickup window. Restores component available stock atomically.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-auto-cancel-approved" ${s.autoCancelApprovedEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Uncollected Pickup Expiry Window (Hours)</h5>
            <p>Maximum hours permitted for a student to collect hardware from the laboratory desk after approval (Default: 24 hours).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-approved-hours" class="settings-num-input" min="1" max="168" value="${s.approvedExpiryHours ?? 24}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">hours</span>
          </div>
        </div>
      </div>

      <!-- Section B: Return and Overdue Settings -->
      <div class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <h4><span>⏱️</span> B. Return Circulation & Overdue Enforcement</h4>
            <p>Configure equipment loan durations, advance reminder timing, and physical inspection rules.</p>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Default Equipment Loan Duration</h5>
            <p>Standard borrowing period assigned when lab staff issues approved hardware to a student (Default: 7 days).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-loan-duration" class="settings-num-input" min="1" max="60" value="${s.defaultLoanDurationDays ?? 7}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">days</span>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Advance Return Reminder Window</h5>
            <p>Days prior to the scheduled due date when in-app warning notifications are dispatched to the borrower (Default: 1 day).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-return-reminder" class="settings-num-input" min="1" max="7" value="${s.returnReminderDays ?? 1}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">days before</span>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Overdue Notification Dispatch Frequency</h5>
            <p>Cadence for issuing overdue alerts to students who hold past-due laboratory apparatus.</p>
          </div>
          <div class="settings-control">
            <select id="set-overdue-freq" class="settings-select">
              <option value="daily" ${s.overdueFrequency === 'daily' ? 'selected' : ''}>Once Daily</option>
              <option value="hourly" ${s.overdueFrequency === 'hourly' ? 'selected' : ''}>Every 6 Hours</option>
              <option value="realtime" ${s.overdueFrequency === 'realtime' ? 'selected' : ''}>Real-Time On Login</option>
            </select>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Overdue Status Detection Mode</h5>
            <p>Tolerance window before a loan is formally marked overdue in system audits and student profiles.</p>
          </div>
          <div class="settings-control">
            <select id="set-overdue-mode" class="settings-select">
              <option value="immediate" ${s.overdueDetection === 'immediate' ? 'selected' : ''}>Immediate (0h grace period)</option>
              <option value="grace12" ${s.overdueDetection === 'grace12' ? 'selected' : ''}>12-Hour Grace Period</option>
              <option value="grace24" ${s.overdueDetection === 'grace24' ? 'selected' : ''}>24-Hour Grace Period</option>
            </select>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Mandatory Damage Description Protocol</h5>
            <p>Require laboratory staff to document defect descriptions whenever marking an asset as damaged on return.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-require-damage-note" ${s.requireDamageNote !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Section C: Student Booking Restrictions -->
      <div class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <h4><span>🛡️</span> C. Student Quotas & Borrowing Governance</h4>
            <p>Enforce fair hardware allocation limits and prevent delinquent students from booking items.</p>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Maximum Active Bookings & Loans Per Student</h5>
            <p>Upper limit of concurrent active items (pending, approved, or issued) permitted per student account (Default: 3).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-max-bookings" class="settings-num-input" min="1" max="10" value="${s.maxActiveBookingsPerStudent ?? 3}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">items</span>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Maximum Quantity Per Booking Request</h5>
            <p>Maximum units of a single component allowed in a single requisition request (Default: 1).</p>
          </div>
          <div class="settings-control">
            <input type="number" id="set-max-qty" class="settings-num-input" min="1" max="5" value="${s.maxQuantityPerBooking ?? 1}">
            <span class="muted" style="font-size: 12px; font-weight: 600;">unit(s)</span>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Allow Student Self-Cancellation (Pending Requests)</h5>
            <p>Permit students to revoke their own pending booking requests prior to staff review.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-cancel-pending" ${s.allowStudentCancelPending !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Allow Student Self-Cancellation (Approved Bookings)</h5>
            <p>Permit students to cancel approved reservations before collection, immediately releasing reserved inventory back to shelves.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-cancel-approved" ${s.allowStudentCancelApproved !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Block Requisitions for Students with Overdue Hardware</h5>
            <p>Strictly block new booking requests if the student currently holds unreturned past-due laboratory equipment.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-block-overdue" ${s.blockIfOverdue !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Section D: Notification Settings -->
      <div class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <h4><span>🔔</span> D. In-App Notification Dispatch Matrix</h4>
            <p>Control which operational milestones generate in-app alert badges and notification bell items.</p>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Booking Submission Alerts</h5>
            <p>Send in-app notification when a new requisition is registered in the laboratory queue.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-booking" ${s.notifyOnBooking !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Approval & Ready-for-Pickup Alerts</h5>
            <p>Notify students immediately when their equipment requisition has been approved by laboratory staff.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-approval" ${s.notifyOnApproval !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Rejection & Cancellation Alerts</h5>
            <p>Notify students when an equipment request is declined or expired by the automated background engine.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-rejection" ${s.notifyOnRejection !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Advance Return Reminders</h5>
            <p>Dispatch reminder alerts to students approaching their scheduled return deadlines.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-return-reminder" ${s.notifyOnReturnReminder !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Overdue Delinquency Notifications</h5>
            <p>Issue high-priority in-app alerts when issued laboratory assets pass their scheduled return due date.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-overdue" ${s.notifyOnOverdue !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <h5>Component Damage & Quarantine Alerts</h5>
            <p>Log and notify staff when hardware is flagged with physical defects upon return.</p>
          </div>
          <div class="settings-control">
            <label class="switch">
              <input type="checkbox" id="set-notify-damage" ${s.notifyOnDamage !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Section E: Settings Management Bar (Sticky Bottom) -->
    <div class="settings-footer-bar">
      <div class="settings-meta-text">
        <span>🕒 Last Modified: <b>${lastUpdatedFormatted}</b></span>
        <span>•</span>
        <span>👤 Administrator: <b>${esc(s.updatedBy || 'admin')}</b></span>
      </div>
      <div class="settings-actions-group">
        <button class="btn secondary" id="btn-reset-settings" type="button">
          ↺ Reset to Defaults
        </button>
        <button class="btn primary" id="btn-save-settings" type="button">
          💾 Save Administrative Settings
        </button>
      </div>
    </div>
  `;

  // Bind Event Listeners
  // 1. Run Automation Now
  const runBtn = $('#btn-run-automation');
  if (runBtn) {
    runBtn.onclick = async () => {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>⏳</span> Processing...';
      try {
        const res = await triggerAutomationRun();
        toast(`Automation complete: ${res.totalCancelled ?? 0} request(s) processed.`);
        renderSettings(c);
      } catch (err) {
        toast(err.message || 'Automation execution failed.', true);
        runBtn.disabled = false;
        runBtn.innerHTML = '⚡ Run Check Now';
      }
    };
  }

  // 2. Save Settings
  const saveBtn = $('#btn-save-settings');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>⏳</span> Saving...';

      const pendingDays = parseInt($('#set-pending-days')?.value, 10) || 3;
      const approvedHours = parseInt($('#set-approved-hours')?.value, 10) || 24;
      const loanDuration = parseInt($('#set-loan-duration')?.value, 10) || 7;
      const returnReminder = parseInt($('#set-return-reminder')?.value, 10) || 1;
      const maxBookings = parseInt($('#set-max-bookings')?.value, 10) || 3;
      const maxQty = parseInt($('#set-max-qty')?.value, 10) || 1;

      const newSettings = {
        autoCancelPendingEnabled: $('#set-auto-cancel-pending')?.checked ?? true,
        pendingExpiryDays: Math.max(1, Math.min(30, pendingDays)),
        autoCancelApprovedEnabled: $('#set-auto-cancel-approved')?.checked ?? true,
        approvedExpiryHours: Math.max(1, Math.min(168, approvedHours)),

        defaultLoanDurationDays: Math.max(1, Math.min(60, loanDuration)),
        returnReminderDays: Math.max(1, Math.min(7, returnReminder)),
        overdueFrequency: $('#set-overdue-freq')?.value || 'daily',
        overdueDetection: $('#set-overdue-mode')?.value || 'immediate',
        requireDamageNote: $('#set-require-damage-note')?.checked ?? true,

        maxActiveBookingsPerStudent: Math.max(1, Math.min(10, maxBookings)),
        maxQuantityPerBooking: Math.max(1, Math.min(5, maxQty)),
        allowStudentCancelPending: $('#set-cancel-pending')?.checked ?? true,
        allowStudentCancelApproved: $('#set-cancel-approved')?.checked ?? true,
        blockIfOverdue: $('#set-block-overdue')?.checked ?? true,

        notifyOnBooking: $('#set-notify-booking')?.checked ?? true,
        notifyOnApproval: $('#set-notify-approval')?.checked ?? true,
        notifyOnRejection: $('#set-notify-rejection')?.checked ?? true,
        notifyOnCollectionReminder: true,
        notifyOnReturnReminder: $('#set-notify-return-reminder')?.checked ?? true,
        notifyOnOverdue: $('#set-notify-overdue')?.checked ?? true,
        notifyOnDamage: $('#set-notify-damage')?.checked ?? true
      };

      try {
        await saveAdminSettingsToServer(newSettings);
        toast('Administrative settings saved to Supabase successfully!');
        renderSettings(c);
      } catch (err) {
        toast('Failed to save settings: ' + (err.message || 'Server error'), true);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Save Administrative Settings';
      }
    };
  }

  // 3. Reset Settings to Defaults
  const resetBtn = $('#btn-reset-settings');
  if (resetBtn) {
    resetBtn.onclick = () => {
      modal(
        'Reset Administrative Settings to Defaults',
        `<p>Are you sure you want to restore all laboratory booking policies, cancellation thresholds, and notification rules to standard university defaults?</p>
         <p class="muted" style="margin-top: 8px;">This will reset pending request expiry to 3 days, uncollected pickup window to 24 hours, and standard loan duration to 7 days across all devices.</p>`,
        'Confirm Reset to Defaults',
        async () => {
          try {
            await saveAdminSettingsToServer(DEFAULT_ADMIN_SETTINGS);
            toast('Laboratory settings restored to defaults.');
            renderSettings(c);
          } catch (err) {
            toast('Failed to reset settings: ' + (err.message || 'Error'), true);
          }
        }
      );
    };
  }
}

function modal(title, body, submitText, handler, cancelText = 'Cancel', onClose = null) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">
    <h3>${title}</h3>
    ${body}
    <div class="modal-actions">
      <button class="btn secondary" data-close type="button">${cancelText}</button>
      ${submitText ? `<button class="btn primary" data-submit type="button">${submitText}</button>` : ''}
    </div>
  </div>`;

  const originalRemove = wrap.remove.bind(wrap);
  let closed = false;
  const closeFn = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown);
    if (typeof onClose === 'function') {
      try { onClose(); } catch {}
    }
    originalRemove();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeFn();
  };
  document.addEventListener('keydown', onKeyDown);

  wrap.remove = closeFn;
  document.body.append(wrap);
  wrap.querySelector('[data-close]').onclick = closeFn;
  wrap.onclick = e => { if (e.target === wrap) closeFn(); };

  // Allow enter inside text inputs of form to submit modal
  const form = wrap.querySelector('form');
  if (form && submitText) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      wrap.querySelector('[data-submit]')?.click();
    });
  }

  if (submitText && handler) {
    wrap.querySelector('[data-submit]').onclick = async () => {
      const submitBtn = wrap.querySelector('[data-submit]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
      }
      try {
        await handler(wrap);
        closeFn();
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
        toast(err.message || 'Something went wrong', true);
      }
    };
  }

  return wrap;
}

function equipmentModal(item = null) {
  const meta = item ? getEquipmentMeta(item.asset_code, item) : null;
  const body = `
    <form id="equipment-form">
      <label>Equipment / Component Name
        <input name="name" required value="${esc(item?.name || '')}" placeholder="e.g. Arduino Uno R3 or ESP32 DevKit V1" />
      </label>
      <div class="form-grid">
        <label>Unique Asset Code (Inventory Barcode Tag)
          <input name="asset_code" required value="${esc(item?.asset_code || '')}" placeholder="LS-1001" ${item ? 'readonly style="background:#f3f5f4;"' : ''} />
        </label>
        <label>Laboratory Category
          <input name="category" required value="${esc(item?.category || '')}" placeholder="Development Board / Sensors / Power" />
        </label>
      </div>
      <div class="form-grid">
        <label>Total Inventory Units (Stock)
          <input name="total_quantity" type="number" min="1" required value="${item?.total_quantity || 1}" />
        </label>
        <label>Symbol / Emoji
          <input name="icon" value="${esc(item?.icon || '📦')}" maxlength="4" placeholder="📦" />
        </label>
      </div>
      <label>Technical Specifications & Pins
        <input name="specs" value="${esc(meta?.specs || '')}" placeholder="MCU, clock speed, voltage, pin headers..." />
      </label>
      <label>Detailed Laboratory Description
        <input name="description" value="${esc(item?.description || meta?.description || '')}" placeholder="Detailed functional description for student guidance" />
      </label>
    </form>
  `;

  modal(item ? 'Edit Equipment Specifications' : 'Add New Equipment to Inventory', body, item ? 'Save Changes' : 'Add to Inventory', async w => {
    const f = new FormData(w.querySelector('form'));
    const data = Object.fromEntries(f);
    data.total_quantity = Number(data.total_quantity);

    if (item) {
      const issuedCount = item.total_quantity - item.available_quantity;
      if (data.total_quantity < issuedCount) {
        throw new Error(`Total quantity cannot be lower than ${issuedCount} units currently issued on loan.`);
      }
      data.available_quantity = data.total_quantity - issuedCount;
      const { error } = await supabase.from('equipment').update({
        name: data.name,
        category: data.category,
        total_quantity: data.total_quantity,
        available_quantity: data.available_quantity,
        icon: data.icon,
        description: data.description
      }).eq('id', item.id);
      if (error) throw error;
      await logActivity(`Updated equipment specs for ${data.name} (${item.asset_code})`);
    } else {
      data.asset_code = data.asset_code.trim().toUpperCase();
      const existing = cache.equipment.find(e => e.asset_code.toUpperCase() === data.asset_code);
      if (existing) throw new Error(`Asset code ${data.asset_code} already exists in inventory!`);
      data.available_quantity = data.total_quantity;
      const { error } = await supabase.from('equipment').insert({
        name: data.name,
        asset_code: data.asset_code,
        category: data.category,
        total_quantity: data.total_quantity,
        available_quantity: data.available_quantity,
        icon: data.icon,
        description: data.description
      });
      if (error) throw error;
      await logActivity(`Cataloged new laboratory equipment: ${data.name} (${data.asset_code})`);
    }

    await reload();
    toast('Equipment record saved successfully.');
  });
}

async function deleteEquipmentSafely(equipmentId) {
  const item = cache.equipment.find(x => x.id === equipmentId);
  if (!item) return;

  const activeLoans = cache.loans.filter(l => l.equipment_id === equipmentId && l.status === 'issued');
  if (activeLoans.length > 0) {
    toast(`Safety lock: Cannot delete ${item.name} while there are ${activeLoans.length} active issued loan(s)!`, true);
    return;
  }

  const pendingRequests = cache.requests.filter(r => r.equipment_id === equipmentId && r.status === 'pending');
  if (pendingRequests.length > 0) {
    toast(`Safety lock: Cannot delete ${item.name} while there are ${pendingRequests.length} pending requisition(s)!`, true);
    return;
  }

  if (!confirm(`Confirm Deletion: Are you sure you want to permanently remove "${item.name}" (${item.asset_code}) from the laboratory catalogue?`)) return;

  const { error } = await supabase.from('equipment').delete().eq('id', equipmentId);
  if (error) {
    toast(error.message, true);
    return;
  }

  await logActivity(`Deleted laboratory equipment asset: ${item.name} (${item.asset_code})`);
  await reload();
  toast(`Removed ${item.name} safely.`);
}

async function requestEquipment(id) {
  const item = cache.equipment.find(x => x.id === id);
  if (!item || item.available_quantity < 1) {
    toast('Sorry, this equipment unit is currently fully checked out.', true);
    return;
  }

  // Student quota & restriction checks based on administrative settings
  const activeReqs = cache.requests.filter(r => r.user_id === session?.user?.id && (r.status === 'pending' || r.status === 'approved')).length;
  const activeLoans = cache.loans.filter(l => l.user_id === session?.user?.id && l.status === 'issued').length;
  const totalActive = activeReqs + activeLoans;
  const maxAllowed = Number(adminSettings.maxActiveBookingsPerStudent) || 3;
  if (totalActive >= maxAllowed) {
    toast(`Quota Reached: You already hold ${totalActive} active requisition(s)/loan(s). The maximum allowed concurrent quota is ${maxAllowed}. Return borrowed items or wait for pending reviews before requesting more.`, true);
    return;
  }

  if (adminSettings.blockIfOverdue) {
    const hasOverdue = cache.loans.some(l => l.user_id === session?.user?.id && l.status === 'issued' && new Date(l.due_at) < new Date());
    if (hasOverdue) {
      toast('Action Blocked: You currently hold overdue equipment. Institutional rules require returning overdue items at the lab desk before submitting new requisitions.', true);
      return;
    }
  }

  const meta = getEquipmentMeta(item.asset_code, item);
  const defaultLoanDays = Number(adminSettings.defaultLoanDurationDays) || 7;
  const defaultReturn = new Date(Date.now() + defaultLoanDays * 86400000).toISOString().slice(0, 10);
  const body = `
    <form id="request-form">
      <div class="notice" style="margin-bottom:14px;background:#f0f8f5;border-color:#bce0d6;">
        <b>Requisitioning:</b> ${esc(item.name)} (<span class="code-tag">${esc(item.asset_code)}</span>)<br>
        <small>Current ready stock: <b>${item.available_quantity}</b> of ${item.total_quantity} units available · Shelf: ${esc(meta.shelf)}</small>
      </div>
      <label>Experiment / Academic Project Purpose
        <input name="purpose" required placeholder="e.g. Embedded Systems Lab Exp-4: Sensor Telemetry or IoT Smart Irrigation" />
      </label>
      <label>Scheduled Return Date (Standard Loan: ${defaultLoanDays} days)
        <input name="return_date" type="date" min="${new Date().toISOString().slice(0, 10)}" value="${defaultReturn}" required />
      </label>
      <div class="muted" style="font-size:11px;margin-top:8px;">
        By submitting this requisition, you agree to inspect component pins and return all cables and modules in good operational condition.
      </div>
    </form>
  `;

  modal('Submit Equipment Booking Requisition', body, 'Submit Requisition', async w => {
    const f = Object.fromEntries(new FormData(w.querySelector('form')));
    const { error } = await supabase.from('booking_requests').insert({
      equipment_id: id,
      user_id: session.user.id,
      purpose: f.purpose.trim(),
      requested_return_date: f.return_date,
      status: 'pending'
    });
    if (error) throw error;
    await logActivity(`Student submitted booking request for ${item.name}`);
    await reload();
    toast('Requisition submitted! Awaiting laboratory administrator approval.');
  });
}

async function cancelBookingRequest(requestId) {
  const r = cache.requests.find(x => x.id === requestId);
  if (!r) return;

  if (r.status === 'pending' && !adminSettings.allowStudentCancelPending && !isAdmin()) {
    toast('Administrative policy restricts students from cancelling pending requisitions.', true);
    return;
  }
  if (r.status === 'approved' && !adminSettings.allowStudentCancelApproved && !isAdmin()) {
    toast('Approved bookings cannot be retracted once stock has been allocated.', true);
    return;
  }

  const label = r.status === 'approved' ? 'approved uncollected booking' : 'pending requisition';
  if (!confirm(`Are you sure you want to cancel your ${label} for "${r.equipment?.name || 'Equipment'}"?`)) return;

  const { error } = await supabase.from('booking_requests').update({
    status: 'cancelled',
    purpose: (r.purpose || '') + ' [Cancelled by student]'
  }).eq('id', requestId);
  if (error) {
    toast(error.message, true);
    return;
  }

  // If cancelling an approved booking, release the uncollected loan and restore inventory atomically
  if (r.status === 'approved') {
    const linkedLoan = cache.loans.find(l => l.request_id === r.id);
    if (linkedLoan && linkedLoan.status === 'issued' && !linkedLoan.returned_at) {
      await supabase.from('loans').delete().eq('id', linkedLoan.id);
      const eq = cache.equipment.find(e => e.id === r.equipment_id);
      if (eq) {
        const restored = Math.min(Number(eq.total_quantity) || 1, (Number(eq.available_quantity) || 0) + 1);
        await supabase.from('equipment').update({ available_quantity: restored }).eq('id', eq.id);
      }
    }
  }

  await logActivity(`Student cancelled ${r.status} requisition for ${r.equipment?.name || 'equipment'}`);
  await reload();
  toast('Requisition cancelled successfully.');
}

async function updateRequest(id, status) {
  const r = cache.requests.find(x => x.id === id);
  if (!r) return;

  if (status === 'approved') {
    const defaultDays = Number(adminSettings.defaultLoanDurationDays) || 7;
    const calcDue = new Date(Date.now() + defaultDays * 86400000).toISOString().slice(0, 10);
    const defaultDue = r.requested_return_date || calcDue;
    const body = `
      <p class="muted">Approve booking and assign <b>${esc(r.equipment?.name || 'Equipment')}</b> to student <b>${esc(r.profiles?.full_name || 'Student')}</b> (USN: <code>${esc(r.profiles?.usn || '—')}</code>)?</p>
      <label>Approved Equipment Return Due Date
        <input id="approve-due" type="date" min="${new Date().toISOString().slice(0, 10)}" value="${defaultDue}" required />
      </label>
      <div class="notice" style="margin-top:12px;font-size:11px;">
        Approving this request will atomically decrement available inventory by 1 unit and generate an active loan record.
      </div>
    `;

    modal('Approve Booking & Issue Hardware', body, 'Approve & Issue Hardware', async w => {
      const due = w.querySelector('#approve-due').value;
      if (!due) throw new Error('Please select a valid return due date.');

      const { error } = await supabase.rpc('approve_booking', {
        p_request_id: id,
        p_due_at: due
      });
      if (error) throw error;

      await logActivity(`Approved requisition & issued ${r.equipment?.name || 'equipment'} to ${r.profiles?.full_name || 'student'}`);
      await reload();
      toast('Approved! Equipment successfully issued and stock updated.');
    });
  } else {
    if (!confirm(`Reject equipment requisition for "${r.equipment?.name || 'equipment'}"?`)) return;
    const { error } = await supabase.from('booking_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) throw error;
    await logActivity(`Rejected booking requisition for ${r.equipment?.name || 'equipment'}`);
    await reload();
    toast('Requisition rejected.');
  }
}

async function approveStudent(id, status) {
  const s = cache.profiles.find(p => p.id === id);
  if (!s) return;
  if (ADMIN_EMAILS.includes(s.email?.toLowerCase())) {
    toast('Safety lock: Administrator permissions cannot be modified.', true);
    return;
  }
  const actionLabel = status === 'approved' 
    ? (s.status === 'rejected' ? 're-approve' : 'approve enrollment for')
    : (s.status === 'approved' ? 'revoke access for' : 'reject registration of');

  if (!confirm(`Confirm: ${actionLabel.toUpperCase()} "${s.full_name || 'student'}" (${s.email})?`)) return;

  const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
  if (error) {
    toast(error.message || 'Failed to update student status', true);
    return;
  }

  await logActivity(`${status === 'approved' ? 'Approved' : 'Rejected/Revoked'} student registration for ${s.full_name || s.email}`);
  await reload();
  toast(`Student account ${status === 'approved' ? 'approved successfully' : 'access revoked'}.`);
}

async function returnLoan(id) {
  const loan = cache.loans.find(l => l.id === id);
  if (!confirm(`Confirm return of "${loan?.equipment?.name || 'equipment'}" from student ${loan?.profiles?.full_name || 'student'} in GOOD operational condition?`)) return;

  const { error } = await supabase.rpc('return_loan', {
    p_loan_id: id,
    p_damaged: false,
    p_note: null
  });
  if (error) throw error;

  await logActivity(`Recorded equipment return for ${loan?.equipment?.name || 'equipment'} (Good condition)`);
  await reload();
  toast('Return recorded successfully! Available stock incremented.');
}

async function damageLoan(id) {
  const loan = cache.loans.find(l => l.id === id);
  const promptMsg = adminSettings.requireDamageNote !== false
    ? `Describe the component damage or physical defect for "${loan?.equipment?.name || 'equipment'}" (mandatory laboratory protocol):`
    : `Describe the component damage or physical defect for "${loan?.equipment?.name || 'equipment'}" (optional):`;
  const note = prompt(promptMsg);
  if (adminSettings.requireDamageNote !== false && (!note || !note.trim())) {
    toast('Damage report cancelled: physical damage description is required by laboratory protocol.', true);
    return;
  }
  const finalNote = (note && note.trim()) ? note.trim() : 'Flagged damaged upon laboratory return';

  const { error } = await supabase.rpc('return_loan', {
    p_loan_id: id,
    p_damaged: true,
    p_note: finalNote
  });
  if (error) throw error;

  await logActivity(`Reported damaged equipment: ${loan?.equipment?.name || 'equipment'} - ${finalNote}`);
  await reload();
  toast('Damage report recorded. Component held out of circulation.');
}

async function logActivity(description) {
  if (!session?.user?.id) return;
  const { error } = await supabase.from('activity_log').insert({ description });
  if (error && !String(error.message).includes('activity_log')) console.warn('Activity log error:', error);
}

async function reload() {
  await refreshData();
  setUserHeader();
  renderPage();
}

function qrModal(id) {
  const e = cache.equipment.find(x => x.id === id);
  if (!e) return;

  const meta = getEquipmentMeta(e.asset_code, e);
  const assetUrl = `${location.origin}/?asset=${encodeURIComponent(e.asset_code)}`;

  const body = `
    <div class="modal-detail-img-wrap">
      <img src="${meta.image}" alt="${esc(e.name)}" class="modal-detail-img" onerror="this.src='/images/equipment/arduino-uno.svg'" />
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span class="equipment-cat-tag">${esc(e.category || 'Electronics')}</span>
      <span class="code-tag">${esc(e.asset_code)}</span>
    </div>

    <h3 style="margin:0 0 6px;font:700 18px 'Space Grotesk',sans-serif;color:#1e2d27;">${esc(e.name)}</h3>
    <p style="font-size:12px;color:#53645c;line-height:1.6;margin:0 0 10px;">${esc(meta.description)}</p>

    <div class="detail-section">
      <h5>Technical Specifications</h5>
      <p>${esc(meta.specs)}</p>
    </div>

    <div class="detail-section">
      <h5>Academic Laboratory Usage & Project Suitability</h5>
      <p>${esc(meta.applications)}</p>
    </div>

    <div class="detail-section">
      <h5>Component Safety & Handling Guidelines</h5>
      <p>${esc(meta.safety)}</p>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;font-size:12px;">
      <span><b>Storage Location:</b> ${esc(meta.shelf)}</span>
      <span><b>Live Stock:</b> ${e.available_quantity} / ${e.total_quantity} units</span>
    </div>

    <div class="qr-preview-box">
      <div id="qr-target"></div>
      <p style="font-size:11px;color:#718279;margin:8px 0 0;">Scan QR code with LabSync camera scanner to verify inventory status.</p>
      <div class="qr-preview-actions">
        <button class="btn primary full" id="dl-qr-btn">Download QR (.png)</button>
        <button class="btn secondary full" id="print-qr-btn">Print QR Asset Tag</button>
      </div>
      <button class="link-btn" id="copy-asset-link" style="margin-top:8px;">Copy Asset Link</button>
    </div>
  `;

  const w = modal(`Asset Details & QR: ${esc(e.name)}`, body, 'Done', async () => {});

  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, assetUrl, { width: 220, margin: 2, color: { dark: '#111b2d', light: '#ffffff' } }, err => {
    if (!err) {
      w.querySelector('#qr-target').replaceChildren(canvas);
    } else {
      w.querySelector('#qr-target').textContent = e.asset_code;
    }
  });

  w.querySelector('#dl-qr-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${e.asset_code}_QR.png`;
    a.click();
    toast('Asset QR Code downloaded.');
  };

  w.querySelector('#print-qr-btn').onclick = () => {
    const dataUrl = canvas.toDataURL('image/png');
    const printWin = window.open('', '_blank', 'width=440,height=560');
    if (!printWin) {
      toast('Pop-up blocked. Please allow pop-ups to print QR label.', true);
      return;
    }
    printWin.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>Asset Label - ${esc(e.asset_code)}</title>
        <style>
          body { font-family: 'DM Sans', system-ui, sans-serif; text-align: center; padding: 25px; color: #172033; }
          .tag-card { border: 2px dashed #087f75; border-radius: 12px; padding: 22px; width: 300px; margin: 0 auto; box-sizing: border-box; }
          .tag-brand { font-size: 13px; font-weight: 700; color: #087f75; letter-spacing: 1px; }
          h2 { margin: 8px 0 4px; font-size: 18px; line-height: 1.2; }
          .code { font-family: monospace; font-size: 14px; background: #e8f4f0; padding: 3px 8px; border-radius: 4px; display: inline-block; font-weight: 700; margin: 6px 0; }
          img { margin: 10px 0; width: 170px; height: 170px; }
          .cat { font-size: 11px; color: #555; text-transform: uppercase; }
          .footer { font-size: 9px; color: #888; margin-top: 10px; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="tag-card">
          <div class="tag-brand">LABSYNC LABORATORY ASSET</div>
          <h2>${esc(e.name)}</h2>
          <div class="code">${esc(e.asset_code)}</div>
          <br>
          <img src="${dataUrl}" alt="QR Code" />
          <div class="cat">${esc(e.category || 'General')} · ${esc(meta.shelf)}</div>
          <div class="footer">Scan with LabSync to verify inventory & loans</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  w.querySelector('#copy-asset-link').onclick = () => {
    const copyToClipboard = (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (success) return Promise.resolve();
          return Promise.reject(new Error('execCommand failed'));
        } catch (err) {
          document.body.removeChild(textarea);
          return Promise.reject(err);
        }
      }
    };

    copyToClipboard(assetUrl)
      .then(() => toast('Asset link copied to clipboard.'))
      .catch(() => toast('Could not copy link automatically. URL: ' + assetUrl, true));
  };
}

function scanModal() {
  const datalistOptions = cache.equipment.map(e => `<option value="${esc(e.asset_code)}">${esc(e.name)} (${esc(e.asset_code)})</option>`).join('');

  const body = `
    <p class="muted">Point camera at an equipment QR label, or use the manual asset code lookup below.</p>
    <div id="qr-reader" style="width:100%;min-height:220px;background:#f8faf9;border-radius:10px;overflow:hidden;"></div>
    <div id="scan-warning" class="muted" style="font-size:11px;color:#c25353;margin-top:6px;"></div>

    <div class="lookup-box">
      <h4>Manual Asset Code Lookup (Camera Fallback)</h4>
      <div style="display:flex;gap:8px;">
        <input id="manual-asset-input" list="equipment-datalist" placeholder="e.g. LS-1001, LS-1002..." autocomplete="off" style="margin:0;" />
        <datalist id="equipment-datalist">${datalistOptions}</datalist>
        <button class="btn primary" id="lookup-btn" type="button" style="white-space:nowrap;">Look Up</button>
      </div>
    </div>

    <div id="scan-result" style="margin-top:12px;"></div>
  `;

  function wrapCleanup() {
    if (scannerInstance) {
      scannerInstance.stop().catch(() => {});
      scannerInstance = null;
    }
  }

  const w = modal('Identify Equipment (QR / Asset Code)', body, null, null, 'Close Scanner', wrapCleanup);

  const displayFoundEquipment = (assetCode) => {
    const code = String(assetCode || '').trim().toUpperCase();
    const found = cache.equipment.find(e => e.asset_code.toUpperCase() === code);
    const resultBox = w.querySelector('#scan-result');
    if (!resultBox) return;

    if (!found) {
      resultBox.innerHTML = `<div class="notice" style="border-color:#e88a8a;background:#fff5f5;color:#9b2e2e;">
        Asset code "<b>${esc(code)}</b>" not found in LabSync catalogue.
      </div>`;
      return;
    }

    const meta = getEquipmentMeta(found.asset_code, found);
    const activeItemLoans = cache.loans.filter(l => l.equipment_id === found.id && l.status === 'issued');

    resultBox.innerHTML = `
      <div class="panel" style="background:#f3f8f6;border-color:#b9ded4;">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${meta.image}" alt="${esc(found.name)}" style="width:50px;height:50px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;border:1px solid #d0e5df;" onerror="this.src='/images/equipment/arduino-uno.svg'" />
          <div>
            <h4 style="margin:0 0 4px;color:#087f75;">✓ Identified: ${esc(found.name)}</h4>
            <p style="margin:0;font-size:12px;">
              Asset Code: <span class="code-tag">${esc(found.asset_code)}</span> · Category: ${esc(found.category || 'General')}<br>
              Current Stock: <b>${found.available_quantity}</b> available of ${found.total_quantity} units
            </p>
          </div>
        </div>

        ${isAdmin() ? `
          ${activeItemLoans.length ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #d2e7e1;">
              <strong style="font-size:12px;">Active Loans for this unit (${activeItemLoans.length}):</strong>
              ${activeItemLoans.map(l => `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;">
                  <span>${esc(l.profiles?.full_name || 'Student')} (Due: ${formatDate(l.due_at)})</span>
                  <button class="btn primary small-btn" data-quick-return="${l.id}">Mark Returned</button>
                </div>
              `).join('')}
            </div>
          ` : '<p class="muted" style="font-size:11px;margin:6px 0 0;">No active issued loans for this equipment unit.</p>'}
        ` : `
          <div style="margin-top:10px;">
            ${found.available_quantity > 0 ? `
              <button class="btn primary small-btn" data-quick-request="${found.id}">Request This Equipment</button>
            ` : '<span class="pill red">Currently Out of Stock</span>'}
          </div>
        `}
      </div>
    `;

    resultBox.querySelectorAll('[data-quick-return]').forEach(b => {
      b.onclick = async () => {
        w.remove();
        await returnLoan(b.dataset.quickReturn);
      };
    });

    resultBox.querySelectorAll('[data-quick-request]').forEach(b => {
      b.onclick = async () => {
        w.remove();
        await requestEquipment(b.dataset.quickRequest);
      };
    });
  };

  w.querySelector('#lookup-btn').onclick = () => {
    const val = (w.querySelector('#manual-asset-input').value || '').trim();
    if (!val) {
      toast('Please enter or select an asset code (e.g. LS-1001)', true);
      return;
    }
    displayFoundEquipment(val);
  };

  w.querySelector('#manual-asset-input').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.target.value || '').trim();
      if (!val) {
        toast('Please enter or select an asset code (e.g. LS-1001)', true);
        return;
      }
      displayFoundEquipment(val);
    }
  };

  try {
    const scanner = new Html5Qrcode('qr-reader');
    scannerInstance = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      decodedText => {
        try {
          let assetCode = decodedText;
          if (decodedText.includes('asset=')) {
            const url = new URL(decodedText);
            assetCode = url.searchParams.get('asset') || decodedText;
          }
          scanner.stop().catch(() => {});
          displayFoundEquipment(assetCode);
        } catch {
          displayFoundEquipment(decodedText);
        }
      },
      () => {}
    ).catch(err => {
      w.querySelector('#scan-warning').textContent = 'Camera unavailable or permission denied. Please use the manual lookup above.';
    });

    w.querySelector('[data-close]').onclick = () => {
      w.remove();
    };
  } catch (err) {
    w.querySelector('#scan-warning').textContent = 'Camera scanner module could not start. Please use the manual lookup above.';
  }
}

function userProfileModal() {
  if (!profile) return;

  const body = `
    <div class="profile-info-grid">
      <div class="profile-info-item"><small>Full Registered Name</small><strong>${esc(profile.full_name || '—')}</strong></div>
      <div class="profile-info-item"><small>User Role</small><strong>${isAdmin() ? 'Lab Administrator' : 'Student'}</strong></div>
      <div class="profile-info-item"><small>Account Email</small><strong>${esc(profile.email || session?.user?.email)}</strong></div>
      <div class="profile-info-item"><small>Verification Status</small>${statusPill(profile.status)}</div>
      ${!isAdmin() ? `
        <div class="profile-info-item"><small>University USN / ID</small><strong class="code-tag">${esc(profile.usn || '—')}</strong></div>
        <div class="profile-info-item"><small>Academic Department</small><strong>${esc(profile.department || '—')} (Sem ${esc(profile.semester || '—')})</strong></div>
      ` : ''}
    </div>

    <div class="panel" style="background:#fafcfb;border:1px solid #e2eae5;margin-top:14px;">
      <h4 style="margin:0 0 6px;color:#202a35;">Update Account Password</h4>
      <p class="muted" style="margin:0 0 10px;font-size:11px;">Update your password securely. Remember to store your new password safely.</p>
      <form id="change-pass-form">
        <label>New Password (min 8 characters)
          <input id="new-pass" type="password" minlength="8" required placeholder="Enter new secure password" />
        </label>
        <label>Confirm New Password
          <input id="confirm-new-pass" type="password" minlength="8" required placeholder="Re-enter new password" />
        </label>
        <button class="btn primary full" type="submit" style="margin-top:10px;">Update Password</button>
      </form>
    </div>
  `;

  const w = modal('Account Profile & Security', body, null, null, 'Close Profile');

  w.querySelector('#change-pass-form').onsubmit = async e => {
    e.preventDefault();
    const submitBtn = w.querySelector('#change-pass-form button[type="submit"]');
    const p1 = w.querySelector('#new-pass').value;
    const p2 = w.querySelector('#confirm-new-pass').value;

    if (p1.length < 8) {
      toast('Password must be at least 8 characters.', true);
      return;
    }
    if (p1 !== p2) {
      toast('Passwords do not match. Please re-enter carefully.', true);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      await logActivity('User changed their password');
      toast('Password updated successfully!');
      w.remove();
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
      }
      toast(err.message, true);
    }
  };
}

async function signIn(email, password, expectedRole) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  await loadProfile();

  if (expectedRole === 'admin' && !isAdmin()) {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    throw new Error('Access denied: this account is not an authorized laboratory administrator.');
  }

  if (expectedRole === 'student' && isAdmin()) {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    throw new Error('Please choose "Lab admin" tab to sign in with this administrator account.');
  }

  await enterApp();
}

async function enterApp() {
  await refreshData();
  showWorkspace();
  setUserHeader();
  navigate('overview');
}

async function registerStudent() {
  const full_name = $('#reg-name').value.trim();
  const usn = $('#reg-usn').value.trim().toUpperCase();
  const email = $('#reg-email').value.trim().toLowerCase();
  const department = $('#reg-dept').value;
  const semester = $('#reg-sem').value;
  const password = $('#reg-password').value;
  const confirmPassword = $('#reg-confirm-password')?.value;

  if (password.length < 8) {
    throw new Error('Please choose a password of at least 8 characters.');
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new Error('Passwords do not match. Please re-enter carefully.');
  }

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name,
      usn,
      department,
      semester
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed. Please try again.');
  }

  toast('Registration submitted! Your student account is pending administrator approval before you can sign in.');
  $('#register-form').reset();
  $('#register-form').classList.add('hidden');
  $('#login-form').classList.remove('hidden');
  $('#auth-title').textContent = 'Sign in to LabSync';
}

function initTheme() {
  const saved = localStorage.getItem('labsync_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  const btn = $('#theme-toggle');
  if (btn) {
    btn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('labsync_theme', next);
      updateThemeIcon(next);
      toast(`Switched to ${next === 'dark' ? 'Cyber Dark' : 'Studio Light'} theme`);
    };
  }
}

function updateThemeIcon(theme) {
  const btn = $('#theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = `Switch to ${theme === 'dark' ? 'Studio Light' : 'Cyber Dark'} theme`;
  }
}

async function init() {
  initTheme();
  $$('.role-tab').forEach(b => {
    b.onclick = () => {
      roleChoice = b.dataset.role;
      $$('.role-tab').forEach(x => x.classList.toggle('active', x === b));
      $('#auth-note').textContent = roleChoice === 'admin'
        ? 'Administrator access is restricted to the two configured administrator accounts.'
        : 'Student accounts require approval from a lab administrator.';
      $('#student-auth-links')?.classList.toggle('hidden', roleChoice === 'admin');
    };
  });

  if (!configured) {
    showAuth();
    toast('Setup required: add Supabase URL and anon key to .env.local', true);
    $('#login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      toast('Connect Supabase first. See SETUP.md.', true);
    });
    return;
  }

  $('#login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Signing in...';
    }
    try {
      await signIn($('#login-email').value.trim(), $('#login-password').value, roleChoice);
    } catch (err) {
      toast(err.message, true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign in <span>→</span>';
      }
    }
  });

  $('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting registration...';
    }
    try {
      await registerStudent();
    } catch (err) {
      toast(err.message, true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit registration <span>→</span>';
      }
    }
  });

  $('#show-register')?.addEventListener('click', () => {
    $('#login-form').classList.add('hidden');
    $('#register-form').classList.remove('hidden');
    $('#auth-title').textContent = 'Create Student Account';
    $('#auth-subtitle').textContent = 'Your account will be reviewed by a lab administrator.';
  });

  $$('.back-login').forEach(b => {
    b.onclick = () => {
      $('#register-form').classList.add('hidden');
      $('#login-form').classList.remove('hidden');
      $('#auth-title').textContent = 'Sign in to LabSync';
    };
  });

  $('#forgot-password')?.addEventListener('click', async () => {
    const email = $('#login-email').value.trim();
    if (!email) {
      $('#login-email')?.focus();
      toast('Please enter your email address in the field above first.', true);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (error) toast(error.message, true);
    else toast('If an account exists with this email, a reset link has been dispatched.');
  });

  $('#signout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    showAuth();
  });

  $('#refresh-btn')?.addEventListener('click', () => reload().catch(e => toast(e.message, true)));

  $('#nav')?.addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (b && !b.classList.contains('hidden')) navigate(b.dataset.page);
  });

  $('#page-content')?.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) navigate(b.dataset.go);
  });

  $('#menu-toggle')?.addEventListener('click', () => {
    const sidebar = $('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.onclick = () => {
        sidebar.classList.remove('open');
        backdrop.remove();
      };
      document.body.append(backdrop);
    } else {
      $('.sidebar-backdrop')?.remove();
    }
  });

  $('#user-profile-trigger')?.addEventListener('click', userProfileModal);
  $('#user-profile-trigger')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      userProfileModal();
    }
  });

  $('#notif-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    $('#notif-panel')?.classList.toggle('hidden');
  });

  $('#notif-mark-read')?.addEventListener('click', e => {
    e.stopPropagation();
    markAllNotificationsRead();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.notif-wrapper')) {
      $('#notif-panel')?.classList.add('hidden');
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const assetParam = urlParams.get('asset');

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    session = data.session;
    try {
      await loadProfile();
      await enterApp();

      if (assetParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          navigate('equipment');
          const found = cache.equipment.find(e => e.asset_code === assetParam);
          if (found) qrModal(found.id);
        }, 500);
      }
    } catch (e) {
      await supabase.auth.signOut();
      showAuth();
      toast(e.message, true);
    }
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (!newSession) {
      session = null;
      profile = null;
      showAuth();
    }
  });
}

function initChatbot() {
  if (document.getElementById('lab-buddy')) return;

  const root = document.createElement('div');
  root.id = 'lab-buddy';
  root.innerHTML = `
    <button class="buddy-launcher" id="buddy-launcher" type="button" aria-label="Open LabBuddy AI assistant">
      <span class="buddy-launcher-icon">✦</span>
      <span class="buddy-launcher-label">Ask LabBuddy</span>
    </button>
    <section class="buddy-panel hidden" id="buddy-panel" aria-label="LabBuddy AI chat">
      <header class="buddy-header">
        <div class="buddy-avatar">✦</div>
        <div class="buddy-heading">
          <strong>LabBuddy</strong>
          <small>Smart Laboratory AI Assistant</small>
        </div>
        <span class="buddy-online"><i></i> Gemini AI</span>
        <button class="buddy-clear" id="buddy-clear" type="button" title="Clear chat history and start fresh conversation">↻ New</button>
        <button class="buddy-close" id="buddy-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="buddy-messages" id="buddy-messages" aria-live="polite">
        <div class="buddy-message assistant">
          <b>Hello! I'm LabBuddy 👋</b><br>
          I can recommend electronics components for your college project, check real lab inventory availability, or answer questions about booking and returning equipment in LabSync.
        </div>
      </div>
      <div class="buddy-suggestions" id="buddy-suggestions">
        <button type="button" data-prompt="I want to build a smart irrigation system using IoT. What equipment do I need?">Smart Irrigation (IoT)</button>
        <button type="button" data-prompt="What sensors and development boards are currently available in the lab?">Available Sensors & Boards</button>
        <button type="button" data-prompt="How does the equipment booking and QR return process work in LabSync?">How to Book & Return?</button>
      </div>
      <form class="buddy-composer" id="buddy-form">
        <input id="buddy-input" maxlength="1200" autocomplete="off" placeholder="Describe your project or ask LabBuddy..." aria-label="Message LabBuddy" />
        <button id="buddy-send" type="submit" aria-label="Send message">➤</button>
      </form>
      <div class="buddy-footnote">Powered by Google Gemini · Verify lab inventory before submitting requests.</div>
    </section>
  `;
  document.body.append(root);

  const panel = root.querySelector('#buddy-panel');
  const messagesEl = root.querySelector('#buddy-messages');
  const input = root.querySelector('#buddy-input');
  const send = root.querySelector('#buddy-send');
  const history = [];

  const renderBubble = (text, who) => {
    const bubble = document.createElement('div');
    bubble.className = `buddy-message ${who}`;
    if (who.includes('assistant') && !who.includes('typing')) {
      let formatted = esc(text)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/^\s*[-*•]\s+(.*)$/gm, '• $1')
        .replace(/\n/g, '<br>');
      
      formatted = formatted.replace(/\b(LS-\d{4})\b/g, '<button type="button" class="buddy-asset-chip" data-buddy-asset="$1" title="Inspect $1 in catalogue">$1 🔍</button>');
      bubble.innerHTML = formatted;
    } else {
      bubble.textContent = text;
    }
    messagesEl.append(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  };

  const sendMessage = async (raw) => {
    const text = raw.trim();
    if (!text || send.disabled) return;

    root.querySelector('#buddy-suggestions')?.classList.add('hidden');
    renderBubble(text, 'user');
    history.push({ role: 'user', text });
    input.value = '';
    send.disabled = true;
    send.textContent = '…';

    const pending = renderBubble('LabBuddy is analysing...', 'assistant typing');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          equipment: (Array.isArray(cache?.equipment) ? cache.equipment : []).map(item => ({
            name: item.name,
            asset_code: item.asset_code,
            category: item.category,
            description: item.description,
            total_quantity: item.total_quantity,
            available_quantity: item.available_quantity
          }))
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'The AI assistant is temporarily unavailable.');
      }

      pending.remove();
      renderBubble(data.reply, 'assistant');
      history.push({ role: 'model', text: data.reply });
      if (history.length > 12) history.splice(0, history.length - 12);
    } catch (error) {
      pending.textContent = error.message || 'Unable to contact LabBuddy. Please try again.';
      pending.className = 'buddy-message assistant error';
    } finally {
      send.disabled = false;
      send.textContent = '➤';
      input.focus();
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  root.querySelector('#buddy-launcher').onclick = () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) input.focus();
  };

  root.querySelector('#buddy-close').onclick = () => panel.classList.add('hidden');

  root.querySelector('#buddy-clear').onclick = () => {
    history.length = 0;
    messagesEl.innerHTML = `
      <div class="buddy-message assistant">
        <b>Chat restarted! 👋</b><br>
        Ask me for electronics recommendations, lab procedures, or component stock availability.
      </div>
    `;
    root.querySelector('#buddy-suggestions')?.classList.remove('hidden');
    input.value = '';
    input.focus();
    toast('LabBuddy conversation reset.');
  };

  messagesEl.addEventListener('click', e => {
    const chip = e.target.closest('.buddy-asset-chip');
    if (!chip) return;
    const code = chip.dataset.buddyAsset;
    if (code) {
      navigate('equipment');
      const found = cache.equipment.find(item => item.asset_code.toUpperCase() === code.toUpperCase());
      if (found) {
        qrModal(found.id);
      } else {
        toast(`Equipment ${code} not currently found in inventory.`, true);
      }
    }
  });

  root.querySelector('#buddy-form').onsubmit = (event) => {
    event.preventDefault();
    sendMessage(input.value);
  };

  root.querySelectorAll('[data-prompt]').forEach(button => {
    button.onclick = () => sendMessage(button.dataset.prompt);
  });
}

initChatbot();
init().catch(e => {
  console.error(e);
  toast(e.message || 'Unable to start LabSync', true);
});
