import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
// Screen imports removed — Physio Pro uses its own screens via App.jsx

// Physio Pro SA — Auth helpers, Onboarding Wizard, Login screen
import { APP_VERSION, Btn, C, SUPABASE_ANON, SUPABASE_URL, USE_MOCK, auth } from "../shared.js";



// Supabase client with auth token support
export { sbAuth } from "@prosa/core";

// ─── ONBOARDING WIZARD ────────────────────────────────────────────────────────
export const OnboardingWizard = ({ session, onComplete }) => {
  const [step, setStep] = useState(1); // 1=practice 2=you 3=done
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = session?.access_token || session?.user?.access_token;

  const meta = session?.user?.user_metadata || {};
  const [practice, setPractice] = useState({
    practice_name: meta.practice_name || "",
    phone: "", email: meta.email || "", address: "",
    invoice_prefix: "PHY", payment_terms_days: 30, vat_number: "",
  });
  const [you, setYou] = useState({
    name: meta.full_name || "",
    hpcsa_number: meta.hpcsa_number || "",
    qualification: "BSc Physiotherapy",
  });

  const db = sbAuth(token);

  const savePractitioner = async () => {
    if (!practice.practice_name || !you.name) {
      setError("Practice name and your name are required."); return;
    }
    setSaving(true); setError("");
    const payload = {
      user_id: session.user.id,
      name: you.name,
      practice_name: practice.practice_name,
      phone: practice.phone || null,
      email: practice.email || null,
      address: practice.address || null,
      hpcsa_number: you.hpcsa_number || null,
      vat_number: practice.vat_number || null,
      invoice_prefix: practice.invoice_prefix || "PHY",
      payment_terms_days: Number(practice.payment_terms_days) || 30,
      created_at: new Date().toISOString(),
    };
    const { error: err } = await db.from("practitioner").insert(payload);
    if (err) {
      setError(`Failed to save: ${err.message || JSON.stringify(err)}`);
      setSaving(false); return;
    }
    setSaving(false);
    setStep(3);
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
    color: C.textTert, marginBottom: 4, fontWeight: 500, display: "block" };

  const steps = ["Practice", "You", "Done"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
      justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%",
        maxWidth: 480, boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.teal, marginBottom: 4 }}>Set up Physio Pro SA</div>
          <div style={{ fontSize: 13, color: C.textSub }}>Just two quick steps — takes under a minute.</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: "1.75rem" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i + 1 <= step ? C.teal : C.border, marginBottom: 4 }} />
              <div style={{ fontSize: 10, color: i + 1 <= step ? C.teal : C.textTert,
                fontWeight: i + 1 === step ? 600 : 400 }}>{s}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7,
            padding: "8px 12px", fontSize: 12, color: C.red, marginBottom: "1rem" }}>{error}</div>
        )}

        {/* Step 1 — Practice */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem", color: C.text }}>Your practice details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Practice name *</label>
              <input style={inputStyle} value={practice.practice_name}
                onChange={e => setPractice(p => ({ ...p, practice_name: e.target.value }))}
                placeholder="e.g. Cape Town Physio & Rehab" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={practice.phone}
                  onChange={e => setPractice(p => ({ ...p, phone: e.target.value }))}
                  placeholder="021 555 1234" />
              </div>
              <div>
                <label style={labelStyle}>VAT number</label>
                <input style={inputStyle} value={practice.vat_number}
                  onChange={e => setPractice(p => ({ ...p, vat_number: e.target.value }))}
                  placeholder="4501234567" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={practice.email}
                onChange={e => setPractice(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@mypractice.co.za" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={practice.address}
                onChange={e => setPractice(p => ({ ...p, address: e.target.value }))}
                placeholder="12 Main Rd, Claremont, Cape Town" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.5rem" }}>
              <div>
                <label style={labelStyle}>Invoice prefix</label>
                <input style={inputStyle} value={practice.invoice_prefix}
                  onChange={e => setPractice(p => ({ ...p, invoice_prefix: e.target.value }))}
                  placeholder="PHY" />
              </div>
              <div>
                <label style={labelStyle}>Payment terms (days)</label>
                <input type="number" style={inputStyle} value={practice.payment_terms_days}
                  onChange={e => setPractice(p => ({ ...p, payment_terms_days: e.target.value }))} />
              </div>
            </div>
            <Btn onClick={() => { if (!practice.practice_name) { setError("Practice name is required"); return; } setError(""); setStep(2); }}
              style={{ width: "100%" }}>Continue →</Btn>
          </div>
        )}

        {/* Step 2 — You */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem", color: C.text }}>Your professional details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Full name *</label>
              <input style={inputStyle} value={you.name}
                onChange={e => setYou(y => ({ ...y, name: e.target.value }))}
                placeholder="e.g. Dr. Sarah Van der Merwe" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>HPCSA registration number</label>
              <input style={inputStyle} value={you.hpcsa_number}
                onChange={e => setYou(y => ({ ...y, hpcsa_number: e.target.value }))}
                placeholder="e.g. PT000001" />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Qualification</label>
              <select style={inputStyle} value={you.qualification}
                onChange={e => setYou(y => ({ ...y, qualification: e.target.value }))}>
                <option value="BSc Physiotherapy">BSc Physiotherapy</option>
                <option value="BSc Hons Physiotherapy">BSc Hons Physiotherapy</option>
                <option value="MSc Physiotherapy">MSc Physiotherapy</option>
                <option value="BPhysT">BPhysT</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(1)}>← Back</Btn>
              <Btn onClick={savePractitioner} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Saving..." : "Finish setup →"}
              </Btn>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: "1rem" }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>You're all set</div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your practice is configured. Add your first patient and start recording clinical notes.
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
    if (USE_MOCK) { onLogin({ access_token: "mock_token", user: { id: "mock_user", email: "demo@physioprosa.co.za", user_metadata: { full_name: "Demo Physiotherapist", practice_name: "Demo Physio Practice", hpcsa_number: "PT000001", onboarding_complete: true } } }); setLoading(false); return; }
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
      setError("Account created — please sign in.");
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
      setError("Account created — please sign in.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.tealDark, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.tealDark, letterSpacing: "-0.02em" }}>Physio Pro SA</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Cloud practice management for South African physiotherapists</div>
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
            : (mode === "login" ? "Sign in" : mode === "signup" ? "Create Pro account" : "Create account")}
        </Btn>

        <div style={{ textAlign: "center", marginTop: "1rem", fontSize: 11, color: C.textTert }}>
          Physio Pro SA v{APP_VERSION} · POPIA compliant
        </div>
      </div>
    </div>
  );
};


// ─── CPD TRACKER ──────────────────────────────────────────────────────────────
