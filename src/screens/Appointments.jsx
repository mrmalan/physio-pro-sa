import { useContext, useState, useMemo } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES } from "../shared.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const APPT_TYPES = {
  initial:    { label: "Initial assessment", duration: 60 },
  follow_up:  { label: "Follow-up",          duration: 30 },
  review:     { label: "Review",             duration: 30 },
  discharge:  { label: "Discharge session",  duration: 45 },
  home_visit: { label: "Home visit",         duration: 60 },
};

const STATUS_CONFIG = {
  scheduled:   { label: "Scheduled",   color: "#3b82f6" },
  arrived:     { label: "Arrived",     color: "#f59e0b" },
  in_progress: { label: "In progress", color: "#8b5cf6" },
  completed:   { label: "Completed",   color: "#10b981" },
  dna:         { label: "DNA",         color: "#ef4444" },
  cancelled:   { label: "Cancelled",   color: "#94a3b8" },
};

const STATUS_FLOW = {
  scheduled: ["arrived", "dna", "cancelled"],
  arrived:   ["in_progress", "dna"],
  in_progress: ["completed"],
  completed: [],
  dna:       ["scheduled"],
  cancelled: ["scheduled"],
};

const ROOMS = ["Room 1", "Room 2", "Room 3", "Gym / exercise bay", "Home visit"];

function pad(n) { return String(n).padStart(2, "0"); }
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

