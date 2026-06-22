import { useContext, useState } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";

const APPT_TYPES = { initial: "Initial assessment", follow_up: "Follow-up", review: "Review", discharge: "Discharge" };
const STATUS_COLORS = { scheduled: C_blue => "#3b82f6", arrived: "#f59e0b", in_progress: "#8b5cf6", completed: "#10b981", dna: "#ef4444", cancelled: "#94a3b8" };

export const Appointments = ({ navigate }) => {
  const { appointments, patients } = useContext(DataContext);
  const [view, setView] = useState("today");

  const todayStr = new Date().toISOString().split("T")[0];
  const displayed = view === "today"
    ? appointments.filter(a => a.scheduled_at.startsWith(todayStr))
    : appointments;

  const patientName = (id) => {
    const p = patients.find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "Unknown";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Appointments</h2>
        <Btn>+ Book appointment</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {["today", "all"].map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: view === v ? C.teal : C.tealLight, color: view === v ? "#fff" : C.teal,
              fontWeight: 600, fontSize: 13 }}>
            {v === "today" ? "Today" : "All upcoming"}
          </button>
        ))}
      </div>
      <Card>
        {displayed.length === 0 ? (
          <p style={{ color: C.textSub, margin: 0 }}>No appointments.</p>
        ) : displayed.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ minWidth: 70, color: C.teal, fontWeight: 600, fontSize: 14 }}>
              {new Date(a.scheduled_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{patientName(a.patient_id)}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{APPT_TYPES[a.appointment_type] || a.appointment_type} · {a.duration_minutes} min · {a.room}</div>
            </div>
            <Badge label={a.status} color={a.status === "completed" ? C.green : a.status === "dna" ? C.red : C.teal} />
          </div>
        ))}
      </Card>
    </div>
  );
};
