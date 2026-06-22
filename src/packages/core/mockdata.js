// OccHealth Pro SA — mock data for demo mode
export const _MOCK_PLACEHOLDER = true; // re-exported via shared.js
// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const MOCK_SESSION = {
  user: {
    id: "mock-user-1",
    email: "demo@occhealth.co.za",
    user_metadata: {
      full_name: "Sr. Thandi Dlamini",
      role: "ohp",
      tenant_name: "Cape OccHealth Services",
      tenant_type: "independent_ohp",
    },
  },
};

export const MOCK_EMPLOYERS = [
  { id: "e1", name: "Cape Construction (Pty) Ltd", coida_ref: "CF-2024-001", industry_class: "Construction", coida_insurer: "fem", contact_email: "hr@capeconstruct.co.za", person_count: 48 },
  { id: "e2", name: "Stellenbosch Winery Group", coida_ref: "CF-2024-002", industry_class: "Agriculture", coida_insurer: "compensation_fund", contact_email: "safety@swg.co.za", person_count: 124 },
  { id: "e3", name: "Atlantic Logistics SA", coida_ref: "CF-2024-003", industry_class: "Transport", coida_insurer: "compensation_fund", contact_email: "ohs@atlanticlogistics.co.za", person_count: 67 },
];

export const MOCK_PERSONS = [
  { id: "p1", employer_id: "e1", employee_number: "CC-001", first_name: "Sipho", last_name: "Nkosi", job_title: "Site Foreman", department: "Civil", site: "N2 Highway Project", employment_status: "active", date_of_birth: "1982-03-15" },
  { id: "p2", employer_id: "e1", employee_number: "CC-002", first_name: "Ahmed", last_name: "Davids", job_title: "Scaffolder", department: "Civil", site: "N2 Highway Project", employment_status: "active", date_of_birth: "1990-07-22" },
  { id: "p3", employer_id: "e2", employee_number: "SW-045", first_name: "Liezel", last_name: "van der Berg", job_title: "Cellar Worker", department: "Production", site: "Stellenbosch Main", employment_status: "active", date_of_birth: "1988-11-08" },
  { id: "p4", employer_id: "e3", employee_number: "AL-012", first_name: "Thabo", last_name: "Mokoena", job_title: "Forklift Operator", department: "Warehouse", site: "Cape Town DC", employment_status: "active", date_of_birth: "1975-05-30" },
];

export const MOCK_ENCOUNTERS = [
  { id: "enc1", person_id: "p1", employer_id: "e1", encounter_at: "2026-06-10T09:00:00Z", encounter_type: "periodic", signed_at: "2026-06-10T09:45:00Z", signed_by: "Sr. Thandi Dlamini", assessment: "No significant changes noted. BP well controlled.", plan: "Continue current medication. Repeat in 12 months." },
  { id: "enc2", person_id: "p2", employer_id: "e1", encounter_at: "2026-06-12T10:30:00Z", encounter_type: "pre_employment", signed_at: "2026-06-12T11:00:00Z", signed_by: "Sr. Thandi Dlamini", assessment: "Fit for scaffolding work at heights.", plan: "Issue fitness certificate. Audiometry baseline recorded." },
];

export const MOCK_FITNESS_CERTS = [
  { id: "fc1", encounter_id: "enc1", person_id: "p1", fitness_status: "fit", valid_from: "2026-06-10", valid_until: "2027-06-10", role_category: "Site Foreman", superseded: false },
  { id: "fc2", encounter_id: "enc2", person_id: "p2", fitness_status: "fit", valid_from: "2026-06-12", valid_until: "2027-06-12", role_category: "Scaffolder", superseded: false },
];

export const MOCK_IOD = [
  { id: "iod1", person_id: "p4", employer_id: "e3", incident_at: "2026-06-05T14:22:00Z", incident_type: "injury", mechanism: "Forklift blade contact", body_part: "Left hand — index finger", severity: "medical_treatment", narrative: "Employee was guiding pallet when forklift blade made contact with left index finger. Immediate first aid applied on site." },
];

