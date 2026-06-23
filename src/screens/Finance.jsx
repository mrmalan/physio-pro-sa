import { useContext, useState, useMemo } from "react";
import { DataContext, C, Card, Btn } from "../shared.js";
import { SA_SCHEMES, generateClaimCSV } from "../shared.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const VAT_RATE = 0.15;
function today() { return new Date().toISOString().split("T")[0]; }
function thisMonth() { return new Date().toISOString().slice(0,7); }
function fmtRand(n) { return `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// ── CSV utilities ─────────────────────────────────────────────────────────────
function downloadCSV(content, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

function exportXeroInvoices(invoices, patients) {
  const headers = ["ContactName","InvoiceNumber","InvoiceDate","DueDate",
    "Description","Quantity","UnitAmount","AccountCode","TaxType"];
  const rows = invoices.map(inv => {
    const pt = patients.find(p => p.id === inv.patient_id);
    const name = pt ? `${pt.first_name} ${pt.last_name}` : "Unknown";
    return [name, inv.id.toUpperCase(),
      inv.issue_date.split("-").reverse().join("/"),
      inv.issue_date.split("-").reverse().join("/"),
      "Physiotherapy session", 1, inv.subtotal.toFixed(2), "200", "OUTPUT2"];
  });
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadCSV(csv, `physio_xero_invoices_${today()}.csv`);
}

function exportSageInvoices(invoices, patients) {
  const headers = ["Type","Date","Reference","NetAmount","VATCode","GrossAmount","NominalCode"];
  const rows = invoices.map(inv => {
    return ["SI",
      inv.issue_date.split("-").reverse().join("/"),
      inv.id.toUpperCase(),
      inv.subtotal.toFixed(2),
      "T1",
      inv.total.toFixed(2),
      "4000",
    ];
  });
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadCSV(csv, `physio_sage_invoices_${today()}.csv`);
}

function exportVAT201(invoices) {
  const headers = ["InvoiceRef","Date","Description","Field1_Output","Field1A_ZeroRated","Field1B_Exempt","Field4_InputVAT"];
  const rows = invoices.map(inv => [
    inv.id.toUpperCase(),
    inv.issue_date.split("-").reverse().join("/"),
    "Physiotherapy session",
    inv.subtotal.toFixed(2),
    "0.00","0.00",
    inv.vat_amount.toFixed(2)
  ]);
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadCSV(csv, `physio_VAT201_${today()}.csv`);
}

// ── Revenue chart bar ─────────────────────────────────────────────────────────
const RevBar = ({ label, value, max, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
    <div style={{ width: 80, fontSize: 12, color: C.textSub, textAlign: "right" }}>{label}</div>
    <div style={{ flex: 1, background: C.bgSub, borderRadius: 4, height: 18, overflow: "hidden" }}>
      <div style={{ width: `${max ? (value/max)*100 : 0}%`, background: color || C.teal,
        height: "100%", borderRadius: 4, transition: "width .4s" }} />
    </div>
    <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: C.text }}>
      R {value.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
    </div>
  </div>
);

// ── Main Finance screen ───────────────────────────────────────────────────────
export const Finance = ({ navigate }) => {
  const { patients, invoices: liveInvoices } = useContext(DataContext);
  const [period, setPeriod]   = useState("month");
  const [activeTab, setTab]   = useState("overview");

  // Use live invoices from Supabase; fall back to empty array (not mock data)
  const invoices = liveInvoices ?? [];

  const filtered = useMemo(() => {
    const now = new Date();
    return invoices.filter(inv => {
      if (period === "month")   return inv.issue_date.startsWith(thisMonth());
      if (period === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        const d = new Date(inv.issue_date);
        return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
      }
      if (period === "year")    return inv.issue_date.startsWith(String(now.getFullYear()));
      return true; // all
    });
  }, [invoices, period]);

  const totalRevenue   = filtered.reduce((s,i) => s + i.total, 0);
  const paidRevenue    = filtered.filter(i => i.status === "paid").reduce((s,i) => s + i.total, 0);
  const outstanding    = filtered.filter(i => ["issued","overdue"].includes(i.status)).reduce((s,i) => s + i.total, 0);
  const overdueAmt     = filtered.filter(i => i.status === "overdue").reduce((s,i) => s + i.total, 0);
  const vatOutput      = filtered.reduce((s,i) => s + i.vat_amount, 0);
  const medAidRevenue  = filtered.filter(i => i.is_medical_aid).reduce((s,i) => s + i.total, 0);
  const cashRevenue    = filtered.filter(i => !i.is_medical_aid).reduce((s,i) => s + i.total, 0);
  const maxScheme      = Math.max(medAidRevenue, cashRevenue, 1);

  // Scheme breakdown
  const schemeBreakdown = SA_SCHEMES
    .map(s => ({ ...s, total: filtered.filter(i => i.scheme_code === s.code).reduce((sum,i) => sum + i.total, 0) }))
    .filter(s => s.total > 0)
    .sort((a,b) => b.total - a.total);
  const maxSchemeBreak = Math.max(...schemeBreakdown.map(s => s.total), 1);

  // Outstanding debtors
  const debtors = patients.map(pt => {
    const ptInvs = filtered.filter(i => i.patient_id === pt.id && ["issued","overdue"].includes(i.status));
    const owed   = ptInvs.reduce((s,i) => s + i.total, 0);
    const hasOvd = ptInvs.some(i => i.status === "overdue");
    return { ...pt, owed, hasOvd, count: ptInvs.length };
  }).filter(d => d.owed > 0).sort((a,b) => b.owed - a.owed);

  const tabs = [["overview","Overview"],["debtors","Debtors"],["exports","Exports"]];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: C.teal }}>Finance</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {[["month","This month"],["quarter","Quarter"],["year","Year"],["all","All time"]].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                background: period === v ? C.teal : C.bgSub, color: period === v ? "#fff" : C.text,
                fontSize: 12, fontWeight: 500 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>
        {tabs.map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
              fontWeight: activeTab === v ? 700 : 400,
              color: activeTab === v ? C.teal : C.textSub,
              borderBottom: activeTab === v ? `2px solid ${C.teal}` : "2px solid transparent",
              fontSize: 13, marginBottom: -1 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Total billed",   value: fmtRand(totalRevenue),  color: C.teal    },
              { label: "Collected",      value: fmtRand(paidRevenue),   color: "#10b981" },
              { label: "Outstanding",    value: fmtRand(outstanding),   color: "#f59e0b" },
              { label: "Overdue",        value: fmtRand(overdueAmt),    color: "#ef4444" },
            ].map(s => (
              <div key={s.label} style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem 1rem" }}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Revenue split */}
            <Card>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Revenue by type</div>
              <RevBar label="Medical aid" value={medAidRevenue} max={maxScheme} color={C.teal} />
              <RevBar label="Cash"        value={cashRevenue}   max={maxScheme} color="#f59e0b" />
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 8 }}>
                Medical aid {totalRevenue ? Math.round(medAidRevenue/totalRevenue*100) : 0}% of billings
              </div>
            </Card>

            {/* VAT */}
            <Card>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>VAT summary</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.textSub }}>Output VAT (Field 1)</span>
                <span style={{ fontWeight: 600 }}>{fmtRand(vatOutput)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.textSub }}>Input VAT (Field 4)</span>
                <span style={{ fontWeight: 600 }}>R 0.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14,
                fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 8 }}>
                <span>Net VAT payable</span>
                <span style={{ color: C.teal }}>{fmtRand(vatOutput)}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <a href="https://efiling.sars.gov.za" target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: C.teal, textDecoration: "underline" }}>
                  → SARS eFiling
                </a>
              </div>
            </Card>
          </div>

          {schemeBreakdown.length > 0 && (
            <Card style={{ marginTop: "1rem" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Revenue by medical aid scheme</div>
              {schemeBreakdown.map(s => (
                <RevBar key={s.id} label={s.name} value={s.total} max={maxSchemeBreak} color={C.tealMid} />
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── Debtors ── */}
      {activeTab === "debtors" && (
        <div>
          {debtors.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "2rem", color: C.textSub, fontSize: 14 }}>
                No outstanding debtors for this period. 🎉
              </div>
            </Card>
          ) : (
            <Card>
              {debtors.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.first_name} {d.last_name}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{d.count} invoice{d.count !== 1 ? "s" : ""} unpaid</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: d.hasOvd ? "#ef4444" : "#f59e0b" }}>
                      {fmtRand(d.owed)}
                    </div>
                    {d.hasOvd && (
                      <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>OVERDUE</div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total outstanding</span>
                <span style={{ color: "#f59e0b" }}>{fmtRand(outstanding)}</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Exports ── */}
      {activeTab === "exports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[
            { title: "Xero — Invoices",   desc: "ContactName, InvoiceNumber, Date, AccountCode 200, OUTPUT2 tax type",
              action: () => exportXeroInvoices(filtered, patients), btn: "Download Xero CSV" },
            { title: "Sage — Invoices",   desc: "Type SI, Date, Reference, Net, T1 VAT code, Nominal 4000",
              action: () => exportSageInvoices(filtered, patients), btn: "Download Sage CSV" },
            { title: "VAT 201 workpaper", desc: "Fields 1, 1A, 1B, and 4 with full invoice detail for SARS submission",
              action: () => exportVAT201(filtered), btn: "Download VAT201 CSV" },
            { title: "Medical aid claims CSV", desc: "Standard format for scheme portal upload (pre-accreditation manual route)",
              action: () => {
                const rows = filtered.filter(i => i.is_medical_aid).map(inv => {
                  const pt = patients.find(p => p.id === inv.patient_id);
                  return { claim_date: inv.issue_date, patient_surname: pt?.last_name||"",
                    patient_first_name: pt?.first_name||"", member_number: pt?.medical_aid_number||"",
                    scheme_code: inv.scheme_code||"", tariff_code:"18533", icd10_code:"",
                    quantity:1, unit_amount: inv.subtotal, total_amount: inv.total,
                    treating_provider:"Physiotherapist", hpcsa_number:"" };
                });
                downloadCSV(generateClaimCSV(rows), `physio_claims_${today()}.csv`);
              }, btn: "Download Claims CSV" },
          ].map(ex => (
            <Card key={ex.title}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ex.title}</div>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: "1rem", lineHeight: 1.5 }}>{ex.desc}</div>
              <Btn onClick={ex.action}>{ex.btn}</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
