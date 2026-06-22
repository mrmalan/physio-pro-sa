// apps/physio-pro/src/components/navigation.jsx
import { C } from "../shared.js";

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",      icon: "⊞" },
  { id: "appointments", label: "Appointments",   icon: "📅" },
  { id: "patients",     label: "Patients",       icon: "👤" },
  { id: "clinical",     label: "Clinical notes", icon: "📋" },
  { id: "episodes",     label: "Episodes",       icon: "🗂" },
  { id: "medicalaid",   label: "Medical aid",    icon: "💳" },
  { id: "invoices",     label: "Invoices",       icon: "🧾" },
  { id: "finance",      label: "Finance",        icon: "📊" },
  { id: "cpd",          label: "CPD tracker",    icon: "🎓" },
  { id: "settings",     label: "Settings",       icon: "⚙" },
];

const SCREEN_LABELS = Object.fromEntries(NAV_ITEMS.map(n => [n.id, n.label]));

export const Sidebar = ({ screen, setScreen, session, onLogout }) => {
  const meta = session?.user?.user_metadata || {};
  return (
    <div style={{ width: 220, background: "#083D40", display: "flex", flexDirection: "column",
      minHeight: "100vh", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: -0.3 }}>Physio Pro SA</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
          {meta.practice_name || "Practice management"}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0.5rem 0", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 1rem", background: screen === item.id ? "rgba(255,255,255,0.1)" : "none",
              border: "none", cursor: "pointer", color: screen === item.id ? "#fff" : "rgba(255,255,255,0.65)",
              fontSize: 13, fontWeight: screen === item.id ? 600 : 400, textAlign: "left",
              borderLeft: screen === item.id ? "3px solid #4DD6D9" : "3px solid transparent" }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, truncate: true }}>
          {meta.full_name || session?.user?.email}
        </div>
        <button onClick={onLogout}
          style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", background: "none",
            border: "none", cursor: "pointer", padding: 0 }}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export const TopBar = ({ screen }) => (
  <div style={{ height: 52, background: "#fff", borderBottom: `1px solid ${C.border}`,
    display: "flex", alignItems: "center", padding: "0 1.5rem",
    justifyContent: "space-between", flexShrink: 0 }}>
    <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>
      {SCREEN_LABELS[screen] || screen}
    </div>
    <div style={{ fontSize: 12, color: C.textSub }}>Physio Pro SA</div>
  </div>
);
