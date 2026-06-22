import { useContext, useState } from "react";
import { DataContext, C, Card, Btn } from "../shared.js";
import { PHYSIO_TARIFF_CODES, ICD10_PHYSIO, searchICD10, searchTariffs } from "@prosa/core";

const BODY_REGIONS = ["Cervical spine", "Thoracic spine", "Lumbar spine", "Shoulder", "Elbow",
  "Wrist/Hand", "Hip", "Knee", "Ankle/Foot", "Neurological", "Cardiopulmonary", "Paediatric", "Other"];

const MODALITIES = ["TENS/IFC", "Ultrasound", "Laser", "Shockwave", "Traction", "Hot pack", "Cold pack",
  "Dry needling", "Hydrotherapy", "Pilates rehab"];

export const ClinicalNote = ({ navigate }) => {
  const { patients, episodes, notes } = useContext(DataContext);
  const [note, setNote] = useState({
    patient_id: "", episode_id: "", note_date: new Date().toISOString().split("T")[0],
    subjective: "", objective: "", assessment: "", plan: "",
    body_regions: [], modalities: [],
    tariff_codes: [], icd10_primary: "", icd10_secondary: [],
    signed: false,
  });
  const [tariffSearch, setTariffSearch] = useState("");
  const [icd10Search, setIcd10Search]   = useState("");
  const [tab, setTab] = useState("soap");

  const set = (k, v) => setNote(n => ({ ...n, [k]: v }));
  const toggle = (k, val) => setNote(n => {
    const arr = n[k] || [];
    return { ...n, [k]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });

  const tariffResults = tariffSearch.length > 1 ? searchTariffs(tariffSearch) : [];
  const icd10Results  = icd10Search.length > 2  ? searchICD10(icd10Search)   : [];
  const selectedTariffs = PHYSIO_TARIFF_CODES.filter(t => note.tariff_codes.includes(t.code));
  const totalAmount = selectedTariffs.reduce((s, t) => s + t.unit_amount, 0);

  const TABS = ["soap", "billing", "modalities"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Clinical note</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary">Save draft</Btn>
          <Btn>Sign & finalise</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === t ? C.teal : C.tealLight, color: tab === t ? "#fff" : C.teal,
              fontWeight: 600, fontSize: 13 }}>
            {t === "soap" ? "SOAP note" : t === "billing" ? "Billing / codes" : "Modalities"}
          </button>
        ))}
      </div>

      {tab === "soap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Patient</label>
              <select value={note.patient_id} onChange={e => set("patient_id", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Date</label>
              <input type="date" value={note.note_date} onChange={e => set("note_date", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} />
            </div>
          </div>
          {["subjective", "objective", "assessment", "plan"].map(field => (
            <Card key={field} style={{ padding: "0.75rem" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: 1 }}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <textarea value={note[field]} onChange={e => set(field, e.target.value)}
                rows={field === "subjective" || field === "plan" ? 4 : 5}
                placeholder={field === "subjective" ? "Patient's reported symptoms, pain scores, functional limitations..." :
                  field === "objective" ? "ROM measurements, special tests, palpation findings..." :
                  field === "assessment" ? "Clinical diagnosis, problem list..." :
                  "Treatment applied, home programme, next session plan..."}
                style={{ width: "100%", marginTop: 8, padding: 8, border: `1px solid ${C.border}`,
                  borderRadius: 6, fontSize: 14, resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box" }} />
            </Card>
          ))}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Body regions treated</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
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
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ICD-10 diagnosis code</div>
            <input placeholder="Search ICD-10 (e.g. 'back pain' or 'M54')" value={icd10Search}
              onChange={e => setIcd10Search(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, boxSizing: "border-box" }} />
            {icd10Results.map(c => (
              <div key={c.code} onClick={() => { set("icd10_primary", c.code); setIcd10Search(""); }}
                style={{ padding: "8px 10px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
                  fontSize: 13, display: "flex", gap: 12 }}>
                <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{c.code}</span>
                <span>{c.description}</span>
              </div>
            ))}
            {note.icd10_primary && (
              <div style={{ marginTop: 8, padding: "6px 12px", background: C.tealLight,
                borderRadius: 6, fontSize: 13, color: C.teal, fontWeight: 600 }}>
                Primary: {note.icd10_primary}
              </div>
            )}
          </Card>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Procedure / tariff codes</div>
            <input placeholder="Search (e.g. 'manipulation' or '18533')" value={tariffSearch}
              onChange={e => setTariffSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, boxSizing: "border-box" }} />
            {tariffResults.slice(0,8).map(t => (
              <div key={t.code} onClick={() => { toggle("tariff_codes", t.code); setTariffSearch(""); }}
                style={{ padding: "8px 10px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
                  fontSize: 13, display: "flex", gap: 12, alignItems: "center",
                  background: note.tariff_codes.includes(t.code) ? C.tealLight : "transparent" }}>
                <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{t.code}</span>
                <span style={{ flex: 1 }}>{t.description}</span>
                <span style={{ color: C.textSub }}>R{t.unit_amount.toFixed(2)}</span>
              </div>
            ))}
            {selectedTariffs.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Selected codes</div>
                {selectedTariffs.map(t => (
                  <div key={t.code} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 13, padding: "4px 0" }}>
                    <span>{t.code} — {t.description}</span>
                    <span>R{t.unit_amount.toFixed(2)}</span>
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
        </Card>
      )}
    </div>
  );
};
