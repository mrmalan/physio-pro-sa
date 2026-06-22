// packages/core/src/tariffs_physio.js
// NHRPL physiotherapy procedure codes (RPL tariff codes)
// Reference: National Health Reference Price List, Physiotherapy section
// All amounts in ZAR at 100% of NHRPL (schemes pay various % of this)
// ─────────────────────────────────────────────────────────────────────────────

export const PHYSIO_TARIFF_CODES = [
  // ── Consultations ──────────────────────────────────────────────────────────
  { code: "18530", description: "Initial consultation and assessment (≤30 min)", category: "consultation", unit_amount: 485.00, requires_icd10: true },
  { code: "18531", description: "Initial consultation and assessment (>30 min)", category: "consultation", unit_amount: 695.00, requires_icd10: true },
  { code: "18532", description: "Follow-up consultation (≤20 min)",             category: "consultation", unit_amount: 330.00, requires_icd10: true },
  { code: "18533", description: "Follow-up consultation (>20 min)",             category: "consultation", unit_amount: 485.00, requires_icd10: true },

  // ── Manual therapy ─────────────────────────────────────────────────────────
  { code: "18540", description: "Spinal manipulation — cervical",               category: "manual_therapy", unit_amount: 420.00, requires_icd10: true },
  { code: "18541", description: "Spinal manipulation — thoracic",               category: "manual_therapy", unit_amount: 420.00, requires_icd10: true },
  { code: "18542", description: "Spinal manipulation — lumbar",                 category: "manual_therapy", unit_amount: 420.00, requires_icd10: true },
  { code: "18543", description: "Joint mobilisation (per region)",              category: "manual_therapy", unit_amount: 310.00, requires_icd10: true },
  { code: "18544", description: "Soft tissue mobilisation (per 15 min)",       category: "manual_therapy", unit_amount: 245.00, requires_icd10: true },
  { code: "18545", description: "Dry needling (per region)",                   category: "manual_therapy", unit_amount: 385.00, requires_icd10: true },

  // ── Electrotherapy / modalities ───────────────────────────────────────────
  { code: "18550", description: "Ultrasound therapy",                           category: "electrotherapy", unit_amount: 185.00, requires_icd10: false },
  { code: "18551", description: "TENS / interferential current",                category: "electrotherapy", unit_amount: 185.00, requires_icd10: false },
  { code: "18552", description: "Laser therapy (per area)",                     category: "electrotherapy", unit_amount: 225.00, requires_icd10: false },
  { code: "18553", description: "Shockwave therapy",                            category: "electrotherapy", unit_amount: 450.00, requires_icd10: false },
  { code: "18554", description: "Traction — mechanical",                        category: "electrotherapy", unit_amount: 210.00, requires_icd10: false },
  { code: "18555", description: "Hot/cold pack application",                    category: "electrotherapy", unit_amount: 95.00,  requires_icd10: false },

  // ── Exercise therapy ──────────────────────────────────────────────────────
  { code: "18560", description: "Individual therapeutic exercise (per 30 min)", category: "exercise", unit_amount: 310.00, requires_icd10: true },
  { code: "18561", description: "Group exercise (per session)",                 category: "exercise", unit_amount: 195.00, requires_icd10: true },
  { code: "18562", description: "Hydrotherapy (per session)",                   category: "exercise", unit_amount: 420.00, requires_icd10: true },
  { code: "18563", description: "Balance and proprioception training",          category: "exercise", unit_amount: 285.00, requires_icd10: true },
  { code: "18564", description: "Pilates-based rehabilitation (individual)",    category: "exercise", unit_amount: 420.00, requires_icd10: true },

  // ── Neurological rehab ─────────────────────────────────────────────────────
  { code: "18570", description: "Neurological rehabilitation (per 30 min)",    category: "neuro", unit_amount: 485.00, requires_icd10: true },
  { code: "18571", description: "Bobath / NDT treatment session",              category: "neuro", unit_amount: 510.00, requires_icd10: true },

  // ── Paediatric ────────────────────────────────────────────────────────────
  { code: "18580", description: "Paediatric physiotherapy — initial",          category: "paediatric", unit_amount: 595.00, requires_icd10: true },
  { code: "18581", description: "Paediatric physiotherapy — follow-up",        category: "paediatric", unit_amount: 420.00, requires_icd10: true },

  // ── Assessment / outcome measures ─────────────────────────────────────────
  { code: "18590", description: "Functional capacity evaluation (per hr)",     category: "assessment", unit_amount: 650.00, requires_icd10: true },
  { code: "18591", description: "Ergonomic workplace assessment",              category: "assessment", unit_amount: 850.00, requires_icd10: false },
  { code: "18592", description: "Postural / biomechanical assessment",         category: "assessment", unit_amount: 485.00, requires_icd10: true },

  // ── Reports and admin ────────────────────────────────────────────────────
  { code: "18600", description: "Medico-legal report",                         category: "admin", unit_amount: 950.00, requires_icd10: false },
  { code: "18601", description: "Progress report to referring practitioner",   category: "admin", unit_amount: 285.00, requires_icd10: false },
  { code: "18602", description: "Home exercise programme preparation",         category: "admin", unit_amount: 185.00, requires_icd10: false },
];

export const TARIFF_CATEGORIES = [
  { id: "consultation",   label: "Consultation" },
  { id: "manual_therapy", label: "Manual therapy" },
  { id: "electrotherapy", label: "Electrotherapy / modalities" },
  { id: "exercise",       label: "Exercise therapy" },
  { id: "neuro",          label: "Neurological rehab" },
  { id: "paediatric",     label: "Paediatric" },
  { id: "assessment",     label: "Assessment" },
  { id: "admin",          label: "Reports / admin" },
];

export function getTariffByCode(code) {
  return PHYSIO_TARIFF_CODES.find(t => t.code === code) || null;
}

export function searchTariffs(query) {
  const q = query.toLowerCase();
  return PHYSIO_TARIFF_CODES.filter(t =>
    t.code.includes(q) || t.description.toLowerCase().includes(q)
  );
}
