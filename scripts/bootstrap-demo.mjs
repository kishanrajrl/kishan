import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const password=process.env.DEMO_STUDENT_PASSWORD;
if(!url||!key||!password){console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_STUDENT_PASSWORD in local .env.local');process.exit(1);}
const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
const demoStudents=[
 {email:'demo.student1@labsync.test',name:'Aarav Sharma',usn:'1DS24CS041',dept:'Computer Science',sem:'3'},
 {email:'demo.student2@labsync.test',name:'Diya Nair',usn:'1DS24EC018',dept:'Electronics',sem:'3'},
 {email:'demo.student3@labsync.test',name:'Rohan Kumar',usn:'1DS24IS027',dept:'Information Science',sem:'4'}
];
async function getOrCreateUser(s){
 const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;
 let u=data.users.find(x=>x.email?.toLowerCase()===s.email);
 if(!u){const r=await db.auth.admin.createUser({email:s.email,password,email_confirm:true,user_metadata:{full_name:s.name,usn:s.usn,department:s.dept,semester:s.sem}});if(r.error)throw r.error;u=r.data.user;}
 const {error:pe}=await db.from('profiles').upsert({id:u.id,email:s.email,full_name:s.name,usn:s.usn,department:s.dept,semester:s.sem,role:'student',status:'approved'},{onConflict:'id'});if(pe)throw pe;
 return u;
}
const students=[];for(const s of demoStudents)students.push(await getOrCreateUser(s));
const assets=[
 ['Arduino Uno','LS-1001','Development Board',14,'▦'],
 ['ESP32 DevKit V1','LS-1002','IoT & Wi-Fi',12,'▣'],
 ['NodeMCU ESP8266','LS-2004','IoT & Wi-Fi',8,'▣'],
 ['DHT11 Temperature Sensor','LS-1003','Sensors',18,'◉'],
 ['DHT22 Humidity Sensor','LS-1004','Sensors',10,'◉'],
 ['Breadboard 830 Point','LS-1005','Prototyping',24,'▤'],
 ['Jumper Wire Set','LS-1006','Prototyping',30,'⌁'],
 ['Digital Multimeter','LS-1007','Test Equipment',8,'ϟ'],
 ['Digital Power Supply (5V, 3A)','LS-1008','Power',6,'ϟ'],
 ['RC Servo Motor','LS-1009','Actuators',15,'⚙'],
 ['Ultrasonic Sensor HC-SR04','LS-1010','Sensors',16,'◉'],
 ['Relay Module 5V','LS-1011','Modules',12,'▦']
]
for(const [name,asset_code,category,total_quantity,icon] of assets){
 const {error}=await db.from('equipment').upsert({name,asset_code,category,total_quantity,available_quantity:total_quantity,icon,description:'Demo inventory item for LabSync presentation.'},{onConflict:'asset_code',ignoreDuplicates:true});
 if(error)throw error;
}
const {data:eq,error:eqErr}=await db.from('equipment').select('*').order('asset_code');if(eqErr)throw eqErr;
const byCode=Object.fromEntries(eq.map(x=>[x.asset_code,x]));
const {data:existing,error:exErr}=await db.from('booking_requests').select('id,purpose');if(exErr)throw exErr;
const hasDemo=(purpose)=>existing.some(x=>x.purpose===purpose);
const requestRows=[
 {user_id:students[0].id,equipment_id:byCode['LS-1002'].id,purpose:'DEMO: Analog signals lab experiment',requested_return_date:new Date(Date.now()+5*86400000).toISOString().slice(0,10),status:'pending'},
 {user_id:students[1].id,equipment_id:byCode['LS-1001'].id,purpose:'DEMO: Microcontroller mini project',requested_return_date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),status:'pending'},
 {user_id:students[2].id,equipment_id:byCode['LS-1003'].id,purpose:'DEMO: IoT prototype development',requested_return_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10),status:'pending'}
];
for(const r of requestRows)if(!hasDemo(r.purpose)){const {error}=await db.from('booking_requests').insert(r);if(error)throw error;}
const {data:loans,error:loanErr}=await db.from('loans').select('id,damage_note');if(loanErr)throw loanErr;
const demoLoans=[
 {user_id:students[0].id,equipment_id:byCode['LS-1007'].id,due_at:new Date(Date.now()+2*86400000).toISOString(),status:'issued',damage_note:'DEMO: Active loan'},
 {user_id:students[1].id,equipment_id:byCode['LS-1006'].id,due_at:new Date(Date.now()-86400000).toISOString(),status:'issued',damage_note:'DEMO: Overdue loan'},
 {user_id:students[2].id,equipment_id:byCode['LS-1008'].id,due_at:new Date(Date.now()-3*86400000).toISOString(),status:'returned',returned_at:new Date().toISOString(),damage_note:'DEMO: Returned loan'}
];
for(const l of demoLoans)if(!loans.some(x=>x.damage_note===l.damage_note)){const {error}=await db.from('loans').insert(l);if(error)throw error;}
console.log('Demo data ready: 12 electronics equipment records, 3 approved demo students, 3 sample requests and 3 sample loans.');
console.log('Demo student accounts: '+demoStudents.map(s=>s.email).join(', '));
console.log('Their password is the DEMO_STUDENT_PASSWORD you supplied locally.');
