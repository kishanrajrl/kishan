-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 06: DEMO EQUIPMENT CATALOGUE
-- Purpose: Seeds complete 22 laboratory hardware models across 8 departments.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses ON CONFLICT (asset_code) DO UPDATE; safe and non-destructive.
-- Total Inventory: 22 equipment models, 288 total hardware units.
-- ============================================================================

insert into public.equipment (name, asset_code, category, description, icon, total_quantity, available_quantity)
values
  -- Microcontroller & Embedded Computing
  (
    'Arduino Uno R3',
    'LS-1001',
    'Development Board',
    'Standard ATmega328P microcontroller board for embedded prototyping, digital I/O, and introductory electronics coursework.',
    '▦',
    14,
    14
  ),
  (
    'ESP32 DevKit V1',
    'LS-1002',
    'IoT & Wi-Fi',
    'Dual-core 240MHz microcontroller with integrated 2.4GHz Wi-Fi and Bluetooth LE for smart campus and telemetry projects.',
    '▣',
    12,
    12
  ),
  (
    'NodeMCU ESP8266',
    'LS-2004',
    'IoT & Wi-Fi',
    'Compact Wi-Fi development board based on ESP-12E module, ideal for web sockets, MQTT, and sensor logging.',
    '▣',
    8,
    8
  ),
  (
    'Raspberry Pi 4 Model B (4GB)',
    'LS-1012',
    'Development Board',
    'High-performance 64-bit quad-core SBC with Gigabit Ethernet, dual-band Wi-Fi, dual 4K micro-HDMI outputs, and 4GB LPDDR4 RAM.',
    '▣',
    8,
    8
  ),

  -- Sensors & Measurement Transducers
  (
    'DHT11 Temperature Sensor',
    'LS-1003',
    'Sensors',
    'Basic, low-cost digital temperature and relative humidity sensor with calibrated digital signal output.',
    '◉',
    18,
    18
  ),
  (
    'DHT22 Humidity Sensor',
    'LS-1004',
    'Sensors',
    'High accuracy digital temperature (-40 to 80C) and relative humidity sensor module with single-bus digital interface.',
    '◉',
    10,
    10
  ),
  (
    'Ultrasonic Sensor HC-SR04',
    'LS-1010',
    'Sensors',
    'Non-contact ultrasonic distance measuring transducer module with 2cm to 400cm range and 3mm ranging accuracy.',
    '◉',
    16,
    16
  ),
  (
    'MPU-6050 6-DOF IMU Sensor',
    'LS-1017',
    'Sensors',
    'Integrated 3-axis accelerometer and 3-axis angular rate sensor (gyroscope) with onboard Digital Motion Processor (DMP).',
    '◎',
    14,
    14
  ),
  (
    'PIR Motion Sensor HC-SR501',
    'LS-1021',
    'Sensors',
    'Pyroelectric infrared motion detector module with adjustable delay time and sensitivity for automated presence detection.',
    '◎',
    16,
    16
  ),

  -- Displays & Output Modules
  (
    'OLED Display 0.96 inch I2C',
    'LS-1015',
    'Displays',
    'Monochrome 128x64 self-illuminating graphical OLED display with high contrast and standard 4-pin I2C communication interface.',
    '▤',
    15,
    15
  ),
  (
    '16x2 LCD with I2C Backpack',
    'LS-1016',
    'Displays',
    'Alphanumeric 16-character by 2-line liquid crystal display with PCF8574 I2C adapter backpack for 2-wire serial connection.',
    '▤',
    18,
    18
  ),

  -- Actuators & Motor Controllers
  (
    'RC Servo Motor',
    'LS-1009',
    'Actuators',
    'Standard 180-degree positional rotation micro servo motor with plastic gear train for robotics and automation arms.',
    '⚙',
    15,
    15
  ),
  (
    'L298N Dual H-Bridge Motor Driver',
    'LS-1019',
    'Actuators',
    'High-voltage, high-current dual full-bridge driver designed to control inductive loads such as DC motors and stepping motors.',
    '⚙',
    12,
    12
  ),
  (
    'Relay Module 5V',
    'LS-1011',
    'Modules',
    '1-channel 5V optocoupler-isolated relay switch board rated for AC 250V/10A load switching and circuit isolation.',
    '▦',
    12,
    12
  ),

  -- Wireless & Connectivity
  (
    'HC-05 Bluetooth Module',
    'LS-1018',
    'IoT & Wi-Fi',
    'Class 2 serial Bluetooth v2.0+EDR transceiver module with master/slave mode switching and simple AT command configuration.',
    '📶',
    12,
    12
  ),

  -- Test, Bench & Measurement Equipment
  (
    'Digital Multimeter',
    'LS-1007',
    'Test Equipment',
    'Auto-ranging digital multimeter for AC/DC voltage, current, resistance, continuity check, and diode testing.',
    'ϟ',
    8,
    8
  ),
  (
    'Digital Storage Oscilloscope 100MHz',
    'LS-1013',
    'Test Equipment',
    'Dual-channel 100MHz bench oscilloscope with 1GSa/s real-time sampling rate, 7-inch TFT color display, and FFT frequency analysis.',
    '∿',
    4,
    4
  ),
  (
    'Logic Analyzer 8-Channel 24MHz',
    'LS-1014',
    'Test Equipment',
    'USB-based 8-channel digital logic analyzer supporting I2C, SPI, UART, and PWM protocol decoding on PC software.',
    '⑉',
    10,
    10
  ),
  (
    'Digital Power Supply (5V, 3A)',
    'LS-1008',
    'Power',
    'Regulated benchtop DC laboratory power supply with constant voltage/current output and short-circuit protection.',
    'ϟ',
    6,
    6
  ),

  -- Prototyping & Fabrication
  (
    'Breadboard 830 Point',
    'LS-1005',
    'Prototyping',
    'Solderless breadboard with dual power rails, 830 tie points, and standard 2.54mm pitch spacing.',
    '▤',
    24,
    24
  ),
  (
    'Jumper Wire Set',
    'LS-1006',
    'Prototyping',
    'Multi-color set of 65 flexible male-to-male, male-to-female, and female-to-female breadboard jumper cables.',
    '⌁',
    30,
    30
  ),
  (
    'Soldering Station 60W Adjustable',
    'LS-1020',
    'Prototyping',
    'ESD-safe temperature-controlled 60W soldering iron station with ceramic heating element, digital LED readout, and stand.',
    '⚡',
    6,
    6
  )
on conflict (asset_code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  icon = excluded.icon,
  total_quantity = excluded.total_quantity,
  available_quantity = excluded.available_quantity;
