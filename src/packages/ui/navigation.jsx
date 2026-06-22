import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { Badge, Btn } from "./ui.jsx";
import { C, USE_MOCK } from "../core/mockdata.js";

// OccHealth Pro SA — Navigation: NAV_OHP, NAV_EMPLOYER, Sidebar, TopBar
export const NAV_OHP = [
  { id: "dashboard",    label: "Dashboard",    icon: "⊞" },
  { id: "flowboard",    label: "Flowboard",    icon: "📅" },
  { id: "employers",    label: "Employers",    icon: "🏭" },
  { id: "encounters",   label: "Encounters",   icon: "📋" },
  { id: "surveillance", label: "Surveillance", icon: "📊" },
  { id: "fitness",      label: "Fitness certs",icon: "✅" },
  { id: "iod",          label: "IOD register", icon: "⚠" },
  { id: "drug",         label: "Drug testing", icon: "🧪" },
  { id: "stock",        label: "Stock & cal.", icon: "📦" },
  { id: "dol_checklist",label: "DoL readiness",icon: "🔍" },
  { id: "portal",       label: "Employer view",icon: "🏢" },
  { id: "cpd",          label: "CPD tracker",  icon: "🎓" },
  { id: "finance",      label: "Finance",      icon: "💳" },
  { id: "settings",     label: "Settings",     icon: "⚙" },
];

export const NAV_EMPLOYER = [
  { id: "portal", label: "Dashboard", icon: "⊞" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export const Sidebar = ({ screen, setScreen, session, onLogout, view, isCPDFree, onUpgrade }) => {
  const nav = view === "employer" ? NAV_EMPLOYER : NAV_OHP;
  return (
    <div style={{ width: 200, minHeight: "100vh", background: C.tealDark, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "1.25rem 1rem 1rem" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>OccHealth Pro SA</div>
        <div style={{ fontSize: 10, color: "#5DCAA5", marginTop: 2, letterSpacing: "0.05em" }}>
          {view === "employer" ? "EMPLOYER PORTAL" : view === "bureau" ? "BUREAU OPS" : "OHP CLINICAL"}
        </div>
      </div>
      <nav style={{ flex: 1, padding: "0.5rem 0.5rem" }}>
        {nav.map(item => (
          <div key={item.id} onClick={() => setScreen(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 7, marginBottom: 2, cursor: "pointer", background: screen === item.id ? "rgba(255,255,255,0.12)" : "transparent", color: screen === item.id ? "#fff" : "#9FE1CB", fontSize: 13, transition: "background 0.15s" }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: "1rem", borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 11, color: "#5DCAA5", marginBottom: 4 }}>{session.user.user_metadata.full_name}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{session.user.email}</div>
        {isCPDFree && (
          <button onClick={() => onUpgrade("ohp")} style={{ width: "100%", padding: "7px 10px", background: "#5DCAA5", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "center", marginBottom: 6 }}>
            ⚡ Upgrade to Pro
          </button>
        )}
        <Btn variant="ghost" size="sm" onClick={onLogout} style={{ color: "#9FE1CB", borderColor: "rgba(255,255,255,0.2)", fontSize: 11 }}>Sign out</Btn>
      </div>
    </div>
  );
};

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
export const TopBar = ({ screen, nav }) => {
  const item = nav.find(n => n.id === screen);
  return (
    <div style={{ background: "#fff", borderBottom: `0.5px solid ${C.border}`, padding: "0 1.5rem", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{item?.label || screen}</div>
      {USE_MOCK && <Badge color="amber">Demo mode</Badge>}
    </div>
  );
};

// ─── DATA CONTEXT ────────────────────────────────────────────────────────────
