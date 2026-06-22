// OccHealth Pro SA — audit log writer and voice model helpers
import { LS, USE_MOCK, SUPABASE_URL, SUPABASE_ANON } from "./config.js";
import { offlineQ, sb, sbAuth } from "./supabase.js";

export const writeAuditLog = async (action, tableName, recordId, personId, employerId, detail = {}) => {
  const entry = {
    actor_type: "practitioner",
    action,
    table_name: tableName,
    record_id: recordId,
    person_id: personId,
    employer_id: employerId,
    client_timestamp: new Date().toISOString(),
    detail,
  };
  if (!navigator.onLine || USE_MOCK) {
    await offlineQ.push({ table: "audit_log", payload: entry, client_timestamp: entry.client_timestamp });
    return;
  }
  // Requires authenticated session — skip silently if no token (avoids 401 noise)
  try {
    const sess = JSON.parse(localStorage.getItem(LS.SESSION) || "null");
    const token = sess?.access_token;
    if (!token) return; // no session yet — skip, don't use anon key
    // Use return=minimal — no SELECT after INSERT, avoids 403 from RLS SELECT gap
    await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(entry),
    });
  } catch(e) {
    // Audit log failure is non-fatal — never let it break the calling operation
  }
};

// ─── VET VOICE MODEL (OHP style) ─────────────────────────────────────────────
export const saveSignedNote = (note) => {
  try {
    const notes = JSON.parse(localStorage.getItem(LS.SIGNED_NOTES) || "[]");
    notes.unshift(note);
    localStorage.setItem(LS.SIGNED_NOTES, JSON.stringify(notes.slice(0, 10)));
  } catch(e) {}
};

export const getStyleExamples = () => {
  try {
    const notes = JSON.parse(localStorage.getItem(LS.SIGNED_NOTES) || "[]");
    return notes.slice(0, 3).map(n =>
      `S: ${n.subjective}\nO: ${n.objective}\nA: ${n.assessment}\nP: ${n.plan}`
    ).join("\n\n---\n\n");
  } catch(e) { return ""; }
};

// ─── INPUT COMPONENT ─────────────────────────────────────────────────────────
