import { useContext, useState, useMemo } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { PHYSIO_TARIFF_CODES } from "../shared.js";
import { SA_SCHEMES } from "../shared.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const VAT_RATE    = 0.15;
const INV_PREFIX  = "PP";

let _nextInvNo = 1001;
function nextInvoiceNumber() { return `${INV_PREFIX}-${_nextInvNo++}`; }

const INV_STATUSES = {
  draft:       { label: "Draft",       color: "#94a3b8" },
  issued:      { label: "Issued",      color: "#3b82f6" },
  paid:        { label: "Paid",        color: "#10b981" },
  overdue:     { label: "Overdue",     color: "#ef4444" },
  written_off: { label: "Written off", color: "#6b7280" },
};

const PAYMENT_METHODS = ["EFT", "Cash", "Card (Yoco)", "Medical aid", "Debit order"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function dueDateFrom(d, days = 30) {
  const dt = new Date(d); dt.setDate(dt.getDate() + days);
  return dt.toISOString().split("T")[0];
}
function fmtRand(n) { return `R ${Number(n || 0).toFixed(2)}`; }
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// ── Line item row ─────────────────────────────────────────────────────────────
const LineRow = ({ line, onRemove }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
    borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <span style={{ fontWeight: 600, color: C.teal }}>{line.tariff_code}</span>
      <span style={{ color: C.textSub }}> · {line.description}</span>
    </div>
    <div style={{ color: C.textSub, minWidth: 30, textAlign: "center" }}>×{line.quantity}</div>
    <div style={{ minWidth: 80, textAlign: "right", fontWeight: 600 }}>{fmtRand(line.line_total)}</div>
    <button onClick={onRemove} style={{ border: "none", background: "none", cursor: "pointer",
      color: C.textSub, fontSize: 16, padding: "0 4px", lineHeight: 1 }}>×</button>
  </div>
);

// ── Invoice creation modal ────────────────────────────────────────────────────
const InvoiceModal = ({ patients, episodes, onSave, onClose }) => {
  const [patientId, setPatientId] = useState("");
  const [patientQ,  setPatientQ]  = useState("");
  const [lines,     setLines]     = useState([]);
  const [tariffQ,   setTariffQ]   = useState("");
  const [icd10,     setIcd10]     = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate,   setDueDate]   = useState(dueDateFrom(today()));
  const [vatExempt, setVatExempt] = useState(false);
  const [notes,     setNotes]     = useState("");
  const [step,      setStep]      = useState(1);

  const selPt  = patients.find(p => p.id === patientId);
  const patEps = episodes.filter(e => e.patient_id === patientId && e.status === "active");

  const filteredPts = patients.filter(p => {
    const q = patientQ.toLowerCase();
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q);
  });

  const filteredTariffs = PHYSIO_TARIFF_CODES.filter(t => {
    const q = tariffQ.toLowerCase();
    return !q || t.code.includes(q) || t.description.toLowerCase().includes(q);
  }).slice(0, 12);

  const addLine = (tariff) => {
    setLines(prev => {
      const existing = prev.find(l => l.tariff_code === tariff.code);
      if (existing) {
        return prev.map(l => l.tariff_code === tariff.code
          ? { ...l, quantity: l.quantity + 1, line_total: (l.quantity + 1) * l.unit_amount }
          : l);
      }
      return [...prev, {
        id: `l${Date.now()}`,
        tariff_code: tariff.code,
        description: tariff.description,
        quantity: 1,
        unit_amount: tariff.unit_amount,
        line_total: tariff.unit_amount,
      }];
    });
    setTariffQ("");
  };

  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id));

  const subtotal  = lines.reduce((s, l) => s + l.line_total, 0);
  const vatAmount = vatExempt ? 0 : subtotal * VAT_RATE;
  const total     = subtotal + vatAmount;

  const handleSave = () => {
    if (!patientId || lines.length === 0) return;
    onSave({
      id: `inv${Date.now()}`,
      invoice_number: nextInvoiceNumber(),
      patient_id: patientId,
      issue_date: issueDate,
      due_date:   dueDate,
      lines,
      subtotal,
      vat_amount: vatAmount,
      total,
      status: "draft",
      payment_method: null,
      icd10_primary: icd10,
      notes,
      is_medical_aid: !!selPt?.medical_aid_id,
      scheme_code: SA_SCHEMES.find(s => s.id === selPt?.medical_aid_id)?.code || null,
    });
  };

  const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, color: C.text, background: C.bgCard, boxSizing: "border-box" };
  const lbl = { fontSize: 12, color: C.textSub, display: "block", marginBottom: 4, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem", width: 520,
        maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, color: C.teal, fontSize: 16 }}>New invoice</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer",
            fontSize: 18, color: C.textSub }}>×</button>
        </div>

        {/* Patient selection */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Patient</label>
              <input style={inp} value={patientQ} onChange={e => setPatientQ(e.target.value)}
                placeholder="Search by name..." autoFocus />
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
              {filteredPts.map(p => {
                const scheme = SA_SCHEMES.find(s => s.id === p.medical_aid_id);
                return (
                  <div key={p.id} onClick={() => { setPatientId(p.id); setStep(2); }}
                    style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer" }}
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

        {step === 2 && selPt && (
          <div>
            {/* Patient banner */}
            <div onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 8,
              marginBottom: "1rem", padding: "8px 10px", background: C.tealLight,
              borderRadius: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>←</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.teal }}>
                  {selPt.first_name} {selPt.last_name}
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>
                  {SA_SCHEMES.find(s => s.id === selPt.medical_aid_id)?.name || "Cash patient"}
                  {selPt.medical_aid_number ? ` · ${selPt.medical_aid_number}` : ""}
                </div>
              </div>
            </div>

            {/* ICD-10 */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>ICD-10 diagnosis code</label>
              <input style={inp} value={icd10} onChange={e => setIcd10(e.target.value.toUpperCase())}
                placeholder="e.g. M54.5" />
            </div>

            {/* Tariff code search */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Add procedure codes</label>
              <input style={inp} value={tariffQ} onChange={e => setTariffQ(e.target.value)}
                placeholder="Search by code or description..." />
              {tariffQ && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 4,
                  maxHeight: 200, overflowY: "auto", background: C.bgCard }}>
                  {filteredTariffs.map(t => (
                    <div key={t.code} onClick={() => addLine(t)}
                      style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontWeight: 600, color: C.teal }}>{t.code}</span>
                      <span style={{ color: C.textSub }}> · {t.description}</span>
                      <span style={{ float: "right", color: C.text, fontWeight: 600 }}>R{t.unit_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Line items */}
            {lines.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {lines.map(l => <LineRow key={l.id} line={l} onRemove={() => removeLine(l.id)} />)}
                <div style={{ padding: "8px 0", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.textSub }}>
                    <span>Subtotal</span><span>{fmtRand(subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.textSub }}>
                    <span>VAT (15%)</span><span>{fmtRand(vatAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700,
                    fontSize: 15, marginTop: 4, color: C.text }}>
                    <span>Total</span><span>{fmtRand(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dates & options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Issue date</label>
                <input type="date" style={inp} value={issueDate}
                  onChange={e => { setIssueDate(e.target.value); setDueDate(dueDateFrom(e.target.value)); }} />
              </div>
              <div>
                <label style={lbl}>Due date</label>
                <input type="date" style={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 48 }}
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Payment due on receipt" />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={lines.length === 0}>Create invoice</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Payment modal ─────────────────────────────────────────────────────────────
const PaymentModal = ({ invoice, onSave, onClose }) => {
  const [method, setMethod] = useState("EFT");
  const [ref,    setRef]    = useState("");
  const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, color: C.text, background: C.bgCard, boxSizing: "border-box" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: "1.5rem", width: 360,
        maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h3 style={{ margin: "0 0 1rem", color: C.teal, fontSize: 16 }}>Record payment</h3>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Invoice: {invoice.invoice_number}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.teal }}>R {invoice.total.toFixed(2)}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>Payment method</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m} onClick={() => setMethod(m)}
                style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 500,
                  background: method === m ? C.teal : C.bgSub,
                  color: method === m ? "#fff" : C.text }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>Reference (optional)</div>
          <input style={inp} value={ref} onChange={e => setRef(e.target.value)}
            placeholder="e.g. EFT ref 12345" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(method, ref)}>Mark paid</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Main Invoices screen ──────────────────────────────────────────────────────
export const Invoices = ({ navigate }) => {
  const { patients, episodes, invoices: liveInvoices, setLiveInvoices,
          db, practitionerId } = useContext(DataContext);

  // Fall back to demo invoices when no live data (empty DB / demo mode)
  const DEMO_INVOICES = [];
  const [filter,   setFilter]   = useState("all");
  const [showNew,  setShowNew]  = useState(false);
  const [payInv,   setPayInv]   = useState(null);

  const invoices = liveInvoices?.length ? liveInvoices : DEMO_INVOICES;
  const setInvoices = (updater) => {
    setLiveInvoices?.(typeof updater === "function" ? updater(invoices) : updater);
  };

  const displayed = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter(i => i.status === filter);
  }, [invoices, filter]);

  const totalOutstanding = invoices
    .filter(i => ["issued","overdue"].includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const totalPaidMonth = invoices
    .filter(i => i.status === "paid" && i.issue_date >= new Date().toISOString().slice(0,7))
    .reduce((s, i) => s + i.total, 0);

  const handleCreate = async (inv) => {
    // Optimistic update
    setInvoices(prev => [inv, ...prev]);
    setShowNew(false);
    // Persist to Supabase if live
    if (db && practitionerId) {
      const { data: invData, error: invErr } = await db.from("invoice").insert({
        practitioner_id: practitionerId,
        patient_id:      inv.patient_id,
        invoice_number:  inv.invoice_number,
        issue_date:      inv.issue_date,
        due_date:        inv.due_date || null,
        status:          "draft",
        subtotal:        inv.subtotal,
        vat_amount:      inv.vat_amount,
        total:           inv.total,
        notes:           inv.notes || null,
      });
      if (invErr) { console.warn("Invoice save failed:", invErr); return; }
      const savedInvId = invData?.[0]?.id;
      if (savedInvId && inv.lines?.length) {
        await db.from("invoice_line").insert(inv.lines.map(l => ({
          invoice_id:   savedInvId,
          description:  l.description,
          tariff_code:  l.tariff_code || null,
          icd10_code:   inv.icd10_primary || null,
          quantity:     l.quantity,
          unit_amount:  l.unit_amount,
          vat_rate:     0.15,
          line_total:   l.line_total,
        })));
      }
    }
  };

  const handleMarkPaid = async (method, ref) => {
    const updated = { ...payInv, status: "paid", payment_method: method, payment_ref: ref };
    setInvoices(prev => prev.map(i => i.id === payInv.id ? updated : i));
    setPayInv(null);
    if (db && payInv.id && !String(payInv.id).startsWith("inv")) {
      await db.from("invoice").update({ status: "paid", notes: `Paid via ${method}${ref ? ` ref ${ref}` : ""}` }).eq("id", payInv.id);
    }
  };

  const exportXero = () => {
    const headers = ["ContactName","InvoiceNumber","InvoiceDate","DueDate","Description",
      "Quantity","UnitAmount","AccountCode","TaxType"];
    const rows = invoices.flatMap(inv => {
      const pt = patients.find(p => p.id === inv.patient_id);
      const name = pt ? `${pt.first_name} ${pt.last_name}` : "Unknown";
      return inv.lines.map(l => [
        name, inv.invoice_number,
        inv.issue_date.split("-").reverse().join("/"),
        (inv.due_date||"").split("-").reverse().join("/"),
        l.description, l.quantity, l.unit_amount.toFixed(2),
        "200", "OUTPUT2"
      ]);
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `physio_xero_${today()}.csv`; a.click();
  };

  const patName = (id) => {
    const p = patients.find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "—";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Invoices</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportXero}>Xero CSV</Btn>
          <Btn onClick={() => setShowNew(true)}>+ New invoice</Btn>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem 1rem" }}>
          <div style={{ fontSize: 11, color: C.textSub }}>Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalOutstanding > 0 ? "#f59e0b" : C.teal }}>
            R {totalOutstanding.toFixed(2)}
          </div>
        </div>
        <div style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem 1rem" }}>
          <div style={{ fontSize: 11, color: C.textSub }}>Paid this month</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>R {totalPaidMonth.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
        {[["all","All"],["draft","Draft"],["issued","Issued"],["paid","Paid"],["overdue","Overdue"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === v ? C.teal : C.tealLight,
              color: filter === v ? "#fff" : C.teal, fontSize: 12, fontWeight: 500 }}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
            No invoices. Create one above.
          </div>
        ) : displayed.map(inv => {
          const cfg = INV_STATUSES[inv.status] || { label: inv.status, color: "#94a3b8" };
          return (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "11px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{patName(inv.patient_id)}</div>
                <div style={{ fontSize: 12, color: C.textSub }}>
                  {inv.invoice_number} · {fmtDate(inv.issue_date)}
                  {inv.icd10_primary ? ` · ${inv.icd10_primary}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>R {inv.total.toFixed(2)}</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                  background: cfg.color + "20", color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              {inv.status === "issued" && (
                <Btn size="sm" onClick={() => setPayInv(inv)}>Mark paid</Btn>
              )}
            </div>
          );
        })}
      </Card>

      {showNew && (
        <InvoiceModal patients={patients} episodes={episodes} onSave={handleCreate} onClose={() => setShowNew(false)} />
      )}
      {payInv && (
        <PaymentModal invoice={payInv} onSave={handleMarkPaid} onClose={() => setPayInv(null)} />
      )}
    </div>
  );
};