// ── Booking modal ─────────────────────────────────────────────────────────────
const BookingModal = ({ patients, episodes, onSave, onClose }) => {
  const [patientId, setPatientId]   = useState("");
  const [patientQ,  setPatientQ]    = useState("");
  const [epId,      setEpId]        = useState("");
  const [apptType,  setApptType]    = useState("follow_up");
  const [date,      setDate]        = useState(todayStr());
  const [hour,      setHour]        = useState("09");
  const [minute,    setMinute]      = useState("00");
  const [duration,  setDuration]    = useState(30);
  const [room,      setRoom]        = useState("Room 1");
  const [notes,     setNotes]       = useState("");
  const [step,      setStep]        = useState(1); // 1=patient, 2=details

  const filteredPts = patients.filter(p => {
    const q = patientQ.toLowerCase();
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q);
  });

  const selPatient = patients.find(p => p.id === patientId);
  const patientEps = episodes.filter(e => e.patient_id === patientId && e.status === "active");

  const handleSelectType = (t) => {
    setApptType(t);
    setDuration(APPT_TYPES[t].duration);
  };

  const handleSave = () => {
    if (!patientId) return;
    const scheduled_at = `${date}T${hour}:${minute}:00Z`;
    onSave({
      id: `a${Date.now()}`,
      patient_id: patientId,
      episode_id: epId || null,
      scheduled_at,
      duration_minutes: duration,
      appointment_type: apptType,
      room,
      status: "scheduled",
      notes,
    });
  };

  const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, color: C.text, background: C.bgCard, boxSizing: "border-box" };
  const lbl = { fontSize: 12, color: C.textSub, display: "block", marginBottom: 4, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem", width: 480,
        maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, color: C.teal, fontSize: 16 }}>Book appointment</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer",
            fontSize: 18, color: C.textSub, lineHeight: 1 }}>×</button>
        </div>

        {/* Step 1 — Patient selection */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Search patient</label>
              <input style={inp} value={patientQ} onChange={e => setPatientQ(e.target.value)}
                placeholder="Type name..." autoFocus />
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`,
              borderRadius: 8, background: C.bg }}>
              {filteredPts.length === 0 && (
                <div style={{ padding: "1rem", color: C.textSub, fontSize: 13, textAlign: "center" }}>
                  No patients found
                </div>
              )}
              {filteredPts.map(p => {
                const scheme = SA_SCHEMES.find(s => s.id === p.medical_aid_id);
                return (
                  <div key={p.id} onClick={() => { setPatientId(p.id); setStep(2); }}
                    style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>
                      {scheme ? scheme.name : "Cash patient"} · {p.phone}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Appointment details */}
        {step === 2 && selPatient && (
          <div>
            <div onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 8,
              marginBottom: "1rem", padding: "8px 10px", background: C.tealLight,
              borderRadius: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>←</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.teal }}>
                  {selPatient.first_name} {selPatient.last_name}
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>
                  {SA_SCHEMES.find(s => s.id === selPatient.medical_aid_id)?.name || "Cash patient"}
                </div>
              </div>
            </div>

            {/* Episode */}
            {patientEps.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Episode of care</label>
                <select style={inp} value={epId} onChange={e => setEpId(e.target.value)}>
                  <option value="">No episode / walk-in</option>
                  {patientEps.map(e => (
                    <option key={e.id} value={e.id}>{e.diagnosis} ({e.icd10_primary})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Type */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Type</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(APPT_TYPES).map(([k, v]) => (
                  <button key={k} onClick={() => handleSelectType(k)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500,
                      background: apptType === k ? C.teal : C.bgSub,
                      color: apptType === k ? "#fff" : C.text }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Date</label>
                <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Hour</label>
                <select style={inp} value={hour} onChange={e => setHour(e.target.value)}>
                  {Array.from({length: 13}, (_, i) => pad(i + 7)).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Minute</label>
                <select style={inp} value={minute} onChange={e => setMinute(e.target.value)}>
                  {["00","15","30","45"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Duration (min)</label>
                <select style={inp} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            {/* Room */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Room</label>
              <select style={inp} value={room} onChange={e => setRoom(e.target.value)}>
                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={lbl}>Notes (optional)</label>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 56 }}
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Bring in previous scans" />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn onClick={handleSave}>Book appointment</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Status badge with inline progress ─────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#94a3b8" };
  return (
    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 600,
      background: cfg.color + "20", color: cfg.color, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
};

// ── Appointment detail panel ──────────────────────────────────────────────────
const ApptPanel = ({ appt, patient, episode, onStatusChange, onOpenNote, onClose }) => {
  const nextStatuses = STATUS_FLOW[appt.status] || [];
  const scheme = SA_SCHEMES.find(s => s.id === patient?.medical_aid_id);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem", width: 420,
        maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient"}
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              {APPT_TYPES[appt.appointment_type]?.label || appt.appointment_type} · {appt.duration_minutes} min · {appt.room}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer",
            fontSize: 18, color: C.textSub }}>×</button>
        </div>

        <div style={{ background: C.bgSub, borderRadius: 8, padding: "12px", marginBottom: "1rem",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Date & time</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(appt.scheduled_at)}</div>
            <div style={{ fontSize: 13, color: C.textSub }}>{fmtTime(appt.scheduled_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Medical aid</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{scheme?.name || "Cash patient"}</div>
            {patient?.medical_aid_number && (
              <div style={{ fontSize: 12, color: C.textSub }}>{patient.medical_aid_number}</div>
            )}
          </div>
          {episode && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: C.textSub }}>Episode</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{episode.diagnosis}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                {episode.icd10_primary} · Session {episode.sessions_completed + 1} of {episode.sessions_authorised || "?"}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
          <span style={{ fontSize: 12, color: C.textSub }}>Status:</span>
          <StatusBadge status={appt.status} />
        </div>

        {nextStatuses.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>Move to:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {nextStatuses.map(s => (
                <button key={s} onClick={() => onStatusChange(s)}
                  style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                    background: STATUS_CONFIG[s].color + "20", color: STATUS_CONFIG[s].color,
                    fontSize: 12, fontWeight: 600 }}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {appt.notes && (
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: "1rem",
            background: C.bgSub, borderRadius: 6, padding: "8px 10px" }}>
            {appt.notes}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {(appt.status === "arrived" || appt.status === "in_progress" || appt.status === "completed") && (
            <Btn onClick={onOpenNote} style={{ flex: 1 }}>
              {appt.status === "completed" ? "View clinical note" : "Open clinical note →"}
            </Btn>
          )}
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Main Appointments screen ──────────────────────────────────────────────────
export const Appointments = ({ navigate }) => {
  const { patients, episodes, appointments, setLiveAppts } = useContext(DataContext);
  const [view,      setView]      = useState("today");
  const [showBook,  setShowBook]  = useState(false);
  const [selAppt,   setSelAppt]   = useState(null);

  const today = todayStr();

  const displayed = useMemo(() => {
    const sorted = [...appointments].sort((a, b) =>
      new Date(a.scheduled_at) - new Date(b.scheduled_at));
    if (view === "today")    return sorted.filter(a => a.scheduled_at.startsWith(today));
    if (view === "upcoming") return sorted.filter(a => a.scheduled_at >= today + "T" && a.status !== "cancelled");
    return sorted;
  }, [appointments, view, today]);

  const patientName = (id) => {
    const p = patients.find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "Unknown";
  };

  const handleBook = (appt) => {
    setLiveAppts?.(prev => prev ? [...prev, appt] : [appt]);
    setShowBook(false);
  };

  const handleStatusChange = (newStatus) => {
    if (!selAppt) return;
    const updated = { ...selAppt, status: newStatus };
    setLiveAppts?.(prev => prev
      ? prev.map(a => a.id === selAppt.id ? updated : a)
      : appointments.map(a => a.id === selAppt.id ? updated : a)
    );
    setSelAppt(updated);
  };

  const openNote = () => {
    setSelAppt(null);
    navigate("clinical");
  };

  // Summary counts
  const todayCounts = appointments.filter(a => a.scheduled_at.startsWith(today));
  const doneToday   = todayCounts.filter(a => a.status === "completed").length;
  const dnaToday    = todayCounts.filter(a => a.status === "dna").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Appointments</h2>
        <Btn onClick={() => setShowBook(true)}>+ Book appointment</Btn>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Today",     value: todayCounts.length, color: C.teal },
          { label: "Completed", value: doneToday,          color: "#10b981" },
          { label: "DNA",       value: dnaToday,           color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ background: C.bgSub, borderRadius: 8, padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {[["today","Today"],["upcoming","Upcoming"],["all","All"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: view === v ? C.teal : C.tealLight, color: view === v ? "#fff" : C.teal,
              fontWeight: 600, fontSize: 13 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Appointment list */}
      <Card>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
            {view === "today" ? "No appointments today — book one above." : "No appointments found."}
          </div>
        ) : displayed.map(a => {
          const pt      = patients.find(x => x.id === a.patient_id);
          const ep      = episodes.find(x => x.id === a.episode_id);
          const scheme  = pt ? SA_SCHEMES.find(s => s.id === pt.medical_aid_id) : null;
          const cfg     = STATUS_CONFIG[a.status] || { color: "#94a3b8" };
          return (
            <div key={a.id} onClick={() => setSelAppt(a)}
              style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "11px 0", borderBottom: `1px solid ${C.border}`,
                cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bgSub}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 4, height: 40, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
              <div style={{ minWidth: 70 }}>
                <div style={{ color: C.teal, fontWeight: 700, fontSize: 14 }}>
                  {fmtTime(a.scheduled_at)}
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>{a.duration_minutes} min</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>
                  {pt ? `${pt.first_name} ${pt.last_name}` : "Unknown patient"}
                </div>
                <div style={{ fontSize: 12, color: C.textSub }}>
                  {APPT_TYPES[a.appointment_type]?.label || a.appointment_type}
                  {ep ? ` · ${ep.diagnosis}` : ""}
                  {" · "}{a.room}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <StatusBadge status={a.status} />
                {scheme && (
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{scheme.name}</div>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {showBook && (
        <BookingModal
          patients={patients}
          episodes={episodes}
          onSave={handleBook}
          onClose={() => setShowBook(false)}
        />
      )}

      {selAppt && (
        <ApptPanel
          appt={selAppt}
          patient={patients.find(p => p.id === selAppt.patient_id)}
          episode={episodes.find(e => e.id === selAppt.episode_id)}
          onStatusChange={handleStatusChange}
          onOpenNote={openNote}
          onClose={() => setSelAppt(null)}
        />
      )}
    </div>
  );
};
