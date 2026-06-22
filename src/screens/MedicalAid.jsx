import { useContext, useState } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES, CLAIM_STATUSES, claimStatusLabel, claimStatusColor, generateClaimCSV } from "../shared.js";

export const MedicalAid = ({ navigate }) => {
  const { claims, patients, episodes } = useContext(DataContext);
  const [filter, setFilter] = useState("all");
  const displayed = filter === "all" ? claims : claims.filter(c => c.status === filter);
  const patientName = (id) => { const p = patients.find(x => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "Unknown"; };

  const totalOutstanding = claims.filter(c => !["paid"].includes(c.status))
    .reduce((s, c) => s + (c.total_amount || 0), 0);
  const totalPaid = claims.filter(c => c.status === "paid").reduce((s, c) => s + (c.amount_paid || 0), 0);

  const exportCSV = () => {
    const csv = generateClaimCSV(claims.map(c => {
      const p = patients.find(x => x.id === c.patient_id);
      const scheme = SA_SCHEMES.find(s => s.code === c.scheme_code);
      return { ...c, patient_surname: p?.last_name || "", patient_first_name: p?.first_name || "",
        member_number: p?.medical_aid_number || "", scheme_code: c.scheme_code,
        treating_provider: "Physiotherapist", hpcsa_number: "" };
    }));
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `physio_claims_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Medical aid claims</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportCSV}>Export CSV</Btn>
          <Btn>+ New claim</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <Card><div style={{ fontSize: 13, color: C.textSub }}>Outstanding</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.amber }}>R{totalOutstanding.toFixed(2)}</div></Card>
        <Card><div style={{ fontSize: 13, color: C.textSub }}>Paid (all time)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>R{totalPaid.toFixed(2)}</div></Card>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")}
          style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            background: filter === "all" ? C.teal : C.tealLight, color: filter === "all" ? "#fff" : C.teal, fontSize: 12 }}>
          All
        </button>
        {["submitted","paid","rejected","short_paid"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === s ? claimStatusColor(s) : C.tealLight,
              color: filter === s ? "#fff" : C.text, fontSize: 12 }}>
            {claimStatusLabel(s)}
          </button>
        ))}
      </div>
      <Card>
        {displayed.length === 0 ? <p style={{ color: C.textSub, margin: 0 }}>No claims.</p>
        : displayed.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{patientName(c.patient_id)}</div>
              <div style={{ color: C.textSub, fontSize: 12 }}>{c.tariff_code} · {c.icd10_code} · {c.claim_date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>R{(c.total_amount||0).toFixed(2)}</div>
              {c.amount_paid && <div style={{ fontSize: 12, color: C.green }}>Paid: R{c.amount_paid.toFixed(2)}</div>}
            </div>
            <Badge label={claimStatusLabel(c.status)} color={claimStatusColor(c.status)} />
          </div>
        ))}
      </Card>
    </div>
  );
};
