import fs from 'fs';
import path from 'path';

const dir = path.join('public', 'images', 'equipment');
fs.mkdirSync(dir, { recursive: true });

const svgs = {
  'arduino-uno.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="pcb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00878F"/>
      <stop offset="100%" stop-color="#005F66"/>
    </linearGradient>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0e0e0"/>
      <stop offset="50%" stop-color="#b0b0b0"/>
      <stop offset="100%" stop-color="#909090"/>
    </linearGradient>
    <filter id="sh" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="url(#sh)">
    <path d="M 40 30 L 260 30 C 265 30 270 35 270 40 L 270 160 C 270 165 265 170 260 170 L 40 170 C 35 170 30 165 30 160 L 30 40 C 30 35 35 30 40 30 Z" fill="url(#pcb)"/>
  </g>
  <circle cx="42" cy="42" r="5" fill="#d9e2e0" stroke="#a0b2af" stroke-width="2"/>
  <circle cx="258" cy="42" r="5" fill="#d9e2e0" stroke="#a0b2af" stroke-width="2"/>
  <circle cx="258" cy="158" r="5" fill="#d9e2e0" stroke="#a0b2af" stroke-width="2"/>
  <rect x="18" y="45" width="32" height="40" rx="3" fill="url(#metal)" stroke="#666" stroke-width="1"/>
  <rect x="20" y="53" width="10" height="24" fill="#333"/>
  <rect x="16" y="115" width="36" height="38" rx="2" fill="#222"/>
  <circle cx="20" cy="134" r="6" fill="#111" stroke="#555" stroke-width="2"/>
  <rect x="62" y="38" width="14" height="14" rx="2" fill="#d32f2f" stroke="#333" stroke-width="1"/>
  <circle cx="69" cy="45" r="4" fill="#f44336"/>
  <rect x="110" y="110" width="100" height="30" rx="2" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
  <circle cx="118" cy="125" r="3" fill="#333"/>
  <text x="130" y="129" font-family="monospace" font-size="8" fill="#bbb" font-weight="bold">ATMEGA328P</text>
  <g fill="#aaa">
    <rect x="114" y="106" width="3" height="4"/><rect x="122" y="106" width="3" height="4"/><rect x="130" y="106" width="3" height="4"/><rect x="138" y="106" width="3" height="4"/><rect x="146" y="106" width="3" height="4"/><rect x="154" y="106" width="3" height="4"/><rect x="162" y="106" width="3" height="4"/><rect x="170" y="106" width="3" height="4"/><rect x="178" y="106" width="3" height="4"/><rect x="186" y="106" width="3" height="4"/><rect x="194" y="106" width="3" height="4"/><rect x="202" y="106" width="3" height="4"/>
    <rect x="114" y="140" width="3" height="4"/><rect x="122" y="140" width="3" height="4"/><rect x="130" y="140" width="3" height="4"/><rect x="138" y="140" width="3" height="4"/><rect x="146" y="140" width="3" height="4"/><rect x="154" y="140" width="3" height="4"/><rect x="162" y="140" width="3" height="4"/><rect x="170" y="140" width="3" height="4"/><rect x="178" y="140" width="3" height="4"/><rect x="186" y="140" width="3" height="4"/><rect x="194" y="140" width="3" height="4"/><rect x="202" y="140" width="3" height="4"/>
  </g>
  <rect x="85" y="72" width="20" height="10" rx="4" fill="url(#metal)"/>
  <rect x="120" y="32" width="136" height="10" fill="#1e1e1e" rx="1"/>
  <g fill="#e0e0e0">
    <circle cx="126" cy="37" r="1.8"/><circle cx="134" cy="37" r="1.8"/><circle cx="142" cy="37" r="1.8"/><circle cx="150" cy="37" r="1.8"/><circle cx="158" cy="37" r="1.8"/><circle cx="166" cy="37" r="1.8"/><circle cx="174" cy="37" r="1.8"/><circle cx="182" cy="37" r="1.8"/><circle cx="194" cy="37" r="1.8"/><circle cx="202" cy="37" r="1.8"/><circle cx="210" cy="37" r="1.8"/><circle cx="218" cy="37" r="1.8"/><circle cx="226" cy="37" r="1.8"/><circle cx="234" cy="37" r="1.8"/><circle cx="242" cy="37" r="1.8"/><circle cx="250" cy="37" r="1.8"/>
  </g>
  <rect x="90" y="158" width="75" height="10" fill="#1e1e1e" rx="1"/>
  <rect x="180" y="158" width="65" height="10" fill="#1e1e1e" rx="1"/>
  <text x="130" y="75" font-family="sans-serif" font-size="14" fill="#fff" font-weight="bold" letter-spacing="1">ARDUINO</text>
  <text x="130" y="92" font-family="sans-serif" font-size="12" fill="#fff" font-weight="bold">UNO</text>
  <text x="170" y="92" font-family="sans-serif" font-size="9" fill="#cce">REV 3</text>
</svg>`,

  'esp32-devkit.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="shield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0f0f0"/>
      <stop offset="50%" stop-color="#d0d0d0"/>
      <stop offset="100%" stop-color="#a8a8a8"/>
    </linearGradient>
    <filter id="sh2" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="url(#sh2)">
    <rect x="75" y="20" width="170" height="160" rx="5" fill="#18191a" stroke="#2d2f31" stroke-width="2"/>
  </g>
  <rect x="110" y="25" width="100" height="24" rx="2" fill="#0f1011"/>
  <path d="M 115 35 L 125 35 L 125 28 L 135 28 L 135 35 L 145 35 L 145 28 L 155 28 L 155 35 L 165 35 L 165 28 L 175 28 L 175 35 L 185 35 L 185 28 L 195 28 L 195 35 L 205 35" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="105" y="55" width="110" height="75" rx="3" fill="url(#shield)" stroke="#888" stroke-width="1"/>
  <text x="115" y="78" font-family="sans-serif" font-size="11" fill="#222" font-weight="bold">ESP-WROOM-32</text>
  <text x="115" y="94" font-family="monospace" font-size="8" fill="#444">Wi-Fi + BT + BLE</text>
  <circle cx="195" cy="75" r="6" fill="none" stroke="#555" stroke-width="1.5"/>
  <rect x="142" y="164" width="36" height="18" rx="2" fill="#aaa" stroke="#444" stroke-width="1"/>
  <rect x="150" y="168" width="20" height="8" rx="1" fill="#222"/>
  <rect x="92" y="150" width="12" height="12" rx="2" fill="#444"/>
  <circle cx="98" cy="156" r="3" fill="#bbb"/>
  <text x="90" y="145" font-family="sans-serif" font-size="6.5" fill="#aaa">EN</text>
  <rect x="216" y="150" width="12" height="12" rx="2" fill="#444"/>
  <circle cx="222" cy="156" r="3" fill="#bbb"/>
  <text x="212" y="145" font-family="sans-serif" font-size="6.5" fill="#aaa">BOOT</text>
  <rect x="78" y="25" width="8" height="150" fill="#111" rx="1"/>
  <rect x="234" y="25" width="8" height="150" fill="#111" rx="1"/>
  <g fill="#d4af37">
    <circle cx="82" cy="35" r="1.8"/><circle cx="82" cy="45" r="1.8"/><circle cx="82" cy="55" r="1.8"/><circle cx="82" cy="65" r="1.8"/><circle cx="82" cy="75" r="1.8"/><circle cx="82" cy="85" r="1.8"/><circle cx="82" cy="95" r="1.8"/><circle cx="82" cy="105" r="1.8"/><circle cx="82" cy="115" r="1.8"/><circle cx="82" cy="125" r="1.8"/><circle cx="82" cy="135" r="1.8"/><circle cx="82" cy="145" r="1.8"/><circle cx="82" cy="155" r="1.8"/><circle cx="82" cy="165" r="1.8"/>
    <circle cx="238" cy="35" r="1.8"/><circle cx="238" cy="45" r="1.8"/><circle cx="238" cy="55" r="1.8"/><circle cx="238" cy="65" r="1.8"/><circle cx="238" cy="75" r="1.8"/><circle cx="238" cy="85" r="1.8"/><circle cx="238" cy="95" r="1.8"/><circle cx="238" cy="105" r="1.8"/><circle cx="238" cy="115" r="1.8"/><circle cx="238" cy="125" r="1.8"/><circle cx="238" cy="135" r="1.8"/><circle cx="238" cy="145" r="1.8"/><circle cx="238" cy="155" r="1.8"/><circle cx="238" cy="165" r="1.8"/>
  </g>
  <circle cx="132" cy="155" r="2.5" fill="#ff3d00"/>
</svg>`,

  'nodemcu-esp8266.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))">
    <rect x="85" y="20" width="150" height="160" rx="5" fill="#1A365D" stroke="#2A4365" stroke-width="2"/>
  </g>
  <rect x="115" y="24" width="90" height="22" rx="1" fill="#0F172A"/>
  <path d="M 120 35 L 130 35 L 130 28 L 140 28 L 140 35 L 150 35 L 150 28 L 160 28 L 160 35 L 170 35 L 170 28 L 180 28 L 180 35 L 190 35 L 190 28 L 200 28" fill="none" stroke="#ECC94B" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="110" y="50" width="100" height="70" rx="3" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1"/>
  <text x="120" y="72" font-family="sans-serif" font-size="11" fill="#1E293B" font-weight="bold">ESP-12E</text>
  <text x="120" y="88" font-family="monospace" font-size="8" fill="#475569">ESP8266MOD</text>
  <text x="120" y="102" font-family="monospace" font-size="7" fill="#475569">Wi-Fi 802.11 b/g/n</text>
  <rect x="144" y="166" width="32" height="16" rx="2" fill="#94A3B8" stroke="#475569" stroke-width="1"/>
  <rect x="150" y="170" width="20" height="7" fill="#1E293B"/>
  <rect x="88" y="25" width="7" height="150" fill="#0F172A"/>
  <rect x="225" y="25" width="7" height="150" fill="#0F172A"/>
  <g fill="#ECC94B">
    <circle cx="91.5" cy="35" r="1.8"/><circle cx="91.5" cy="47" r="1.8"/><circle cx="91.5" cy="59" r="1.8"/><circle cx="91.5" cy="71" r="1.8"/><circle cx="91.5" cy="83" r="1.8"/><circle cx="91.5" cy="95" r="1.8"/><circle cx="91.5" cy="107" r="1.8"/><circle cx="91.5" cy="119" r="1.8"/><circle cx="91.5" cy="131" r="1.8"/><circle cx="91.5" cy="143" r="1.8"/><circle cx="91.5" cy="155" r="1.8"/><circle cx="91.5" cy="167" r="1.8"/>
    <circle cx="228.5" cy="35" r="1.8"/><circle cx="228.5" cy="47" r="1.8"/><circle cx="228.5" cy="59" r="1.8"/><circle cx="228.5" cy="71" r="1.8"/><circle cx="228.5" cy="83" r="1.8"/><circle cx="228.5" cy="95" r="1.8"/><circle cx="228.5" cy="107" r="1.8"/><circle cx="228.5" cy="119" r="1.8"/><circle cx="228.5" cy="131" r="1.8"/><circle cx="228.5" cy="143" r="1.8"/><circle cx="228.5" cy="155" r="1.8"/><circle cx="228.5" cy="167" r="1.8"/>
  </g>
  <text x="130" y="145" font-family="sans-serif" font-size="9" fill="#fff" font-weight="bold">NodeMCU</text>
</svg>`,

  'dht11-sensor.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.18))">
    <rect x="110" y="35" width="100" height="105" rx="8" fill="#1E88E5" stroke="#1565C0" stroke-width="2"/>
  </g>
  <g fill="#0D47A1">
    <rect x="122" y="48" width="76" height="5" rx="2"/>
    <rect x="122" y="60" width="76" height="5" rx="2"/>
    <rect x="122" y="72" width="76" height="5" rx="2"/>
    <rect x="122" y="84" width="76" height="5" rx="2"/>
    <rect x="122" y="96" width="76" height="5" rx="2"/>
  </g>
  <rect x="120" y="110" width="80" height="20" rx="3" fill="#1976D2"/>
  <text x="138" y="125" font-family="sans-serif" font-size="12" fill="#fff" font-weight="bold">DHT11</text>
  <g fill="#D4AF37" stroke="#996515" stroke-width="0.5">
    <rect x="126" y="140" width="5" height="35" rx="1"/>
    <rect x="144" y="140" width="5" height="35" rx="1"/>
    <rect x="162" y="140" width="5" height="35" rx="1"/>
    <rect x="180" y="140" width="5" height="35" rx="1"/>
  </g>
  <text x="124" y="188" font-family="monospace" font-size="8" fill="#666">VCC</text>
  <text x="142" y="188" font-family="monospace" font-size="8" fill="#666">DATA</text>
  <text x="162" y="188" font-family="monospace" font-size="8" fill="#666">NC</text>
  <text x="178" y="188" font-family="monospace" font-size="8" fill="#666">GND</text>
</svg>`,

  'dht22-sensor.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))">
    <rect x="105" y="30" width="110" height="115" rx="7" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
  </g>
  <g fill="#E2E8F0">
    <rect x="118" y="42" width="84" height="4" rx="1"/><rect x="118" y="50" width="84" height="4" rx="1"/><rect x="118" y="58" width="84" height="4" rx="1"/><rect x="118" y="66" width="84" height="4" rx="1"/><rect x="118" y="74" width="84" height="4" rx="1"/><rect x="118" y="82" width="84" height="4" rx="1"/><rect x="118" y="90" width="84" height="4" rx="1"/><rect x="118" y="98" width="84" height="4" rx="1"/>
  </g>
  <text x="132" y="122" font-family="sans-serif" font-size="12" fill="#334155" font-weight="bold">DHT22</text>
  <text x="136" y="135" font-family="monospace" font-size="8" fill="#64748B">AM2302</text>
  <g fill="#D4AF37" stroke="#996515" stroke-width="0.5">
    <rect x="124" y="145" width="5" height="35" rx="1"/>
    <rect x="144" y="145" width="5" height="35" rx="1"/>
    <rect x="164" y="145" width="5" height="35" rx="1"/>
    <rect x="184" y="145" width="5" height="35" rx="1"/>
  </g>
  <text x="121" y="190" font-family="monospace" font-size="7.5" fill="#666">VCC</text>
  <text x="141" y="190" font-family="monospace" font-size="7.5" fill="#666">DAT</text>
  <text x="163" y="190" font-family="monospace" font-size="7.5" fill="#666">NC</text>
  <text x="181" y="190" font-family="monospace" font-size="7.5" fill="#666">GND</text>
</svg>`,

  'breadboard-830.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))">
    <rect x="25" y="45" width="270" height="110" rx="5" fill="#FAF9F6" stroke="#D1D5DB" stroke-width="2"/>
  </g>
  <rect x="30" y="98" width="260" height="4" fill="#D1D5DB"/>
  <line x1="35" y1="55" x2="285" y2="55" stroke="#DC2626" stroke-width="2"/>
  <line x1="35" y1="65" x2="285" y2="65" stroke="#2563EB" stroke-width="2"/>
  <line x1="35" y1="135" x2="285" y2="135" stroke="#2563EB" stroke-width="2"/>
  <line x1="35" y1="145" x2="285" y2="145" stroke="#DC2626" stroke-width="2"/>
  <g fill="#475569">
    <circle cx="45" cy="55" r="1.2"/><circle cx="60" cy="55" r="1.2"/><circle cx="75" cy="55" r="1.2"/><circle cx="90" cy="55" r="1.2"/><circle cx="105" cy="55" r="1.2"/><circle cx="120" cy="55" r="1.2"/><circle cx="135" cy="55" r="1.2"/><circle cx="150" cy="55" r="1.2"/><circle cx="165" cy="55" r="1.2"/><circle cx="180" cy="55" r="1.2"/><circle cx="195" cy="55" r="1.2"/><circle cx="210" cy="55" r="1.2"/><circle cx="225" cy="55" r="1.2"/><circle cx="240" cy="55" r="1.2"/><circle cx="255" cy="55" r="1.2"/><circle cx="270" cy="55" r="1.2"/>
    <circle cx="45" cy="65" r="1.2"/><circle cx="60" cy="65" r="1.2"/><circle cx="75" cy="65" r="1.2"/><circle cx="90" cy="65" r="1.2"/><circle cx="105" cy="65" r="1.2"/><circle cx="120" cy="65" r="1.2"/><circle cx="135" cy="65" r="1.2"/><circle cx="150" cy="65" r="1.2"/><circle cx="165" cy="65" r="1.2"/><circle cx="180" cy="65" r="1.2"/><circle cx="195" cy="65" r="1.2"/><circle cx="210" cy="65" r="1.2"/><circle cx="225" cy="65" r="1.2"/><circle cx="240" cy="65" r="1.2"/><circle cx="255" cy="65" r="1.2"/><circle cx="270" cy="65" r="1.2"/>
    <circle cx="60" cy="75" r="1.2"/><circle cx="60" cy="81" r="1.2"/><circle cx="60" cy="87" r="1.2"/><circle cx="60" cy="93" r="1.2"/>
    <circle cx="90" cy="75" r="1.2"/><circle cx="90" cy="81" r="1.2"/><circle cx="90" cy="87" r="1.2"/><circle cx="90" cy="93" r="1.2"/>
    <circle cx="120" cy="75" r="1.2"/><circle cx="120" cy="81" r="1.2"/><circle cx="120" cy="87" r="1.2"/><circle cx="120" cy="93" r="1.2"/>
    <circle cx="150" cy="75" r="1.2"/><circle cx="150" cy="81" r="1.2"/><circle cx="150" cy="87" r="1.2"/><circle cx="150" cy="93" r="1.2"/>
    <circle cx="180" cy="75" r="1.2"/><circle cx="180" cy="81" r="1.2"/><circle cx="180" cy="87" r="1.2"/><circle cx="180" cy="93" r="1.2"/>
    <circle cx="210" cy="75" r="1.2"/><circle cx="210" cy="81" r="1.2"/><circle cx="210" cy="87" r="1.2"/><circle cx="210" cy="93" r="1.2"/>
    <circle cx="240" cy="75" r="1.2"/><circle cx="240" cy="81" r="1.2"/><circle cx="240" cy="87" r="1.2"/><circle cx="240" cy="93" r="1.2"/>
    <circle cx="60" cy="107" r="1.2"/><circle cx="60" cy="113" r="1.2"/><circle cx="60" cy="119" r="1.2"/><circle cx="60" cy="125" r="1.2"/>
    <circle cx="120" cy="107" r="1.2"/><circle cx="120" cy="113" r="1.2"/><circle cx="120" cy="119" r="1.2"/><circle cx="120" cy="125" r="1.2"/>
    <circle cx="180" cy="107" r="1.2"/><circle cx="180" cy="113" r="1.2"/><circle cx="180" cy="119" r="1.2"/><circle cx="180" cy="125" r="1.2"/>
    <circle cx="240" cy="107" r="1.2"/><circle cx="240" cy="113" r="1.2"/><circle cx="240" cy="119" r="1.2"/><circle cx="240" cy="125" r="1.2"/>
  </g>
  <text x="80" y="37" font-family="sans-serif" font-size="10" fill="#64748B" font-weight="bold">830 TIE-POINT SOLDERLESS BREADBOARD</text>
</svg>`,

  'jumper-wires.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" stroke-width="6" stroke-linecap="round" fill="none">
    <path d="M 40 50 C 100 20, 220 180, 280 60" stroke="#EF4444"/>
    <path d="M 40 65 C 100 35, 220 190, 280 75" stroke="#F97316"/>
    <path d="M 40 80 C 100 50, 220 200, 280 90" stroke="#FACC15"/>
    <path d="M 40 95 C 100 65, 220 210, 280 105" stroke="#10B981"/>
    <path d="M 40 110 C 100 80, 220 220, 280 120" stroke="#06B6D4"/>
    <path d="M 40 125 C 100 95, 220 230, 280 135" stroke="#3B82F6"/>
    <path d="M 40 140 C 100 110, 220 240, 280 150" stroke="#8B5CF6"/>
  </g>
  <g fill="#1E293B" stroke="#0F172A" stroke-width="1">
    <rect x="25" y="42" width="18" height="16" rx="2"/>
    <rect x="25" y="57" width="18" height="16" rx="2"/>
    <rect x="25" y="72" width="18" height="16" rx="2"/>
    <rect x="25" y="87" width="18" height="16" rx="2"/>
    <rect x="25" y="102" width="18" height="16" rx="2"/>
    <rect x="25" y="117" width="18" height="16" rx="2"/>
    <rect x="25" y="132" width="18" height="16" rx="2"/>
  </g>
  <g fill="#D4AF37">
    <rect x="12" y="48" width="14" height="4" rx="1"/>
    <rect x="12" y="63" width="14" height="4" rx="1"/>
    <rect x="12" y="78" width="14" height="4" rx="1"/>
    <rect x="12" y="93" width="14" height="4" rx="1"/>
    <rect x="12" y="108" width="14" height="4" rx="1"/>
    <rect x="12" y="123" width="14" height="4" rx="1"/>
    <rect x="12" y="138" width="14" height="4" rx="1"/>
  </g>
  <g fill="#1E293B" stroke="#0F172A" stroke-width="1">
    <rect x="275" y="52" width="18" height="16" rx="2"/>
    <rect x="275" y="67" width="18" height="16" rx="2"/>
    <rect x="275" y="82" width="18" height="16" rx="2"/>
    <rect x="275" y="97" width="18" height="16" rx="2"/>
    <rect x="275" y="112" width="18" height="16" rx="2"/>
    <rect x="275" y="127" width="18" height="16" rx="2"/>
    <rect x="275" y="142" width="18" height="16" rx="2"/>
  </g>
  <g fill="#D4AF37">
    <rect x="292" y="58" width="14" height="4" rx="1"/>
    <rect x="292" y="73" width="14" height="4" rx="1"/>
    <rect x="292" y="88" width="14" height="4" rx="1"/>
    <rect x="292" y="103" width="14" height="4" rx="1"/>
    <rect x="292" y="118" width="14" height="4" rx="1"/>
    <rect x="292" y="133" width="14" height="4" rx="1"/>
    <rect x="292" y="148" width="14" height="4" rx="1"/>
  </g>
</svg>`,

  'digital-multimeter.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 6px 12px rgba(0,0,0,0.18))">
    <rect x="110" y="15" width="100" height="170" rx="14" fill="#EAB308" stroke="#CA8A04" stroke-width="2"/>
    <rect x="116" y="21" width="88" height="158" rx="10" fill="#1E293B"/>
  </g>
  <rect x="125" y="30" width="70" height="34" rx="3" fill="#94A3B8" stroke="#64748B" stroke-width="1.5"/>
  <text x="136" y="54" font-family="monospace" font-size="20" fill="#0F172A" font-weight="bold">0.00</text>
  <text x="182" y="46" font-family="sans-serif" font-size="10" fill="#0F172A" font-weight="bold">V</text>
  <circle cx="160" cy="105" r="26" fill="#0F172A" stroke="#475569" stroke-width="2"/>
  <circle cx="160" cy="105" r="22" fill="#334155"/>
  <rect x="158" y="85" width="4" height="20" rx="1" fill="#E2E8F0"/>
  <circle cx="145" cy="90" r="2" fill="#EAB308"/>
  <circle cx="175" cy="90" r="2" fill="#38BDF8"/>
  <circle cx="175" cy="120" r="2" fill="#4ADE80"/>
  <circle cx="145" cy="120" r="2" fill="#F87171"/>
  <circle cx="138" cy="155" r="5.5" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
  <circle cx="160" cy="155" r="5.5" fill="#000000" stroke="#475569" stroke-width="1"/>
  <circle cx="182" cy="155" r="5.5" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
  <path d="M 138 155 Q 90 170 50 140" stroke="#DC2626" stroke-width="3" fill="none"/>
  <path d="M 160 155 Q 200 180 260 140" stroke="#000000" stroke-width="3" fill="none"/>
  <rect x="40" y="115" width="12" height="35" rx="2" fill="#DC2626" transform="rotate(20 40 115)"/>
  <polygon points="45,100 48,115 42,115" fill="#E2E8F0" transform="rotate(20 40 115)"/>
  <rect x="260" y="115" width="12" height="35" rx="2" fill="#1E293B" transform="rotate(-20 260 115)"/>
  <polygon points="265,100 268,115 262,115" fill="#E2E8F0" transform="rotate(-20 260 115)"/>
</svg>`,

  'power-supply.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 6px 12px rgba(0,0,0,0.18))">
    <rect x="60" y="30" width="200" height="145" rx="6" fill="#1E293B" stroke="#334155" stroke-width="2"/>
  </g>
  <path d="M 120 30 L 120 20 L 200 20 L 200 30" fill="none" stroke="#64748B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="75" y="45" width="80" height="38" rx="3" fill="#020617" stroke="#475569" stroke-width="1"/>
  <text x="82" y="72" font-family="monospace" font-size="20" fill="#EF4444" font-weight="bold">05.00</text>
  <text x="142" y="58" font-family="sans-serif" font-size="9" fill="#94A3B8">V</text>
  <rect x="165" y="45" width="80" height="38" rx="3" fill="#020617" stroke="#475569" stroke-width="1"/>
  <text x="172" y="72" font-family="monospace" font-size="20" fill="#22C55E" font-weight="bold">03.00</text>
  <text x="232" y="58" font-family="sans-serif" font-size="9" fill="#94A3B8">A</text>
  <circle cx="95" cy="110" r="12" fill="#475569" stroke="#64748B" stroke-width="1.5"/>
  <rect x="93" y="100" width="4" height="10" fill="#E2E8F0" rx="1"/>
  <text x="80" y="132" font-family="sans-serif" font-size="7.5" fill="#94A3B8">VOLTAGE</text>
  <circle cx="140" cy="110" r="12" fill="#475569" stroke="#64748B" stroke-width="1.5"/>
  <rect x="138" y="100" width="4" height="10" fill="#E2E8F0" rx="1"/>
  <text x="125" y="132" font-family="sans-serif" font-size="7.5" fill="#94A3B8">CURRENT</text>
  <rect x="210" y="98" width="24" height="24" rx="3" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
  <circle cx="222" cy="110" r="5" fill="#F87171"/>
  <text x="210" y="132" font-family="sans-serif" font-size="7" fill="#94A3B8">POWER</text>
  <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
    <circle cx="100" cy="155" r="8" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>
    <circle cx="100" cy="155" r="3" fill="#450A0A"/>
    <text x="97" y="158" font-family="monospace" font-size="8" fill="#FFF" font-weight="bold">+</text>
    <circle cx="160" cy="155" r="8" fill="#16A34A" stroke="#15803D" stroke-width="1.5"/>
    <circle cx="160" cy="155" r="3" fill="#052E16"/>
    <text x="156" y="158" font-family="monospace" font-size="8" fill="#FFF" font-weight="bold">⏚</text>
    <circle cx="220" cy="155" r="8" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
    <circle cx="220" cy="155" r="3" fill="#000000"/>
    <text x="218" y="158" font-family="monospace" font-size="8" fill="#FFF" font-weight="bold">-</text>
  </g>
</svg>`,

  'servo-motor.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 6px 10px rgba(0,0,0,0.18))">
    <rect x="95" y="65" width="110" height="85" rx="4" fill="#1E40AF" opacity="0.9" stroke="#1D4ED8" stroke-width="1.5"/>
    <rect x="75" y="90" width="20" height="10" fill="#1E40AF" opacity="0.9"/>
    <circle cx="84" cy="95" r="2.5" fill="#F4F7F6"/>
    <rect x="205" y="90" width="20" height="10" fill="#1E40AF" opacity="0.9"/>
    <circle cx="216" cy="95" r="2.5" fill="#F4F7F6"/>
  </g>
  <rect x="165" y="50" width="30" height="16" rx="2" fill="#1D4ED8" stroke="#1E3A8A" stroke-width="1"/>
  <circle cx="180" cy="48" r="9" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="180" cy="48" r="3" fill="#64748B"/>
  <path d="M 180 48 L 245 42 C 250 42 250 54 245 54 L 180 48 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))"/>
  <circle cx="180" cy="48" r="8" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1"/>
  <circle cx="180" cy="48" r="3" fill="#475569"/>
  <circle cx="205" cy="47" r="1.8" fill="#64748B"/>
  <circle cx="220" cy="47" r="1.8" fill="#64748B"/>
  <circle cx="235" cy="47" r="1.8" fill="#64748B"/>
  <rect x="110" y="95" width="80" height="35" rx="2" fill="#2563EB"/>
  <text x="124" y="112" font-family="sans-serif" font-size="12" fill="#FFF" font-weight="bold">TowerPro</text>
  <text x="128" y="124" font-family="monospace" font-size="9" fill="#FEF08A" font-weight="bold">Micro SG90</text>
  <path d="M 105 145 C 80 155, 60 140, 40 160" stroke="#78350F" stroke-width="3" fill="none"/>
  <path d="M 108 147 C 83 157, 63 142, 43 162" stroke="#DC2626" stroke-width="3" fill="none"/>
  <path d="M 111 149 C 86 159, 66 144, 46 164" stroke="#F59E0B" stroke-width="3" fill="none"/>
</svg>`,

  'ultrasonic-sensor.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 6px 12px rgba(0,0,0,0.18))">
    <rect x="55" y="60" width="210" height="95" rx="6" fill="#1D4ED8" stroke="#1E40AF" stroke-width="2"/>
  </g>
  <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))">
    <circle cx="110" cy="102" r="34" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="110" cy="102" r="26" fill="#334155"/>
    <circle cx="110" cy="102" r="20" fill="none" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 3"/>
    <text x="104" y="108" font-family="sans-serif" font-size="16" fill="#F8FAFC" font-weight="bold">T</text>
  </g>
  <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))">
    <circle cx="210" cy="102" r="34" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="210" cy="102" r="26" fill="#334155"/>
    <circle cx="210" cy="102" r="20" fill="none" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 3"/>
    <text x="204" y="108" font-family="sans-serif" font-size="16" fill="#F8FAFC" font-weight="bold">R</text>
  </g>
  <rect x="153" y="90" width="14" height="24" rx="3" fill="#CBD5E1" stroke="#64748B" stroke-width="1"/>
  <text x="136" y="75" font-family="sans-serif" font-size="10" fill="#FFF" font-weight="bold">HC-SR04</text>
  <g fill="#D4AF37" stroke="#996515" stroke-width="0.5">
    <rect x="136" y="150" width="5" height="25" rx="1"/>
    <rect x="150" y="150" width="5" height="25" rx="1"/>
    <rect x="164" y="150" width="5" height="25" rx="1"/>
    <rect x="178" y="150" width="5" height="25" rx="1"/>
  </g>
  <text x="132" y="186" font-family="monospace" font-size="6.5" fill="#64748B">VCC</text>
  <text x="147" y="186" font-family="monospace" font-size="6.5" fill="#64748B">TRIG</text>
  <text x="161" y="186" font-family="monospace" font-size="6.5" fill="#64748B">ECHO</text>
  <text x="176" y="186" font-family="monospace" font-size="6.5" fill="#64748B">GND</text>
