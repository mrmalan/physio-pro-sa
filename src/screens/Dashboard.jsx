import { useContext } from "react";
import { DataContext, AuthContext, C, Card, StatCard, Badge } from "../shared.js";
import { benefitAlert } from "../shared.js";

export const Dashboard = ({ navigate, session }) => {
  const { patients, episodes, appointments, claims } = useContext(DataContext);
  const meta = session?.user?.user_metadata || {};

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a => a.scheduled_at.startsWith(todayStr));
  const activeEps  = episodes.filter(e => e.status === "active");
  const unpaidClaims = claims.filter(c => c.status !== "paid");
  const benefitAlerts = episodes.filter(e => {
    const rec = { sessions_authorised: e.sessions_authorised, sessions_used: e.sessions_used,
                  sessions_remaining: (e.sessions_authorised || 0) - (e.sessions_used || 0),
                  plan_name: e.medical_aid_id };
    return benefitAlert(rec) !== null;
  });

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, color: C.teal, fontSize: 22 }}>Good morning, {meta.full_name?.split(" ")[0] || "there"}</h2>
        <p style={{ margin: "4px 0 0", color: C.textSub, fontSize: 14 }}>{meta.practice_name || "Physio Pro SA"}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Today's appointments" value={todayAppts.length}
          onClick={() => navigate("appointments")} color={C.teal} />
        <StatCard label="Active episodes" value={activeEps.length}
          onClick={() => navigate("episodes")} color={C.teal} />
        <StatCard label="Unpaid claims" value={unpaidClaims.length}
          onClick={() => navigate("medicalaid")} color={unpaidClaims.length > 0 ? C.amber : C.teal} />
        <StatCard label="Patients" value={patients.length}
          onClick={() => navigate("patients")} color={C.teal} />
      </div>

      {benefitAlerts.length > 0 && (
        <Card style={{ marginBottom: "1rem", borderLeft: `3px solid ${C.amber}` }}>
          <div style={{ fontWeight: 600, color: C.amber, marginBottom: 8 }}>
            Benefit alerts ({benefitAlerts.length})
          </div>
          {benefitAlerts.map(e => {
            const pt = { sessions_authorised: e.sessions_authorised, sessions_used: e.sessions_used,
              sessions_remaining: (e.sessions_authorised||0)-(e.sessions_used||0), plan_name: e.medical_aid_id };
            const alert = benefitAlert(pt);
            return (
              <div key={e.id} style={{ fontSize: 13, padding: "4px 0",
                borderBottom: `1px solid ${C.border}`, color: C.text }}>
                <strong>{e.diagnosis}</strong> — {alert?.message}
              </div>
            );
          })}
        </Card>
      )}

      <Card>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Today's schedule</div>
        {todayAppts.length === 0 ? (
          <p style={{ color: C.textSub, fontSize: 14, margin: 0 }}>No appointments today.</p>
        ) : todayAppts.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
            <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>
              {new Date(a.scheduled_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ flex: 1 }}>{a.appointment_type === "initial" ? "Initial assessment" : "Follow-up"}</span>
            <Badge label={a.status} color={a.status === "completed" ? C.green : C.teal} />
          </div>
        ))}
      </Card>
    </div>
  );
};
