import { useContext, useState } from "react";
import { DataContext, AuthContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES, USE_MOCK, benefitAlert, searchICD10 } from "@prosa/core";

const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 4 };

const NewEpisodeModal = ({ onClose, onSaved, db, patients, practitionerId }) => {
  const EMPTY = {
    patient_id: "", diagnosis: "", icd10_primary: "",
    start_date: new Date().toISOString().split("T")[0],
    sessions_planned: "", medical_aid_id: "",
    benefit_year: new Date().getFullYear(), sessions_authorised: "",
  };
  const [form, setForm]   = useState(EMPTY);
  const [icd10Query, setIcd10Query] = useState("");
  const [icd10Results, setIcd10Results] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleIcd10Search = (q) => {
    setIcd10Query(q);
    setIcd10Results(q.length > 1 ? searchICD10(q) : []);
  };

  const selectIcd10 = (code, desc) => {
    set("icd10_primary", code);
    if (!form.diagnosis) set("diagnosis", desc);
    setIcd10Query(""); setIcd10Results([]);
  };

  const handlePatientChange = (id) => {
    set("patient_id", id);
    const pt = patients.find(p => p.id === id);
    if (pt?.medical_aid_id)      set("medical_aid_id", pt.medical_aid_id);
    if (pt?.sessions_authorised) set("sessions_authorised", pt.sessions_authorised);
  };

  const save = async () => {
    if (!form.patient_id)    { setError("Select a patient."); return; }
    if (!form.diagnosis)     { setError("Diagnosis is required."); return; }
    if (!form.icd10_primary) { setError("ICD-10 code is required."); return; }
    setSaving(true); setError("");
    const payload = { patient_id: form.patient_id, diagnosis: form.diagnosis,
      icd10_primary: form.icd10_primary, start_date: form.start_date, status: "active" };
    if (form.sessions_planned)    payload.sessions_planned    = Number(form.sessions_planned);
    if (form.medical_aid_id)      payload.medical_aid_id      = form.medical_aid_id;
    if (form.benefit_year)        payload.benefit_year        = Number(form.benefit_year);
    if (form.sessions_authorised) payload.sessions_authorised = Number(form.sessions_authorised);

    if (USE_MOCK) {
      onSaved({ ...payload, id: `mock_ep_${Date.now()}`, sessions_completed: 0, sessions_used: 0 });
      return;
    }
    if (!practitionerId) { setError("Practitioner record not loaded yet — try again."); setSaving(false); return; }
    payload.practitioner_id = practitionerId;
    const { data, error: err } = await db.from("episode_of_care").insert(payload);
    if (err || !data?.[0]) { setError(`Save failed: ${err?.message || JSON.stringify(err)}`); setSaving(false); return; }
    onSaved(data[0]);
  };

  const selectedPatient = patients.find(p => p.id === form.patient_id);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520,
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>New episode of care</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
        </div>
        <div style={{ padding: "1rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
            padding: "8px 12px", fontSize: 12, color: C.red }}>{error}</div>}

          <div>
            <label style={lbl}>Patient *</label>
            <select style={inp} value={form.patient_id} onChange={e => handlePatientChange(e.target.value)}>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
            {selectedPatient?.medical_aid_id && (
              <div style={{ fontSize: 11, color: C.teal, marginTop: 4 }}>
                {SA_SCHEMES.find(s => s.id === selectedPatient.medical_aid_id)?.name} · {selectedPatient.medical_aid_number}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <label style={lbl}>ICD-10 diagnosis code *</label>
            <input style={inp} value={icd10Query || form.icd10_primary}
              onChange={e => handleIcd10Search(e.target.value)}
              placeholder="Search — e.g. 'back pain' or 'M54'" />
            {icd10Results.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
                {icd10Results.map(r => (
                  <div key={r.code} onClick={() => selectIcd10(r.code, r.description)}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13,
                      display: "flex", gap: 10, borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: C.teal, fontWeight: 600, minWidth: 60, flexShrink: 0 }}>{r.code}</span>
                    <span>{r.description}</span>
                  </div>
                ))}
              </div>
            )}
            {form.icd10_primary && !icd10Query && (
              <div style={{ fontSize: 12, color: C.teal, fontWeight: 600, marginTop: 4 }}>✓ {form.icd10_primary}</div>
            )}
          </div>

          <div>
            <label style={lbl}>Diagnosis / presenting complaint *</label>
            <input style={inp} value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)}
              placeholder="e.g. Lumbar disc bulge with left-sided radiculopathy" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Start date</label>
              <input type="date" style={inp} value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
            <div><label style={lbl}>Sessions planned</label>
              <input type="number" style={inp} value={form.sessions_planned}
                onChange={e => set("sessions_planned", e.target.value)} placeholder="e.g. 10" /></div>
          </div>

          <div>
            <label style={lbl}>Medical aid scheme (for this episode)</label>
            <select style={inp} value={form.medical_aid_id} onChange={e => set("medical_aid_id", e.target.value)}>
              <option value="">Cash / no medical aid</option>
              {SA_SCHEMES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {form.medical_aid_id && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Sessions authorised</label>
                <input type="number" style={inp} value={form.sessions_authorised}
                  onChange={e => set("sessions_authorised", e.target.value)} placeholder="e.g. 15" /></div>
              <div><label style={lbl}>Benefit year</label>
                <input type="number" style={inp} value={form.benefit_year}
                  onChange={e => set("benefit_year", e.target.value)} /></div>
            </div>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Create episode"}</Btn>
        </div>
      </div>
    </div>
  );
};

