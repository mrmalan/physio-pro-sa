import { useContext, useState, useMemo } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES, benefitAlert } from "../shared.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
function minutesSinceMidnight(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

const STATUS_CFG = {
  scheduled:   { label: "Scheduled",   color: "#3b82f6", bg: "#EFF6FF" },
  arrived:     { label: "Arrived",     color: "#f59e0b", bg: "#FFFBEB" },
  in_progress: { label: "In progress", color: "#8b5cf6", bg: "#F5F3FF" },
  completed:   { label: "Completed",   color: "#10b981", bg: "#ECFDF5" },
  dna:         { label: "DNA",         color: "#ef4444", bg: "#FEF2F2" },
  cancelled:   { label: "Cancelled",   color: "#94a3b8", bg: "#F8FAFC" },
};

const STATUS_FLOW = {
  scheduled: ["arrived", "dna", "cancelled"],
  arrived:   ["in_progress", "dna"],
  in_progress: ["completed"],
  completed: [], dna: ["scheduled"], cancelled: [],
};

const APPT_TYPE_SHORT = {
  initial: "Initial", follow_up: "Follow-up",
  review: "Review", discharge: "Discharge", home_visit: "Home visit",
};

// ── Appointment card (used in list + timeline) ────────────────────────────────
const ApptCard = ({ appt, patient, episode, onStatusChange, onNote, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.scheduled;
  const scheme = patient ? SA_SCHEMES.find(s => s.id === patient.medical_aid_id) : null;
  const nextStatuses = STATUS_FLOW[appt.status] || [];

  return (
    <div style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 8, background: cfg.bg, marginBottom: compact ? 4 : 8,
      overflow: "hidden", transition: "box-shadow .15s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div onClick={() => setExpanded(e => !e)}
        style={{ padding: compact ? "8px 10px" : "10px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: compact ? 48 : 56, fontWeight: 700, color: cfg.color, fontSize: compact ? 12 : 14 }}>
          {fmtTime(appt.scheduled_at)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: compact ? 12 : 13, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>
            {patient ? `${patient.first_name} ${patient.last_name}` : "—"}
          </div>
          {!compact && (
            <div style={{ fontSize: 11, color: C.textSub }}>
              {APPT_TYPE_SHORT[appt.appointment_type] || appt.appointment_type}
              {episode ? ` · ${episode.diagnosis}` : ""}
              {" · "}{appt.duration_minutes}min · {appt.room}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: cfg.color + "22", color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border + "80"}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: C.textSub }}>Medical aid</div>
              <div style={{ fontWeight: 600 }}>{scheme?.name || "Cash patient"}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: C.textSub }}>Duration</div>
              <div style={{ fontWeight: 600 }}>{appt.duration_minutes} min</div>
            </div>
            {episode && (
              <div style={{ fontSize: 12, gridColumn: "1 / -1" }}>
                <div style={{ color: C.textSub }}>Episode</div>
                <div style={{ fontWeight: 600 }}>{episode.diagnosis} · {episode.icd10_primary}</div>
                <div style={{ color: C.textSub }}>
                  Session {(episode.sessions_used || 0) + 1} of {episode.sessions_authorised || "?"}
                </div>
              </div>
            )}
          </div>

          {nextStatuses.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {nextStatuses.map(s => {
                const c = STATUS_CFG[s];
                return (
                  <button key={s} onClick={() => onStatusChange(appt.id, s)}
                    style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      background: c.color + "22", color: c.color, fontSize: 12, fontWeight: 600 }}>
                    → {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {["arrived","in_progress","completed"].includes(appt.status) && (
            <Btn size="sm" onClick={() => onNote(appt)}>
              {appt.status === "completed" ? "View note" : "Open clinical note →"}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
};

// ── Timeline view ─────────────────────────────────────────────────────────────
const TimelineView = ({ appts, patients, episodes, onStatusChange, onNote }) => {
  const ROOMS = [...new Set(appts.map(a => a.room).filter(Boolean))].sort();
  const START_HOUR = 7, END_HOUR = 19;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
  const nowMins = Math.min(Math.max(minutesSinceMidnight(new Date().toISOString()) - START_HOUR * 60, 0), TOTAL_MINS);
  const nowPct = (nowMins / TOTAL_MINS) * 100;

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Hour labels */}
      <div style={{ display: "flex", marginLeft: 80, marginBottom: 4 }}>
        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
          <div key={i} style={{ flex: 1, fontSize: 10, color: C.textSub, textAlign: "left" }}>
            {String(START_HOUR + i).padStart(2,"0")}:00
          </div>
        ))}
      </div>

      {ROOMS.map(room => {
        const roomAppts = appts.filter(a => a.room === room);
        return (
          <div key={room} style={{ display: "flex", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: C.textSub,
              paddingRight: 8, paddingTop: 4, textAlign: "right", fontWeight: 600 }}>
              {room}
            </div>
            <div style={{ flex: 1, position: "relative", height: 40,
              background: C.bgSub, borderRadius: 6, overflow: "hidden" }}>
              {/* Current time line */}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${nowPct}%`,
                width: 2, background: C.teal, zIndex: 2 }} />

              {roomAppts.map(a => {
                const startMins = minutesSinceMidnight(a.scheduled_at) - START_HOUR * 60;
                const leftPct   = Math.max(0, (startMins / TOTAL_MINS) * 100);
                const widthPct  = Math.max(2, ((a.duration_minutes || 30) / TOTAL_MINS) * 100);
                const cfg       = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                const pt        = patients.find(p => p.id === a.patient_id);
                return (
                  <div key={a.id}
                    style={{ position: "absolute", top: 4, height: 32, left: `${leftPct}%`,
                      width: `${Math.min(widthPct, 100 - leftPct)}%`,
                      background: cfg.color, borderRadius: 4, overflow: "hidden",
                      cursor: "pointer", zIndex: 1 }}
                    title={`${pt?.first_name || ""} ${pt?.last_name || ""} · ${fmtTime(a.scheduled_at)} · ${a.duration_minutes}min`}
                    onClick={() => onNote(a)}>
                    <div style={{ fontSize: 10, color: "#fff", padding: "2px 6px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      lineHeight: "14px", fontWeight: 600 }}>
                      {pt?.first_name || "—"}
                    </div>
                    <div style={{ fontSize: 9, color: "#ffffff99", padding: "0 6px" }}>
                      {fmtTime(a.scheduled_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {ROOMS.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
          No appointments with rooms assigned today.
        </div>
      )}
    </div>
  );
};

// ── Intelligence panel ────────────────────────────────────────────────────────
const IntelligencePanel = ({ patients, episodes, appointments, claims }) => {
  const [dismissed, setDismissed] = useState(new Set());
  const today = todayStr();
  const dismiss = (id) => setDismissed(s => new Set([...s, id]));

  const alerts = useMemo(() => {
    const out = [];

    // Benefit limit alerts
    episodes.filter(e => e.status === "active" && e.sessions_authorised != null).forEach(ep => {
      const remaining = (ep.sessions_authorised || 0) - (ep.sessions_used || 0);
      const alert = benefitAlert({ sessions_authorised: ep.sessions_authorised,
        sessions_used: ep.sessions_used, sessions_remaining: remaining, plan_name: ep.medical_aid_id });
      if (alert) {
        const pt = patients.find(p => p.id === ep.patient_id);
        out.push({ id: `benefit_${ep.id}`, level: alert.level,
          icon: "💳", color: "#f59e0b",
          title: `${pt?.first_name || ""} ${pt?.last_name || ""} — benefit alert`,
          message: `${ep.diagnosis}: ${alert.message}` });
      }
    });

    // Lapsed patients — active episode, no appointment in 21 days
    episodes.filter(e => e.status === "active").forEach(ep => {
      const ptAppts = appointments.filter(a => a.patient_id === ep.patient_id && a.status !== "cancelled");
      const lastAppt = ptAppts.sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0];
      if (lastAppt) {
        const daysSince = Math.floor((new Date(today) - new Date(lastAppt.scheduled_at.split("T")[0])) / 86400000);
        if (daysSince >= 21) {
          const pt = patients.find(p => p.id === ep.patient_id);
          out.push({ id: `lapsed_${ep.id}`, level: "warning",
            icon: "⏰", color: "#8b5cf6",
            title: `${pt?.first_name || ""} ${pt?.last_name || ""} — ${daysSince} days since last visit`,
            message: `${ep.diagnosis} episode still active. Consider follow-up.` });
        }
      }
    });

    // Overdue claims — submitted > 30 days ago, not paid
    claims.filter(c => c.status === "submitted" && c.submitted_at).forEach(c => {
      const daysSince = Math.floor((new Date() - new Date(c.submitted_at)) / 86400000);
      if (daysSince >= 30) {
        const pt = patients.find(p => p.id === c.patient_id);
        out.push({ id: `claim_${c.id}`, level: "warning",
          icon: "📋", color: "#ef4444",
          title: `Claim overdue — ${pt?.first_name || ""} ${pt?.last_name || ""}`,
          message: `${c.tariff_code} submitted ${daysSince} days ago, no response. Follow up with ${c.scheme_code || "scheme"}.` });
      }
    });

    return out.filter(a => !dismissed.has(a.id));
  }, [patients, episodes, appointments, claims, dismissed]);

  if (alerts.length === 0) return null;

  return (
    <Card style={{ marginBottom: "1rem", borderLeft: `3px solid #f59e0b` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#854F0B" }}>
          ⚡ Practice intelligence ({alerts.length})
        </div>
      </div>
      {alerts.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: a.color }}>{a.title}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{a.message}</div>
          </div>
          <button onClick={() => dismiss(a.id)}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: C.textSub, fontSize: 14, flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </Card>
  );
};

// ── Main Flowboard screen ─────────────────────────────────────────────────────
export const Flowboard = ({ navigate }) => {
  const { patients, episodes, appointments, claims, setLiveAppts, db } = useContext(DataContext);
  const [view, setView] = useState("list");

  const today = todayStr();
  const todayAppts = useMemo(() =>
    appointments.filter(a => a.scheduled_at.startsWith(today))
      .sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [appointments, today]);

  // KPI summary
  const total     = todayAppts.length;
  const done      = todayAppts.filter(a => a.status === "completed").length;
  const inProg    = todayAppts.filter(a => ["arrived","in_progress"].includes(a.status)).length;
  const dna       = todayAppts.filter(a => a.status === "dna").length;
  const remaining = todayAppts.filter(a => a.status === "scheduled").length;
  const estRev    = done * 980; // rough estimate

  const handleStatusChange = async (apptId, newStatus) => {
    setLiveAppts?.(prev => {
      const arr = prev || appointments;
      return arr.map(a => a.id === apptId ? { ...a, status: newStatus } : a);
    });
    if (db && !String(apptId).startsWith("a")) {
      await db.from("appointment").update({ status: newStatus }).eq("id", apptId);
    }
  };

  const handleOpenNote = (appt) => navigate("clinical");

  const patientOf  = (id) => patients.find(p => p.id === id);
  const episodeOf  = (id) => episodes.find(e => e.id === id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>
          Flowboard · {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}
        </h2>
        <Btn onClick={() => navigate("appointments")}>+ Book appointment</Btn>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Total today",  value: total,     color: C.teal    },
          { label: "Completed",    value: done,       color: "#10b981" },
          { label: "In clinic",    value: inProg,     color: "#8b5cf6" },
          { label: "Remaining",    value: remaining,  color: "#3b82f6" },
          { label: "DNA",          value: dna,        color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ background: C.bgSub, borderRadius: 8, padding: "0.75rem" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textSub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Intelligence panel */}
      <IntelligencePanel patients={patients} episodes={episodes}
        appointments={appointments} claims={claims} />

      {/* View tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {[["list","List"],["timeline","Timeline"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: view === v ? C.teal : C.tealLight,
              color: view === v ? "#fff" : C.teal, fontWeight: 600, fontSize: 13 }}>
            {l}
          </button>
        ))}
      </div>

      {/* List view */}
      {view === "list" && (
        <div>
          {todayAppts.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
                No appointments today.
                <div style={{ marginTop: 10 }}>
                  <Btn onClick={() => navigate("appointments")}>+ Book appointment</Btn>
                </div>
              </div>
            </Card>
          ) : todayAppts.map(a => (
            <ApptCard key={a.id} appt={a}
              patient={patientOf(a.patient_id)}
              episode={episodeOf(a.episode_id)}
              onStatusChange={handleStatusChange}
              onNote={handleOpenNote} />
          ))}
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && (
        <Card>
          <TimelineView appts={todayAppts} patients={patients} episodes={episodes}
            onStatusChange={handleStatusChange} onNote={handleOpenNote} />
        </Card>
      )}
    </div>
  );
};
