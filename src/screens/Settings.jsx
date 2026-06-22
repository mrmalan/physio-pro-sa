import { useState } from "react";
import { C, Card, Btn } from "../shared.js";
import { SWITCH_STATUS, SWITCH_ACCREDITATION_STEPS } from "../shared.js";

const PH_PRACTICE_KEY = "ph_practice";
const DEFAULTS = {
  practice_name: "", physio_name: "", hpcsa_number: "", vat_number: "",
  phone: "", email: "", address: "", invoice_prefix: "PHY", next_invoice_no: 1,
  payment_terms: 30, vat_rate: 0.15,
};

export const Settings = ({ session }) => {
  const [practice, setPractice] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PH_PRACTICE_KEY) || "{}") }; }
    catch { return DEFAULTS; }
  });
  const [tab, setTab] = useState("practice");
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setPractice(p => ({ ...p, [k]: v }));
  const save = () => { localStorage.setItem(PH_PRACTICE_KEY, JSON.stringify(practice)); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const TABS = ["practice", "switch", "account"];

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: C.teal }}>Settings</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === t ? C.teal : C.tealLight, color: tab === t ? "#fff" : C.teal,
              fontWeight: 600, fontSize: 13 }}>
            {t === "practice" ? "Practice" : t === "switch" ? "Medical aid switch" : "Account"}
          </button>
        ))}
      </div>
      {tab === "practice" && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["practice_name","Practice name"],["physio_name","Physiotherapist name"],
              ["hpcsa_number","HPCSA number"],["vat_number","VAT number"],
              ["phone","Phone"],["email","Email"],["address","Address"],
              ["invoice_prefix","Invoice prefix"],["payment_terms","Payment terms (days)"]].map(([k, label]) => (
              <div key={k}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>{label}</label>
                <input value={practice[k] || ""} onChange={e => set(k, e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px",
                    border: `1px solid ${C.border}`, borderRadius: 6, boxSizing: "border-box" }} />
              </div>
            ))}
            <Btn onClick={save}>{saved ? "Saved ✓" : "Save settings"}</Btn>
          </div>
        </Card>
      )}
      {tab === "switch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card style={{ borderLeft: `3px solid ${C.amber}` }}>
            <div style={{ fontWeight: 600, color: C.amber, marginBottom: 4 }}>MediSwitch/SwitchOn accreditation</div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>
              Status: <strong>Pending accreditation</strong> — real-time claim submission not yet active.
              In the meantime, use the CSV export in Medical Aid Claims to submit manually via scheme portals.
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Accreditation steps</div>
            {SWITCH_ACCREDITATION_STEPS.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0",
                borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.tealLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.teal, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                <span>{step}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>MediKredit</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Status: Not started. Contact: medikredit.co.za</div>
          </Card>
        </div>
      )}
      {tab === "account" && (
        <Card>
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 8 }}><strong>Email:</strong> {session?.user?.email}</div>
            <div style={{ marginBottom: 8 }}><strong>Name:</strong> {session?.user?.user_metadata?.full_name}</div>
            <div><strong>HPCSA:</strong> {session?.user?.user_metadata?.hpcsa_number || "Not set"}</div>
          </div>
        </Card>
      )}
    </div>
  );
};
