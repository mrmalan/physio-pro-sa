// packages/core/src/icd10.js
// ICD-10 codes most commonly used in SA physiotherapy practice
// Full ICD-10 database is licensed — this is a curated physio-relevant subset
// for code suggestion from SOAP assessment text via AI, and manual lookup.
// ─────────────────────────────────────────────────────────────────────────────

export const ICD10_PHYSIO = [
  // ── Musculoskeletal — spine ───────────────────────────────────────────────
  { code: "M54.2",  description: "Cervicalgia (neck pain)" },
  { code: "M54.4",  description: "Lumbago with sciatica" },
  { code: "M54.5",  description: "Low back pain" },
  { code: "M54.3",  description: "Sciatica" },
  { code: "M47.8",  description: "Spondylosis with radiculopathy" },
  { code: "M51.1",  description: "Lumbar and other intervertebral disc degeneration with radiculopathy" },
  { code: "M51.0",  description: "Lumbar disc herniation" },
  { code: "M48.0",  description: "Spinal stenosis" },
  { code: "M43.1",  description: "Spondylolisthesis" },
  { code: "M50.1",  description: "Cervical disc disorder with radiculopathy" },

  // ── Musculoskeletal — shoulder ────────────────────────────────────────────
  { code: "M75.1",  description: "Rotator cuff tear / syndrome" },
  { code: "M75.0",  description: "Adhesive capsulitis of shoulder (frozen shoulder)" },
  { code: "M75.2",  description: "Bicipital tendinitis" },
  { code: "M75.3",  description: "Calcific tendinitis of shoulder" },
  { code: "M75.5",  description: "Bursitis of shoulder" },
  { code: "S40.0",  description: "Contusion of shoulder" },
  { code: "S43.0",  description: "Dislocation of shoulder joint" },

  // ── Musculoskeletal — elbow / forearm ─────────────────────────────────────
  { code: "M77.1",  description: "Lateral epicondylitis (tennis elbow)" },
  { code: "M77.0",  description: "Medial epicondylitis (golfer's elbow)" },
  { code: "M70.2",  description: "Olecranon bursitis" },

  // ── Musculoskeletal — wrist / hand ────────────────────────────────────────
  { code: "G56.0",  description: "Carpal tunnel syndrome" },
  { code: "M65.3",  description: "De Quervain's tenosynovitis" },
  { code: "M72.0",  description: "Palmar fasciitis (Dupuytren's)" },

  // ── Musculoskeletal — hip ─────────────────────────────────────────────────
  { code: "M16.0",  description: "Primary osteoarthritis of hip" },
  { code: "M70.6",  description: "Trochanteric bursitis" },
  { code: "M76.1",  description: "Psoas tendinitis" },
  { code: "S72.0",  description: "Fracture of femoral neck" },

  // ── Musculoskeletal — knee ────────────────────────────────────────────────
  { code: "M17.0",  description: "Primary osteoarthritis of knee" },
  { code: "M23.2",  description: "Derangement of meniscus due to old tear" },
  { code: "M76.5",  description: "Patellar tendinitis (jumper's knee)" },
  { code: "M22.2",  description: "Patellofemoral syndrome / chondromalacia patellae" },
  { code: "M70.4",  description: "Prepatellar bursitis" },
  { code: "S83.2",  description: "Tear of medial meniscus, current injury" },

  // ── Musculoskeletal — ankle / foot ────────────────────────────────────────
  { code: "M79.3",  description: "Plantar fasciitis" },
  { code: "M76.6",  description: "Achilles tendinitis" },
  { code: "S93.4",  description: "Sprain of ankle" },
  { code: "M77.3",  description: "Calcaneal spur" },

  // ── Post-surgical ─────────────────────────────────────────────────────────
  { code: "Z96.6",  description: "Presence of orthopaedic joint implant (post TKR/THR)" },
  { code: "Z96.64", description: "Presence of knee joint implant" },
  { code: "Z96.63", description: "Presence of hip joint implant" },
  { code: "Z47.8",  description: "Other orthopaedic follow-up care" },

  // ── Neurological ──────────────────────────────────────────────────────────
  { code: "G35",    description: "Multiple sclerosis" },
  { code: "G20",    description: "Parkinson's disease" },
  { code: "G81.9",  description: "Hemiplegia, unspecified" },
  { code: "G82.2",  description: "Paraplegia" },
  { code: "I69.3",  description: "Sequelae of cerebral infarction (stroke)" },
  { code: "G54.2",  description: "Cervical root disorders" },
  { code: "G54.4",  description: "Lumbosacral root disorders" },

  // ── Sports / soft tissue ──────────────────────────────────────────────────
  { code: "M79.1",  description: "Myalgia" },
  { code: "M79.0",  description: "Fibromyalgia / fibrositis" },
  { code: "M62.4",  description: "Contracture of muscle" },
  { code: "S09.9",  description: "Head injury, unspecified (post-concussion)" },

  // ── Paediatric ────────────────────────────────────────────────────────────
  { code: "Q65.0",  description: "Congenital dislocation of hip (DDH)" },
  { code: "M41.0",  description: "Infantile idiopathic scoliosis" },
  { code: "G80.0",  description: "Spastic cerebral palsy" },
  { code: "P10.0",  description: "Subdural haematoma (birth trauma)" },

  // ── Cardiopulmonary / chest physio ────────────────────────────────────────
  { code: "J44.1",  description: "COPD with acute exacerbation" },
  { code: "J18.9",  description: "Pneumonia, unspecified" },
  { code: "J20.9",  description: "Acute bronchitis" },
  { code: "I50.9",  description: "Heart failure (cardiac rehab)" },
  { code: "Z96.61", description: "Post cardiac surgery rehabilitation" },

  // ── Women's health ────────────────────────────────────────────────────────
  { code: "N81.2",  description: "Incomplete uterovaginal prolapse" },
  { code: "N39.4",  description: "Stress urinary incontinence" },
  { code: "O26.7",  description: "Symphysis pubis dysfunction" },
  { code: "M53.3",  description: "Sacrococcygeal disorders" },
];

export function searchICD10(query) {
  const q = query.toLowerCase();
  return ICD10_PHYSIO.filter(c =>
    c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  ).slice(0, 20);
}

export function getICD10(code) {
  return ICD10_PHYSIO.find(c => c.code === code) || null;
}
