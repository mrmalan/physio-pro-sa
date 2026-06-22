import { useContext } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { benefitAlert } from "@prosa/core";
import { SA_SCHEMES } from "@prosa/core";

export const Episodes = ({ navigate }) => {
  const { episodes, patients } = useContext(DataContext);
  const patientName = (id) => { const p = patients.find(x => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "Unknown"; };
  const schemeName = (id) => SA_SCHEMES.find(s => s.id === id)?.name || "Cash";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Episodes of care</h2>
        <Btn>+ New episode</Btn>
      </div>
      <Card>
        {episodes.map(e => {
          const alert = benefitAlert({ sessions_authorised: e.sessions_authorised,
            sessions_used: e.sessions_used,
            sessions_remaining: (e.sessions_authorised||0)-(e.sessions_used||0),
            plan_name: schemeName(e.medical_aid_id) });
          return (
            <div key={e.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{patientName(e.patient_id)}</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
                    {e.diagnosis} · {e.icd10_primary} · {schemeName(e.medical_aid_id)}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                    Started {e.start_date} · {e.sessions_completed}/{e.sessions_planned} sessions
                    {e.sessions_authorised ? ` · ${e.sessions_used}/${e.sessions_authorised} MA sessions used` : ""}
                  </div>
                </div>
                <Badge label={e.status} color={e.status === "active" ? C.green : C.textSub} />
              </div>
              {alert && (
                <div style={{ marginTop: 6, fontSize: 12, padding: "4px 10px", borderRadius: 4,
                  background: alert.level === "error" ? "#FEE2E2" : "#FEF3C7",
                  color: alert.level === "error" ? C.red : C.amber }}>
                  {alert.message}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
};
