import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
// Screen imports removed — Physio Pro uses its own screens via App.jsx

// OccHealth Pro SA — Auth helpers, Onboarding Wizard, Login screen
import { APP_VERSION, Btn, C, MOCK_SESSION, SUPABASE_ANON, SUPABASE_URL, USE_MOCK } from "../shared.js";



// Supabase client with auth token support
export const sbAuth = (token) => makeClient(() => ({
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${token || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
}));

// ─── ONBOARDING WIZARD ────────────────────────────────────────────────────────
export const OnboardingWizard = ({ session, onComplete }) => {
  const [step, setStep] = useState(1); // 1=tenant 2=practitioner 3=employer 4=employees 5=done
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = session?.access_token || session?.user?.access_token;

  const [tenant, setTenant] = useState({ name: "", type: "independent_ohp", coida_registration: "" });
  const [practitioner, setPractitioner] = useState({ name: session?.user?.user_metadata?.full_name || "", sanc_number: "", qualification: "B.Cur OHN", registration_expiry: "" });
  const [employer, setEmployer] = useState({ name: "", coida_ref: "", industry_class: "", coida_insurer: "compensation_fund", contact_email: "" });
  const [employees, setEmployees] = useState([{ first_name: "", last_name: "", employee_number: "", job_title: "", department: "", site: "" }]);
  const [tenantId, setTenantId] = useState(null);
  const [employerId, setEmployerId] = useState(null);

  const db = sbAuth(token);

  const saveTenant = async () => {
    if (!tenant.name) { setError("Practice name is required"); return; }
    setSaving(true); setError("");
    const tenantData = { name: tenant.name, type: tenant.type, created_at: new Date().toISOString() };
    if (tenant.coida_registration) tenantData.coida_registration = tenant.coida_registration;
    const { data, error: err } = await db.from("tenant").insert(tenantData);
    if (err || !data?.[0]) { setError(`Failed to save practice details: ${JSON.stringify(err)}`); setSaving(false); return; }
    setTenantId(data[0].id);
    setSaving(false);
    setStep(2);
  };

  const savePractitioner = async () => {
    if (!practitioner.name) { setError("Name is required"); return; }
    setSaving(true); setError("");
    const practData = {
      name: practitioner.name,
      tenant_id: tenantId,
      qualification: practitioner.qualification,
      created_at: new Date().toISOString(),
    };
    if (practitioner.sanc_number) practData.sanc_number = practitioner.sanc_number;
    if (practitioner.registration_expiry) practData.registration_expiry = practitioner.registration_expiry;
    const { error: err } = await db.from("practitioner").insert(practData);
    if (err) { setError(`Failed to save practitioner details: ${err.message || JSON.stringify(err)}`); setSaving(false); return; }
    setSaving(false);
    setStep(3);
  };

  const saveEmployer = async () => {
    if (!employer.name) { setError("Employer name is required"); return; }
    setSaving(true); setError("");
    const empData = { name: employer.name, tenant_id: tenantId, coida_insurer: employer.coida_insurer, created_at: new Date().toISOString() };
    if (employer.coida_ref) empData.coida_ref = employer.coida_ref;
    if (employer.industry_class) empData.industry_class = employer.industry_class;
    if (employer.contact_email) empData.contact_email = employer.contact_email;
    const { data, error: err } = await db.from("employer").insert(empData);
    if (err || !data?.[0]) { setError("Failed to save employer."); setSaving(false); return; }
    setEmployerId(data[0].id);
    setSaving(false);
    setStep(4);
  };

  const saveEmployees = async () => {
    setSaving(true); setError("");
    const valid = employees.filter(e => e.first_name && e.last_name);
    if (valid.length === 0) { setStep(5); setSaving(false); return; }
    for (const emp of valid) {
      const personData = {
        first_name: emp.first_name,
        last_name: emp.last_name,
        employer_id: employerId,
        employment_status: "active",
        created_at: new Date().toISOString(),
      };
      if (emp.employee_number) personData.employee_number = emp.employee_number;
      if (emp.job_title) personData.job_title = emp.job_title;
      if (emp.department) personData.department = emp.department;
      if (emp.site) personData.site = emp.site;
      await db.from("person").insert(personData);
    }
    setSaving(false);
    setStep(5);
  };

  const addEmployee = () => setEmployees(e => [...e, { first_name: "", last_name: "", employee_number: "", job_title: "", department: "", site: "" }]);
  const setEmp = (i, k, v) => setEmployees(e => e.map((emp, idx) => idx === i ? { ...emp, [k]: v } : emp));

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const labelStyle = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTert, marginBottom: 4, fontWeight: 500, display: "block" };

  const steps = ["Practice", "You", "Employer", "Employees", "Done"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 520, boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: C.tealDark, marginBottom: 4 }}>Set up OccHealth Pro SA</div>
          <div style={{ fontSize: 13, color: C.textSub }}>Just a few details to get you started — takes about 3 minutes.</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: "1.75rem" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i + 1 <= step ? C.teal : C.border, marginBottom: 4 }} />
              <div style={{ fontSize: 10, color: i + 1 <= step ? C.teal : C.textTert, fontWeight: i + 1 === step ? 600 : 400 }}>{s}</div>
            </div>
          ))}
        </div>

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: C.red, marginBottom: "1rem" }}>{error}</div>}

        {/* Step 1 — Practice */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem", color: C.text }}>Your practice details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Practice / trading name *</label>
              <input style={inputStyle} value={tenant.name} onChange={e => setTenant(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Cape OccHealth Services" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Practice type</label>
              <select style={inputStyle} value={tenant.type} onChange={e => setTenant(t => ({ ...t, type: e.target.value }))}>
                <option value="independent_ohp">Independent OHP (sole practitioner)</option>
                <option value="bureau">OHP bureau / network</option>
                <option value="employer_clinic">Employer-owned clinic</option>
              </select>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>COIDA registration number (optional)</label>
              <input style={inputStyle} value={tenant.coida_registration} onChange={e => setTenant(t => ({ ...t, coida_registration: e.target.value }))} placeholder="e.g. 12345678" />
            </div>
            <Btn onClick={saveTenant} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving..." : "Continue →"}</Btn>
          </div>
        )}

        {/* Step 2 — Practitioner */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem", color: C.text }}>Your professional details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Full name *</label>
              <input style={inputStyle} value={practitioner.name} onChange={e => setPractitioner(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sr. Thandi Dlamini" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>SANC registration number (optional)</label>
              <input style={inputStyle} value={practitioner.sanc_number} onChange={e => setPractitioner(p => ({ ...p, sanc_number: e.target.value }))} placeholder="e.g. 123456789" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Qualification</label>
              <select style={inputStyle} value={practitioner.qualification} onChange={e => setPractitioner(p => ({ ...p, qualification: e.target.value }))}>
                <option value="B.Cur OHN">B.Cur OHN (Occupational Health Nursing)</option>
                <option value="B.Tech OHN">B.Tech OHN</option>
                <option value="Dip OHN">Diploma in OHN</option>
                <option value="MBChB Dip Occ Med">MBChB + Dip Occ Med</option>
                <option value="FC OccMed">FC OccMed (Occupational Medicine Specialist)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>SANC registration expiry date</label>
              <input type="date" style={inputStyle} value={practitioner.registration_expiry} onChange={e => setPractitioner(p => ({ ...p, registration_expiry: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(1)}>← Back</Btn>
              <Btn onClick={savePractitioner} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Continue →"}</Btn>
            </div>
          </div>
        )}

        {/* Step 3 — First employer */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.text }}>Add your first employer client</div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: "1rem" }}>You can add more employers later from the Employers screen.</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Company name *</label>
              <input style={inputStyle} value={employer.name} onChange={e => setEmployer(em => ({ ...em, name: e.target.value }))} placeholder="e.g. Cape Construction (Pty) Ltd" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>COIDA reference number</label>
                <input style={inputStyle} value={employer.coida_ref} onChange={e => setEmployer(em => ({ ...em, coida_ref: e.target.value }))} placeholder="CF-2024-001" />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <select style={inputStyle} value={employer.industry_class} onChange={e => setEmployer(em => ({ ...em, industry_class: e.target.value }))}>
                  <option value="">Select...</option>
                  {["Construction","Mining","Manufacturing","Agriculture","Transport","Logistics","Food processing","Chemical","Healthcare","Retail","Other"].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>COIDA insurer</label>
              <select style={inputStyle} value={employer.coida_insurer} onChange={e => setEmployer(em => ({ ...em, coida_insurer: e.target.value }))}>
                <option value="compensation_fund">Compensation Fund (DoL)</option>
                <option value="rma">Rand Mutual Assurance (RMA) — mining & metals</option>
                <option value="fem">Federated Employers Mutual (FEM) — construction</option>
              </select>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>HR contact email</label>
              <input type="email" style={inputStyle} value={employer.contact_email} onChange={e => setEmployer(em => ({ ...em, contact_email: e.target.value }))} placeholder="hr@company.co.za" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(2)}>← Back</Btn>
              <Btn onClick={saveEmployer} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Continue →"}</Btn>
            </div>
          </div>
        )}

        {/* Step 4 — Employees */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.text }}>Add employees for {employer.name}</div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: "1rem" }}>Add a few key employees to get started. You can bulk-import more later.</div>
            <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: "1rem" }}>
              {employees.map((emp, i) => (
                <div key={i} style={{ background: C.bgSub, borderRadius: 8, padding: "0.875rem", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.textTert, marginBottom: 8, fontWeight: 500 }}>Employee {i + 1}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={labelStyle}>First name *</label>
                      <input style={inputStyle} value={emp.first_name} onChange={e => setEmp(i, "first_name", e.target.value)} placeholder="First name" />
                    </div>
                    <div>
                      <label style={labelStyle}>Last name *</label>
                      <input style={inputStyle} value={emp.last_name} onChange={e => setEmp(i, "last_name", e.target.value)} placeholder="Last name" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Emp. number</label>
                      <input style={inputStyle} value={emp.employee_number} onChange={e => setEmp(i, "employee_number", e.target.value)} placeholder="EMP-001" />
                    </div>
                    <div>
                      <label style={labelStyle}>Job title</label>
                      <input style={inputStyle} value={emp.job_title} onChange={e => setEmp(i, "job_title", e.target.value)} placeholder="Title" />
                    </div>
                    <div>
                      <label style={labelStyle}>Site</label>
                      <input style={inputStyle} value={emp.site} onChange={e => setEmp(i, "site", e.target.value)} placeholder="Site" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Btn variant="ghost" size="sm" onClick={addEmployee} style={{ marginBottom: "1rem" }}>+ Add another employee</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(3)}>← Back</Btn>
              <Btn onClick={saveEmployees} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save & finish →"}</Btn>
            </div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button onClick={() => setStep(5)} style={{ background: "none", border: "none", fontSize: 12, color: C.textTert, cursor: "pointer", textDecoration: "underline" }}>Skip for now</button>
            </div>
          </div>
        )}

        {/* Step 5 — Done */}
        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: "1rem" }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>You're all set</div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your practice is configured. Head to Encounters to start recording clinical notes, or add more employers from the Employers screen.
            </div>
            <Btn onClick={onComplete} style={{ width: "100%" }}>Go to dashboard →</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
