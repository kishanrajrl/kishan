# LabSync demo data

This package already includes the demo-data seeding script. No separate demo-data download is needed.

After creating your Supabase project, running `supabase/schema.sql`, and filling `.env.local`:

1. Run `npm.cmd run bootstrap:admins` to create the two configured lab-admin accounts.
2. Run `npm.cmd run bootstrap:demo` to insert the demo records.
3. Run `npm.cmd run dev` to open the website at http://localhost:5173/.

## Demo inventory included
- Arduino Uno — LS-1001
- ESP32 DevKit V1 — LS-1002
- NodeMCU ESP8266 — LS-2004
- DHT11 and DHT22 sensors — LS-1003 / LS-1004
- Breadboard 830 Point — LS-1005
- Jumper Wire Set — LS-1006
- Digital Multimeter — LS-1007
- Digital Power Supply — LS-1008
- RC Servo Motor — LS-1009
- Ultrasonic Sensor HC-SR04 — LS-1010
- Relay Module 5V — LS-1011

The script also creates three approved sample student accounts, three pending booking requests, and three sample loans (including one overdue example).

## Demo student logins
- demo.student1@labsync.test
- demo.student2@labsync.test
- demo.student3@labsync.test

All three use the password you set as `DEMO_STUDENT_PASSWORD` in your local `.env.local` file (the example value is `DemoStudent@123`).

These are real Supabase seed records, not offline mock data. They appear after the Supabase schema and bootstrap scripts have been run. The role-selection buttons work before Supabase is configured, but authentication and dashboard data require a configured Supabase project.


## LabBuddy AI assistant
The floating Ask LabBuddy chat button is included. Connect your Gemini API key by following section 6 in `SETUP.md`.


### Try project-to-equipment recommendations
Open LabBuddy and enter a project description, for example:
`I am building an IoT smart irrigation system using soil moisture readings to control a pump. Suggest the equipment I need and explain each component.`
When the demo catalogue has been seeded and you are signed in, LabBuddy can compare the suggested items against the equipment catalogue.
