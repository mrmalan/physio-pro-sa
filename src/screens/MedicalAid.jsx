import { useContext, useState, useMemo } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { SA_SCHEMES, ERA_REJECTION_REASONS,
         claimStatusLabel, claimStatusColor, generateClaimCSV, benefitAlert } from "../shared.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const VAT_RATE = 0.15;
function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRand(n) { return `R ${Number(n||0).toFixed(2)}`; }
function downloadCSV(content, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  a.download = filename; a.click();
}

const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
  color: C.text, background: C.bgCard };
const lbl = { fontSize: 11, fontWeight: 600, color: C.textSub, display: "block",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" };

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const color = claimStatusColor(status);
  return (
    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 600,
      background: color + "22", color, whiteSpace: "nowrap" }}>
      {claimStatusLabel(status)}
    </span>
  );
};

// ── Pre-auth tracker modal ────────────────────────────────────────────────────
const PreAuthModal = ({ episode, patient, onSave, onClose }) => {
  const scheme = SA_SCHEMES.find(s => s.id === patient?.medical_aid_id);
  const [form, setForm] = useState({
    pre_auth_number:    episode?.pre_auth_number    || "",
    sessions_authorised: episode?.sessions_authorised || "",
    pre_auth_expiry:    episode?.pre_auth_expiry    || "",
    pre_auth_notes:     episode?.pre_auth_notes     || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem",
        width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, color: C.teal, fontSize: 15 }}>Pre-authorisation</h3>
          <button onClick={onClose} style={{ border: "none", background: "none",
            cursor: "pointer", fontSize: 18, color: C.textSub }}>×</button>
        </div>

        <div style={{ background: C.tealLight, borderRadius: 8, padding: "10px 12px", marginBottom: "1rem", fontSize: 13 }}>
          <strong>{patient?.first_name} {patient?.last_name}</strong>
          <span style={{ color: C.textSub }}> · {scheme?.name || "Cash"}</span>
          <div style={{ color: C.textSub, fontSize: 12 }}>{episode?.diagnosis}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}>Pre-auth number</label>
            <input style={inp} value={form.pre_auth_number}
              onChange={e => set("pre_auth_number", e.target.value)}
              placeholder="e.g. DISC-2026-12345" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Sessions authorised</label>
              <input type="number" style={inp} value={form.sessions_authorised}
                onChange={e => set("sessions_authorised", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div>
              <label style={lbl}>Expiry date</label>
              <input type="date" style={inp} value={form.pre_auth_expiry}
                onChange={e => set("pre_auth_expiry", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 56 }}
              value={form.pre_auth_notes}
              onChange={e => set("pre_auth_notes", e.target.value)}
              placeholder="e.g. Approved for lumbar stabilisation programme" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(form)}>Save pre-auth</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Claim detail / action modal ───────────────────────────────────────────────
const ClaimModal = ({ claim, patient, episode, db, onUpdate, onClose }) => {
  const [status,      setStatus]     = useState(claim.status);
  const [amountPaid,  setAmountPaid] = useState(claim.amount_paid || "");
  const [eraCode,     setEraCode]    = useState(claim.era_code || "");
  const [rejReason,   setRejReason]  = useState(claim.rejection_reason || "");
  const [switchRef,   setSwitchRef]  = useState(claim.switch_ref || "");
  const [saving,      setSaving]     = useState(false);
  const [genAppeal,   setGenAppeal]  = useState(false);
  const [appealText,  setAppealText] = useState("");
  const [generating,  setGenerating] = useState(false);

  const scheme = SA_SCHEMES.find(s => s.code === claim.scheme_code || s.id === claim.scheme_code);
  const shortPaid = status === "short_paid" && amountPaid
    ? (claim.total_amount || 0) - Number(amountPaid) : 0;

  const save = async () => {
    setSaving(true);
    const updates = { status, switch_ref: switchRef || null };
    if (amountPaid)  updates.amount_paid = Number(amountPaid);
    if (eraCode)     updates.era_code    = eraCode;
    if (rejReason)   updates.rejection_reason = rejReason;
    if (status === "submitted" && claim.status !== "submitted")
      updates.submitted_at = new Date().toISOString();

    if (db && !String(claim.id).startsWith("c")) {
      await db.from("medical_aid_claim").update(updates).eq("id", claim.id);
    }
    onUpdate({ ...claim, ...updates });
    setSaving(false);
    onClose();
  };

  const generateAppeal = async () => {
    setGenerating(true);
    const eraDesc = ERA_REJECTION_REASONS[eraCode] || rejReason || "Unknown reason";
    const prompt = `Write a professional medical aid appeal letter for a South African physiotherapist.

Patient: ${patient?.first_name} ${patient?.last_name}
Member number: ${patient?.medical_aid_number || "unknown"}
Scheme: ${scheme?.name || claim.scheme_code}
Tariff code: ${claim.tariff_code}
ICD-10: ${claim.icd10_code}
Claim amount: R${claim.total_amount}
Rejection reason: ${eraDesc}
${episode ? `Diagnosis: ${episode.diagnosis}` : ""}

Write a concise (150–200 word) appeal letter addressing the rejection reason. Professional tone, South African medical aid context. Start with "Dear Claims Department," and end with a request for review. Do not include letterhead placeholders.`;

    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500,
          messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      setAppealText(data.content?.[0]?.text || "");
      setGenAppeal(true);
    } catch (e) { setAppealText(`Error: ${e.message}`); setGenAppeal(true); }
    setGenerating(false);
  };

  const STATUS_OPTIONS = ["draft","ready","submitted","acknowledged","paid","short_paid","rejected","appealed"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem", width: 500,
        maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: C.teal, fontSize: 15 }}>Claim detail</h3>
          <button onClick={onClose} style={{ border: "none", background: "none",
            cursor: "pointer", fontSize: 18, color: C.textSub }}>×</button>
        </div>

        {/* Summary card */}
        <div style={{ background: C.bgSub, borderRadius: 8, padding: "12px",
          marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Patient</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{patient?.first_name} {patient?.last_name}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{scheme?.name || claim.scheme_code}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Claim</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{claim.tariff_code} · {claim.icd10_code}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{fmtDate(claim.claim_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Billed</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.teal }}>
              {fmtRand(claim.total_amount)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textSub }}>Current status</div>
            <StatusPill status={claim.status} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status */}
          <div>
            <label style={lbl}>Update status</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 500,
                    background: status === s ? claimStatusColor(s) : C.bgSub,
                    color: status === s ? "#fff" : C.text }}>
                  {claimStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Switch reference */}
          <div>
            <label style={lbl}>Switch / submission reference</label>
            <input style={inp} value={switchRef} onChange={e => setSwitchRef(e.target.value)}
              placeholder="e.g. MSW-2026-001234" />
          </div>

          {/* Payment */}
          {["paid","short_paid"].includes(status) && (
            <div>
              <label style={lbl}>Amount paid by scheme (R)</label>
              <input type="number" style={inp} value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder={`Expected: ${claim.total_amount}`} />
              {status === "short_paid" && amountPaid && shortPaid > 0 && (
                <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>
                  Short-paid by {fmtRand(shortPaid)} — {Math.round((shortPaid/claim.total_amount)*100)}% below tariff
                </div>
              )}
            </div>
          )}

          {/* Rejection */}
          {["rejected","short_paid"].includes(status) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>ERA code</label>
                <select style={inp} value={eraCode} onChange={e => setEraCode(e.target.value)}>
                  <option value="">Select code...</option>
                  {Object.entries(ERA_REJECTION_REASONS).map(([k, v]) => (
                    <option key={k} value={k}>{k} — {v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Rejection reason</label>
                <input style={inp} value={rejReason || (eraCode ? ERA_REJECTION_REASONS[eraCode] : "")}
                  onChange={e => setRejReason(e.target.value)}
                  placeholder="Reason from scheme" />
              </div>
            </div>
          )}

          {/* Appeal letter */}
          {["rejected","short_paid"].includes(status) && (
            <div>
              {!genAppeal ? (
                <Btn variant="secondary" onClick={generateAppeal} disabled={generating}>
                  {generating ? "Writing appeal..." : "✍️ Generate appeal letter"}
                </Btn>
              ) : (
                <div>
                  <label style={{ ...lbl, marginBottom: 6 }}>Appeal letter</label>
                  <textarea value={appealText} onChange={e => setAppealText(e.target.value)}
                    rows={8} style={{ ...inp, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn size="sm" variant="secondary"
                      onClick={() => navigator.clipboard.writeText(appealText)}>Copy</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => {
                      const w = window.open("", "_blank");
                      w.document.write(`<html><body style="font-family:Arial;max-width:700px;margin:2rem auto;font-size:14px;line-height:1.7">
                        <h3>Appeal Letter — ${scheme?.name || claim.scheme_code}</h3>
                        <p>${appealText.replace(/\n/g, "<br/>")}</p>
                      </body></html>`);
                      w.print();
                    }}>Print</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Benefit year tracker panel ────────────────────────────────────────────────
const BenefitPanel = ({ patients, episodes, claims }) => {
  const currentYear = new Date().getFullYear();

  const benefitRows = episodes
    .filter(e => e.status === "active" && e.medical_aid_id && e.sessions_authorised != null)
    .map(ep => {
      const pt      = patients.find(p => p.id === ep.patient_id);
      const scheme  = SA_SCHEMES.find(s => s.id === ep.medical_aid_id);
      const used    = ep.sessions_used || 0;
      const auth    = ep.sessions_authorised || 0;
      const rem     = Math.max(0, auth - used);
      const pct     = auth > 0 ? Math.round((used / auth) * 100) : 0;
      const alert   = benefitAlert({ sessions_authorised: auth, sessions_used: used,
        sessions_remaining: rem, plan_name: scheme?.name });
      return { ep, pt, scheme, used, auth, rem, pct, alert };
    })
    .sort((a, b) => a.rem - b.rem); // most urgent first

  if (benefitRows.length === 0) return (
    <Card>
      <div style={{ fontSize: 13, color: C.textSub, textAlign: "center", padding: "1.5rem 0" }}>
        No active episodes with authorised session counts.
        Add session limits when opening an episode to track benefit usage here.
      </div>
    </Card>
  );

  return (
    <div>
      {benefitRows.map(({ ep, pt, scheme, used, auth, rem, pct, alert }) => (
        <Card key={ep.id} style={{ marginBottom: "0.75rem",
          borderLeft: `3px solid ${alert?.level === "error" ? "#ef4444" : alert ? "#f59e0b" : C.teal}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {pt?.first_name} {pt?.last_name}
              </div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                {ep.diagnosis} · {scheme?.name || ep.medical_aid_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 16,
                color: rem === 0 ? "#ef4444" : rem <= 3 ? "#f59e0b" : C.teal }}>
                {rem} left
              </div>
              <div style={{ fontSize: 11, color: C.textSub }}>{used}/{auth} used</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background: C.bgSub, borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width .4s",
              background: rem === 0 ? "#ef4444" : rem <= 3 ? "#f59e0b" : C.teal,
            }} />
          </div>
          {alert && (
            <div style={{ fontSize: 12, color: alert.level === "error" ? "#ef4444" : "#854F0B",
              fontWeight: 500 }}>
              ⚠ {alert.message}
            </div>
          )}
          {rem <= 3 && rem > 0 && (
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
              Consider requesting new pre-auth or discussing cash payment for remaining sessions.
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

// ── Bulk export modal ─────────────────────────────────────────────────────────
const BulkExportModal = ({ claims, patients, onClose }) => {
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState(today());
  const [scheme, setScheme] = useState("all");
  const [status, setStatus] = useState("ready");

  const filtered = claims.filter(c => {
    if (from && c.claim_date < from) return false;
    if (to   && c.claim_date > to)   return false;
    if (scheme !== "all" && c.scheme_code !== scheme) return false;
    if (status !== "all" && c.status !== status) return false;
    return true;
  });

  const doExport = () => {
    const rows = filtered.map(c => {
      const pt = patients.find(p => p.id === c.patient_id);
      return { ...c,
        patient_surname:    pt?.last_name    || "",
        patient_first_name: pt?.first_name   || "",
        member_number:      pt?.medical_aid_number || c.member_number || "",
        dependant_code:     pt?.dependant_code || "00",
        treating_provider:  "Physiotherapist",
        hpcsa_number:       "",
        diagnosis_description: c.description || "",
      };
    });
    downloadCSV(generateClaimCSV(rows),
      `physio_claims_${from || "all"}_to_${to}_${scheme === "all" ? "allschemes" : scheme}.csv`);
    onClose();
  };

  const schemes = [...new Set(claims.map(c => c.scheme_code).filter(Boolean))];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem",
        width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: C.teal, fontSize: 15 }}>Bulk claim export</h3>
          <button onClick={onClose} style={{ border: "none", background: "none",
            cursor: "pointer", fontSize: 18, color: C.textSub }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: "1rem", lineHeight: 1.5 }}>
          Generates a CSV for manual upload to scheme portals or billing bureau (Physio Billing / PracMed / MDS).
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>From date</label>
              <input type="date" style={inp} value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>To date</label>
              <input type="date" style={inp} value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Scheme</label>
            <select style={inp} value={scheme} onChange={e => setScheme(e.target.value)}>
              <option value="all">All schemes</option>
              {schemes.map(s => {
                const sc = SA_SCHEMES.find(x => x.code === s || x.id === s);
                return <option key={s} value={s}>{sc?.name || s}</option>;
              })}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ready">Ready to submit</option>
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div style={{ background: C.tealLight, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, color: C.teal, marginBottom: "1rem" }}>
          {filtered.length} claim{filtered.length !== 1 ? "s" : ""} match · {" "}
          {fmtRand(filtered.reduce((s,c) => s + (c.total_amount||0), 0))} total
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={doExport} disabled={filtered.length === 0}>
            Download CSV ({filtered.length})
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Main MedicalAid screen ────────────────────────────────────────────────────
export const MedicalAid = ({ navigate }) => {
  const { claims, patients, episodes, db, setLiveClaims } = useContext(DataContext);

  const [tab,          setTab]          = useState("claims");
  const [filter,       setFilter]       = useState("all");
  const [selClaim,     setSelClaim]     = useState(null);
  const [preAuthEp,    setPreAuthEp]    = useState(null);
  const [showBulk,     setShowBulk]     = useState(false);

  // Derived counts for tab badges
  const readyCount    = claims.filter(c => c.status === "ready").length;
  const rejectedCount = claims.filter(c => ["rejected","short_paid"].includes(c.status)).length;
  const benefitAlerts = episodes.filter(e => {
    if (e.status !== "active" || !e.sessions_authorised) return false;
    const rem = (e.sessions_authorised||0) - (e.sessions_used||0);
    return rem <= 3;
  }).length;

  const displayed = useMemo(() => {
    const base = filter === "all" ? claims : claims.filter(c => c.status === filter);
    return [...base].sort((a,b) => (b.claim_date||"").localeCompare(a.claim_date||""));
  }, [claims, filter]);

  const totalOutstanding = claims
    .filter(c => !["paid","draft"].includes(c.status))
    .reduce((s,c) => s + (c.total_amount||0), 0);
  const totalPaid = claims.filter(c => c.status === "paid")
    .reduce((s,c) => s + (c.amount_paid || c.total_amount || 0), 0);
  const totalShortPaid = claims.filter(c => c.status === "short_paid")
    .reduce((s,c) => s + ((c.total_amount||0) - (c.amount_paid||0)), 0);

  const ptOf = (id) => patients.find(p => p.id === id);
  const epOf = (id) => episodes.find(e => e.id === id);

  const handleClaimUpdate = (updated) => {
    setLiveClaims?.(prev => (prev||claims).map(c => c.id === updated.id ? updated : c));
    setSelClaim(null);
  };

  const handlePreAuthSave = async (form) => {
    if (!preAuthEp || !db) { setPreAuthEp(null); return; }
    const updates = {
      pre_auth_number:     form.pre_auth_number     || null,
      sessions_authorised: form.sessions_authorised ? Number(form.sessions_authorised) : null,
      sessions_used:       preAuthEp.sessions_used  || 0,
    };
    if (!String(preAuthEp.id).startsWith("e")) {
      await db.from("episode_of_care").update(updates).eq("id", preAuthEp.id);
    }
    setPreAuthEp(null);
  };

  const TABS = [
    { id: "claims",   label: "Claims",          badge: readyCount > 0 ? readyCount : null,     badgeColor: "#3b82f6" },
    { id: "actions",  label: "Action required",  badge: rejectedCount > 0 ? rejectedCount : null, badgeColor: "#ef4444" },
    { id: "benefits", label: "Benefit tracker",  badge: benefitAlerts > 0 ? benefitAlerts : null, badgeColor: "#f59e0b" },
    { id: "preauth",  label: "Pre-auth",         badge: null },
  ];

  const FILTER_BUTTONS = [
    ["all","All"],["ready","Ready"],["submitted","Submitted"],
    ["acknowledged","Acknowledged"],["paid","Paid"],
    ["short_paid","Short-paid"],["rejected","Rejected"],["appealed","Appealed"],
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Medical aid</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => setShowBulk(true)}>Export claims CSV</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Outstanding",  value: fmtRand(totalOutstanding), color: "#f59e0b" },
          { label: "Paid (all)",   value: fmtRand(totalPaid),        color: "#10b981" },
          { label: "Short-paid gap",value: fmtRand(totalShortPaid),  color: totalShortPaid > 0 ? "#ef4444" : C.teal },
        ].map(s => (
          <div key={s.label} style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem 1rem" }}>
            <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 14px", border: "none", background: "none", cursor: "pointer",
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? C.teal : C.textSub,
              borderBottom: tab === t.id ? `2px solid ${C.teal}` : "2px solid transparent",
              fontSize: 13, marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {t.badge && (
              <span style={{ background: t.badgeColor, color: "#fff", fontSize: 10,
                padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Claims tab ── */}
      {tab === "claims" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
            {FILTER_BUTTONS.map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 500,
                  background: filter === v ? C.teal : C.tealLight,
                  color: filter === v ? "#fff" : C.teal }}>
                {l}
              </button>
            ))}
          </div>
          <Card>
            {displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
                No claims matching this filter.
              </div>
            ) : displayed.map(c => {
              const pt = ptOf(c.patient_id);
              const shortPaid = c.status === "short_paid" && c.amount_paid
                ? (c.total_amount||0) - c.amount_paid : 0;
              return (
                <div key={c.id} onClick={() => setSelClaim(c)}
                  style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 0", borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSub}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {pt ? `${pt.first_name} ${pt.last_name}` : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub }}>
                      {c.tariff_code} · {c.icd10_code} · {fmtDate(c.claim_date)}
                      {c.scheme_code ? ` · ${c.scheme_code}` : ""}
                    </div>
                    {shortPaid > 0 && (
                      <div style={{ fontSize: 11, color: "#f59e0b" }}>
                        Short-paid {fmtRand(shortPaid)}
                      </div>
                    )}
                    {c.rejection_reason && (
                      <div style={{ fontSize: 11, color: "#ef4444" }}>
                        Rejected: {c.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtRand(c.total_amount)}</div>
                    {c.amount_paid && c.status !== "short_paid" && (
                      <div style={{ fontSize: 11, color: "#10b981" }}>Paid {fmtRand(c.amount_paid)}</div>
                    )}
                  </div>
                  <StatusPill status={c.status} />
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── Action required tab ── */}
      {tab === "actions" && (
        <div>
          {claims.filter(c => ["rejected","short_paid"].includes(c.status)).length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "2rem", color: "#10b981", fontSize: 14 }}>
                ✅ No rejected or short-paid claims. All clear.
              </div>
            </Card>
          ) : claims.filter(c => ["rejected","short_paid"].includes(c.status))
            .sort((a,b) => (b.claim_date||"").localeCompare(a.claim_date||""))
            .map(c => {
              const pt = ptOf(c.patient_id);
              const shortPaid = c.status === "short_paid" && c.amount_paid
                ? (c.total_amount||0) - c.amount_paid : 0;
              return (
                <Card key={c.id} style={{ marginBottom: "0.75rem",
                  borderLeft: `3px solid ${c.status === "rejected" ? "#ef4444" : "#f59e0b"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {pt?.first_name} {pt?.last_name}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        {c.tariff_code} · {c.icd10_code} · {fmtDate(c.claim_date)}
                      </div>
                    </div>
                    <StatusPill status={c.status} />
                  </div>
                  {c.rejection_reason && (
                    <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>
                      Reason: {c.rejection_reason}
                      {c.era_code ? ` (${c.era_code} — ${ERA_REJECTION_REASONS[c.era_code] || ""})` : ""}
                    </div>
                  )}
                  {shortPaid > 0 && (
                    <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8 }}>
                      Short-paid by {fmtRand(shortPaid)} ({Math.round((shortPaid/(c.total_amount||1))*100)}% below tariff)
                    </div>
                  )}
                  <Btn size="sm" onClick={() => setSelClaim(c)}>
                    {c.status === "rejected" ? "Appeal / resubmit" : "Manage short-pay"}
                  </Btn>
                </Card>
              );
            })}
        </div>
      )}

      {/* ── Benefit tracker tab ── */}
      {tab === "benefits" && (
        <BenefitPanel patients={patients} episodes={episodes} claims={claims} />
      )}

      {/* ── Pre-auth tab ── */}
      {tab === "preauth" && (
        <div>
          {episodes.filter(e => e.status === "active" && e.medical_aid_id).length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
                No active medical aid episodes. Pre-auth is tracked per episode.
              </div>
            </Card>
          ) : episodes.filter(e => e.status === "active" && e.medical_aid_id).map(ep => {
            const pt     = patients.find(p => p.id === ep.patient_id);
            const scheme = SA_SCHEMES.find(s => s.id === ep.medical_aid_id);
            const hasAuth = ep.pre_auth_number;
            return (
              <Card key={ep.id} style={{ marginBottom: "0.75rem",
                borderLeft: `3px solid ${hasAuth ? C.teal : "#94a3b8"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {pt?.first_name} {pt?.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>
                      {ep.diagnosis} · {scheme?.name || ep.medical_aid_id}
                    </div>
                    {hasAuth ? (
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: C.teal, fontWeight: 600 }}>✓ {ep.pre_auth_number}</span>
                        <span style={{ color: C.textSub }}>
                          {ep.sessions_authorised ? ` · ${ep.sessions_authorised} sessions authorised` : ""}
                          {ep.pre_auth_expiry ? ` · expires ${fmtDate(ep.pre_auth_expiry)}` : ""}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>No pre-auth recorded</div>
                    )}
                  </div>
                  <Btn size="sm" variant={hasAuth ? "secondary" : "primary"}
                    onClick={() => setPreAuthEp(ep)}>
                    {hasAuth ? "Edit" : "+ Add pre-auth"}
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selClaim && (
        <ClaimModal
          claim={selClaim}
          patient={ptOf(selClaim.patient_id)}
          episode={epOf(selClaim.episode_id)}
          db={db}
          onUpdate={handleClaimUpdate}
          onClose={() => setSelClaim(null)}
        />
      )}
      {preAuthEp && (
        <PreAuthModal
          episode={preAuthEp}
          patient={ptOf(preAuthEp.patient_id)}
          onSave={handlePreAuthSave}
          onClose={() => setPreAuthEp(null)}
        />
      )}
      {showBulk && (
        <BulkExportModal
          claims={claims}
          patients={patients}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
};
