import { useContext } from "react";
import { DataContext, AuthContext, C, Card, StatCard, Badge } from "../shared.js";
import { SA_SCHEMES, benefitAlert } from "../shared.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS = {
  scheduled:   "#3b82f6",
  arrived:     "#f59e0b",
  in_progress: "#8b5cf6",
  completed:   "#10b981",
  dna:         "#ef4444",
  cancelled:   "#94a3b8",
};
const STATUS_LABELS = {
  scheduled: "Scheduled", arrived: "Arrived", in_progress: "In progress",
  completed: "Completed", dna: "DNA", cancelled: "Cancelled",
};
const APPT_TYPE_LABELS = {
  initial: "Initial", follow_up: "Follow-up", review: "Review",
  discharge: "Discharge", home_visit: "Home visit",
};

export const Dashboard = ({ navigate, session }) => {
  const { patients, episodes, appointments, claims } = useContext(DataContext);
  const meta = session?.user?.user_metadata || {};

  const today = todayStr();
  const todayAppts    = appointments
    .filter(a => a.scheduled_at.startsWith(today))
    .sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const activeEps     = episodes.filter(e => e.status === "active");
  const pendingClaims = claims.filter(c => !["paid"].includes(c.status));
  const outstanding   = claims.filter(c => ["issued","overdue"].includes(c.status))
    .reduce((s,c) => s + (c.total_amount || 0), 0);

  // Benefit alerts
  const benefitAlerts = episodes
    .filter(e => e.status === "active" && e.sessions_authorised != null)
    .map(e => {
      const rec = {
        sessions_authorised: e.sessions_authorised,
        sessions_used:       e.sessions_used,
        sessions_remaining:  (e.sessions_authorised || 0) - (e.sessions_used || 0),
        plan_name: SA_SCHEMES.find(s => s.id === e.medical_aid_id)?.name || e.medical_aid_id,
      };
      const alert = benefitAlert(rec);
      return alert ? { episode: e, alert } : null;
    })
    .filter(Boolean);

  const patientName = (id) => {
    const p = patients.find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "Unknown";
  };

  const todayDone = todayAppts.filter(a => a.status === "completed").length;
  const todayRev  = todayAppts.filter(a => a.status === "completed").length * 980; // estimated

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, color: C.teal, fontSize: 22 }}>
          {greeting}, {meta.full_name?.split(" ")[0] || "there"} 👋
        </h2>
        <p style={{ margin: "4px 0 0", color: C.textSub, fontSize: 14 }}>
          {meta.practice_name || "Physio Pro SA"} · {new Date().toLocaleDateString("en-ZA",
            { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Today's appointments" value={todayAppts.length}
          sub={`${todayDone} done`}
          onClick={() => navigate("appointments")} color={C.teal} />
        <StatCard label="Active episodes" value={activeEps.length}
          onClick={() => navigate("episodes")} color={C.teal} />
        <StatCard label="Unpaid claims" value={pendingClaims.length}
          sub={`R ${outstanding.toFixed(2)} outstanding`}
          onClick={() => navigate("medicalaid")} color={pendingClaims.length > 0 ? "#f59e0b" : C.teal} />
        <StatCard label="Total patients" value={patients.length}
          onClick={() => navigate("patients")} color={C.teal} />
      </div>

      {/* Benefit alerts */}
      {benefitAlerts.length > 0 && (
        <Card style={{ marginBottom: "1rem", borderLeft: `3px solid #f59e0b` }}>
          <div style={{ fontWeight: 600, color: "#854F0B", marginBottom: 8, fontSize: 13 }}>
            ⚠️ Benefit alerts ({benefitAlerts.length})
          </div>
          {benefitAlerts.map(({ episode, alert }) => (
            <div key={episode.id} style={{ fontSize: 13, padding: "5px 0",
              borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between",
              alignItems: "center" }}>
              <div>
                <strong>{patientName(episode.patient_id)}</strong>
                <span style={{ color: C.textSub }}> · {episode.diagnosis}</span>
              </div>
              <span style={{ fontSize: 12, color: alert.level === "error" ? "#ef4444" : "#854F0B",
                fontWeight: 500 }}>{alert.message}</span>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        {/* Today's schedule */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Today's schedule</div>
            <button onClick={() => navigate("appointments")}
              style={{ fontSize: 12, color: C.teal, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline" }}>
              View all →
            </button>
          </div>

          {todayAppts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: C.textSub, fontSize: 14 }}>
              No appointments today.
              <div style={{ marginTop: 8 }}>
                <button onClick={() => navigate("appointments")}
                  style={{ fontSize: 13, color: C.teal, background: "none", border: `1px solid ${C.teal}`,
                    padding: "5px 14px", borderRadius: 6, cursor: "pointer" }}>
                  + Book appointment
                </button>
              </div>
            </div>
          ) : todayAppts.map(a => {
            const pt    = patients.find(x => x.id === a.patient_id);
            const ep    = episodes.find(x => x.id === a.episode_id);
            const color = STATUS_COLORS[a.status] || "#94a3b8";
            return (
              <div key={a.id} onClick={() => navigate("appointments")}
                style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "9px 0", borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgSub}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div style={{ minWidth: 56, color: C.teal, fontWeight: 700, fontSize: 13 }}>
                  {fmtTime(a.scheduled_at)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {pt ? `${pt.first_name} ${pt.last_name}` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub }}>
                    {APPT_TYPE_LABELS[a.appointment_type] || a.appointment_type}
                    {ep ? ` · ${ep.diagnosis}` : ""}
                    {" · "}{a.duration_minutes} min
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                  background: color + "22", color, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {STATUS_LABELS[a.status] || a.status}
                </span>
              </div>
            );
          })}
        </Card>

        {/* Quick actions + recent */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Quick actions */}
          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Quick actions</div>
            {[
              { label: "📋 New clinical note", screen: "clinical" },
              { label: "🗓 Book appointment",  screen: "appointments" },
              { label: "👤 Add patient",       screen: "patients" },
              { label: "💊 New episode",       screen: "episodes" },
              { label: "💳 New invoice",       screen: "invoices" },
            ].map(q => (
              <button key={q.screen} onClick={() => navigate(q.screen)}
                style={{ width: "100%", textAlign: "left", padding: "8px 10px", marginBottom: 4,
                  borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg,
                  cursor: "pointer", fontSize: 13, color: C.text, fontWeight: 500 }}
                onMouseEnter={e => { e.currentTarget.style.background = C.tealLight; e.currentTarget.style.borderColor = C.teal; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}>
                {q.label}
              </button>
            ))}
          </Card>

          {/* Active episodes mini-list */}
          {activeEps.length > 0 && (
            <Card>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Active episodes</div>
              {activeEps.slice(0, 4).map(e => {
                const remaining = (e.sessions_authorised || 0) - (e.sessions_used || 0);
                const alert = benefitAlert({
                  sessions_authorised: e.sessions_authorised,
                  sessions_used: e.sessions_used,
                  sessions_remaining: remaining,
                  plan_name: e.medical_aid_id,
                });
                return (
                  <div key={e.id} onClick={() => navigate("episodes")}
                    style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{patientName(e.patient_id)}</div>
                    <div style={{ fontSize: 11, color: alert ? "#854F0B" : C.textSub }}>
                      {e.diagnosis}
                      {e.sessions_authorised ? ` · ${e.sessions_used}/${e.sessions_authorised} sessions` : ""}
                    </div>
                  </div>
                );
              })}
              {activeEps.length > 4 && (
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>
                  +{activeEps.length - 4} more · <span style={{ color: C.teal, cursor: "pointer" }}
                    onClick={() => navigate("episodes")}>view all</span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
