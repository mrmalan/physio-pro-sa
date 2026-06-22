import { useContext, useState } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { PHYSIO_TARIFF_CODES, searchICD10, searchTariffs, USE_MOCK } from "@prosa/core";

const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 4 };

const BODY_REGIONS = ["Cervical spine","Thoracic spine","Lumbar spine","Shoulder","Elbow",
  "Wrist/Hand","Hip","Knee","Ankle/Foot","Neurological","Cardiopulmonary","Paediatric","Other"];
const MODALITIES = ["TENS/IFC","Ultrasound","Laser","Shockwave","Traction",
  "Hot pack","Cold pack","Dry needling","Hydrotherapy","Pilates rehab","Manual therapy"];

// ── Sign & Finalise Modal ─────────────────────────────────────────────────────
const SignModal = ({ note, patient, episode, practitionerId, db, onSigned, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const selectedTariffs = PHYSIO_TARIFF_CODES.filter(t => note.tariff_codes.includes(t.code));
  const total = selectedTariffs.reduce((s, t) => s + t.unit_amount, 0);

  const sign = async () => {
    if (!note.assessment) { setError("Assessment is required before signing."); return; }
    setSaving(true); setError("");

    const signedAt  = new Date().toISOString();
    const noteDate  = note.note_date;

    if (USE_MOCK) {
      onSigned({ ...note, signed: true, signed_at: signedAt, id: `mock_note_${Date.now()}` });
      return;
    }
    if (!practitionerId) { setError("Practitioner record not loaded."); setSaving(false); return; }

    // 1. Save the clinical note
    const notePayload = {
      practitioner_id: practitionerId,
      patient_id:      note.patient_id,
      episode_id:      note.episode_id || null,
      note_date:       noteDate,
      subjective:      note.subjective || null,
      objective:       note.objective  || null,
      assessment:      note.assessment,
      plan:            note.plan       || null,
      body_regions:    note.body_regions.length ? note.body_regions : null,
      modalities:      note.modalities.length  ? note.modalities  : null,
      tariff_codes:    note.tariff_codes.length ? note.tariff_codes : null,
      icd10_primary:   note.icd10_primary || null,
      signed:          true,
      signed_at:       signedAt,
    };
    const { data: noteData, error: noteErr } = await db.from("clinical_note").insert(notePayload);
    if (noteErr || !noteData?.[0]) {
      setError(`Failed to save note: ${noteErr?.message || JSON.stringify(noteErr)}`);
      setSaving(false); return;
    }
    const savedNoteId = noteData[0].id;

    // 2. Create one claim per tariff code
    const claimErrors = [];
    for (const tariff of selectedTariffs) {
      if (!note.icd10_primary) continue; // claim needs ICD-10
      const claimPayload = {
        practitioner_id: practitionerId,
        patient_id:      note.patient_id,
        episode_id:      note.episode_id || null,
        note_id:         savedNoteId,
        claim_date:      noteDate,
        scheme_code:     patient?.medical_aid_id ? patient.medical_aid_id.toUpperCase().slice(0,4) : null,
        member_number:   patient?.medical_aid_number || null,
        dependant_code:  patient?.dependant_code || "00",
        tariff_code:     tariff.code,
        icd10_code:      note.icd10_primary,
        description:     tariff.description,
        quantity:        1,
        unit_amount:     tariff.unit_amount,
        total_amount:    tariff.unit_amount,
        status:          patient?.medical_aid_id ? "ready" : "draft",
        switch:          "manual",
      };
      const { error: claimErr } = await db.from("medical_aid_claim").insert(claimPayload);
      if (claimErr) claimErrors.push(tariff.code);
    }

    if (claimErrors.length) {
      setError(`Note saved but claims failed for: ${claimErrors.join(", ")}. Check Medical Aid screen.`);
      setSaving(false); return;
    }

    onSigned({ ...noteData[0] });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 460,
        boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>Sign & finalise note</div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.red }}>{error}</div>}

          <div style={{ fontSize: 13, color: C.textSub }}>
            Signing will finalise this note and generate claim
            {selectedTariffs.length !== 1 ? "s" : ""} for submission.
          </div>

          {/* Note summary */}
          <Card style={{ background: C.tealLight }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8 }}>Note summary</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
              <div><strong>Date:</strong> {note.note_date}</div>
              {note.icd10_primary && <div><strong>ICD-10:</strong> {note.icd10_primary}</div>}
              {note.body_regions.length > 0 && <div><strong>Regions:</strong> {note.body_regions.join(", ")}</div>}
              {note.modalities.length > 0 && <div><strong>Modalities:</strong> {note.modalities.join(", ")}</div>}
            </div>
          </Card>

          {/* Claims to be created */}
          {selectedTariffs.length > 0 ? (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8 }}>
                Claims to generate ({selectedTariffs.length})
              </div>
              {selectedTariffs.map(t => (
                <div key={t.code} style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span><strong>{t.code}</strong> — {t.description}</span>
                  <span style={{ color: C.teal, fontWeight: 600 }}>R{t.unit_amount.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between",
                fontWeight: 700, paddingTop: 8, marginTop: 4 }}>
                <span>Total (100% NHRPL)</span>
                <span style={{ color: C.teal }}>R{total.toFixed(2)}</span>
              </div>
              {!note.icd10_primary && (
                <div style={{ marginTop: 8, fontSize: 12, color: C.amber }}>
                  ⚠ No ICD-10 code — claims will not be generated without one
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div style={{ fontSize: 13, color: C.textSub }}>
                No tariff codes selected — note will be signed but no claims generated.
              </div>
            </Card>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={sign} disabled={saving}>
            {saving ? "Signing..." : "Sign & generate claims"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Clinical Note Screen ──────────────────────────────────────────────────────
export const ClinicalNote = ({ navigate }) => {
  const { patients, episodes, db, practitionerId, setLiveNotes, setLiveClaims } = useContext(DataContext);

  const EMPTY_NOTE = {
    patient_id: "", episode_id: "",
    note_date: new Date().toISOString().split("T")[0],
    subjective: "", objective: "", assessment: "", plan: "",
    body_regions: [], modalities: [],
    tariff_codes: [], icd10_primary: "",
    signed: false,
  };
  const [note, setNote]       = useState(EMPTY_NOTE);
  const [tab, setTab]         = useState("soap");
  const [tariffSearch, setTariffSearch] = useState("");
  const [icd10Search, setIcd10Search]   = useState("");
  const [showSign, setShowSign]         = useState(false);
  const [signedNote, setSignedNote]     = useState(null);
  const set  = (k, v) => setNote(n => ({ ...n, [k]: v }));
  const toggle = (k, val) => setNote(n => ({
    ...n, [k]: n[k].includes(val) ? n[k].filter(x => x !== val) : [...n[k], val]
  }));

  const tariffResults  = tariffSearch.length > 1 ? searchTariffs(tariffSearch).slice(0, 8) : [];
  const icd10Results   = icd10Search.length > 1  ? searchICD10(icd10Search).slice(0, 8)   : [];
  const selectedTariffs = PHYSIO_TARIFF_CODES.filter(t => note.tariff_codes.includes(t.code));
  const totalAmount     = selectedTariffs.reduce((s, t) => s + t.unit_amount, 0);

  const ptEpisodes = note.patient_id
    ? episodes.filter(e => e.patient_id === note.patient_id && e.status === "active")
    : [];
  const selectedPatient = patients.find(p => p.id === note.patient_id);

  const handleSigned = (saved) => {
    setSignedNote(saved);
    setShowSign(false);
    if (saved.id) {
      setLiveNotes(prev => prev ? [saved, ...prev] : [saved]);
    }
  };

  const startNew = () => { setNote(EMPTY_NOTE); setSignedNote(null); setTab("soap"); };

  const TABS = [
    { id: "soap",      label: "SOAP note" },
    { id: "billing",   label: `Billing${note.tariff_codes.length ? ` (${note.tariff_codes.length})` : ""}` },
    { id: "modalities",label: "Modalities" },
  ];

  // ── Signed confirmation screen ────────────────────────────────────────────
  if (signedNote) {
    const tariffs = PHYSIO_TARIFF_CODES.filter(t => (signedNote.tariff_codes || []).includes(t.code));
    return (
      <div>
        <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.teal, marginBottom: 4 }}>Note signed</div>
          <div style={{ color: C.textSub, fontSize: 13 }}>
            {tariffs.length > 0
              ? `${tariffs.length} claim${tariffs.length !== 1 ? "s" : ""} generated — R${tariffs.reduce((s,t)=>s+t.unit_amount,0).toFixed(2)} total`
              : "Note finalised with no claims"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Btn variant="secondary" onClick={startNew}>+ New note</Btn>
          <Btn onClick={() => navigate("medicalaid")}>View claims →</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Clinical note</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => {}}>Save draft</Btn>
          <Btn onClick={() => {
            if (!note.patient_id) return;
            setShowSign(true);
          }}>Sign & finalise</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === t.id ? C.teal : C.tealLight,
              color: tab === t.id ? "#fff" : C.teal, fontWeight: 600, fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SOAP tab ── */}
      {tab === "soap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Patient + date row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 10 }}>
            <div>
              <label style={lbl}>Patient *</label>
              <select style={inp} value={note.patient_id}
                onChange={e => { set("patient_id", e.target.value); set("episode_id", ""); }}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Episode of care</label>
              <select style={inp} value={note.episode_id} onChange={e => set("episode_id", e.target.value)}
                disabled={!note.patient_id}>
                <option value="">No episode / once-off</option>
                {ptEpisodes.map(e => (
                  <option key={e.id} value={e.id}>{e.diagnosis} ({e.icd10_primary})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" style={inp} value={note.note_date}
                onChange={e => set("note_date", e.target.value)} />
            </div>
          </div>

          {/* SOAP fields */}
          {[
            { key: "subjective",  label: "Subjective",  placeholder: "Patient's reported symptoms, pain scores (e.g. 6/10), functional limitations, what aggravates/relieves..." },
            { key: "objective",   label: "Objective",   placeholder: "ROM measurements, special test results, palpation findings, posture observations..." },
            { key: "assessment",  label: "Assessment",  placeholder: "Clinical diagnosis, problem list, response to treatment, progress towards goals..." },
            { key: "plan",        label: "Plan",        placeholder: "Treatment applied today, home exercise programme, next session plan, referrals..." },
          ].map(({ key, label, placeholder }) => (
            <Card key={key} style={{ padding: "0.75rem" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.teal,
                textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
              <textarea value={note[key]} onChange={e => set(key, e.target.value)}
                rows={key === "assessment" ? 3 : 4} placeholder={placeholder}
                style={{ width: "100%", marginTop: 8, padding: 8, border: `1px solid ${C.border}`,
                  borderRadius: 6, fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", boxSizing: "border-box" }} />
            </Card>
          ))}

          {/* Body regions */}
          <Card style={{ padding: "0.875rem" }}>
            <label style={{ ...lbl, marginBottom: 8 }}>Body regions treated</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BODY_REGIONS.map(r => (
                <button key={r} onClick={() => toggle("body_regions", r)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontSize: 12,
                    background: note.body_regions.includes(r) ? C.teal : "#fff",
                    color: note.body_regions.includes(r) ? "#fff" : C.text }}>
                  {r}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === "billing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* ICD-10 */}
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ICD-10 primary diagnosis code</div>
            <div style={{ position: "relative" }}>
              <input style={inp} value={icd10Search || note.icd10_primary}
                onChange={e => setIcd10Search(e.target.value)}
                placeholder="Search — e.g. 'back pain' or 'M54'" />
              {icd10Results.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
                  {icd10Results.map(r => (
                    <div key={r.code}
                      onClick={() => { set("icd10_primary", r.code); setIcd10Search(""); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13,
                        display: "flex", gap: 10, borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{r.code}</span>
                      <span>{r.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {note.icd10_primary && !icd10Search && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: C.tealLight,
                borderRadius: 6, fontSize: 13, color: C.teal, fontWeight: 600 }}>
                ✓ {note.icd10_primary}
              </div>
            )}
          </Card>

          {/* Tariff codes */}
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Procedure / tariff codes (NHRPL)</div>
            <input style={inp} value={tariffSearch} onChange={e => setTariffSearch(e.target.value)}
              placeholder="Search — e.g. 'manipulation' or '18533'" />
            {tariffResults.length > 0 && (
              <div style={{ marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
                {tariffResults.map(t => (
                  <div key={t.code} onClick={() => { toggle("tariff_codes", t.code); setTariffSearch(""); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13,
                      display: "flex", gap: 10, alignItems: "center",
                      borderBottom: `1px solid ${C.border}`,
                      background: note.tariff_codes.includes(t.code) ? C.tealLight : "transparent" }}
                    onMouseEnter={e => { if (!note.tariff_codes.includes(t.code)) e.currentTarget.style.background = "#f8fafa"; }}
                    onMouseLeave={e => { if (!note.tariff_codes.includes(t.code)) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{t.code}</span>
                    <span style={{ flex: 1 }}>{t.description}</span>
                    <span style={{ color: C.textSub, flexShrink: 0 }}>R{t.unit_amount.toFixed(2)}</span>
                    {note.tariff_codes.includes(t.code) && <span style={{ color: C.teal }}>✓</span>}
                  </div>
                ))}
              </div>
            )}

            {selectedTariffs.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Selected</div>
                {selectedTariffs.map(t => (
                  <div key={t.code} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ flex: 1 }}>{t.code} — {t.description}</span>
                    <span style={{ color: C.teal, fontWeight: 600, marginLeft: 12 }}>R{t.unit_amount.toFixed(2)}</span>
                    <button onClick={() => toggle("tariff_codes", t.code)}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: C.textSub, fontSize: 16, marginLeft: 8 }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700,
                  paddingTop: 8, marginTop: 8, borderTop: `1px solid ${C.border}` }}>
                  <span>Total (100% NHRPL)</span>
                  <span style={{ color: C.teal }}>R{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Modalities tab ── */}
      {tab === "modalities" && (
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Modalities used this session</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MODALITIES.map(m => (
              <button key={m} onClick={() => toggle("modalities", m)}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${C.border}`,
                  cursor: "pointer", fontSize: 13,
                  background: note.modalities.includes(m) ? C.teal : "#fff",
                  color: note.modalities.includes(m) ? "#fff" : C.text }}>
                {m}
              </button>
            ))}
          </div>
          {note.modalities.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`,
              fontSize: 13, color: C.textSub }}>
              Selected: {note.modalities.join(" · ")}
            </div>
          )}
        </Card>
      )}

      {/* Sign modal */}
      {showSign && (
        <SignModal
          note={note}
          patient={selectedPatient}
          episode={episodes.find(e => e.id === note.episode_id)}
          practitionerId={practitionerId}
          db={db}
          onSigned={handleSigned}
          onClose={() => setShowSign(false)}
        />
      )}
    </div>
  );
};
