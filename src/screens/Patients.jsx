import { useContext, useState } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES } from "@prosa/core";

export const Patients = ({ navigate }) => {
  const { patients } = useContext(DataContext);
  const [search, setSearch] = useState("");
  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.medical_aid_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const schemeLabel = (id) => SA_SCHEMES.find(s => s.id === id)?.name || "Cash patient";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Patients</h2>
        <Btn>+ New patient</Btn>
      </div>
      <input
        placeholder="Search by name or medical aid number..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`,
          borderRadius: 6, fontSize: 14, marginBottom: "1rem", boxSizing: "border-box" }}
      />
      <Card>
        {filtered.length === 0 ? (
          <p style={{ color: C.textSub, margin: 0 }}>No patients found.</p>
        ) : filtered.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
            onClick={() => {}}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.tealLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: C.teal, fontSize: 14, flexShrink: 0 }}>
              {p.first_name[0]}{p.last_name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{schemeLabel(p.medical_aid_id)}{p.medical_aid_number ? ` · ${p.medical_aid_number}` : ""}</div>
            </div>
            <div style={{ fontSize: 12, color: C.textSub }}>{p.phone}</div>
            <Badge label={p.medical_aid_id ? "Medical aid" : "Cash"} color={p.medical_aid_id ? C.teal : C.textSub} />
          </div>
        ))}
      </Card>
    </div>
  );
};
