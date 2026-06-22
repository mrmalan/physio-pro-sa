// packages/core/src/billing.js
// Medical aid billing engine — shared across all allied health products
// Physio Pro SA, OT Pro SA, Psychology Pro SA, SLT Pro SA all import from here.
// ─────────────────────────────────────────────────────────────────────────────

// ── SA Medical Aid Schemes ────────────────────────────────────────────────────
export const SA_SCHEMES = [
  { id: "discovery",    name: "Discovery Health",        code: "DISC", switch: "mediswitch" },
  { id: "medshield",   name: "Medshield",               code: "MEDS", switch: "mediswitch" },
  { id: "bonitas",     name: "Bonitas",                  code: "BONI", switch: "mediswitch" },
  { id: "gems",        name: "GEMS",                     code: "GEMS", switch: "mediswitch" },
  { id: "fedhealth",   name: "Fedhealth",                code: "FEDH", switch: "mediswitch" },
  { id: "momentum",    name: "Momentum Health",          code: "MOME", switch: "mediswitch" },
  { id: "bestmed",     name: "Bestmed",                  code: "BEST", switch: "mediswitch" },
  { id: "profmed",     name: "Profmed",                  code: "PROF", switch: "mediswitch" },
  { id: "selfmed",     name: "Selfmed",                  code: "SELF", switch: "mediswitch" },
  { id: "hosmed",      name: "Hosmed",                   code: "HOSM", switch: "mediswitch" },
  { id: "compcare",    name: "CompCare",                 code: "COMP", switch: "mediswitch" },
  { id: "netcare",     name: "Netcare Medical Aid",      code: "NETC", switch: "mediswitch" },
  { id: "keyhealth",   name: "KeyHealth",                code: "KEYH", switch: "mediswitch" },
  { id: "medihelp",    name: "Medihelp",                 code: "MDLP", switch: "mediswitch" },
  { id: "la_health",   name: "LA Health",                code: "LAHE", switch: "mediswitch" },
];

// ── Plan types (generic — scheme-specific plans loaded per scheme) ────────────
export const PLAN_TYPES = [
  "Executive", "Comprehensive", "Classic", "Essential", "Core",
  "Primary", "Smart", "Foundation", "Hospital", "Custom",
];

// ── Benefit tracker ───────────────────────────────────────────────────────────
// Tracks sessions used vs limit per patient per scheme benefit year.
// Benefit year typically Jan 1 – Dec 31 but some schemes use Mar 1.
export function createBenefitRecord(patientId, schemeId, planName, benefitYear = new Date().getFullYear()) {
  return {
    patient_id: patientId,
    scheme_id: schemeId,
    plan_name: planName,
    benefit_year: benefitYear,
    sessions_authorised: null,   // null = unknown / open benefit
    sessions_used: 0,
    sessions_remaining: null,
    last_claim_date: null,
    pre_auth_required: false,
    pre_auth_number: null,
    notes: "",
  };
}

export function updateBenefitUsed(record, sessionCount = 1) {
  const used = (record.sessions_used || 0) + sessionCount;
  const remaining = record.sessions_authorised != null
    ? Math.max(0, record.sessions_authorised - used)
    : null;
  return { ...record, sessions_used: used, sessions_remaining: remaining, last_claim_date: new Date().toISOString().split("T")[0] };
}

export function benefitAlert(record) {
  if (!record || record.sessions_authorised == null) return null;
  const rem = record.sessions_remaining ?? (record.sessions_authorised - record.sessions_used);
  if (rem <= 0) return { level: "error",   message: `Benefit exhausted — ${record.sessions_used}/${record.sessions_authorised} sessions used` };
  if (rem === 1) return { level: "warning", message: `Last session remaining on ${record.plan_name}` };
  if (rem <= 3) return { level: "warning", message: `${rem} sessions remaining on ${record.plan_name}` };
  return null;
}

// ── Claim status lifecycle ────────────────────────────────────────────────────
export const CLAIM_STATUSES = ["draft", "ready", "submitted", "acknowledged", "paid", "short_paid", "rejected", "appealed"];

