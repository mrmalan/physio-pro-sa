import { useState, useEffect, useContext } from "react";
import { C, Card, Btn, Badge, DataContext } from "../shared.js";

const HPCSA_POINTS_REQUIRED = 30; // HPCSA: 30 CEUs per 2-year cycle for physios

const CPD_CATEGORIES = [
  { id: "clinical",   label: "Clinical practice" },
  { id: "research",   label: "Research / publication" },
  { id: "education",  label: "Teaching / education" },
  { id: "ethics",     label: "Ethics / professional" },
  { id: "management", label: "Practice management" },
  { id: "other",      label: "Other" },
];

export const CPDTracker = ({ session }) => {
  const { db, practitionerId } = useContext(DataContext);
  const [activities, setActivities] = useState([]);
  const [loading,  setLoading]      = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ title: "", provider: "", date: "", points: "", category: "clinical", notes: "" });

  // Load from Supabase on mount
  useEffect(() => {
    if (!db || !practitionerId) return;
    setLoading(true);
    db.from("cpd_activity").select("").eq("practitioner_id", practitionerId)
      .order("activity_date", { ascending: false })
      .then(({ data }) => { if (data) setActivities(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [practitionerId]);

  const totalPoints = activities.reduce((s, a) => s + Number(a.points || 0), 0);
  const pct = Math.min(100, Math.round((totalPoints / HPCSA_POINTS_REQUIRED) * 100));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addActivity = async () => {
    if (!form.title || !form.date || !form.points) return;
    const activity = { ...form, id: Date.now().toString(), points: Number(form.points) };
    setActivities(prev => [...prev, activity]);
    setForm({ title: "", provider: "", date: "", points: "", category: "clinical", notes: "" });
    setShowAdd(false);
    if (db && practitionerId) {
      const { error } = await db.from("cpd_activity").insert({
        practitioner_id: practitionerId,
        title:         form.title,
        provider:      form.provider || null,
        activity_date: form.date,
        points:        Number(form.points),
        category:      form.category,
        notes:         form.notes || null,
      });
      if (error) console.warn("CPD save failed:", error);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>CPD Tracker</h2>
        <Btn onClick={() => setShowAdd(s => !s)}>+ Add activity</Btn>
      </div>
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.teal }}>{totalPoints} / {HPCSA_POINTS_REQUIRED}</div>
            <div style={{ fontSize: 13, color: C.textSub }}>HPCSA CEUs (current 2-year cycle)</div>
          </div>
          <Badge label={totalPoints >= HPCSA_POINTS_REQUIRED ? "Compliant" : `${HPCSA_POINTS_REQUIRED - totalPoints} CEUs needed`}
            color={totalPoints >= HPCSA_POINTS_REQUIRED ? C.green : C.amber} />
        </div>
        <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? C.green : C.teal, transition: "width 0.3s" }} />
        </div>
      </Card>
      {showAdd && (
        <Card style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Add CPD activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Activity title *" value={form.title} onChange={e => set("title", e.target.value)}
              style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }} />
            <input placeholder="Provider / institution" value={form.provider} onChange={e => set("provider", e.target.value)}
              style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }} />
              <input type="number" placeholder="CEU points *" value={form.points} onChange={e => set("points", e.target.value)}
                style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }} />
              <select value={form.category} onChange={e => set("category", e.target.value)}
                style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
                {CPD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn onClick={addActivity}>Save</Btn>
            </div>
          </div>
        </Card>
      )}
      <Card>
        {activities.length === 0 ? (
          <p style={{ color: C.textSub, margin: 0 }}>No CPD activities recorded yet.</p>
        ) : activities.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{a.provider} · {a.date} · {CPD_CATEGORIES.find(c => c.id === a.category)?.label}</div>
            </div>
            <div style={{ fontWeight: 700, color: C.teal }}>{a.points} CEU</div>
            <button onClick={async () => {
              setActivities(prev => prev.filter(x => x.id !== a.id));
              if (db && a.id && !String(a.id).match(/^\d+$/)) {
                await db.from("cpd_activity").delete().eq("id", a.id);
              }
            }} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub, fontSize: 16 }}>×</button>
          </div>
        ))}
      </Card>
    </div>
  );
};
