import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { C } from "../core/mockdata.js";

// OccHealth Pro SA — shared UI primitives
// Badge, Card, SectionTitle, Btn, StatCard
// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────
export const Badge = ({ children, color = "teal" }) => {
  const styles = {
    teal: { background: C.tealLight, color: C.teal },
    amber: { background: C.amberLight, color: C.amber },
    red: { background: C.redLight, color: C.red },
    gray: { background: C.bgSub, color: C.textSub },
  };
  return (
    <span style={{ ...styles[color], fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
};

export const Card = ({ children, style = {}, ...rest }) => (
  <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "1rem 1.25rem", ...style }} {...rest}>
    {children}
  </div>
);

export const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textTert, fontWeight: 500, marginBottom: 12, paddingBottom: 8, borderBottom: `0.5px solid ${C.border}` }}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, variant = "primary", size = "md", disabled = false, style = {} }) => {
  const base = { border: "none", borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 500, transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1 };
  const sizes = { sm: { fontSize: 12, padding: "5px 12px" }, md: { fontSize: 13, padding: "8px 16px" }, lg: { fontSize: 14, padding: "10px 20px" } };
  const variants = {
    primary: { background: C.teal, color: "#fff" },
    secondary: { background: C.bgSub, color: C.text },
    danger: { background: C.red, color: "#fff" },
    ghost: { background: "transparent", color: C.teal, border: `1px solid ${C.teal}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

export const StatCard = ({ label, value, sub, color = C.teal, onClick, style = {} }) => (
  <div onClick={onClick} style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem 1rem", transition: "opacity .15s", ...(onClick ? { cursor: "pointer" } : {}), ...style }} onMouseEnter={onClick ? e => e.currentTarget.style.opacity=".8" : undefined} onMouseLeave={onClick ? e => e.currentTarget.style.opacity="1" : undefined}>
    <div style={{ fontSize: 22, fontWeight: 500, color, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 1.4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.textTert, marginTop: 2 }}>{sub}</div>}
  </div>
);