export function claimStatusLabel(status) {
  return {
    draft:        "Draft",
    ready:        "Ready to submit",
    submitted:    "Submitted",
    acknowledged: "Acknowledged",
    paid:         "Paid",
    short_paid:   "Short-paid",
    rejected:     "Rejected",
    appealed:     "Under appeal",
  }[status] || status;
}

export function claimStatusColor(status) {
  return {
    draft:        "#94a3b8",
    ready:        "#3b82f6",
    submitted:    "#f59e0b",
    acknowledged: "#8b5cf6",
    paid:         "#10b981",
    short_paid:   "#f97316",
    rejected:     "#ef4444",
    appealed:     "#ec4899",
  }[status] || "#94a3b8";
}

// ── ERA (Electronic Remittance Advice) rejection reasons ─────────────────────
export const ERA_REJECTION_REASONS = {
  "001": "Not a benefit",
  "002": "Benefit limit exhausted",
  "003": "Pre-authorisation required",
  "004": "Pre-authorisation not obtained",
  "005": "Member not registered",
  "006": "Dependant not registered",
  "007": "Claim submitted late",
  "008": "Service not covered on plan",
  "009": "Tariff code incorrect",
  "010": "ICD-10 code required",
  "011": "ICD-10 code invalid",
  "012": "Duplicate claim",
  "013": "Member not active on date of service",
  "014": "Provider not registered with scheme",
  "015": "Quantity exceeds limit",
  "016": "Short-payment — tariff rate applied",
};

// ── Switch accreditation status ───────────────────────────────────────────────
// Tracks where we are in MediSwitch/MediKredit accreditation.
// Manual CSV export path is the interim workaround until accreditation completes.
export const SWITCH_STATUS = {
  mediswitch: "pending_accreditation",  // update to "live" when accredited
  medikredit: "not_started",
};

export const SWITCH_ACCREDITATION_STEPS = [
  "Contact SwitchOn/MediSwitch accreditation team",
  "Submit PMS vendor application + company registration",
  "Receive test credentials + sandbox environment",
  "Build and test claim submission against sandbox",
  "Submit 50 production test claims for validation",
  "Receive production accreditation certificate",
  "Go live with real-time submission",
];

// ── Manual claim CSV export (pre-accreditation path) ─────────────────────────
// Generates a CSV that practice admin can upload to scheme portals manually.
// Format is generic — each scheme has a slightly different portal format,
// but this covers the common fields used by Discovery, Bonitas, Medshield.
export function generateClaimCSV(claims) {
  const headers = [
    "ClaimDate", "PatientSurname", "PatientFirstName", "MemberNumber",
    "DependantCode", "SchemeCode", "PlanCode", "TariffCode",
    "ICD10Code", "Quantity", "UnitAmount", "TotalAmount",
    "TreatingProvider", "HPCSANumber", "DiagnosisDescription", "Notes",
  ];
  const rows = claims.map(c => [
    c.claim_date,
    c.patient_surname,
    c.patient_first_name,
    c.member_number,
    c.dependant_code || "00",
    c.scheme_code,
    c.plan_code || "",
    c.tariff_code,
    c.icd10_code,
    c.quantity || 1,
    (c.unit_amount || 0).toFixed(2),
    (c.total_amount || 0).toFixed(2),
    c.treating_provider,
    c.hpcsa_number || "",
    c.diagnosis_description || "",
    c.notes || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  return csv;
}

// ── Invoice → claim bridge ────────────────────────────────────────────────────
// Converts a draft invoice into a claim-ready structure.
export function invoiceToClaim(invoice, patient, practitioner, scheme) {
  return invoice.lines.map(line => ({
    claim_date: invoice.invoice_date,
    patient_surname: patient.last_name,
    patient_first_name: patient.first_name,
    member_number: patient.medical_aid_number,
    dependant_code: patient.dependant_code || "00",
    scheme_code: scheme?.code || "",
    plan_code: patient.plan_name || "",
    tariff_code: line.tariff_code,
    icd10_code: line.icd10_code || invoice.icd10_primary,
    quantity: line.quantity || 1,
    unit_amount: line.unit_amount,
    total_amount: (line.quantity || 1) * line.unit_amount,
    treating_provider: practitioner.name,
    hpcsa_number: practitioner.hpcsa_number,
    diagnosis_description: line.description,
    notes: "",
  }));
}
