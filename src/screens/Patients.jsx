import { useContext, useState } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES, USE_MOCK } from "../shared.js";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 4 };

// ── New Patient Modal ─────────────────────────────────────────────────────────
const NewPatientModal = ({ onClose, onSaved, db, practitionerId }) => {
  const EMPTY = {
    first_name: "", last_name: "", dob: "", gender: "", id_number: "",
    phone: "", email: "", address: "", referring_dr: "",
    medical_aid_id: "", medical_aid_number: "", dependant_code: "00",
    plan_name: "", sessions_authorised: "", benefit_year: new Date().getFullYear(),
    pre_auth_required: false, notes: "",
  };
  const [form, setForm]   = useState(EMPTY);
  const [tab, setTab]     = useState("personal");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.first_name || !form.last_name) { setError("First and last name are required."); return; }
    setSaving(true); setError("");
    const payload = {
      practitioner_id: practitionerId,
      first_name: form.first_name,
      last_name:  form.last_name,
      phone:      form.phone  || null,
      email:      form.email  || null,
      address:    form.address || null,
      referring_dr: form.referring_dr || null,
      notes:      form.notes  || null,
    };
    if (form.dob)              payload.dob              = form.dob;
    if (form.gender)           payload.gender           = form.gender;
    if (form.id_number)        payload.id_number        = form.id_number;
    if (form.medical_aid_id)   payload.medical_aid_id   = form.medical_aid_id;
    if (form.medical_aid_number) payload.medical_aid_number = form.medical_aid_number;
    if (form.dependant_code)   payload.dependant_code   = form.dependant_code;
    if (form.plan_name)        payload.plan_name        = form.plan_name;
    if (form.sessions_authorised) payload.sessions_authorised = Number(form.sessions_authorised);
    if (form.benefit_year)     payload.benefit_year     = Number(form.benefit_year);
    payload.pre_auth_required = form.pre_auth_required;

    if (USE_MOCK) {
      onSaved({ ...payload, id: `mock_${Date.now()}`, created_at: new Date().toISOString() });
      return;
    }
    const { data, error: err } = await db.from("patient").insert(payload);
    if (err || !data?.[0]) { setError(`Save failed: ${err?.message || JSON.stringify(err)}`); setSaving(false); return; }
    onSaved(data[0]);
  };

  const TABS = ["personal", "medical_aid", "other"];
  const TAB_LABELS = { personal: "Personal", medical_aid: "Medical aid", other: "Other" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520,
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>New patient</div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20,
              cursor: "pointer", color: C.textSub, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: tab === t ? C.teal : C.tealLight,
                  color: tab === t ? "#fff" : C.teal, fontSize: 12, fontWeight: 600 }}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "0 1.5rem 1rem", overflowY: "auto", flex: 1 }}>
          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
            padding: "8px 12px", fontSize: 12, color: C.red, marginBottom: 12 }}>{error}</div>}

          {tab === "personal" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>First name *</label>
                  <input style={inp} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="e.g. Sarah" /></div>
                <div><label style={lbl}>Last name *</label>
                  <input style={inp} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="e.g. Van der Merwe" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Date of birth</label>
                  <input type="date" style={inp} value={form.dob} onChange={e => set("dob", e.target.value)} /></div>
                <div><label style={lbl}>Gender</label>
                  <select style={inp} value={form.gender} onChange={e => set("gender", e.target.value)}>
                    <option value="">—</option>
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                    <option value="Other">Other</option>
                  </select></div>
                <div><label style={lbl}>ID number</label>
                  <input style={inp} value={form.id_number} onChange={e => set("id_number", e.target.value)} placeholder="8503120001087" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Phone</label>
                  <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="082 555 1234" /></div>
                <div><label style={lbl}>Email</label>
                  <input type="email" style={inp} value={form.email} onChange={e => set("email", e.target.value)} placeholder="patient@email.com" /></div>
              </div>
              <div><label style={lbl}>Address</label>
                <input style={inp} value={form.address} onChange={e => set("address", e.target.value)} placeholder="12 Main Rd, Claremont" /></div>
              <div><label style={lbl}>Referring doctor</label>
                <input style={inp} value={form.referring_dr} onChange={e => set("referring_dr", e.target.value)} placeholder="Dr. J. Smit" /></div>
            </div>
          )}

          {tab === "medical_aid" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={lbl}>Medical aid scheme</label>
                <select style={inp} value={form.medical_aid_id} onChange={e => set("medical_aid_id", e.target.value)}>
                  <option value="">Cash patient (no medical aid)</option>
                  {SA_SCHEMES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              {form.medical_aid_id && (<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Member number</label>
                    <input style={inp} value={form.medical_aid_number} onChange={e => set("medical_aid_number", e.target.value)} placeholder="12345678" /></div>
                  <div><label style={lbl}>Dependant code</label>
                    <input style={inp} value={form.dependant_code} onChange={e => set("dependant_code", e.target.value)} placeholder="00 = main member" /></div>
                </div>
                <div><label style={lbl}>Plan / option name</label>
                  <input style={inp} value={form.plan_name} onChange={e => set("plan_name", e.target.value)} placeholder="e.g. Classic Comprehensive" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Sessions authorised this year</label>
                    <input type="number" style={inp} value={form.sessions_authorised} onChange={e => set("sessions_authorised", e.target.value)} placeholder="e.g. 15" /></div>
                  <div><label style={lbl}>Benefit year</label>
                    <input type="number" style={inp} value={form.benefit_year} onChange={e => set("benefit_year", e.target.value)} /></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="preauth" checked={form.pre_auth_required}
                    onChange={e => set("pre_auth_required", e.target.checked)} />
                  <label htmlFor="preauth" style={{ fontSize: 13, color: C.text }}>Pre-authorisation required for this patient</label>
                </div>
              </>)}
            </div>
          )}

          {tab === "other" && (
            <div>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: "vertical" }} rows={5}
                value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Allergies, contraindications, special considerations..." />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save patient"}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Patient Detail Panel ──────────────────────────────────────────────────────