export const MOCK_DRUG_TESTS = [
  { id: "dt1", person_id: "p1", employer_id: "e1", test_reason: "random", specimen_type: "urine", result: "negative", consent_given: true, refusal: false, tested_at: "2026-06-15T08:00:00Z", substances_tested: ["cannabis", "cocaine", "opiates", "amphetamines"] },
];

export const MOCK_SURVEILLANCE = [
  { id: "sv1", person_id: "p2", hazard_profile_id: "hp1", test_type: "audiometry", scheduled_date: "2026-07-01", status: "scheduled" },
  { id: "sv2", person_id: "p3", hazard_profile_id: "hp2", test_type: "spirometry", scheduled_date: "2026-06-25", status: "overdue" },
  { id: "sv3", person_id: "p4", hazard_profile_id: "hp3", test_type: "audiometry", scheduled_date: "2026-08-01", status: "scheduled" },
];

// ─── COLOURS & DESIGN TOKENS ──────────────────────────────────────────────────
export const C = {
  teal: "#0F6E56",
  tealDark: "#04342C",
  tealLight: "#E1F5EE",
  tealMid: "#1D9E75",
  amber: "#854F0B",
  amberLight: "#FAEEDA",
  red: "#B91C1C",
  redLight: "#FEE2E2",
  text: "#1a1a18",
  textSub: "#5F5E5A",
  textTert: "#888780",
  border: "#D8D6CE",
  bg: "#F8F7F4",
  bgCard: "#FFFFFF",
  bgSub: "#F1EFE8",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const fmtR = (n) => `R ${Number(n||0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── FLOWBOARD CONSTANTS ──────────────────────────────────────────────────────
// OccHealth encounter types with colours
export const OCC_APPT_TYPES = {
  "Pre-employment":  { color: "#2563EB", light: "#DBEAFE" },
  "Periodic":        { color: "#0F6E56", light: "#E1F5EE" },
  "Exit medical":    { color: "#7C3AED", light: "#EDE9FE" },
  "IOD follow-up":   { color: "#DC2626", light: "#FEE2E2" },
  "Surveillance":    { color: "#0891B2", light: "#CFFAFE" },
  "Drug test":       { color: "#D97706", light: "#FEF3C7" },
  "Sick/acute":      { color: "#6B7280", light: "#F3F4F6" },
  "Chronic review":  { color: "#059669", light: "#D1FAE8" },
};

// Practitioner colours (first 5)
export const OHP_COLORS = [
  { color: "#0D6B6E", light: "#E8F4F4" },
  { color: "#7C3AED", light: "#EDE9FE" },
  { color: "#D97706", light: "#FEF3C7" },
  { color: "#DC2626", light: "#FEE2E2" },
  { color: "#059669", light: "#D1FAE8" },
];

// Mock flowboard data — OccHealth clinic session
export const MOCK_OCC_FLOWBOARD = [
  { id:"a1",  time:"07:30", hour:7.5,  dur:30,  person:"Sipho Nkosi",        job_title:"Boilermaker",      dept:"Maintenance",  type:"Pre-employment",  prac:"p1", bay:"Bay 1", status:"done",        arrived:true,  invoiced:true,  startedAt:"07:32",endedAt:"07:58", revenue:480, alerts:[] },
  { id:"a2",  time:"08:00", hour:8,    dur:20,  person:"Fatima Adams",       job_title:"Welder",           dept:"Production",   type:"Drug test",       prac:"p2", bay:"Bay 2", status:"done",        arrived:true,  invoiced:true,  startedAt:"08:02",endedAt:"08:19", revenue:280, alerts:[] },
  { id:"a3",  time:"08:30", hour:8.5,  dur:45,  person:"Johannes van Wyk",  job_title:"Machine operator", dept:"Production",   type:"Periodic",        prac:"p1", bay:"Bay 1", status:"done",        arrived:true,  invoiced:true,  startedAt:"08:33",endedAt:"09:14", revenue:550, alerts:["Hypertension — on treatment"] },
  { id:"a4",  time:"09:00", hour:9,    dur:30,  person:"Thandi Dlamini",    job_title:"Safety officer",   dept:"SHE",          type:"Chronic review",  prac:"p1", bay:"Bay 1", status:"in_progress", arrived:true,  invoiced:false, startedAt:"09:05",endedAt:null,   revenue:null, alerts:["Diabetic — check glucose"] },
  { id:"a5",  time:"09:30", hour:9.5,  dur:60,  person:"Marco Ferreira",    job_title:"Scaffolder",       dept:"Civil",        type:"Surveillance",    prac:"p2", bay:"Bay 2", status:"in_progress", arrived:true,  invoiced:false, startedAt:"09:35",endedAt:null,   revenue:null, alerts:["Audiometry + spirometry required"] },
  { id:"a6",  time:"10:00", hour:10,   dur:30,  person:"Brenda Mokoena",    job_title:"Cleaner",          dept:"Facilities",   type:"IOD follow-up",   prac:"p1", bay:"Bay 1", status:"waiting",     arrived:true,  invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:["Slip injury 14 days ago"] },
  { id:"a7",  time:"10:30", hour:10.5, dur:30,  person:"Andile Khumalo",    job_title:"Electrician",      dept:"Engineering",  type:"Pre-employment",  prac:"p2", bay:"Bay 2", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a8",  time:"11:00", hour:11,   dur:20,  person:"Pieter du Plessis", job_title:"Forklift operator",dept:"Logistics",    type:"Drug test",       prac:"p1", bay:"Bay 1", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a9",  time:"11:30", hour:11.5, dur:45,  person:"Nokukhanya Sitole", job_title:"Chemical worker",  dept:"Processing",   type:"Surveillance",    prac:"p2", bay:"Bay 2", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:["Bio-monitoring — urine sample required"] },
  { id:"a10", time:"12:30", hour:12.5, dur:30,  person:"Rory Campbell",     job_title:"Site manager",     dept:"Management",   type:"Periodic",        prac:"p1", bay:"Bay 1", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a11", time:"13:00", hour:13,   dur:45,  person:"Zanele Moyo",       job_title:"Lab technician",   dept:"Laboratory",   type:"Pre-employment",  prac:"p1", bay:"Bay 1", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a12", time:"13:30", hour:13.5, dur:20,  person:"Deon Swart",        job_title:"Driver",           dept:"Transport",    type:"Drug test",       prac:"p2", bay:"Bay 2", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a13", time:"14:00", hour:14,   dur:30,  person:"Priya Naidoo",      job_title:"Nurse",            dept:"Medical",      type:"Exit medical",    prac:"p1", bay:"Bay 1", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a14", time:"14:30", hour:14.5, dur:30,  person:"Lebo Sithole",      job_title:"Artisan",          dept:"Maintenance",  type:"Periodic",        prac:"p2", bay:"Bay 2", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
  { id:"a15", time:"15:00", hour:15,   dur:30,  person:"Yolanda Steyn",     job_title:"Admin clerk",      dept:"Admin",        type:"Chronic review",  prac:"p1", bay:"Bay 1", status:"scheduled",   arrived:false, invoiced:false, startedAt:null,   endedAt:null,   revenue:null, alerts:[] },
];

// Monthly register — 20 working days of clinic data
const generateOccMonthlyRegister = () => {
  const days = [];
  const today = new Date(2026, 5, 21);
  const types = Object.keys(OCC_APPT_TYPES);
  const seed = (d,p) => ((d*7+p*3)%100)/100;
  for (let d=0; d<25; d++) {
    const date = new Date(today); date.setDate(today.getDate()-d);
    if (date.getDay()===0||date.getDay()===6) continue;
    const dateStr = date.toISOString().slice(0,10);
    const pracData = ["p1","p2"].map((pid,pi) => {
      const s = seed(d,pi);
      const count = Math.floor(6 + s*6);
      let revenue = 0;
      const sessions = [];
      for (let i=0; i<count; i++) {
        const type = types[Math.floor(seed(d*10+i,pi)*types.length)];
        const rate = type==="Pre-employment"?480:type==="Periodic"?550:type==="Drug test"?280:type==="Surveillance"?620:type==="IOD follow-up"?420:400;
        const dur = type==="Surveillance"?60:type==="Pre-employment"?45:30;
        revenue += Math.round(rate*(0.85+seed(d+i,pi)*0.3));
        sessions.push({ type, dur, revenue: Math.round(rate*(0.85+seed(d+i,pi)*0.3)) });
      }
      const bookedMins = sessions.reduce((s,a)=>s+a.dur,0);
      return { pracId: pid, count, revenue, bookedMins, sessions };
    });
    const dayRevenue = pracData.reduce((s,p)=>s+p.revenue,0);
    const dayCount = pracData.reduce((s,p)=>s+p.count,0);
    days.push({ date:dateStr, label:date.toLocaleDateString("en-ZA",{weekday:"short",day:"numeric",month:"short"}), pracData, dayRevenue, dayCount });
  }
  return days.reverse();
};
export const MOCK_OCC_MONTHLY = generateOccMonthlyRegister();

// Stock / consumables defaults
export const MOCK_OCC_STOCK = [
  { id:"s1", name:"Drug test kits (urine, 6-panel)", category:"test_kits",    qty:48,  reorder:20, unit:"units",    lot:"DT2026-04", expiry:"2027-03-31", supplier:"Biosite", unit_cost:145 },
  { id:"s2", name:"Drug test kits (breath alcohol)", category:"test_kits",    qty:12,  reorder:8,  unit:"units",    lot:"BA2025-11", expiry:"2026-12-31", supplier:"Alco-Safe", unit_cost:210 },
  { id:"s3", name:"Venipuncture needles 21G",        category:"consumables",  qty:200, reorder:50, unit:"units",    lot:null,        expiry:null,         supplier:"Medipack", unit_cost:4.5 },
  { id:"s4", name:"Vacutainer tubes (EDTA)",         category:"consumables",  qty:80,  reorder:30, unit:"units",    lot:null,        expiry:"2027-06-30", supplier:"Medipack", unit_cost:8 },
  { id:"s5", name:"Nitrile gloves (M)",              category:"consumables",  qty:5,   reorder:10, unit:"boxes",    lot:null,        expiry:null,         supplier:"Medical Direct", unit_cost:85 },
  { id:"s6", name:"Urine specimen cups",             category:"consumables",  qty:60,  reorder:20, unit:"units",    lot:null,        expiry:null,         supplier:"Biosite", unit_cost:6 },
  { id:"s7", name:"BP cuff (adult)",                 category:"equipment",    qty:2,   reorder:1,  unit:"units",    lot:null,        expiry:null,         supplier:"Welch Allyn", unit_cost:1200 },
  { id:"s8", name:"Pulse oximeter",                  category:"equipment",    qty:2,   reorder:1,  unit:"units",    lot:null,        expiry:null,         supplier:"Nonin", unit_cost:950 },
];

export const MOCK_OCC_CALIBRATION = [
  { id:"c1", equip:"Audiometer (Maico MA 41)",     serial:"MA41-2024-0033", last:"2025-06-15", next:"2026-06-15", by:"SABS Accredited Lab",    cert_url:null },
  { id:"c2", equip:"Spirometer (MIR Spirolab)",    serial:"SL-2023-0117",  last:"2026-01-10", next:"2026-07-10", by:"MIR SA",                   cert_url:null },
  { id:"c3", equip:"Audiometric booth (IAC 400A)", serial:"IAC-2019-011",  last:"2025-11-20", next:"2026-11-20", by:"SABS Accredited Lab",    cert_url:null },
  { id:"c4", equip:"Breath alcohol (Lion SD400)",  serial:"SD4-2025-0044", last:"2026-03-05", next:"2026-09-05", by:"Lion Laboratories SA",   cert_url:null },
  { id:"c5", equip:"Weighing scale",               serial:"WS-2022-008",   last:"2025-12-01", next:"2026-12-01", by:"In-house",                 cert_url:null },
];