const PasswordInput = ({ value, onChange, placeholder, onKeyDown, label, hint }) => {
  const [show, setShow] = useState(false);
  const inputStyle = { width: "100%", padding: "9px 40px 9px 12px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "inherit" };
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>
        {label} {hint && <span style={{ color: C.textTert }}>{hint}</span>}
      </div>
      <div style={{ position: "relative" }}>
        <input type={show ? "text" : "password"} style={inputStyle} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} />
        <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textTert, fontSize: 16, lineHeight: 1 }}>
          {show ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
};

export const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sancNumber, setSancNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = { width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "inherit" };

  const handleLogin = async () => {
    if (!email || !password) { setError("Enter email and password"); return; }
    setLoading(true); setError("");
    if (USE_MOCK) { onLogin(MOCK_SESSION); setLoading(false); return; }
    const data = await auth.signIn(email, password);
    if (data.error || !data.access_token) {
      setError(data.error_description || data.message || "Invalid email or password");
      setLoading(false); return;
    }
    const user = await auth.getUser(data.access_token);
    onLogin({ ...data, user });
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password || !fullName) { setError("All fields required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    const data = await auth.signUp(email, password, { full_name: fullName, role: "ohp", onboarding_complete: false });
    if (data.error) { setError(data.error_description || data.message || "Signup failed"); setLoading(false); return; }
    const signInData = await auth.signIn(email, password);
    if (signInData.access_token) {
      const user = await auth.getUser(signInData.access_token);
      onLogin({ ...signInData, user });
    } else {
      setError("Account created. Check your email to confirm, then sign in.");
    }
    setLoading(false);
  };

  const handleCPDSignup = async () => {
    if (!email || !password || !fullName) { setError("Name, email and password are required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    const data = await auth.signUp(email, password, {
      full_name: fullName,
      sanc_number: sancNumber,
      role: "ohp",
      account_type: "cpd_free",
      onboarding_complete: true,
    });
    if (data.error) { setError(data.error_description || data.message || "Signup failed"); setLoading(false); return; }
    const signInData = await auth.signIn(email, password);
    if (signInData.access_token) {
      const user = await auth.getUser(signInData.access_token);
      onLogin({ ...signInData, user });
    } else {
      setError("Account created. Check your email to confirm, then sign in.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.tealDark, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.tealDark, letterSpacing: "-0.02em" }}>OccHealth Pro SA</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Occupational health practice management</div>
        </div>

        {USE_MOCK && (
          <div style={{ background: C.tealLight, border: `1px solid ${C.tealMid}`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem", fontSize: 12, color: C.teal }}>
            Demo mode — any credentials will work
          </div>
        )}

        {!USE_MOCK && (
          <div style={{ display: "flex", background: C.bgSub, borderRadius: 8, padding: 3, marginBottom: "1.25rem" }}>
            {[
              { id: "login", label: "Sign in" },
              { id: "signup", label: "Pro account" },
              { id: "cpd_signup", label: "Free CPD log" },
            ].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setError(""); setConfirmPassword(""); setSancNumber(""); }} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", background: mode === m.id ? "#fff" : "transparent", color: mode === m.id ? C.text : C.textSub, fontSize: 12, fontWeight: mode === m.id ? 500 : 400, cursor: "pointer", boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {mode === "cpd_signup" && !USE_MOCK && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: "1rem", fontSize: 12, color: "#15803d" }}>
            <strong>Free forever</strong> — SANC CPD log, 15-point tracker, PDF export. No credit card required.
          </div>
        )}

        {(mode === "signup" || mode === "cpd_signup") && !USE_MOCK && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>Full name</div>
            <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Sr. Jane Smith" />
          </div>
        )}
        {mode === "cpd_signup" && !USE_MOCK && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>SANC registration number <span style={{ color: C.textTert }}>(optional)</span></div>
            <input style={inputStyle} value={sancNumber} onChange={e => setSancNumber(e.target.value)} placeholder="e.g. 12345678" />
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>Email</div>
          <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.co.za" onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : undefined)} />
        </div>

        <PasswordInput
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          label="Password"
          hint={mode === "signup" ? "(min 8 characters)" : ""}
          onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()}
        />

        {(mode === "signup" || mode === "cpd_signup") && !USE_MOCK && (
          <PasswordInput
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            label="Confirm password"
            onKeyDown={e => e.key === "Enter" && (mode === "signup" ? handleSignup() : handleCPDSignup())}
          />
        )}

        {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 10, background: "#FEF2F2", padding: "8px 10px", borderRadius: 6 }}>{error}</div>}

        <Btn onClick={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleCPDSignup} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading
            ? (mode === "login" ? "Signing in..." : "Creating account...")
            : (mode === "login" ? "Sign in" : mode === "signup" ? "Create Pro account" : "Create free CPD log")}
        </Btn>

        <div style={{ textAlign: "center", marginTop: "1rem", fontSize: 11, color: C.textTert }}>
          OccHealth Pro SA v{APP_VERSION} · POPIA compliant
        </div>
      </div>
    </div>
  );
};


// ─── CPD TRACKER ──────────────────────────────────────────────────────────────