export const Episodes = ({ navigate }) => {
  const { episodes, patients, db, setLiveEpisodes, practitionerId } = useContext(DataContext);
  const [showNew, setShowNew] = useState(false);
  const [filterStatus, setFilter] = useState("all");

  const patientName = (id) => { const p = patients.find(x => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "Unknown"; };
  const schemeName  = (id) => SA_SCHEMES.find(s => s.id === id)?.name || "Cash";
  const displayed   = filterStatus === "all" ? episodes : episodes.filter(e => e.status === filterStatus);

  const handleSaved = (ep) => { setLiveEpisodes(prev => prev ? [ep, ...prev] : [ep]); setShowNew(false); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Episodes of care</h2>
        <Btn onClick={() => setShowNew(true)}>+ New episode</Btn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {[["all","All"],["active","Active"],["discharged","Discharged"],["on_hold","On hold"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: filterStatus === val ? C.teal : C.tealLight,
              color: filterStatus === val ? "#fff" : C.teal }}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        {displayed.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗂</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No episodes yet</div>
            <div style={{ color: C.textSub, fontSize: 13, marginBottom: "1rem" }}>
              Create an episode of care to start tracking treatment
            </div>
            <Btn onClick={() => setShowNew(true)}>+ New episode</Btn>
          </div>
        ) : displayed.map(e => {
          const alert = benefitAlert({ sessions_authorised: e.sessions_authorised, sessions_used: e.sessions_used,
            sessions_remaining: (e.sessions_authorised||0)-(e.sessions_used||0), plan_name: schemeName(e.medical_aid_id) });
          return (
            <div key={e.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{patientName(e.patient_id)}</div>
                  <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{e.diagnosis}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                    {e.icd10_primary}{e.medical_aid_id ? ` · ${schemeName(e.medical_aid_id)}` : " · Cash"} · Started {e.start_date}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                    {e.sessions_completed||0}/{e.sessions_planned||"?"} sessions
                    {e.sessions_authorised ? ` · ${e.sessions_used||0}/${e.sessions_authorised} MA used` : ""}
                  </div>
                </div>
                <Badge label={e.status === "on_hold" ? "On hold" : e.status}
                  color={e.status === "active" ? C.green : e.status === "on_hold" ? C.amber : C.textSub} />
              </div>
              {alert && (
                <div style={{ marginTop: 6, fontSize: 12, padding: "4px 10px", borderRadius: 4,
                  background: alert.level === "error" ? "#FEE2E2" : "#FEF3C7",
                  color: alert.level === "error" ? C.red : C.amber }}>
                  ⚠ {alert.message}
                </div>
              )}
            </div>
          );
        })}
      </Card>
      {showNew && <NewEpisodeModal onClose={() => setShowNew(false)} onSaved={handleSaved} db={db} patients={patients} practitionerId={practitionerId} />}
    </div>
  );
};