const PatientDetail = ({ patient, onClose, navigate }) => {
  const { episodes } = useContext(DataContext);
  const schemeLabel = (id) => SA_SCHEMES.find(s => s.id === id)?.name || "Cash patient";
  const ptEpisodes = episodes.filter(e => e.patient_id === patient.id);
  const sessionsRemaining = patient.sessions_authorised != null
    ? patient.sessions_authorised - (patient.sessions_used || 0) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 500,
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.tealLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, color: C.teal, fontSize: 18, flexShrink: 0 }}>
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{patient.first_name} {patient.last_name}</div>
                <div style={{ fontSize: 12, color: C.textSub }}>
                  {patient.dob ? `DOB: ${patient.dob}` : ""}
                  {patient.gender ? ` · ${patient.gender}` : ""}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none",
              fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
          </div>

          {/* Contact */}
          <Card style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contact</div>
            {[["Phone", patient.phone], ["Email", patient.email], ["Address", patient.address],
              ["Referring Dr", patient.referring_dr]].map(([label, val]) => val ? (
              <div key={label} style={{ display: "flex", gap: 12, fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: C.textSub, minWidth: 90 }}>{label}</span>
                <span>{val}</span>
              </div>
            ) : null)}
          </Card>

          {/* Medical aid */}
          <Card style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Medical aid</div>
            {patient.medical_aid_id ? (<>
              <div style={{ display: "flex", gap: 12, fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: C.textSub, minWidth: 90 }}>Scheme</span>
                <span>{schemeLabel(patient.medical_aid_id)}</span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: C.textSub, minWidth: 90 }}>Member no.</span>
                <span>{patient.medical_aid_number} (dep. {patient.dependant_code})</span>
              </div>
              {patient.plan_name && (
                <div style={{ display: "flex", gap: 12, fontSize: 13, padding: "3px 0" }}>
                  <span style={{ color: C.textSub, minWidth: 90 }}>Plan</span>
                  <span>{patient.plan_name}</span>
                </div>
              )}
              {patient.sessions_authorised != null && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6,
                  background: sessionsRemaining <= 2 ? "#FEF3C7" : C.tealLight }}>
                  <div style={{ fontSize: 13, fontWeight: 600,
                    color: sessionsRemaining <= 2 ? C.amber : C.teal }}>
                    {patient.sessions_used || 0} / {patient.sessions_authorised} sessions used
                    {sessionsRemaining != null ? ` · ${sessionsRemaining} remaining` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                    Benefit year {patient.benefit_year}
                  </div>
                </div>
              )}
            </>) : (
              <div style={{ fontSize: 13, color: C.textSub }}>Cash patient</div>
            )}
          </Card>

          {/* Episodes */}
          <Card style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: "0.06em" }}>Episodes of care</div>
              <Btn onClick={() => { onClose(); navigate("episodes"); }}>+ New episode</Btn>
            </div>
            {ptEpisodes.length === 0 ? (
              <div style={{ fontSize: 13, color: C.textSub }}>No episodes yet.</div>
            ) : ptEpisodes.map(e => (
              <div key={e.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`,
                fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.diagnosis}</div>
                  <div style={{ color: C.textSub, fontSize: 12 }}>{e.icd10_primary} · Started {e.start_date}</div>
                </div>
                <Badge label={e.status} color={e.status === "active" ? C.green : C.textSub} />
              </div>
            ))}
          </Card>

          {patient.notes && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</div>
              <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap" }}>{patient.notes}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Patients Screen ───────────────────────────────────────────────────────────
export const Patients = ({ navigate }) => {
  const { patients, db, setLivePatients, practitionerId } = useContext(DataContext);
  const [search, setSearch]     = useState("");
  const [showNew, setShowNew]   = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.medical_aid_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || "").includes(search)
  );

  const schemeLabel = (id) => SA_SCHEMES.find(s => s.id === id)?.name || "Cash";

  const handleSaved = (newPatient) => {
    setLivePatients(prev => (prev ? [newPatient, ...prev] : [newPatient]));
    setShowNew(false);
    setSelected(newPatient);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Patients</h2>
        <Btn onClick={() => setShowNew(true)}>+ New patient</Btn>
      </div>

      <input placeholder="Search by name, medical aid number or phone..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`,
          borderRadius: 6, fontSize: 14, marginBottom: "1rem", boxSizing: "border-box" }} />

      <Card>
        {filtered.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No patients yet</div>
            <div style={{ color: C.textSub, fontSize: 13, marginBottom: "1rem" }}>Add your first patient to get started</div>
            <Btn onClick={() => setShowNew(true)}>+ Add patient</Btn>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} onClick={() => setSelected(p)}
            style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
              cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.tealLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: C.teal, fontSize: 14, flexShrink: 0 }}>
              {p.first_name[0]}{p.last_name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
              <div style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {schemeLabel(p.medical_aid_id)}{p.medical_aid_number ? ` · ${p.medical_aid_number}` : ""}
                {p.referring_dr ? ` · Ref: ${p.referring_dr}` : ""}
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.textSub, flexShrink: 0 }}>{p.phone}</div>
            <Badge label={p.medical_aid_id ? "Medical aid" : "Cash"}
              color={p.medical_aid_id ? C.teal : C.textSub} />
          </div>
        ))}
      </Card>

      {showNew && (
        <NewPatientModal
          onClose={() => setShowNew(false)}
          onSaved={handleSaved}
          db={db}
          practitionerId={practitionerId}
        />
      )}

      {selected && (
        <PatientDetail
          patient={selected}
          onClose={() => setSelected(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
};