</svg>`,

  'relay-module.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="100%" height="100%" fill="#F4F7F6" rx="12"/>
  <g filter="drop-shadow(0 6px 10px rgba(0,0,0,0.18))">
    <rect x="70" y="35" width="180" height="130" rx="5" fill="#0284C7" stroke="#0369A1" stroke-width="2"/>
  </g>
  <g filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))">
    <rect x="115" y="50" width="95" height="75" rx="3" fill="#0369A1" stroke="#075985" stroke-width="1.5"/>
  </g>
  <text x="123" y="72" font-family="sans-serif" font-size="12" fill="#FFF" font-weight="bold">SONGLE</text>
  <text x="123" y="86" font-family="monospace" font-size="8" fill="#BAE6FD">10A 250VAC</text>
  <text x="123" y="98" font-family="monospace" font-size="8" fill="#BAE6FD">10A 30VDC</text>
  <text x="123" y="114" font-family="sans-serif" font-size="9" fill="#FEF08A" font-weight="bold">SRD-05VDC-SL-C</text>
  <rect x="55" y="60" width="24" height="55" rx="2" fill="#15803D" stroke="#166534" stroke-width="1.5"/>
  <circle cx="67" cy="72" r="4" fill="#E2E8F0" stroke="#475569" stroke-width="1"/>
  <circle cx="67" cy="87" r="4" fill="#E2E8F0" stroke="#475569" stroke-width="1"/>
  <circle cx="67" cy="102" r="4" fill="#E2E8F0" stroke="#475569" stroke-width="1"/>
  <text x="54" y="130" font-family="monospace" font-size="8" fill="#FFF">NO COM NC</text>
  <rect x="240" y="70" width="10" height="35" fill="#0F172A"/>
  <g fill="#D4AF37">
    <rect x="248" y="75" width="15" height="4" rx="1"/>
    <rect x="248" y="86" width="15" height="4" rx="1"/>
    <rect x="248" y="97" width="15" height="4" rx="1"/>
  </g>
  <text x="218" y="79" font-family="monospace" font-size="7.5" fill="#FFF">VCC</text>
  <text x="218" y="90" font-family="monospace" font-size="7.5" fill="#FFF">GND</text>
  <text x="225" y="101" font-family="monospace" font-size="7.5" fill="#FFF">IN</text>
  <circle cx="130" cy="145" r="3.5" fill="#EF4444"/>
  <circle cx="145" cy="145" r="3.5" fill="#22C55E"/>
  <text x="155" y="148" font-family="sans-serif" font-size="7.5" fill="#FFF">POWER / RELAY</text>
</svg>`
};

for (const [file, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(dir, file), content.trim(), 'utf8');
}
console.log('Successfully generated all 12 equipment vector SVGs in public/images/equipment/');
